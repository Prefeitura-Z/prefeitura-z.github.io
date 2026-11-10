XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

local function reply(player,command,data)
    if player and sendServerCommand then sendServerCommand(player,X.MODULE,command,data or {}) end
end

local function onCommand(module,command,player,args)
    if module~=X.MODULE or not player then return end
    if command==X.CMD_OPEN_BOX then if X.Open then X.Open.handle(player,args) end; return end
    if command==X.CMD_OPEN_BOX_ALL then if X.Open then X.Open.handleAll(player,args) end; return end
    if command==X.CMD_REQUEST_SYNC then X.Store.transmitConfig(); reply(player,X.SRV_SAVED,{}); return end
    if not X.isStaffPlayer(player) then return end
    if command==X.CMD_TABLE_SET and X.Store.setBoxTable(args) then reply(player,X.SRV_SAVED,{box=args.box}); return end
    if command==X.CMD_TABLE_RESET and args and X.Store.resetBox(args.box) then reply(player,X.SRV_SAVED,{box=args.box}); return end
    if command==X.CMD_NAMES_SET and X.Store.setDisplayNames(args) then reply(player,X.SRV_SAVED,{}); return end
end

local function boot()
    local ok,err=pcall(function()
        X.Store.getConfig()
        if X.FileConfig then X.FileConfig.bootstrapFromDisk() end
        X.Store.transmitConfig()
    end)
    if not ok then print("[XsLootBoxes] inicializacao falhou: "..tostring(err)) end
end

Events.OnInitGlobalModData.Add(boot)
Events.OnClientCommand.Add(onCommand)
if Events.OnCreatePlayer then Events.OnCreatePlayer.Add(function(_,player) if player then X.Store.transmitConfig() end end) end

-- Network broadcasts must wait until the UDP engine exists.
Events.OnServerStarted.Add(function()
    X._przNetworkReady = true
    X.Store.transmitConfig()
end)
