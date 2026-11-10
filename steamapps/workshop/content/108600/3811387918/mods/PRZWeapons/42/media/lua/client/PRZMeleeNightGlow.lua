PRZMeleeNightGlow = PRZMeleeNightGlow or {}

PRZMeleeNightGlow.State = PRZMeleeNightGlow.State or {
    itemSprites = {},
    remoteHandRefs = {},
    lastGlobalNightState = nil,
    lastBoundaryCheckMs = 0,
    lastRemoteScanMs = 0,
    hasTrackedClientWeapon = false,
    tickRegistered = false,
}

local onTick

local function getConfig()
    return PRZMeleeGlowConfig or {}
end

local function ensureState()
    local state = PRZMeleeNightGlow.State
    if not state then
        state = {}
        PRZMeleeNightGlow.State = state
    end

    if type(state.itemSprites) ~= "table" then
        state.itemSprites = {}
    end
    if type(state.remoteHandRefs) ~= "table" then
        state.remoteHandRefs = {}
    end
    if type(state.lastBoundaryCheckMs) ~= "number" then
        state.lastBoundaryCheckMs = 0
    end
    if type(state.lastRemoteScanMs) ~= "number" then
        state.lastRemoteScanMs = 0
    end
    if type(state.hasTrackedClientWeapon) ~= "boolean" then
        state.hasTrackedClientWeapon = false
    end
    if type(state.tickRegistered) ~= "boolean" then
        state.tickRegistered = false
    end

    return state
end

local function getTimeConfig()
    return getConfig().Time or {}
end

local function getWeapons()
    return getConfig().Weapons or {}
end

local function setTickEnabled(enabled)
    local state = ensureState()
    if state.tickRegistered == enabled then
        return
    end

    if enabled then
        Events.OnTick.Add(onTick)
    else
        Events.OnTick.Remove(onTick)
    end

    state.tickRegistered = enabled
end

local function refreshTickRegistration()
    local state = ensureState()
    setTickEnabled(isClient() or state.hasTrackedClientWeapon)
end

local function isNightWindow()
    -- Treat the disabled setting as daytime so boundary refresh restores models.
    local effectsEnabled = getConfig().isEffectsEnabled
    if effectsEnabled and not effectsEnabled() then
        return false
    end

    local gameTime = getGameTime()
    if not gameTime then
        return false
    end

    local cfg = getTimeConfig()
    local startHour = cfg.startHour or 20
    local endHour = cfg.endHour or 8
    local hour = gameTime:getTimeOfDay()
    return hour >= startHour or hour < endHour
end

local function getWeaponConfig(item)
    if not item then
        return nil
    end

    return getWeapons()[item:getFullType()]
end

function PRZMeleeNightGlow.isWeaponSelfLuminous(item)
    local weaponConfig = getWeaponConfig(item)
    if not weaponConfig or not isNightWindow() then
        return false
    end

    local ok, spriteName = pcall(function()
        return item:getWeaponSprite()
    end)

    return ok and spriteName == weaponConfig.nightSprite
end

local function markTrackedItem(activeItemIDs, item)
    if not item then
        return false
    end

    if not getWeaponConfig(item) then
        return false
    end

    activeItemIDs[item:getID()] = true
    return true
end

local function getPlayerKey(player)
    if not player then
        return "unknown"
    end

    if isMultiplayer() then
        local username = player:getUsername()
        if username and username ~= "" then
            return username
        end
    end

    return tostring(player:getPlayerNum())
end

local function ensureSprite(item, spriteName, forceApply)
    if not item or not spriteName then
        return false
    end

    local state = ensureState()
    local itemID = item:getID()
    local appliedSprite = state.itemSprites[itemID]

    -- A saved-item migration or another equip listener may replace the sprite
    -- after our first update. The cache must not conceal the actual day model.
    if not forceApply and appliedSprite == spriteName and item:getWeaponSprite() == spriteName then
        return false
    end

    item:setWeaponSprite(spriteName)
    state.itemSprites[itemID] = spriteName
    return true
end

local function pruneItemSpriteCache(activeItemIDs)
    local state = ensureState()

    for itemID in pairs(state.itemSprites) do
        if not activeItemIDs[itemID] then
            state.itemSprites[itemID] = nil
        end
    end
end

local function updateHands(player, forceApply, allowRemote)
    if not player then
        return false
    end

    if not player:isLocal() and not allowRemote then
        return false
    end

    local isNight = isNightWindow()
    local changed = false
    local seen = {}
    local hands = {
        player:getPrimaryHandItem(),
        player:getSecondaryHandItem(),
    }

    for _, item in ipairs(hands) do
        if item and not seen[item] then
            seen[item] = true

            local weaponConfig = getWeaponConfig(item)
            if weaponConfig then
                local spriteName = isNight and weaponConfig.nightSprite or weaponConfig.daySprite
                if ensureSprite(item, spriteName, forceApply) then
                    changed = true
                end
            end
        end
    end

    if changed then
        player:resetEquippedHandsModels()
    end

    return changed
