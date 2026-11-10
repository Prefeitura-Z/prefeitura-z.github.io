require "PRZArmory/Network"
require "PRZArmory/Config"
require "PRZArmory/Core"
require "PRZArmory/Combat"
require "PRZArmory/SweepAction"
require "PRZArmory/CannonAmmo"
require "PRZArmory/Expansion"
require "PRZArmory/Arsenal"
require "PRZArmory/WeaponControls"
require "PRZArmory/NewWeapons"
require "PRZArmory/GunMechanics"
require "PRZArmory/SourcePose"
require "PRZArmory/Rage"
require "TimedActions/ISTimedActionQueue"

local C = {state = {}, now = 0, lastMs = nil}
PRZArmory.Controller = C
local Config, Core = PRZArmory.Config, PRZArmory.Core

local function singlePlayer()
    return not isServer()
end

local function held(player)
    if not player then return nil end
    local weapon = player:getPrimaryHandItem()
    if not weapon then return nil end
    local spec = Config.weapons[weapon:getFullType()]
    if not spec then return nil end
    return weapon, spec
end

local function data(weapon, spec)
    local md = weapon:getModData()
    if type(md.PRZArmoryArmory) ~= "table" then md.PRZArmoryArmory = {} end
    local d = md.PRZArmoryArmory
    local needed = math.max(1, Core.count(spec.shotsPerUse))
    if d.schema ~= 2 then
        -- Migrate the former 0..100 meter once. Full energy becomes one stored use.
        local old = Core.energy(d.energy, 0, 100)
        d.storedUses = Core.count(d.storedUses) + math.floor(old / 100)
        d.progressShots = math.floor((old % 100) * needed / 100 + 0.000001)
        d.specialMode, d.schema, d.energy = false, 2, nil
    end
    local progress = Core.count(d.progressShots)
    d.storedUses = Core.count(Core.count(d.storedUses) + math.floor(progress / needed))
    d.progressShots = progress % needed
    d.specialMode = d.specialMode == true
    return d
end

local function nonWeaponAction(player)
    return player:isDoShove() or player:isPerformingShoveAnimation()
        or player:isPerformingStompAnimation() or player:isDoGrapple()
        or player:isPerformingGrappleGrabAnimation() or player:isPerformingGrappleAnimation()
end

local function canUse(player)
    return Config.effectsEnabled ~= false and player and not player:isDead() and not player:isAsleep()
        and not player:getVehicle() and not player:isSitOnGround()
        and not isGamePaused() and not nonWeaponAction(player)
        and player:isAuthorizedHandToHandAction()
        and not ISTimedActionQueue.isPlayerDoingAction(player)
end

local function canAct(player)
    return canUse(player) and player:isAiming()
end

local function keyCode()
    return Keyboard["KEY_" .. Config.specialKey] or Keyboard.KEY_G
end

local function cancelCharge()
    C.state.charging, C.state.charge = false, 0
end

function C.reset()
    PRZArmory.SweepAction.cancel()
    C.state = {cooldown = 0, charge = 0, down = false, armed = false}
    C.now, C.lastMs = 0, getTimestampMs()
    PRZArmory.Combat.clear()
end

function C.start(player, weapon, spec)
    local s = C.state
    if not canAct(player) or weapon:getCondition() <= 0 or s.cooldown > 0
        or player:isAttacking() then return end
    if not spec.axe or not PRZArmory.Rage.ready(player)
        or player:getStats():get(CharacterStat.ENDURANCE) < spec.enduranceCost then return end
    if not PRZArmory.SweepAction.begin(player, weapon, spec, 1) then return end
    PRZArmory.Rage.consume(player)
    if not isClient() then
        local stats = player:getStats()
        stats:set(CharacterStat.ENDURANCE, math.max(0,stats:get(CharacterStat.ENDURANCE)-spec.enduranceCost))
    end
    s.cooldown = spec.cooldown
end

function C.toggleMode(player, weapon, spec)
    if spec.expansion or spec.axe or spec.passive or not canUse(player) or weapon:getCondition() <= 0
        or player:isAttacking() then return end
    local d = data(weapon, spec)
    d.specialMode = not d.specialMode
end

local function gunShot(player, weapon, spec)
    if isClient() then
        local d=not spec.passive and data(weapon,spec) or {}
        PRZArmory.Network.weaponRequest(player,weapon,"WeaponShot",{special=d.specialMode==true,
            prepareID=spec.kind=="cannon" and PRZArmory.CannonAmmo.getPrepareID(player,weapon) or nil})
        if spec.kind=="cannon" or spec.kind=="flame" and d.specialMode then
            PRZArmory.Combat.attack(player,weapon,spec,1)
        end
        return
    end
    if spec.passive then
        -- Holy Flame has ordinary native pellets. Only their actual hit event
        -- applies its passive; a discharge never scans or damages a cone.
        if spec.onHitStun then return end
        PRZArmory.Combat.attack(player, weapon, spec, 1)
        return
    end
    local d = data(weapon, spec)
    if d.specialMode and d.storedUses > 0 then
        d.storedUses = d.storedUses - 1
        PRZArmory.Combat.attack(player, weapon, spec, 1)
    else
        d.progressShots = d.progressShots + 1
        if d.progressShots >= spec.shotsPerUse then
            d.progressShots = d.progressShots - spec.shotsPerUse
            d.storedUses = Core.count(d.storedUses + 1)
        end
    end
