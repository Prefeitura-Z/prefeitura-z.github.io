PRZMeleeSwingFlash = PRZMeleeSwingFlash or {}

PRZMeleeSwingFlash.State = PRZMeleeSwingFlash.State or {
    activeFlashes = {},
    activeFlashCount = 0,
    lastFlashUpdateMs = 0,
    lastSwingMs = {},
    tickRegistered = false,
}

local onTick

local function getConfig()
    return PRZMeleeGlowConfig or {}
end

local function ensureState()
    local state = PRZMeleeSwingFlash.State
    if not state then
        state = {}
        PRZMeleeSwingFlash.State = state
    end

    if type(state.activeFlashes) ~= "table" then
        state.activeFlashes = {}
    end
    if type(state.lastSwingMs) ~= "table" then
        state.lastSwingMs = {}
    end
    if type(state.activeFlashCount) ~= "number" then
        state.activeFlashCount = 0
    end
    if type(state.lastFlashUpdateMs) ~= "number" then
        state.lastFlashUpdateMs = 0
    end
    if type(state.tickRegistered) ~= "boolean" then
        state.tickRegistered = false
    end

    return state
end

local function getTimeConfig()
    return getConfig().Time or {}
end

local function getFlashConfig()
    return getConfig().Flash or {}
end

local function getWeapons()
    return getConfig().Weapons or {}
end

local function getFlashThemes()
    return getConfig().FlashThemes or {}
end

local function isEffectsEnabled()
    local enabled = getConfig().isEffectsEnabled
    return not enabled or enabled()
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

local function isNightWindow()
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

local function removeLightList(lights)
    if not lights then
        return
    end

    local cell = getCell()
    if not cell then
        return
    end

    for _, light in ipairs(lights) do
        cell:removeLamppost(light)
    end
end

local function clearFlash(playerKey)
    local state = ensureState()
    local flash = state.activeFlashes[playerKey]
    if not flash then
        return
    end

    removeLightList(flash.lights)
    state.activeFlashes[playerKey] = nil
    if state.activeFlashCount > 0 then
        state.activeFlashCount = state.activeFlashCount - 1
    end
    if state.activeFlashCount <= 0 then
        state.activeFlashCount = 0
        setTickEnabled(false)
    end
end

local function addFlashLight(cell, x, y, z, r, g, b, radius)
    local light = IsoLightSource.new(x, y, z, r, g, b, radius)
    cell:addLamppost(light)
    return light
end

local function buildFlashLights(flash, progress)
    local cell = getCell()
    if not cell then
        return
    end

    removeLightList(flash.lights)
    flash.lights = {}

    local fade
    if progress < 0.35 then
        fade = 1.0
    elseif progress < 0.75 then
        fade = 1.0 - ((progress - 0.35) / 0.40) * 0.45
    else
        fade = 0.55 - ((progress - 0.75) / 0.25) * 0.55
    end

    if fade <= 0.01 then
        return
    end

    local forwardBoost = progress * 0.18
    local sideBoost = 1.0 + progress * 0.45
    local baseForward = 0.35

    for _, def in ipairs(flash.themeDefs) do
        local forward = baseForward + def.f + forwardBoost
        local side = def.s * sideBoost
        local x = flash.x + flash.fx * forward + flash.sx * side
        local y = flash.y + flash.fy * forward + flash.sy * side
        local light = addFlashLight(cell, x, y, flash.z, def.r * fade, def.g * fade, def.b * fade, def.radius)
        table.insert(flash.lights, light)
    end
end

local function updateActiveFlashes(now)
    local state = ensureState()
    local cfg = getFlashConfig()
    local updateIntervalMs = cfg.updateIntervalMs or 33
    local durationMs = cfg.durationMs or 180

    if now - state.lastFlashUpdateMs < updateIntervalMs then
        return
    end

    state.lastFlashUpdateMs = now

    for playerKey, flash in pairs(state.activeFlashes) do
        local progress = (now - flash.startMs) / durationMs

        if progress >= 1.0 then
            clearFlash(playerKey)
        else
            buildFlashLights(flash, progress)
        end
    end
end

local function startSwingFlash(player, weapon)
    if not player or not player:isLocal() or not isEffectsEnabled() or not isNightWindow() then
        return
    end

    local weaponConfig = getWeaponConfig(weapon)
    if not weaponConfig or not weaponConfig.flashTheme then
        return
    end

    local themeDefs = getFlashThemes()[weaponConfig.flashTheme]
    if not themeDefs then
        return
    end

    local state = ensureState()
    local cfg = getFlashConfig()
    local playerKey = getPlayerKey(player)
    local now = getTimestampMs()
    local cooldownMs = cfg.swingCooldownMs or 120
    local lastSwingMs = state.lastSwingMs[playerKey] or 0

    if now - lastSwingMs < cooldownMs then
        return
    end

    local dir = player:getForwardDirection()
    local fx = dir and dir:getX() or 0.0
    local fy = dir and dir:getY() or 0.0
    local len = math.sqrt(fx * fx + fy * fy)
    if len <= 0.0001 then
        return
    end

    fx = fx / len
    fy = fy / len

    clearFlash(playerKey)

    state.lastSwingMs[playerKey] = now
    state.activeFlashes[playerKey] = {
        x = player:getX(),
        y = player:getY(),
        z = player:getZ(),
        fx = fx,
        fy = fy,
        sx = -fy,
        sy = fx,
        startMs = now,
        lights = {},
        themeDefs = themeDefs,
    }
    state.activeFlashCount = state.activeFlashCount + 1
    setTickEnabled(true)

    buildFlashLights(state.activeFlashes[playerKey], 0.0)
end

onTick = function()
    local state = ensureState()
    if not isEffectsEnabled() then
        for playerKey in pairs(state.activeFlashes) do
            clearFlash(playerKey)
        end
        return
    end
    if state.activeFlashCount <= 0 then
        setTickEnabled(false)
        return
    end

    updateActiveFlashes(getTimestampMs())
end

local function onWeaponSwing(player, weapon)
    startSwingFlash(player, weapon)
end

local function onAttackHook(character, chargeDelta, weapon)
    startSwingFlash(character, weapon)
end

if Events.OnWeaponSwing then
    Events.OnWeaponSwing.Add(onWeaponSwing)
end

if Hook and Hook.Attack then
    Hook.Attack.Add(onAttackHook)
end
