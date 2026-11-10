XsLootBoxes=XsLootBoxes or {}
local X=XsLootBoxes

local function snapshot(data,codes)
    local cfg={version=data.version,displayNames={},chatRarePctEnabled={},boxes={}}
    for _,color in ipairs(X.COLORS) do
        local name=data.displayNames and data.displayNames[color]
        if type(codes)=="table" and type(codes[color])=="table" then
            local parts={}
            for _,code in ipairs(codes[color]) do
                code=tonumber(code)
                if code and code>=0 and code<=65535 then parts[#parts+1]=string.char(code) end
            end
            if #parts>0 then name=table.concat(parts) end
        end
        cfg.displayNames[color]=X.repairTierDisplayName(color,name or X.DEFAULT_DISPLAY_NAMES[color])
        cfg.chatRarePctEnabled[color]=not data.chatRarePctEnabled or data.chatRarePctEnabled[color]~=false
        local box=data.boxes and data.boxes[color]
        if type(box)=="table" and type(box.entries)=="table" then
            local entries={}
            for _,e in ipairs(box.entries) do
                if type(e)=="table" and type(e.item)=="string" then entries[#entries+1]={item=e.item,weight=tonumber(e.weight) or 0} end
            end
            cfg.boxes[color]={entries=entries,rolls=X.clampRolls(box.rolls)}
        end
    end
    return cfg
end

function X.applyClientConfig(data,direct,codes)
    if type(data)~="table" or type(data.boxes)~="table" then return false end
    if X._hasDirectConfig and not direct then return false end
    local cfg=snapshot(data,codes)
    X._clientConfigCache=cfg
    X._clientConfigConfirmed=true
    X._syncPending=false
    if direct then X._hasDirectConfig=true end
    X.applySyncedDisplayNames(cfg)
    if X.UI then X.UI._items={} end
    local admin=X.ConfigUI and X.ConfigUI.instance
    if admin and admin.refreshFromServer and (not admin.dirty or admin._saving) then admin:refreshFromServer() end
    if X.ViewContentsUI and X.ViewContentsUI.refreshVisibleWindow then X.ViewContentsUI.refreshVisibleWindow() end
    return true
end

local function onReceive(key,data)
    if key==X.MD_CONFIG and type(data)=="table" then X.applyClientConfig(data,false) end
end

local function onServer(module,command,args)
    if module~=X.MODULE or command~=(X.SRV_CONFIG_SYNC or "SRV_CONFIG_SYNC") then return end
    if type(args)=="table" then X.applyClientConfig(args.config,true,args.displayNameCodes) end
end

local function onStart()
    X._hasDirectConfig=false
    X._clientConfigConfirmed=false
    X._clientConfigCache=nil
    X.requestConfigSync()
end

-- Explicit references keep client reloads from duplicating callbacks.
if X._configReceiveHandler and Events.OnReceiveGlobalModData then Events.OnReceiveGlobalModData.Remove(X._configReceiveHandler) end
if X._configServerHandler and Events.OnServerCommand then Events.OnServerCommand.Remove(X._configServerHandler) end
if X._configStartHandler and Events.OnGameStart then Events.OnGameStart.Remove(X._configStartHandler) end
X._configReceiveHandler=onReceive; X._configServerHandler=onServer; X._configStartHandler=onStart
if Events.OnReceiveGlobalModData then Events.OnReceiveGlobalModData.Add(onReceive) end
Events.OnServerCommand.Add(onServer)
Events.OnGameStart.Add(onStart)
