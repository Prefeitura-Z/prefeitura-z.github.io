if isServer() and not isClient() then
    return
end

require "ISUI/ISPanel"

PRZWeaponVFX = PRZWeaponVFX or {}
PRZWeaponVFX.Runtime = PRZWeaponVFX.Runtime or {}

local Config = PRZWeaponVFX.Config
if not Config then
    print("[PRZWeaponVFX] Missing shared config; client disabled")
    return
end

local normalize = Config.normalize
local getDirectionVector = Config.getDirectionVector
local getCurveSign = Config.getCurveSign
local getWeaponBinding = Config.getWeaponBinding
local getProfile = Config.getProfile
local getGlowBinding = Config.getGlowBinding

if not normalize or not getDirectionVector or not getCurveSign or not getWeaponBinding or not getProfile then
    print("[PRZWeaponVFX] Shared config incomplete; client disabled")
    return
end

local Runtime = PRZWeaponVFX.Runtime
Runtime.activeEffects = Runtime.activeEffects or {}
Runtime.activeCount = Runtime.activeCount or 0
Runtime.freeEffects = Runtime.freeEffects or {}
Runtime.freeCount = Runtime.freeCount or 0
Runtime.lastSwingMsByPlayer = Runtime.lastSwingMsByPlayer or {}
Runtime.pendingSwings = Runtime.pendingSwings or {}
Runtime.lastImpactMsByPlayer = Runtime.lastImpactMsByPlayer or {}
Runtime.lastUpdateMs = Runtime.lastUpdateMs or 0
Runtime.overlays = Runtime.overlays or {}
Runtime.overlaysReady = Runtime.overlaysReady or false
Runtime.overlaysVisible = Runtime.overlaysVisible or false
Runtime.poolWarmed = Runtime.poolWarmed or false
Runtime.mainSequences = Runtime.mainSequences or {}
Runtime.burstSequences = Runtime.burstSequences or {}
Runtime.activeLights = Runtime.activeLights or {}
Runtime.activeLightCount = Runtime.activeLightCount or 0

local Draw = PRZWeaponVFX.Draw or {}
PRZWeaponVFX.Draw = Draw

local Overlay = ISPanel:derive("PRZWeaponVFXOverlay")

local fallbackTexture = nil

local function clamp01(value)
    if value < 0.0 then
        return 0.0
    end
    if value > 1.0 then
        return 1.0
    end
    return value
end

local function easeOutCubic(value)
    local t = 1.0 - clamp01(value)
    return 1.0 - (t * t * t)
end

local function smoothstep(value)
    local t = clamp01(value)
    return t * t * (3.0 - 2.0 * t)
end

local function createSequence(sequenceConfig)
    local sequence = {
        frames = {},
        count = 0,
        width = sequenceConfig.width or 256,
        height = sequenceConfig.height or 256,
    }

    for _, path in ipairs(sequenceConfig.paths or {}) do
        local texture = getTexture(path) or fallbackTexture
        if texture then
            sequence.count = sequence.count + 1
            sequence.frames[sequence.count] = texture
        end
    end

    return sequence
end

local function getMainSequence(sequenceId)
    local sequence = Runtime.mainSequences[sequenceId]
    if sequence then
        return sequence
    end

    local sequenceConfig = Config.MainSequences[sequenceId]
    if not sequenceConfig then
        return nil
    end

    sequence = createSequence(sequenceConfig)
    Runtime.mainSequences[sequenceId] = sequence
    return sequence
end

local function getBurstSequence(sequenceId)
    local sequence = Runtime.burstSequences[sequenceId]
    if sequence then
        return sequence
    end

    local sequenceConfig = Config.BurstSequences[sequenceId]
    if not sequenceConfig then
        return nil
    end

    sequence = createSequence(sequenceConfig)
    Runtime.burstSequences[sequenceId] = sequence
    return sequence
end

-- So carrega a textura de fallback aqui (1 arquivo, leve). As sequencias de
-- animacao (189 PNGs em 18 pastas, ~17MB) NAO sao mais pre-carregadas todas
-- de uma vez em OnGameStart/OnCreatePlayer - isso causava um burst de ~189
-- getTexture() simultaneos logo no login, estourando a memoria disponivel
-- em clientes com menos RAM/VRAM livre (java.lang.OutOfMemoryError em
-- FileSystemImpl.updateAsyncTransactions, cliente fechava sem aviso).
-- getMainSequence()/getBurstSequence() (usadas em setupEffect(), no golpe
-- de verdade) ja carregam e cacheiam cada sequencia individualmente na
-- primeira vez que aquela arma especifica e usada - carregamento sob
-- demanda, so a sequencia realmente necessaria, nunca as 18 de uma vez.
local function loadTextures()
    if fallbackTexture then
        return true
    end

    fallbackTexture = getTexture(Config.TEXTURES.fallback or "media/white.png")
    if not fallbackTexture then
        return false
    end

    return true
end

local function worldToScreen(playerNum, x, y, z, screenLeft, screenTop)
    local sx = isoToScreenX(playerNum, x, y, z) - screenLeft
    local sy = isoToScreenY(playerNum, x, y, z) - screenTop
    return sx, sy