end

function C.release(player, weapon, spec)
    -- Legacy release callbacks never trigger a second attack.
    cancelCharge()
end

function C.onSwing(player, weapon)
    if Config.effectsEnabled == false or not singlePlayer() or PRZArmory.Combat.active or not player
        or player ~= getSpecificPlayer(0) then return end
    local s = C.state
    local primary = player:getPrimaryHandItem()
    -- Reconcile callbacks with physical weapon swaps between controller ticks.
    if s.weapon ~= primary then
        cancelCharge()
        s.armed, s.weapon = false, primary
    end
    if player:isDead() or isGamePaused() or nonWeaponAction(player) then
        cancelCharge()
        return
    end
    if not weapon then cancelCharge(); return end
    local spec = Config.weapons[weapon:getFullType()]
    if not spec or weapon ~= primary or weapon:getCondition() <= 0 then
        cancelCharge()
        return
    end
    -- Expansion guns/throwables own their native shot and impact callbacks.
    -- They have no stored BALROG-11 charge counter or G mode.
    if spec.expansion then return end
    if spec.axe then
        cancelCharge()
        -- Ordinary melee damage stays native. Only G release emits a circular sweep.
    else
        if player:isRangedWeaponEmpty() then return end
        if spec.kind == "cannon" and not PRZArmory.CannonAmmo.consumeShot(player,weapon) then return end
        -- This event represents a real discharge; vanilla may already have removed
        -- the last shell. Never check remaining ammo or remove another shell here.
        gunShot(player, weapon, spec)
        -- A cosmetic overlay must not interrupt a paid shot's damage, plume
        -- or authoritative request if its rendering boundary ever fails.
        if spec.kind == "cannon" and PRZArmory.CannonReload then PRZArmory.CannonReload.fire(player,weapon) end
    end
end

function C.update()
    local nowMs = getTimestampMs()
    local dt = math.max(0, math.min(0.1,(nowMs-(C.lastMs or nowMs))/1000))
    C.lastMs = nowMs
    if PRZArmory.AxeAudio then PRZArmory.AxeAudio.update() end
    if not singlePlayer() then return end
    local player = getSpecificPlayer(0)
    PRZArmory.Rage.update(player)
    if not player or player:isDead() then
        cancelCharge()
        C.state.armed = false
        PRZArmory.Combat.clear()
        return
    end
    local s = C.state
    local down = isKeyDown(keyCode())
    if isGamePaused() then
        cancelCharge()
        s.down = down
        return
    end
    C.now = C.now + dt
    s.cooldown = math.max(0,(s.cooldown or 0)-dt)
    PRZArmory.Combat.update(dt)
    local weapon, spec = held(player)
    if s.weapon ~= weapon then
        cancelCharge()
        s.armed, s.weapon, s.down = false, weapon, down
        return
    end
    if not weapon or weapon:getCondition() <= 0 or not canUse(player) then
        cancelCharge()
        s.down = down
        return
    end
    if down and not s.down then
        if spec.axe then C.start(player,weapon,spec)
        else C.toggleMode(player,weapon,spec) end
    end
    s.down = down
end

function C.getHUD()
    if not singlePlayer() then return nil end
    local player = getSpecificPlayer(0)
    local rage = PRZArmory.Rage.update(player)
    if not player or player:isDead() then return nil end
    local weapon, spec = held(player)
    if not weapon then return nil end
    if spec.expansion then
        if spec.newpack and spec.kind ~= "minigun" and PRZArmory.NewWeapons then
            return PRZArmory.NewWeapons.getHUD(player, weapon, spec)
        end
        if PRZArmory.Expansion and PRZArmory.Expansion.getHUD then
            return PRZArmory.Expansion.getHUD(player, weapon, spec)
        end
        return nil
    end
    local s = C.state
    local d = not spec.axe and not spec.passive and data(weapon, spec) or {}
    rage = spec.axe and rage or nil
    return {
        name = weapon:getDisplayName(), itemType = weapon:getFullType(),
        ammo = not spec.axe and weapon:getCurrentAmmoCount() or nil,
        maxAmmo = spec.kind == "cannon" and 1 or weapon:getMaxAmmo(), charge = s.charge or 0,
        charging = s.charging or false, armed = s.armed or false,
        cooldown = s.cooldown or 0, axe = spec.axe or false, keyName = Config.specialKey,
        rage = rage and rage.kills or nil, rageNeeded = Config.axeRageKills or 25,
        mode = spec.axe and "axe" or (spec.kind == "flame" and "balrog" or spec.kind),
        passive = spec.passive or false, specialMode = d.specialMode or false,
        storedUses = d.storedUses or 0, progressShots = d.progressShots or 0,
        shotsPerUse = spec.shotsPerUse or 5,
        skillCooldown = spec.cooldown, stunSeconds = spec.stunSeconds, stunChance = spec.stunChance,
        reloadSeconds = Config.cannonReloadSeconds, shotSeconds = Config.holyShotSeconds,
    }
end

Events.OnGameStart.Add(C.reset)
Events.OnMainMenuEnter.Add(C.reset)
Events.OnTick.Add(C.update)
Events.OnWeaponSwingHitPoint.Add(C.onSwing)

return C
