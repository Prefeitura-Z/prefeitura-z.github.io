require "PRZArmory/Network"
require "PRZArmory/Config"
require "PRZArmory/Core"
require "PRZArmory/AxeAudio"
require "PRZArmory/CannonEffects"

local Combat = { burns = {}, stuns = {}, stunByZombie = {}, active = false }
PRZArmory.Combat = Combat
local Config, Core = PRZArmory.Config, PRZArmory.Core

local function releaseMovement(stun)
    -- Only restore a movement flag while this effect still owns the false value.
    -- Native reactions can restore it themselves when they exit.
    if stun.held and not stun.zombie:isDeferredMovementEnabled() then
        stun.zombie:setDeferredMovementEnabled(stun.deferred)
    end
    stun.held = false
end

local function releaseStun(stun)
    releaseMovement(stun)
    if stun.zombie:isUseless() then stun.zombie:setUseless(stun.useless) end
end

function Combat.clear()
    for _, stun in ipairs(Combat.stuns) do releaseStun(stun) end
    Combat.burns = {}
    Combat.stuns = {}
    Combat.stunByZombie = {}
    Combat.active = false
end

local function lineFrom(x, y, z, zombie)
    local to = zombie:getSquare()
    return to and math.floor(z) == to:getZ()
        and not LosUtil.lineClearCollide(math.floor(x), math.floor(y), math.floor(z),
            to:getX(), to:getY(), to:getZ(), false)
end

local function holdStill(stun)
    local zombie = stun.zombie
    zombie:setUseless(true)
    zombie:setTarget(nil)
    local state = zombie:getCurrentState()
    local idle = ZombieIdleState.instance()
    -- Whitelist locomotion only. FallDown -> OnGround -> GetUp owns the floor,
    -- knocked-down and reanimation flags. Never replace those native states or
    -- clear their hit reaction, even when a pellet arrives during a prior stun.
    local walking = state == idle or state == WalkTowardState.instance()
        or state == PathFindState.instance() or state == LungeState.instance()
        or state == AttackState.instance() or state == ThumpState.instance()
    if stun.grace > 0 or not walking
        or ((zombie:isOnFloor() or zombie:isKnockedDown()) and not zombie:isCrawling()) then
        releaseMovement(stun)
        return
    end
    zombie:setPath2(nil)
    zombie:setVariable("bMoving", false)
    zombie:setVariable("bPathfind", false)
    if state ~= idle then zombie:changeState(idle) end
    if zombie:getCurrentState() == idle then
        -- Snapshot at acquisition, not during a preceding native hit reaction.
        if not stun.held then stun.deferred = zombie:isDeferredMovementEnabled() end
        zombie:setDeferredMovementEnabled(false)
        stun.held = true
    else
        -- A native state lock remains owned by the engine.
        releaseMovement(stun)
    end
end

function Combat.enforceStun(zombie)
    if Config.effectsEnabled == false then Combat.clear(); return end
    local stun = Combat.stunByZombie[zombie]
    if stun and stun.left > 0 and not zombie:isDead()
        and zombie:getSquare() and not stun.player:isDead() then holdStill(stun) end
end

function Combat.stun(zombie, player, seconds)
    if isClient() and not PRZArmory.Network.applying then return end
    if Config.effectsEnabled == false or not seconds or seconds <= 0 or zombie:isDead() or zombie:isInvulnerable() then return end
    local current = Combat.stunByZombie[zombie]
    if current then
        current.left, current.player = math.max(current.left, seconds), player
        -- The hit event precedes native damage/reaction; release our movement
        -- hold before the engine selects and plays that new reaction.
        releaseMovement(current)
        current.grace = 0.75
        if PRZArmory.Effects and PRZArmory.Effects.stun then PRZArmory.Effects.stun(zombie, seconds) end
        return
    end
    if #Combat.stuns >= Config.maxStunned then return end
    local stun = {
        zombie = zombie, player = player, left = seconds, grace = 0.75,
        useless = zombie:isUseless(), deferred = zombie:isDeferredMovementEnabled(),
    }
    table.insert(Combat.stuns, stun)
    Combat.stunByZombie[zombie] = stun
    zombie:setUseless(true)
    if PRZArmory.Effects and PRZArmory.Effects.stun then PRZArmory.Effects.stun(zombie, seconds) end
end