end

local function drawQuad(panel, texture, cx, cy, tangentX, tangentY, halfLength, halfWidth, r, g, b, a, flipX)
    local normalX = -tangentY
    local normalY = tangentX

    local tlx = cx - tangentX * halfLength - normalX * halfWidth
    local tly = cy - tangentY * halfLength - normalY * halfWidth
    local trx = cx + tangentX * halfLength - normalX * halfWidth
    local try = cy + tangentY * halfLength - normalY * halfWidth
    local brx = cx + tangentX * halfLength + normalX * halfWidth
    local bry = cy + tangentY * halfLength + normalY * halfWidth
    local blx = cx - tangentX * halfLength + normalX * halfWidth
    local bly = cy - tangentY * halfLength + normalY * halfWidth

    if flipX then
        -- Espelha somente o sprite dentro do mesmo quad; não inverte direção/posição do golpe.
        panel:drawTextureAllPoint(texture, trx, try, tlx, tly, blx, bly, brx, bry, r, g, b, a)
    else
        panel:drawTextureAllPoint(texture, tlx, tly, trx, try, brx, bry, blx, bly, r, g, b, a)
    end
end

local function drawSequenceFrame(panel, texture, cx, cy, angle, widthPixels, heightPixels, color, alpha, flipX)
    if not texture or alpha <= 0.001 or widthPixels <= 1.0 or heightPixels <= 1.0 then
        return
    end

    local tangentX = math.cos(angle)
    local tangentY = math.sin(angle)
    drawQuad(panel, texture, cx, cy, tangentX, tangentY, widthPixels * 0.5, heightPixels * 0.5, color.r, color.g, color.b, alpha, flipX)
end

local function resolvePaletteColor(palette, frameIndex, fallback)
    if type(palette) ~= "table" then
        return fallback
    end

    local color = palette[frameIndex]
    if color then
        return color
    end

    local colorCount = #palette
    if colorCount > 0 then
        local loopedIndex = ((frameIndex - 1) % colorCount) + 1
        return palette[loopedIndex] or fallback
    end

    return fallback
end

local function resolveConfiguredValue(overrideValue, defaultValue)
    if overrideValue ~= nil then
        return overrideValue
    end
    return defaultValue
end

local function createEffect()
    return {}
end


local function effectsEnabled()
    return not PRZMeleeSandbox or PRZMeleeSandbox.isEnabled()
end

local function isNightGlowActive(glow)
    local gameTime = getGameTime and getGameTime() or nil
    if not gameTime then
        return true
    end
    if glow and glow.startHour then
        local hour=gameTime:getTimeOfDay()
        return hour>=glow.startHour or hour<(glow.endHour or 8)
    end
    local ok, night = pcall(function() return gameTime:getNight() end)
    if ok and night then
        return night >= 0.10
    end
    return true
end

local function safeAddLamppost(light)
    local cell = getCell and getCell() or nil
    if not cell or not light then
        return false
    end
    local added = false
    pcall(function()
        cell:addLamppost(light)
        added = true
    end)
    if added then return true end
    pcall(function()
        local list = cell:getLamppostPositions()
        if list then
            list:add(light)
            added = true
        end
    end)
    return added
end

local function safeRemoveLamppost(light)
    local cell = getCell and getCell() or nil
    if not cell or not light then
        return
    end
    pcall(function() cell:removeLamppost(light) end)
    pcall(function()
        local list = cell:getLamppostPositions()
        if list then list:remove(light) end
    end)
end

local function registerActiveLight(light, life)
    -- Bound lights independently from sprite effects, including crowded MP.
    if Runtime.activeLightCount >= 24 then
        safeRemoveLamppost(Runtime.activeLights[1].light)
        Runtime.activeLights[1]=Runtime.activeLights[Runtime.activeLightCount]
        Runtime.activeLights[Runtime.activeLightCount]=nil
        Runtime.activeLightCount=Runtime.activeLightCount-1
    end
    Runtime.activeLightCount = Runtime.activeLightCount + 1
    Runtime.activeLights[Runtime.activeLightCount] = { light = light, life = life or 0.18 }
end

local function spawnGlowLights(effect)
    if not getGlowBinding then
        return
    end
    local glow = getGlowBinding(effect.weaponFullType)
    if not glow or not isNightGlowActive(glow) then
        return
    end
    local z = math.floor(effect.z or 0)
    local baseX = effect.x or 0
    local baseY = effect.y or 0
    local count = glow.count or 3
    local spacing = glow.spacing or 0.18
    for i = 0, count - 1 do
        local forward = 0.22 + (i * spacing)
        local lx = math.floor(baseX + effect.dirX * forward + 0.5)
        local ly = math.floor(baseY + effect.dirY * forward + 0.5)
        local ok, light = pcall(function()
            return IsoLightSource.new(lx, ly, z, glow.r or 1.0, glow.g or 1.0, glow.b or 1.0, glow.radius or 3)
        end)
        if ok and light and safeAddLamppost(light) then
            registerActiveLight(light, glow.life or 0.18)
        end
    end
end

