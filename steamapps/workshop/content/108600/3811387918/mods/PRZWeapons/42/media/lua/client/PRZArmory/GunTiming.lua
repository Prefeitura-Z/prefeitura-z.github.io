require "PRZArmory/Config"
require "PRZArmory/Network"
require "TimedActions/ISReloadWeaponAction"
require "PRZArmory/CannonReloadTiming"
require "PRZArmory/CannonReload"

local Timing = {holyLeft = 0}
PRZArmory.GunTiming = Timing
local Config = PRZArmory.Config

local function localPlayer(player)
    return PRZArmory.Network.isLocal(player) and not player:isDead()
end

local function holdRecoil(player)
    -- Native recoil decays by 0.625 * GameTime.multiplier per update.
    -- Use the engine conversion instead of assuming 60 FPS or a skill level.
    local delay = getGameTime():getMultiplierFromTimeDelta(Timing.holyLeft)*0.625
    player:setRecoilDelay(math.max(player:getRecoilDelay(),delay))
end

function Timing.onShot(player, weapon)
    if not localPlayer(player) or not weapon or isGamePaused()
        or (Config.weapons[weapon:getFullType()] or {}).nativeMechanics
        or weapon:getFullType() ~= "PRZWeapons.OmegaHolyFlame" or weapon:getCondition() <= 0
        or player:isRangedWeaponEmpty() or player:isDoShove()
        or player:isPerformingShoveAnimation() or player:isPerformingStompAnimation()
        or player:isDoGrapple() or player:isPerformingGrappleGrabAnimation()
        or player:isPerformingGrappleAnimation() then return end
    Timing.holyLeft = Config.holyShotSeconds
    holdRecoil(player)
end

function Timing.update()
    local now = getTimestampMs()
    local dt = math.max(0,math.min(0.1,(now-(Timing.lastMs or now))/1000))
    Timing.lastMs = now
    local player = getSpecificPlayer(0)
    if not localPlayer(player) then Timing.holyLeft = 0; return end
    if isGamePaused() then return end
    Timing.holyLeft = math.max(0,Timing.holyLeft-dt)
    local weapon = player:getPrimaryHandItem()
    if Timing.holyLeft > 0 and weapon and weapon:getFullType() == "PRZWeapons.OmegaHolyFlame" then
        holdRecoil(player)
    end
end

function Timing.reset()
    Timing.holyLeft = 0
    Timing.lastMs = getTimestampMs()
end

-- The current Caravan uses native cadence/recoil. Retain the legacy helper
-- for old fixtures/configurations without registering an idle frame callback.
if not (Config.weapons["PRZWeapons.OmegaHolyFlame"] or {}).nativeMechanics then
    Events.OnWeaponSwingHitPoint.Add(Timing.onShot)
    Events.OnTick.Add(Timing.update)
end
Events.OnGameStart.Add(Timing.reset)
Events.OnMainMenuEnter.Add(Timing.reset)

return Timing