function Combat.onHitZombie(zombie, player, bodyPart, weapon)
    -- OnHitZombie is fired by the native pellet hit, before its damage. Do not
    -- enumerate a cone, add damage, force knockback, or affect bystanders.
    if Config.effectsEnabled == false or Combat.active or isClient() or isServer() or not zombie or not weapon
        or not player or player ~= getSpecificPlayer(0) or player:isDead()
        or player:isDoShove() or player:isPerformingShoveAnimation()
        or player:isPerformingStompAnimation() then return end
    local spec = Config.weapons[weapon:getFullType()]
    if not spec or not spec.onHitStun then return end
    local chance = spec.stunChance or 100
    if chance <= 0 or (chance < 100 and ZombRand(100) >= chance) then return end
    Combat.stun(zombie, player, spec.stunSeconds)
end

function Combat.clearLine(player, zombie)
    local from, to = player:getSquare(), zombie:getSquare()
    if not from or not to or from:getZ() ~= to:getZ() then return false end
    -- true means obstructed; bIgnoreDoors=false also blocks closed doors.
    return not LosUtil.lineClearCollide(from:getX(), from:getY(), from:getZ(),
        to:getX(), to:getY(), to:getZ(), false)
end

local function hit(zombie, player, weapon, damage)
    if zombie:isDead() or zombie:isInvulnerable() or not zombie:getSquare() or player:isDead() then return end
    -- Engine Hit handles health, reaction, death/corpse creation and attacker credit.
    -- B42.21 overload: Hit(HandWeapon,IsoGameCharacter,float,boolean,float,boolean).
    Combat.active = true
    local ok, err = pcall(function() zombie:Hit(weapon, player, damage, false, 1.0, false) end)
    Combat.active = false
    if not ok then error(err) end
end

local function directDamage(zombie, player, weapon, amount)
    if amount <= 0 or zombie:isDead() or zombie:isInvulnerable()
        or not zombie:getSquare() or player:isDead() then return false end
    -- Skills/DOT are health damage, not ordinary melee input to Hit(). B42's
    -- Hit() applies weapon skill and global melee reductions again.
    zombie:setAttackedBy(player)
    zombie:applyDamage(amount)
    if zombie:getHealth() <= 0 and not zombie:isOnKillDone() then
        player:setZombieKills(player:getZombieKills() + 1)
        zombie:Kill(weapon, player)
    end
    return true
end

function Combat.ignite(zombie, player, weapon, spec)
    if Config.effectsEnabled == false or not spec.burnSeconds or spec.burnSeconds <= 0 or zombie:isDead()
        or zombie:isInvulnerable() then return end
    for _, burn in ipairs(Combat.burns) do
        if burn.zombie == zombie then
            -- Refresh instead of stacking infinite burn DPS.
            burn.left = math.max(burn.left, spec.burnSeconds)
            burn.damage = math.max(burn.damage, spec.burnDamage)
            burn.player, burn.weapon = player, weapon
            return
        end
    end
    if #Combat.burns >= Config.maxBurning then return end
    table.insert(Combat.burns, {
        zombie = zombie, player = player, weapon = weapon,
        left = spec.burnSeconds, tick = 0, visual = 0, damage = spec.burnDamage,
    })
end