local function updateActiveLights(dt)
    local index = 1
    while index <= Runtime.activeLightCount do
        local entry = Runtime.activeLights[index]
        entry.life = (entry.life or 0.0) - dt
        if entry.life <= 0 then
            safeRemoveLamppost(entry.light)
            Runtime.activeLights[index] = Runtime.activeLights[Runtime.activeLightCount]
            Runtime.activeLights[Runtime.activeLightCount] = nil
            Runtime.activeLightCount = Runtime.activeLightCount - 1
        else
            index = index + 1
        end
    end
end


local function scoreEviction(effect)
    local score = 0.0
    local duration = effect.duration or 0.40
    local lifeRatio = clamp01((effect.life or duration) / duration)
    local alpha = effect.alpha or 0.0

    if effect.sourceMissing then
        score = score + 1000.0
    end
    if not effect.isOwned then
        score = score + 250.0
    end

    score = score + lifeRatio * 120.0
    score = score + (1.0 - alpha) * 80.0
    return score
end

local function pickEvictionIndex()
    local bestIndex = 1
    local bestScore = -1.0
    for index = 1, Runtime.activeCount do
        local score = scoreEviction(Runtime.activeEffects[index])
        if score > bestScore then
            bestScore = score
            bestIndex = index
        end
    end
    return bestIndex
end

local function recycleEffect(index)
    local effect = Runtime.activeEffects[index]
    Runtime.activeEffects[index] = Runtime.activeEffects[Runtime.activeCount]
    Runtime.activeEffects[Runtime.activeCount] = nil
    Runtime.activeCount = Runtime.activeCount - 1

    Runtime.freeCount = Runtime.freeCount + 1
    Runtime.freeEffects[Runtime.freeCount] = effect
end

local function acquireEffect()
    if Runtime.freeCount > 0 then
        local effect = Runtime.freeEffects[Runtime.freeCount]
        Runtime.freeEffects[Runtime.freeCount] = nil
        Runtime.freeCount = Runtime.freeCount - 1
        return effect
    end

    if Runtime.activeCount >= Config.MAX_EFFECTS then
        local evictionIndex = pickEvictionIndex()
        local effect = Runtime.activeEffects[evictionIndex]
        Runtime.activeEffects[evictionIndex] = Runtime.activeEffects[Runtime.activeCount]
        Runtime.activeEffects[Runtime.activeCount] = nil
        Runtime.activeCount = Runtime.activeCount - 1
        return effect
    end

    return createEffect()
end

local function warmPool()
    if Runtime.poolWarmed then
        return
    end

    for index = 1, Config.MAX_EFFECTS do
        Runtime.freeEffects[index] = createEffect()
    end

    Runtime.freeCount = Config.MAX_EFFECTS
    Runtime.poolWarmed = true
end

local function isGameReady()
    if getCore():isDedicated() then
        return false
    end

    local mainScreen = MainScreen and MainScreen.instance or nil
    if not mainScreen or not mainScreen.inGame then
        return false
    end

    if mainScreen.getIsVisible and mainScreen:getIsVisible() then
        return false
    end

    return getPlayer() ~= nil
end

local function ensureRuntimeReady()
    if not isGameReady() then
        return false
    end

    if not loadTextures() then
        return false
    end

    warmPool()

    if not Runtime.overlaysReady then
        Draw.rebuildOverlays()
    end

    return true
end

local function resolveSourcePlayer(effect)
    if effect.sourceRef then
        local ref = effect.sourceRef
        if effect.sourceOnlineID and effect.sourceOnlineID >= 0 then
            if ref:getOnlineID() == effect.sourceOnlineID then
                return ref
            end
        elseif effect.sourcePlayerNum and effect.sourcePlayerNum >= 0 then
            if ref:getPlayerNum() == effect.sourcePlayerNum then
                return ref
            end
        end
        effect.sourceRef = nil
    end

    if effect.sourcePlayerNum and effect.sourcePlayerNum >= 0 then
        local localPlayer = getSpecificPlayer(effect.sourcePlayerNum)
        if localPlayer then
            if not effect.sourceOnlineID or effect.sourceOnlineID < 0 then
                effect.sourceRef = localPlayer
                return localPlayer
            end
            if localPlayer:getOnlineID() == effect.sourceOnlineID then
                effect.sourceRef = localPlayer
                return localPlayer
            end
        end
    end

    if effect.sourceOnlineID and effect.sourceOnlineID >= 0 then
        local remotePlayer = getPlayerByOnlineID(effect.sourceOnlineID)
        if remotePlayer then
            effect.sourceRef = remotePlayer
            return remotePlayer
        end
    end

    return nil
end

local function refreshTrackedOrigin(effect, requireSource)
    local sourcePlayer = resolveSourcePlayer(effect)
    if sourcePlayer then
        effect.x = sourcePlayer:getX()
        effect.y = sourcePlayer:getY()
        effect.z = sourcePlayer:getZ()
        effect.sourceMissing = false
        return true
    end

    effect.sourceMissing = true
    if requireSource then
        return false
    end

    return effect.x ~= nil and effect.y ~= nil and effect.z ~= nil
end

