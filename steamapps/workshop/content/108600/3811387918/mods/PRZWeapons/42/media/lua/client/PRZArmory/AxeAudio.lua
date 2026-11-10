require "PRZArmory/Config"

PRZArmory = PRZArmory or {}
local A = {}
PRZArmory.AxeAudio = A
local readyHandles = {}

local function localPlayer(player)
    return (PRZArmory.Config or {}).effectsEnabled ~= false and not isServer()
        and player and player == getSpecificPlayer(0) and not player:isDead()
end

function A.isEquipped(player)
    local ok, equipped = pcall(function()
        if not localPlayer(player) then return false end
        local weapon = player:getPrimaryHandItem()
        return weapon and weapon:getFullType() == "PRZWeapons.OmegaTyphoonAxe"
    end)
    return ok and equipped == true
end

local function playLocal(player, event, requireAxe)
    -- A failed clip cannot block the second ready clip or gameplay bookkeeping.
    local ok, played, handle = pcall(function()
        if not localPlayer(player) or (requireAxe and not A.isEquipped(player)) then return false end
        return true, player:playSoundLocal(event)
    end)
    return ok and played == true, handle
end

function A.stopReady(player)
    if not player then return end
    local handles = readyHandles[player]
    readyHandles[player] = nil
    for _,handle in ipairs(handles or {}) do
        -- The native player method accepts the exact playSoundLocal handle.
        -- Never stop an entire emitter or an unrelated cast/hit instance.
        pcall(function() player:stopOrTriggerSound(handle) end)
    end
end

function A.ready(player)
    if not A.isEquipped(player) then A.stopReady(player); return false end
    A.stopReady(player)
    -- Start both immediately on the same callback; neither waits for the other.
    local first, firstHandle = playLocal(player, "PRZArmory_AxeRageReady1", true)
    local second, secondHandle = playLocal(player, "PRZArmory_AxeRageReady2", true)
    local handles = {}
    for _,handle in ipairs({firstHandle or false, secondHandle or false}) do
        if type(handle) == "number" and handle ~= 0 and handle == handle then handles[#handles+1] = handle end
    end
    if #handles > 0 then readyHandles[player] = handles end
    return first or second
end

function A.hit(player)
    return playLocal(player, "PRZArmory_AxeSpecialHit")
end

function A.update()
    for player,handles in pairs(readyHandles) do
        if not A.isEquipped(player) then A.stopReady(player)
        else
            -- Discard finished handles so an old notification owns no later sound.
            for i=#handles,1,-1 do
                local ok, playing = pcall(function() return player:getEmitter():isPlaying(handles[i]) end)
                if ok and not playing then table.remove(handles,i) end
            end
            if #handles == 0 then readyHandles[player] = nil end
        end
    end
end

function A.clear()
    for player in pairs(readyHandles) do A.stopReady(player) end
end
if Events then
    if Events.OnMainMenuEnter then Events.OnMainMenuEnter.Add(A.clear) end
    if Events.OnGameStart then Events.OnGameStart.Add(A.clear) end
end
return A
