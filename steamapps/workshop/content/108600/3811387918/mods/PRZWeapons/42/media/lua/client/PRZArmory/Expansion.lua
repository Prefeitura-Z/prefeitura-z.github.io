require "PRZArmory/Config"
require "PRZArmory/Network"
require "PRZArmory/CannonAmmo"
require "TimedActions/ISReloadWeaponAction"
require "TimedActions/ISTimedActionQueue"

-- New firearms retain native targeting, projectiles, penetration and reloads.
-- This module owns only their accepted-shot proof, proc and warmup rules, and
-- the holy grenade's damage after the real physics object detonates.
local E = {pending = {}, burns = {}, spin = {}, committed = nil}
PRZArmory.Expansion = E
local Config, Reload = PRZArmory.Config, ISReloadWeaponAction
local nativeCanShoot, nativeOnShoot, nativeAttackHook = Reload.canShoot, Reload.onShoot, Reload.attackHook
local GUNS = {["PRZWeapons.OmegaBalrog7"] = true, ["PRZWeapons.OmegaMG3Gold"] = true}
local HOLY = "PRZWeapons.OmegaHolyWaterGrenade"
local exploded = setmetatable({}, {__mode = "k"})

local function singlePlayer()
    return not isClient() and not isServer()
end

local function localPlayer(player)
    return PRZArmory.Network.isLocal(player)
end

local function specFor(weapon)
    return weapon and Config.weapons[weapon:getFullType()]
end

local function scopedGun(player, weapon)
    return Config.effectsEnabled ~= false and localPlayer(player) and weapon
        and GUNS[weapon:getFullType()]
end

local function nonWeaponAction(player)
    return player:isDoShove() or player:isPerformingShoveAnimation()
        or player:isPerformingStompAnimation() or player:isDoGrapple()
        or player:isPerformingGrappleGrabAnimation() or player:isPerformingGrappleAnimation()
end

local function loaded(weapon)
    if weapon:haveChamber() then return weapon:isRoundChambered() end
    return weapon:getCurrentAmmoCount() >= 1
end

local function available(player, weapon)
    return not player:isDead() and not player:isAsleep() and not player:getVehicle()
        and not player:isSitOnGround() and not isGamePaused() and not nonWeaponAction(player)
        and player:getPrimaryHandItem() == weapon and weapon:getCondition() > 0
        and not weapon:isJammed() and loaded(weapon)
        and not (weapon:isSelectFire() and weapon:getFireMode() == "Safe")
end

function Reload.canShoot(player, weapon)
    if scopedGun(player, weapon) then
        if not available(player, weapon) then return false end
        weapon:setAmmoPerShoot(1)

    end
    return nativeCanShoot(player, weapon)
end

function E.attackHook(player, chargeDelta, weapon)
    if isClient() and localPlayer(player) and specFor(weapon) then PRZArmory.Network.weaponRequest(player,weapon,"WeaponPrepare") end
    return nativeAttackHook(player, chargeDelta, weapon)
end

function E.onShoot(player, weapon)
    if not scopedGun(player, weapon) then return nativeOnShoot(player, weapon) end
    E.ticket = nil
    if not available(player, weapon) or player:isRangedWeaponEmpty() then return end
    local before = weapon:getCurrentAmmoCount()
    local chambered = weapon:haveChamber() and weapon:isRoundChambered()
    weapon:setAmmoPerShoot(1)
    nativeOnShoot(player, weapon)
    -- Multiplayer's native shot callback leaves magazine debit to the server.
    -- Never interpret that unchanged client count as unlimited ammunition.
    if isClient() then return end
    local after = weapon:getCurrentAmmoCount()
    local finalChamber = chambered and not weapon:isRoundChambered() and after == before
    if after == before and not finalChamber then
        -- Native debug unlimited-ammo bypass is scoped out for these weapons.
        if before >= 1 then weapon:setCurrentAmmoCount(before - 1)
        elseif chambered then
            weapon:setRoundChambered(false)
            weapon:setSpentRoundChambered(false)
        end
        syncHandWeaponFields(player, weapon)
        after = weapon:getCurrentAmmoCount()
        finalChamber = chambered and not weapon:isRoundChambered() and after == before
    end
    if (after == before - 1 or finalChamber) and weapon:getFullType() == "PRZWeapons.OmegaBalrog7" then
        local spec = specFor(weapon)
        E.ticket = {player = player, weapon = weapon,
            proc = ZombRand(100) < (spec.procChance or 20), spec = spec}
    end