local function resolveAimVector(player)
    local forward = player:getForwardDirection()
    if forward then
        local angle = forward:getDirection()
        if angle then
            return normalize(math.cos(angle), math.sin(angle))
        end
    end

    return getDirectionVector(player:getDir())
end

local function buildPacket(player, weapon)
    local dirX, dirY = resolveAimVector(player)
    -- Offline slot 0 is not online ID 0. Preserve the negative online ID so
    -- the effect can follow the real local actor during the swing.
    local playerId = player:getOnlineID() or -1

    return {
        sourceOnlineID = playerId,
        sourcePlayerNum = player:getPlayerNum(),
        weaponFullType = weapon:getFullType(),
        x = player:getX(),
        y = player:getY(),
        z = player:getZ(),
        dirX = dirX,
        dirY = dirY,
        curveSign = getCurveSign(player:getDir()),
        sourceRef = player,
    }
end

local function effectMatchesPacket(effect, packet)
    if effect.weaponFullType ~= packet.weaponFullType then
        return false
    end

    if effect.sourceOnlineID and effect.sourceOnlineID >= 0 and packet.sourceOnlineID and packet.sourceOnlineID >= 0 then
        return effect.sourceOnlineID == packet.sourceOnlineID
    end

    return effect.sourcePlayerNum == packet.sourcePlayerNum
end

local function findReusableEffect(packet)
    local mergeWindow = Config.MERGE_WINDOW or 0.0
    local overloadThreshold = Config.OVERLOAD_THRESHOLD or Config.MAX_EFFECTS

    for index = Runtime.activeCount, 1, -1 do
        local effect = Runtime.activeEffects[index]
        if effect and effectMatchesPacket(effect, packet) then
            if effect.life <= mergeWindow then
                return effect
            end
            if Runtime.activeCount >= overloadThreshold then
                return effect
            end
        end
    end

    return nil
end

local function updateEffect(effect)
    if effect.life <= effect.followDuration then
        if not refreshTrackedOrigin(effect, effect.requireSource) then
            effect.life = effect.duration
            effect.alpha = 0.0
            effect.mainGlowAlpha = 0.0
            effect.mainCoreAlpha = 0.0
            effect.burstAlpha = 0.0
            return
        end
    elseif effect.requireSource then
        if not resolveSourcePlayer(effect) then
            effect.life = math.max(effect.life, effect.duration - 0.03)
            effect.sourceMissing = true
        else
            effect.sourceMissing = false
        end
    end

    local lifeT = effect.life / effect.duration
    local appearT = effect.life / effect.appearDuration
    local appear = easeOutCubic(appearT)
    local fade = 1.0 - clamp01(lifeT)
    local alpha = appear * (fade ^ (effect.fadePower or 2))

    effect.appear = appear
    effect.fade = fade
    effect.alpha = alpha
    effect.mainScale = effect.scaleIn - (effect.scaleIn - effect.scaleOut) * smoothstep(lifeT)
    effect.mainStretch = 0.50 + effect.stretchIn * appear
    effect.mainGlowAlpha = alpha * effect.mainGlow.a
    effect.mainCoreAlpha = math.min(1.0, alpha * effect.mainCore.a * 1.04)

    local burstT = clamp01(effect.life / (effect.duration * effect.burstLifePortion))
    effect.burstAlpha = (1.0 - burstT) * appear * effect.burst.a
    effect.burstScale = 0.82 + 0.32 * appear
end

