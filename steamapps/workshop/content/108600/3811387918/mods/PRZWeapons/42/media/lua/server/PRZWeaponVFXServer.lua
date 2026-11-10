if not isServer() then
    return
end

PRZWeaponVFX = PRZWeaponVFX or {}
local Config = PRZWeaponVFX.Config

local MODULE = (Config and Config.MODULE) or "PRZWeaponVFX"
local COMMAND_SPAWN = (Config and Config.COMMAND_SPAWN) or "SpawnSlash"
local SYNC_RADIUS = (Config and Config.SYNC_RADIUS) or 70.0
local SERVER_DEBOUNCE_MS = (Config and Config.SERVER_DEBOUNCE_MS) or 90
local lastRelayMsBySource = setmetatable({}, { __mode = "k" })

local function normalize(x, y)
    local length = math.sqrt(x * x + y * y)
    if length <= 0.0001 then
        return 1.0, 0.0
    end
    return x / length, y / length
end

local function normalizeCurveSign(value)
    if tonumber(value) and tonumber(value) < 0 then
        return -1
    end
    return 1
end

local function weaponEnabled(fullType)
    return Config and Config.getWeaponBinding and Config.getWeaponBinding(fullType) ~= nil
end

local function buildBroadcastPacket(player, args)
    if not args or type(args) ~= "table" then
        return nil
    end

    if args.glowActive ~= true then
        return nil
    end

    local weaponFullType = tostring(args.weaponFullType or "")
    if not weaponEnabled(weaponFullType) then
        return nil
    end

    local dirX = tonumber(args.dirX)
    local dirY = tonumber(args.dirY)
    if not dirX or not dirY or dirX~=dirX or dirY~=dirY or math.abs(dirX)>1e6 or math.abs(dirY)>1e6 then
        return nil
    end

    dirX, dirY = normalize(dirX, dirY)

    local playerId = player:getOnlineID()
    if playerId == nil or playerId < 0 then
        playerId = player:getPlayerNum()
    end

    return {
        sourceOnlineID = playerId,
        weaponFullType = weaponFullType,
        dirX = dirX,
        dirY = dirY,
        curveSign = normalizeCurveSign(args.curveSign),
        glowActive = true,
    }
end

local function relayToNearbyPlayers(sourcePlayer, packet)
    local players = getOnlinePlayers()
    if not players or players:size() <= 1 then
        return
    end

    local radiusSquared = SYNC_RADIUS * SYNC_RADIUS
    local sourceX = sourcePlayer:getX()
    local sourceY = sourcePlayer:getY()
    local sourceZ = sourcePlayer:getZ()
    for index = 0, players:size() - 1 do
        local receiver = players:get(index)
        if receiver ~= sourcePlayer then
            local dx = receiver:getX() - sourceX
            local dy = receiver:getY() - sourceY
            local dz = math.abs(receiver:getZ() - sourceZ)
            if dx * dx + dy * dy <= radiusSquared and dz <= 1.5 then
                sendServerCommand(receiver, MODULE, COMMAND_SPAWN, packet)
            end
        end
    end
end

local function onClientCommand(module, command, player, args)
    if module ~= MODULE or command ~= COMMAND_SPAWN then
        return
    end

    if not player or player:isDead() or type(args)~="table" then return end
    local held=player:getPrimaryHandItem()
    if not held or held:getFullType()~=args.weaponFullType or not player:getInventory():containsRecursive(held) then return end
    local nowMs = getTimestampMs()
    local lastMs = lastRelayMsBySource[player] or 0
    if nowMs - lastMs < SERVER_DEBOUNCE_MS then return end
    lastRelayMsBySource[player] = nowMs

    local equipped = player:getPrimaryHandItem()
    if not equipped or equipped:getFullType() ~= tostring(args.weaponFullType or "") then return end
    local packet = buildBroadcastPacket(player, args)
    if not packet then
        return
    end

    relayToNearbyPlayers(player, packet)
end

Events.OnClientCommand.Add(onClientCommand)

print("[PRZWeaponVFX] Server module loaded")