end

local function isRemoteClientPlayer(player)
    return player and (not player:isLocal()) and isClient() and player:isAlive()
end

local function refreshLocalPlayers(forceApply, activeItemIDs)
    local hasTracked = false

    for i = 0, getNumActivePlayers() - 1 do
        local player = getSpecificPlayer(i)
        if player and player:isLocal() then
            local primary = player:getPrimaryHandItem()
            local secondary = player:getSecondaryHandItem()
            local holdsTracked = markTrackedItem(activeItemIDs, primary) or markTrackedItem(activeItemIDs, secondary)
            if holdsTracked then
                hasTracked = true
                updateHands(player, forceApply, false)
            elseif forceApply then
                updateHands(player, true, false)
            end
        end
    end

    return hasTracked
end

local function refreshRemotePlayers(forceApply, activeItemIDs)
    local hasTracked = false
    local state = ensureState()
    local seenPlayers = {}

    if not isClient() or not getOnlinePlayers then
        state.remoteHandRefs = {}
        return false
    end

    local onlinePlayers = getOnlinePlayers()
    if not onlinePlayers then
        state.remoteHandRefs = {}
        return false
    end

    for i = 0, onlinePlayers:size() - 1 do
        local player = onlinePlayers:get(i)
        if isRemoteClientPlayer(player) then
            local playerKey = getPlayerKey(player)
            local primary = player:getPrimaryHandItem()
            local secondary = player:getSecondaryHandItem()
            local holdsTracked = markTrackedItem(activeItemIDs, primary) or markTrackedItem(activeItemIDs, secondary)
            local cached = state.remoteHandRefs[playerKey]
            local remoteChanged = forceApply
                or not cached
                or cached.player ~= player
                or cached.primary ~= primary
                or cached.secondary ~= secondary

            seenPlayers[playerKey] = true
            state.remoteHandRefs[playerKey] = {
                player = player,
                primary = primary,
                secondary = secondary,
            }

            if holdsTracked then
                hasTracked = true
                updateHands(player, remoteChanged, true)
            end
        end
    end

    for playerKey in pairs(state.remoteHandRefs) do
        if not seenPlayers[playerKey] then
            state.remoteHandRefs[playerKey] = nil
        end
    end

    return hasTracked
end

local function refreshTrackedPresence(forceApply)
    local state = ensureState()
    local activeItemIDs = {}
    local localTracked = refreshLocalPlayers(forceApply, activeItemIDs)
    local remoteTracked = refreshRemotePlayers(forceApply, activeItemIDs)
    pruneItemSpriteCache(activeItemIDs)
    state.hasTrackedClientWeapon = localTracked or remoteTracked
    refreshTickRegistration()
    return state.hasTrackedClientWeapon
end

local function handleBoundaryTick(now)
    local state = ensureState()
    local cfg = getTimeConfig()
    local boundaryIntervalMs = cfg.boundaryCheckIntervalMs or 100

    if now - state.lastBoundaryCheckMs < boundaryIntervalMs then
        return
    end

    state.lastBoundaryCheckMs = now

    if not state.hasTrackedClientWeapon then
        return
    end

    local isNight = isNightWindow()
    local lastNightState = state.lastGlobalNightState
    local forceApply = lastNightState == nil or lastNightState ~= isNight

    if forceApply then
        refreshTrackedPresence(true)
    end

    state.lastGlobalNightState = isNight
end

onTick = function()
    local state = ensureState()
    local cfg = getTimeConfig()
    local now = getTimestampMs()

    if isClient() then
        local remoteScanIntervalMs = cfg.remoteScanIntervalMs or 1000
        if now - state.lastRemoteScanMs >= remoteScanIntervalMs then
            state.lastRemoteScanMs = now
            refreshTrackedPresence(false)
        end
    end

    if not state.hasTrackedClientWeapon then
        return
    end

    handleBoundaryTick(now)
end

local function onMinuteTick()
    if refreshTrackedPresence(false) then
        ensureState().lastGlobalNightState = isNightWindow()
    end
end

local function onEquipChanged(player, item)
    if not player or not player:isLocal() then
        return
    end

    local primary = player:getPrimaryHandItem()
    local secondary = player:getSecondaryHandItem()
    if getWeaponConfig(item) or getWeaponConfig(primary) or getWeaponConfig(secondary) then
        updateHands(player, true, false)
    end

    refreshTrackedPresence(false)
end

Events.OnGameStart.Add(function()
    ensureState().lastGlobalNightState = isNightWindow()
    refreshTrackedPresence(true)
end)

Events.OnCreatePlayer.Add(function(playerIndex, player)
    if player then
        updateHands(player, true, false)
    end

    refreshTrackedPresence(false)
end)

Events.OnEquipPrimary.Add(onEquipChanged)
Events.OnEquipSecondary.Add(onEquipChanged)
Events.EveryOneMinute.Add(onMinuteTick)