local function setupEffect(effect, packet, binding, profile)
    effect.life = 0.0
    effect.duration = binding.duration or profile.duration or Config.DURATION
    effect.appearDuration = binding.appearDuration or profile.appearDuration or Config.APPEAR_DURATION
    effect.fadePower = math.max(.5,math.min(3,binding.fadePower or profile.fadePower or 2))
    effect.sourceOnlineID = tonumber(packet.sourceOnlineID) or -1
    effect.sourcePlayerNum = tonumber(packet.sourcePlayerNum) or -1
    effect.sourceRef = packet.sourceRef or nil
    effect.weaponFullType = packet.weaponFullType
    effect.requireSource = (packet.x == nil or packet.y == nil or packet.z == nil)
    effect.sourceMissing = false
    effect.isOwned = effect.sourcePlayerNum and effect.sourcePlayerNum >= 0
    effect.dirX, effect.dirY = normalize(tonumber(packet.dirX) or 1.0, tonumber(packet.dirY) or 0.0)
    effect.perpX = -effect.dirY
    effect.perpY = effect.dirX
    effect.curveSign = (tonumber(packet.curveSign) or 1) < 0 and -1 or 1
    local curveSignMultiplier = resolveConfiguredValue(binding.curveSignMultiplier, 1)
    if tonumber(curveSignMultiplier) and tonumber(curveSignMultiplier) < 0 then
        effect.curveSign = -effect.curveSign
    end
    effect.scale = resolveConfiguredValue(binding.scale, 1.0)
    effect.mainSequence = getMainSequence(resolveConfiguredValue(binding.mainSequence, profile.mainSequence))
    effect.burstSequence = getBurstSequence(resolveConfiguredValue(binding.burstSequence, profile.burstSequence))
    if not effect.mainSequence or effect.mainSequence.count <= 0 or not effect.burstSequence or effect.burstSequence.count <= 0 then
        return false
    end

    effect.mainGlow = resolveConfiguredValue(binding.mainGlow, profile.mainGlow)
    effect.mainCore = resolveConfiguredValue(binding.mainCore, profile.mainCore)
    effect.burst = resolveConfiguredValue(binding.burst, profile.burst)
    effect.mainGlowPalette = resolveConfiguredValue(binding.mainGlowPalette, profile.mainGlowPalette)
    effect.mainCorePalette = resolveConfiguredValue(binding.mainCorePalette, profile.mainCorePalette)
    effect.burstPalette = resolveConfiguredValue(binding.burstPalette, profile.burstPalette)
    effect.pivotForwardTiles = resolveConfiguredValue(binding.pivotForwardTiles, profile.pivotForwardTiles)
    effect.pivotLateralTiles = resolveConfiguredValue(binding.pivotLateralTiles, profile.pivotLateralTiles)
    effect.mainForwardOffsetTiles = resolveConfiguredValue(binding.mainForwardOffsetTiles, resolveConfiguredValue(profile.mainForwardOffsetTiles, 0.0))
    effect.mainLateralOffsetTiles = resolveConfiguredValue(binding.mainLateralOffsetTiles, resolveConfiguredValue(profile.mainLateralOffsetTiles, 0.0))
    effect.handForwardTiles = resolveConfiguredValue(binding.handForwardTiles, profile.handForwardTiles)
    effect.handLateralTiles = resolveConfiguredValue(binding.handLateralTiles, profile.handLateralTiles)
    effect.mainAnchorZ = resolveConfiguredValue(binding.mainAnchorZ, profile.mainAnchorZ)
    effect.burstAnchorZ = resolveConfiguredValue(binding.burstAnchorZ, resolveConfiguredValue(profile.burstAnchorZ, effect.mainAnchorZ))
    effect.mainWidthTiles = resolveConfiguredValue(binding.mainWidthTiles, profile.mainWidthTiles)
    effect.mainHeightTiles = resolveConfiguredValue(binding.mainHeightTiles, profile.mainHeightTiles)
    effect.mainGlowScale = resolveConfiguredValue(binding.mainGlowScale, profile.mainGlowScale)
    effect.mainCoreScale = resolveConfiguredValue(binding.mainCoreScale, profile.mainCoreScale)
    effect.scaleIn = resolveConfiguredValue(binding.scaleIn, profile.scaleIn)
    effect.scaleOut = resolveConfiguredValue(binding.scaleOut, profile.scaleOut)
    effect.stretchIn = resolveConfiguredValue(binding.stretchIn, profile.stretchIn)
    effect.angleBiasRadians = math.rad(resolveConfiguredValue(binding.angleBiasDeg, profile.angleBiasDeg))
    effect.burstSizeTiles = resolveConfiguredValue(binding.burstSizeTiles, profile.burstSizeTiles)
    effect.burstLifePortion = resolveConfiguredValue(binding.burstLifePortion, profile.burstLifePortion)
    effect.burstAngleOffsetRadians = math.rad(resolveConfiguredValue(binding.burstAngleOffsetDeg, profile.burstAngleOffsetDeg))
    effect.mainFlipX = resolveConfiguredValue(binding.mainFlipX, resolveConfiguredValue(profile.mainFlipX, false)) == true
    effect.burstFlipX = resolveConfiguredValue(binding.burstFlipX, resolveConfiguredValue(profile.burstFlipX, false)) == true
    effect.followDuration = resolveConfiguredValue(binding.followDuration, resolveConfiguredValue(profile.followDuration, Config.FOLLOW_DURATION or 0.15))

    if packet.x ~= nil and packet.y ~= nil and packet.z ~= nil then
        effect.x = tonumber(packet.x) or 0.0
        effect.y = tonumber(packet.y) or 0.0
        effect.z = tonumber(packet.z) or 0.0
    elseif not refreshTrackedOrigin(effect, true) then
        return false
    end

    updateEffect(effect)
    return true
end

local function spawnEffectFromPacket(packet)
    if not effectsEnabled() or not ensureRuntimeReady() then
        return
    end

    local binding = getWeaponBinding(packet.weaponFullType)
    if not binding then
        return
    end

    local profile = getProfile(binding.profile)
    local effect = findReusableEffect(packet)
    local isNew = false

    if not effect then
        effect = acquireEffect()
        isNew = true
    end

    if not setupEffect(effect, packet, binding, profile) then
        if isNew then
            Runtime.freeCount = Runtime.freeCount + 1
            Runtime.freeEffects[Runtime.freeCount] = effect
        end
        return
    end

    if isNew then
        Runtime.activeCount = Runtime.activeCount + 1
        Runtime.activeEffects[Runtime.activeCount] = effect
    end

    spawnGlowLights(effect)
    Draw.setVisible(true)
end

local function updateEffects(dt)
    local index = 1
    while index <= Runtime.activeCount do
        local effect = Runtime.activeEffects[index]
        effect.life = effect.life + dt
        if effect.life >= effect.duration then
            recycleEffect(index)
        else
            updateEffect(effect)
            index = index + 1
        end
    end
    updateActiveLights(dt)