function Combat.attack(player, weapon, spec, charge)
    -- Native-pellet passives have no Lua area attack endpoint.
    if Config.effectsEnabled == false or spec.onHitStun then return 0 end
    if isClient() then PRZArmory.Network.weaponRequest(player,weapon,"Attack");return 0 end
    if not player:getSquare() then return 0 end
    charge = charge or 1
    local radius = spec.axe and (spec.minRange + (spec.range - spec.minRange)*charge) or spec.range
    local facing = player:getForwardDirection()
    local dx, dy = facing:getX(), facing:getY()
    local x, y, z = player:getX(), player:getY(), player:getZ()
    local angle = spec.axe and math.pi or spec.halfAngle
    local zombies, candidates = getCell():getZombieList(), {}
    local cx, cy = x, y
    -- The cannon is a forward, penetrating plume. Never retarget its centre
    -- to the nearest enemy or turn the hit into a circular grenade blast.
    -- Snapshot first: Hit() may change the underlying Java zombie list.
    for i = 0, zombies:size() - 1 do
        local zombie = zombies:get(i)
        if zombie and not zombie:isDead() and not zombie:isInvulnerable() and zombie:getSquare()
            and Core.inShape(cx,cy,z,zombie:getX(),zombie:getY(),zombie:getZ(),dx,dy,radius,angle)
            and Combat.clearLine(player, zombie) and lineFrom(cx,cy,z,zombie) then
            local zx, zy = zombie:getX()-cx, zombie:getY()-cy
            table.insert(candidates, {zombie = zombie, distance = zx*zx + zy*zy})
        end
    end
    table.sort(candidates, function(a,b) return a.distance < b.distance end)
    local hits = math.min(#candidates, Config.maxTargets)
    local axeHits = 0
    for i = 1, hits do
        local zombie = candidates[i].zombie
        -- Any native hit may replace an existing recoil/locomotion state.
        local stun = Combat.stunByZombie[zombie]
        if stun then releaseMovement(stun) end
        local damage = spec.damage * (spec.axe and (0.45 + 0.55*charge) or 1)
        if spec.axe and candidates[i].distance < (radius * spec.outerEdge)^2 then
            damage = damage * spec.innerDamageMultiplier
        end
        if spec.kind == "cannon" then
            -- Native carrier damage is zero. Apply the cone exactly once per
            -- visible target, independent of pellet count and melee scaling.
            hit(zombie, player, weapon, 0)
            local direction=zombie:getHitDir()
            direction:set(zombie:getX()-x,zombie:getY()-y)
            direction:normalize()
            zombie:setHitForce(1.25)
            directDamage(zombie, player, weapon, damage)
        elseif spec.axe then
            if directDamage(zombie, player, weapon, damage) then axeHits = axeHits + 1 end
        else hit(zombie, player, weapon, damage) end
        Combat.ignite(zombie, player, weapon, spec)
    end
    if spec.specialSound then pcall(function() player:playSound(spec.specialSound) end) end
    if spec.axe and axeHits > 0 and PRZArmory.AxeAudio then PRZArmory.AxeAudio.hit(player) end
    if spec.kind == "cannon" and PRZArmory.CannonEffects then
        PRZArmory.CannonEffects.emit(player,weapon,{x=x+dx*.55,y=y+dy*.55,z=z+.35,
            dx=dx,dy=dy,range=radius,halfAngle=angle})
    elseif PRZArmory.Effects then
        PRZArmory.Effects.emit(spec.kind,cx,cy,z,dx,dy,radius,angle,charge,spec.outerEdge)
    end
    return hits
end

function Combat.update(dt)
    if Config.effectsEnabled == false then Combat.clear(); return end
    if dt <= 0 then return end
    for i = #Combat.stuns, 1, -1 do
        local stun = Combat.stuns[i]
        local zombie = stun.zombie
        stun.left, stun.grace = stun.left-dt, stun.grace-dt
        if zombie:isDead() or not zombie:getSquare() or stun.player:isDead() or stun.left <= 0.000001 then
            releaseStun(stun)
            Combat.stunByZombie[zombie] = nil
            table.remove(Combat.stuns,i)
        else
            holdStill(stun)
        end
    end
    for i = #Combat.burns, 1, -1 do
        local burn = Combat.burns[i]
        local zombie = burn.zombie
        if zombie:isDead() or not zombie:getSquare() or burn.player:isDead() or burn.left <= 0 then
            table.remove(Combat.burns, i)
        else
            local step = math.min(dt, burn.left)
            -- Avoid a tiny positive remainder keeping an expired burn alive for
            -- another frame after repeated decimal-sized update intervals.
            if burn.left - step < 0.000001 then step = burn.left end
            burn.left = burn.left - step
            burn.tick, burn.visual = burn.tick + step, burn.visual + step
            if burn.visual >= 0.4 then
                burn.visual = 0
                if PRZArmory.Effects then PRZArmory.Effects.burn(zombie) end
            end
            if burn.tick >= Config.burnInterval or burn.left <= 0 then
                directDamage(zombie, burn.player, burn.weapon, burn.damage * burn.tick)
                burn.tick = 0
            end
            if burn.left <= 0 or zombie:isDead() then
                table.remove(Combat.burns, i)
            end
        end
    end
end

Events.OnZombieUpdate.Add(Combat.enforceStun)
Events.OnHitZombie.Add(Combat.onHitZombie)

return Combat