end

local function queueBlast(player, weapon, spec, x, y, z, kind)
    if #E.pending >= 32 then table.remove(E.pending, 1) end
    E.pending[#E.pending + 1] = {
        player = player, weapon = weapon, spec = spec, x = x, y = y, z = z, kind = kind,
    }
end

function E.onHitZombie(zombie, player, bodyPart, weapon)
    local t = E.ticket
    if Config.effectsEnabled == false or not t or t.player ~= player or t.weapon ~= weapon or not localPlayer(player)
        or player:isDead() or isGamePaused() or nonWeaponAction(player)
        or (PRZArmory.Combat and PRZArmory.Combat.active) or not zombie or zombie:isDead()
        or zombie:isInvulnerable() or not zombie:getSquare() then return end
    -- Consume on the first actual native impact, even for a failed proc. Native
    -- penetrating bullets cannot roll again on each subsequent zombie.
    E.ticket = nil
    if t.proc then
        -- OnHitZombie precedes native damage/reaction. Defer the area hit until
        -- that native call completes; never kill the target inside its Hit().
        queueBlast(player, weapon, t.spec, zombie:getX(), zombie:getY(), zombie:getZ(), "balrog7blast")
    end
end

function E.onThrowableExplode(trap, square)
    if Config.effectsEnabled == false or not singlePlayer() or isGamePaused() or not trap or not square or exploded[trap] then return end
    local weapon, player = trap:getHandWeapon(), trap:getAttacker()
    if not weapon or weapon:getFullType() ~= HOLY or not localPlayer(player) or player:isDead() then return end
    local spec = specFor(weapon)
    if not spec then return end
    exploded[trap] = true
    queueBlast(player, weapon, spec, square:getX() + 0.5, square:getY() + 0.5, square:getZ(), "holyblast")
end

local function damage(zombie, player, weapon, amount)
    if amount <= 0 or zombie:isDead() or zombie:isInvulnerable() or not zombie:getSquare() or player:isDead() then return end
    zombie:setAttackedBy(player)
    zombie:applyDamage(amount)
    if zombie:getHealth() <= 0 and not zombie:isOnKillDone() then
        player:setZombieKills(player:getZombieKills() + 1)
        zombie:Kill(weapon, player)
    end
end

local function ignite(zombie, player, weapon, spec)
    if zombie:isDead() or zombie:isInvulnerable() or not spec.burnSeconds or spec.burnSeconds <= 0 then return end
    for _, b in ipairs(E.burns) do
        if b.zombie == zombie then
            b.left, b.damage = math.max(b.left, spec.burnSeconds), math.max(b.damage, spec.burnDamage)
            b.player, b.weapon = player, weapon
            return
        end
    end
    if #E.burns >= (Config.maxBurning or 96) then return end
    E.burns[#E.burns + 1] = {zombie = zombie, player = player, weapon = weapon,
        left = spec.burnSeconds, damage = spec.burnDamage, tick = 0, visual = 1}
end