end

local function renderEffect(panel, effect, screenLeft, screenTop)
    local playerNum = panel.playerNum
    local pivotWorldX = effect.x + effect.dirX * effect.pivotForwardTiles + effect.perpX * (effect.pivotLateralTiles * effect.curveSign)
    local pivotWorldY = effect.y + effect.dirY * effect.pivotForwardTiles + effect.perpY * (effect.pivotLateralTiles * effect.curveSign)
    local mainWorldX = pivotWorldX + effect.dirX * effect.mainForwardOffsetTiles + effect.perpX * (effect.mainLateralOffsetTiles * effect.curveSign)
    local mainWorldY = pivotWorldY + effect.dirY * effect.mainForwardOffsetTiles + effect.perpY * (effect.mainLateralOffsetTiles * effect.curveSign)

    local pivotX, pivotY = worldToScreen(playerNum, mainWorldX, mainWorldY, effect.z + effect.mainAnchorZ, screenLeft, screenTop)
    local frontX, frontY = worldToScreen(playerNum, pivotWorldX + effect.dirX, pivotWorldY + effect.dirY, effect.z + effect.mainAnchorZ, screenLeft, screenTop)

    local dirScreenX = frontX - pivotX
    local dirScreenY = frontY - pivotY
    local tilePixels = math.sqrt(dirScreenX * dirScreenX + dirScreenY * dirScreenY)
    if tilePixels <= 1.0 then
        return
    end

    local mainWidthPixels = tilePixels * effect.mainWidthTiles * effect.scale * effect.mainScale * effect.mainStretch
    local mainHeightPixels = tilePixels * effect.mainHeightTiles * effect.scale * effect.mainScale
    local angle = math.atan2(dirScreenY, dirScreenX) + effect.angleBiasRadians * effect.curveSign
    local mainFrameIndex = 1 + math.min(effect.mainSequence.count - 1, math.floor((effect.life / effect.duration) * effect.mainSequence.count))
    local mainTexture = effect.mainSequence.frames[mainFrameIndex]
    local mainGlowColor = resolvePaletteColor(effect.mainGlowPalette, mainFrameIndex, effect.mainGlow)
    local mainCoreColor = resolvePaletteColor(effect.mainCorePalette, mainFrameIndex, effect.mainCore)

    local glowWidth = mainWidthPixels * effect.mainGlowScale
    local glowHeight = mainHeightPixels * effect.mainGlowScale
    drawSequenceFrame(panel, mainTexture, pivotX, pivotY, angle, glowWidth, glowHeight, mainGlowColor, effect.mainGlowAlpha, effect.mainFlipX)
    drawSequenceFrame(panel, mainTexture, pivotX, pivotY, angle, mainWidthPixels * effect.mainCoreScale, mainHeightPixels * effect.mainCoreScale, mainCoreColor, effect.mainCoreAlpha, effect.mainFlipX)

    if effect.burstAlpha > 0.001 then
        local handWorldX = effect.x + effect.dirX * effect.handForwardTiles + effect.perpX * (effect.handLateralTiles * effect.curveSign)
        local handWorldY = effect.y + effect.dirY * effect.handForwardTiles + effect.perpY * (effect.handLateralTiles * effect.curveSign)
        local handX, handY = worldToScreen(playerNum, handWorldX, handWorldY, effect.z + effect.burstAnchorZ, screenLeft, screenTop)
        local burstFrameT = clamp01(effect.life / (effect.duration * effect.burstLifePortion))
        local burstFrameIndex = 1 + math.min(effect.burstSequence.count - 1, math.floor(burstFrameT * effect.burstSequence.count))
        local burstTexture = effect.burstSequence.frames[burstFrameIndex]
        local burstSize = tilePixels * effect.burstSizeTiles * effect.scale * effect.burstScale
        local burstAngle = angle + effect.burstAngleOffsetRadians * effect.curveSign
        local burstColor = resolvePaletteColor(effect.burstPalette, burstFrameIndex, effect.burst)
        drawSequenceFrame(panel, burstTexture, handX, handY, burstAngle, burstSize, burstSize * (effect.burstSequence.height / effect.burstSequence.width), burstColor, effect.burstAlpha, effect.burstFlipX)
    end
end

function Overlay:new(playerNum)
    local panel = ISPanel:new(0, 0, getCore():getScreenWidth(), getCore():getScreenHeight())
    setmetatable(panel, self)
    self.__index = self
    panel.playerNum = playerNum
    panel:noBackground()
    panel.drawBorder = false
    -- ISPanel defaults to consuming mouse input even with an empty background.
    -- A cosmetic trail must never intercept aiming, inventory or other panels.
    panel:setWantMouseEvents(false)
    panel:setRenderThisPlayerOnly(playerNum)
    return panel
end

function Overlay:initialise()
    ISPanel.initialise(self)
end

function Overlay:onMouseDown()
    return false
end

function Overlay:onRightMouseDown()
    return false
end

