PRZArmory = PRZArmory or {}
PRZArmory.Network = PRZArmory.Network or {sequence=0}
local N = PRZArmory.Network
N.module = "PRZWeaponsArmory"
function N.canManagePool(player)
    if not isClient() and not isServer() then return true end
    if not player or not player.getAccessLevel then return false end
    local access=tostring(player:getAccessLevel()):lower()
    return access=="admin" or access=="moderator" or access=="overseer"
end
function N.isLocal(player)
    return not isServer() and player ~= nil and player == getSpecificPlayer(0)
end
function N.request(player, command, args)
    if not isClient() or not N.isLocal(player) or player:isDead() then return false end
    N.sequence = N.sequence + 1
    args = args or {}
    args.requestID = N.sequence
    sendClientCommand(player, N.module, command, args)
    return true
end
function N.weaponRequest(player, weapon, command, args)
    if not weapon then return false end
    if command=="WeaponPrepare" then
        N.prepared=N.prepared or setmetatable({},{__mode="k"})
        local t=getTimestampMs()
        if (N.prepared[weapon] or 0)>t then return true end
        N.prepared[weapon]=t+250
    end
    args = args or {}
    args.weaponID = weapon:getID()
    return N.request(player, command, args)
end
function N.added(container, item)
    if isServer() and item then sendAddItemToContainer(container, item) end
end
function N.removed(container, item)
    if isServer() and item then sendRemoveItemFromContainer(container, item) end
end
return N