local function detonate(e)
    if e.player:isDead() or not getCell() then return end
    local radius = e.spec.blastRadius or 1.8
    local list, candidates = getCell():getZombieList(), {}
    for i = 0, list:size() - 1 do
        local zombie = list:get(i)
        if zombie and not zombie:isDead() and not zombie:isInvulnerable() and zombie:getSquare()
            and math.floor(zombie:getZ()) == math.floor(e.z) then
            local dx, dy = zombie:getX() - e.x, zombie:getY() - e.y
            local distance = dx * dx + dy * dy
            if distance <= radius * radius and not LosUtil.lineClearCollide(
                math.floor(e.x), math.floor(e.y), math.floor(e.z), math.floor(zombie:getX()),
                math.floor(zombie:getY()), math.floor(zombie:getZ()), false) then
                candidates[#candidates + 1] = {zombie = zombie, distance = distance}
            end
        end
    end
    table.sort(candidates, function(a, b) return a.distance < b.distance end)
    for i = 1, math.min(#candidates, Config.maxTargets or 64) do
        local zombie = candidates[i].zombie
        damage(zombie, e.player, e.weapon, e.spec.blastDamage or 0.45)
        if e.kind == "holyblast" then ignite(zombie, e.player, e.weapon, e.spec) end
    end
    if PRZArmory.Effects then PRZArmory.Effects.emit(e.kind, e.x, e.y, e.z, 1, 0, radius, math.pi, 1) end
end

function E.update()
    local now = getTimestampMs()
    local dt = math.max(0, math.min(0.1, (now - (E.lastMs or now)) / 1000))
    E.lastMs, E.ticket = now, nil
    local player = getSpecificPlayer(0)
    if Config.effectsEnabled == false or not localPlayer(player) or player:isDead() then E.reset(); return end
    if isGamePaused() then return end
    local pending = E.pending
    E.pending = {}
    for _, entry in ipairs(pending) do detonate(entry) end
    for i = #E.burns, 1, -1 do
        local b, step = E.burns[i], dt
        if b.zombie:isDead() or b.zombie:isInvulnerable() or not b.zombie:getSquare() or b.player:isDead() then
            table.remove(E.burns, i)
        else
            step = math.min(step, b.left)
            if b.left - step < 0.000001 then step = b.left end
            b.left, b.tick, b.visual = b.left - step, b.tick + step, b.visual + step
            if b.visual >= 0.4 then
                b.visual = 0
                if PRZArmory.Effects and PRZArmory.Effects.holyBurn then PRZArmory.Effects.holyBurn(b.zombie) end
            end
            if b.tick >= (Config.burnInterval or 0.25) or b.left <= 0 then
                damage(b.zombie, b.player, b.weapon, b.damage * b.tick)
                b.tick = 0
            end
            if b.left <= 0 or b.zombie:isDead() then table.remove(E.burns, i) end
        end
    end
end

function E.getHUD(player, weapon, spec)
    local holy = weapon:getFullType() == HOLY
    local ammo = holy and player:getInventory():getCountTypeRecurse(HOLY)
        or (weapon:getCurrentAmmoCount() + (weapon:haveChamber() and weapon:isRoundChambered() and 1 or 0))
    return {
        name = weapon:getDisplayName(), itemType = weapon:getFullType(),
        ammo = ammo, maxAmmo = holy and math.max(1, ammo) or math.max(weapon:getMaxAmmo(), ammo),
        magazineMax = weapon:getMaxAmmo(), iconName = spec.iconName,
        procChance = spec.procChance, burnSeconds = spec.burnSeconds, warmupSeconds = spec.warmupSeconds,
        mode = spec.kind, passive = true, expansion = true,
        cooldown = 0, keyName = Config.specialKey, axe = false,
    }
end

function E.reset()
    E.pending, E.burns, E.ticket, E.committed = {}, {}, nil, nil
    E.lastMs = getTimestampMs()
    exploded = setmetatable({}, {__mode = "k"})

end

-- Lua events/Hook keep the original closure; update both registered callbacks
-- and Reload fields while keeping CannonAmmo's previous wrapper in the chain.
Hook.Attack.Remove(nativeAttackHook)
Reload.attackHook = E.attackHook
Hook.Attack.Add(E.attackHook)
Events.OnWeaponSwingHitPoint.Remove(nativeOnShoot)
Reload.onShoot = E.onShoot
Events.OnWeaponSwingHitPoint.Add(E.onShoot)
Events.OnHitZombie.Add(E.onHitZombie)
Events.OnThrowableExplode.Add(E.onThrowableExplode)
Events.OnTick.Add(E.update)
Events.OnGameStart.Add(E.reset)
Events.OnMainMenuEnter.Add(E.reset)

return E