function Overlay:render()
    local core = getCore()
    local screenWidth = core:getScreenWidth()
    local screenHeight = core:getScreenHeight()
    if self.width ~= screenWidth then
        self:setWidth(screenWidth)
        self.width = screenWidth
    end
    if self.height ~= screenHeight then
        self:setHeight(screenHeight)
        self.height = screenHeight
    end

    if Runtime.activeCount <= 0 then
        return
    end

    local screenLeft = getPlayerScreenLeft(self.playerNum)
    local screenTop = getPlayerScreenTop(self.playerNum)
    for index = 1, Runtime.activeCount do
        local effect = Runtime.activeEffects[index]
        if effect and effect.alpha > 0.001 then
            renderEffect(self, effect, screenLeft, screenTop)
        end
    end
end

function Draw.ensureOverlay(playerNum)
    local panel = Runtime.overlays[playerNum]
    if panel then
        return panel
    end

    local player = getSpecificPlayer(playerNum)
    if not player then
        return nil
    end

    panel = Overlay:new(playerNum)
    panel:initialise()
    panel:addToUIManager()
    panel:setVisible(false)
    Runtime.overlays[playerNum] = panel
    return panel
end

function Draw.rebuildOverlays()
    local activePlayers = {}
    for playerNum = 0, getNumActivePlayers() - 1 do
        if getSpecificPlayer(playerNum) then
            activePlayers[playerNum] = true
            Draw.ensureOverlay(playerNum)
        end
    end

    for playerNum, panel in pairs(Runtime.overlays) do
        if not activePlayers[playerNum] then
            panel:removeFromUIManager()
            Runtime.overlays[playerNum] = nil
        end
    end

    Runtime.overlaysReady = true
end

function Draw.setVisible(visible)
    if Runtime.overlaysVisible == visible then
        return
    end

    for _, panel in pairs(Runtime.overlays) do
        panel:setVisible(visible)
    end
    Runtime.overlaysVisible = visible
end

function Draw.removeOverlays()
    for playerNum, panel in pairs(Runtime.overlays) do
        panel:removeFromUIManager()
        Runtime.overlays[playerNum] = nil
    end
    Runtime.overlaysReady = false
    Runtime.overlaysVisible = false
end

local function resetRuntime()
    for i=1,Runtime.activeLightCount do safeRemoveLamppost(Runtime.activeLights[i].light) end
    Runtime.activeLights={}
    Runtime.activeLightCount=0
    Draw.removeOverlays()
    Runtime.activeEffects = {}
    Runtime.activeCount = 0
    Runtime.freeEffects = {}
    Runtime.freeCount = 0
    Runtime.lastSwingMsByPlayer = {}
    Runtime.pendingSwings = {}
    Runtime.lastImpactMsByPlayer = {}
    Runtime.lastUpdateMs = 0
    Runtime.poolWarmed = false
    Runtime.mainSequences = {}
    Runtime.burstSequences = {}
end

local function getPlayerRuntimeKey(player)
    if not player then
        return -1
    end

    local playerId = player:getOnlineID()
    if playerId == nil or playerId < 0 then
        playerId = player:getPlayerNum()
    end
    return playerId
end

local function broadcastPacket(player, packet)
    if not isClient() then
        return
    end

    sendClientCommand(player, Config.MODULE, Config.COMMAND_SPAWN, {
        weaponFullType = packet.weaponFullType,
        dirX = packet.dirX,
        dirY = packet.dirY,
        curveSign = packet.curveSign,
        glowActive = true,
    })
end

local function isLocalPlayerActor(character)
    if not character then return false end

    -- Bandits are IsoZombie-based actors and also fire OnWeaponHitCharacter.
    -- Reject them before touching IsoPlayer-only methods.
    local okClass, isPlayer = pcall(function()
        return instanceof(character, "IsoPlayer")
    end)
    if not okClass or not isPlayer then return false end

    local ok, value = pcall(function()
        return character:isLocalPlayer()
    end)
    return ok and value == true
end

local function releasePendingSwing(playerId, weaponOverride)
    local pending = Runtime.pendingSwings[playerId]
    if not pending then
        return false
    end

    Runtime.pendingSwings[playerId] = nil

    local player = pending.playerRef
    if not isLocalPlayerActor(player) then
        return false
    end
    if player:isDead() or player:isDoShove() or player:isPerformingStompAnimation()
        or player:getPrimaryHandItem()~=pending.weaponRef or not effectsEnabled() then return false end

    local weapon = weaponOverride or pending.weaponRef
    if not weapon or weapon:getFullType() ~= pending.weaponFullType then
        local equipped = player:getPrimaryHandItem()
        if not equipped or equipped:getFullType() ~= pending.weaponFullType then
            return false
        end
        weapon = equipped
    end

    -- Reconstrói o pacote NO MOMENTO em que o VFX realmente vai aparecer.
    -- Isso faz posição/direção acompanharem o swing atual, e não o instante
    -- em que OnWeaponSwing foi disparado.
    local packet = buildPacket(player, weapon)
    spawnEffectFromPacket(packet)
    broadcastPacket(player, packet)
    return true
end

