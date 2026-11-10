require "PRZArmory/Network"
require "PRZArmory/Config"
require "PRZArmory/Core"
require "PRZArmory/AxeAudio"

PRZArmory = PRZArmory or {}
local R = {}
PRZArmory.Rage = R

local function equipped(player)
    if PRZArmory.Config.effectsEnabled == false or isServer()
        or player ~= getSpecificPlayer(0) or player:isDead() then return false end
    local weapon = player:getPrimaryHandItem()
    return weapon ~= nil and weapon:getFullType() == "PRZWeapons.OmegaTyphoonAxe"
end

-- Character-owned, capped at one use. Only kills while holding the axe count.
-- Every observation advances the baseline, including other weapons and HUD reads.
function R.update(player, syncOnly)
    if not PRZArmory.Network.isLocal(player) then return nil end
    local md = player:getModData()
    if isClient() then
        if not equipped(player) and PRZArmory.AxeAudio then PRZArmory.AxeAudio.stopReady(player) end
        return md.PRZArmoryTyphoonRage or {schema=1,kills=0,lastKills=player:getZombieKills()}
    end
    local kills = PRZArmory.Core.count(player:getZombieKills())
    local d = md.PRZArmoryTyphoonRage
    if type(d) ~= "table" then
        d = {schema=1, kills=0, lastKills=kills}
        md.PRZArmoryTyphoonRage = d
    end
    local needed = PRZArmory.Config.axeRageKills or 25
    local wasFull = PRZArmory.Core.count(d.kills) >= needed
    d.kills = math.min(needed, PRZArmory.Core.count(d.kills))
    local previous = PRZArmory.Core.count(d.lastKills)
    d.lastKills = kills
    if not equipped(player) then
        if PRZArmory.AxeAudio then PRZArmory.AxeAudio.stopReady(player) end
        return d
    end
    -- Equip events only establish a fresh baseline. Switching back can never
    -- import a previous weapon's kills from between controller updates.
    if syncOnly then return d end
    d.kills = math.min(needed, d.kills + math.max(0,kills-previous))
    -- A loaded full meter is already full before this update. Queries and HUD
    -- refreshes therefore cannot replay the transition sound.
    if not wasFull and d.kills >= needed and PRZArmory.AxeAudio then PRZArmory.AxeAudio.ready(player) end
    return d
end

function R.ready(player)
    local d = R.update(player)
    return d ~= nil and equipped(player) and d.kills >= (PRZArmory.Config.axeRageKills or 25)
end

function R.consume(player)
    if not R.ready(player) then return false end
    if isClient() then return true end
    player:getModData().PRZArmoryTyphoonRage.kills = 0
    return true
end

if Events then
    if Events.OnEquipPrimary then Events.OnEquipPrimary.Add(function(player)
        if not isServer() and player and player == getSpecificPlayer(0) then R.update(player, true) end
    end) end
    -- Observe credited kills before a subsequent hand swap can discard their
    -- pending delta. Non-player kills leave the native player's counter unchanged.
    if Events.OnZombieDead then Events.OnZombieDead.Add(function()
        if not isServer() then R.update(getSpecificPlayer(0)) end
    end) end
end
return R