local function processPendingSwings(nowMs)
    for playerId, pending in pairs(Runtime.pendingSwings) do
        if not pending or nowMs >= (pending.releaseAtMs or 0) then
            releasePendingSwing(playerId, pending and pending.weaponRef or nil)
        elseif nowMs - (pending.queuedAtMs or nowMs) > 1200 then
            Runtime.pendingSwings[playerId] = nil
        end
    end
end

local function onWeaponSwing(player, weapon)
    if not weapon or not isLocalPlayerActor(player) or not effectsEnabled()
        or player:isDoShove() or player:isPerformingStompAnimation() then
        return
    end

    local binding = getWeaponBinding(weapon:getFullType())
    if not binding then
        return
    end

    if not Config.isWeaponGlowActive(weapon) then
        return
    end

    if not ensureRuntimeReady() then
        return
    end

    local playerId = getPlayerRuntimeKey(player)
    local nowMs = getTimestampMs()
    local minInterval = binding.debounceMs or Config.DEBOUNCE_MS
    if nowMs - (Runtime.lastSwingMsByPlayer[playerId] or 0) < minInterval then
        return
    end
    Runtime.lastSwingMsByPlayer[playerId] = nowMs

    local profile = getProfile(binding.profile)
    local delayMs = resolveConfiguredValue(binding.vfxDelayMs, resolveConfiguredValue(profile.vfxDelayMs, 240))

    -- Não desenha mais no começo da animação. Apenas arma o efeito.
    -- Se houver hit em personagem/zumbi, OnWeaponHitCharacter libera
    -- exatamente no impacto. Se errar, o fallback usa delay por categoria.
    Runtime.pendingSwings[playerId] = {
        playerRef = player,
        weaponRef = weapon,
        weaponFullType = weapon:getFullType(),
        queuedAtMs = nowMs,
        releaseAtMs = nowMs + delayMs,
    }
end

local function onWeaponHitCharacter(attacker, target, weapon, damage)
    -- PRZWeapons 2.5.1 Consolidated: OnWeaponHitCharacter is also fired by Bandits/NPC combat.
    -- Those attackers are IsoZombie-based actors and do not implement
    -- IsoPlayer:isLocalPlayer(), so calling the method directly raises
    -- "Object tried to call nil".  VFX is intentionally player-local:
    -- ignore every non-player/non-local attacker without touching Bandits.
    if not attacker or not weapon then
        return
    end

    if not isLocalPlayerActor(attacker) then
        return
    end

    local okType, weaponFullType = pcall(function()
        return weapon:getFullType()
    end)
    if not okType or type(weaponFullType) ~= "string" or weaponFullType == "" then
        return
    end

    if not getWeaponBinding(weaponFullType) then
        return
    end

    local playerId = getPlayerRuntimeKey(attacker)
    local nowMs = getTimestampMs()
    local pending = Runtime.pendingSwings[playerId]

    if pending and pending.weaponFullType == weaponFullType then
        -- Primeiro alvo atingido no swing é o ponto visual principal.
        -- Multi-hit não gera várias cópias do mesmo VFX.
        Runtime.lastImpactMsByPlayer[playerId] = nowMs
        releasePendingSwing(playerId, weapon)
    end
end

local function onTick()
    if not effectsEnabled() then
        if Runtime.activeCount>0 or Runtime.activeLightCount>0 or next(Runtime.pendingSwings) then resetRuntime() end
        return
    end
    local nowMs = getTimestampMs()
    processPendingSwings(nowMs)

    if Runtime.activeCount <= 0 then
        Runtime.lastUpdateMs = 0
        Draw.setVisible(false)
        return
    end

    if not isGameReady() then
        Runtime.lastUpdateMs = 0
        Draw.setVisible(false)
        return
    end

    if not ensureRuntimeReady() then
        return
    end

    if Runtime.lastUpdateMs == 0 then
        Runtime.lastUpdateMs = nowMs
    else
        local dt = (nowMs - Runtime.lastUpdateMs) / 1000.0
        Runtime.lastUpdateMs = nowMs
        if dt > 0.0 then
            updateEffects(math.min(dt, 0.050))
        end
    end

    Draw.setVisible(Runtime.activeCount > 0)
end

local function onServerCommand(module, command, args)
    if module ~= Config.MODULE or command ~= Config.COMMAND_SPAWN or not args then
        return
    end

    if args.glowActive ~= true then
        return
    end

    spawnEffectFromPacket(args)
end

local function onCreatePlayer(playerNum)
    if not ensureRuntimeReady() then
        return
    end
    Draw.ensureOverlay(playerNum)
end

local function onGameStart()
    resetRuntime()
    ensureRuntimeReady()
end

if not PRZWeaponVFX._eventsRegistered then
    Events.OnGameStart.Add(onGameStart)
    Events.OnLoad.Add(resetRuntime)
    Events.OnCreatePlayer.Add(onCreatePlayer)
    Events.OnTick.Add(onTick)
    Events.OnWeaponSwing.Add(onWeaponSwing)
    Events.OnWeaponHitCharacter.Add(onWeaponHitCharacter)
    Events.OnServerCommand.Add(onServerCommand)
    PRZWeaponVFX._eventsRegistered = true
end

print("[PRZWeaponVFX] Client module loaded")
