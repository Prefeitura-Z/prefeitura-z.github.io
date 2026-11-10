XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

local function chatStub(text)
    local stub={ _text=tostring(text or "") }
    function stub:getTextWithPrefix() return self._text end
    function stub:getText() return self._text end
    function stub:setText(value) self._text=tostring(value or "") end
    function stub:getAuthor() return nil end
    function stub:isShowAuthor() return false end
    function stub:isShowInChat() return true end
    function stub:getDatetime() return nil end
    function stub:getRadioChannel() return -1 end
    return stub
end

local function post(text)
    if not text or text=="" then return end
    if ISChat and ISChat.addLineInChat then
        local ok=pcall(function() ISChat.addLineInChat(chatStub(text),0) end)
        if ok then return end
    end
    if HaloTextHelper and getPlayer() then pcall(HaloTextHelper.addText,getPlayer(),text) end
end

local function rewardText(payload)
    local parts={}
    local threshold=X.CHAT_RARE_PCT_THRESHOLD
    local cfg=X._clientConfigCache or (ModData and ModData.getOrCreate and ModData.getOrCreate(X.MD_CONFIG) or nil)
    local showPct=cfg and cfg.chatRarePctEnabled and cfg.chatRarePctEnabled[payload.color]==true
    for _,e in ipairs(payload.items or {}) do
        local label=tostring(e.name or e.fullType or "item")
        if showPct and tonumber(e.pct) and tonumber(e.pct)<threshold then label=label..X.formatDropPctSuffix(e.pct) end
        parts[#parts+1]=label
    end
    return table.concat(parts,", ")
end

local function onServer(module,command,args)
    if module~=X.MODULE or command~=X.SRV_CHAT_BROADCAST or type(args)~="table" then return end
    if args.kind=="opening" then
        local count=tonumber(args.count) or 1
        local who=tostring(args.player or getText("IGUI_XsLootBoxes_Player"))
        local tier=tostring(args.tier or args.color or "")
        if count>1 then post(getText("IGUI_XsLootBoxes_ChatOpeningMany",who,tostring(count),tier))
        else post(getText("IGUI_XsLootBoxes_ChatOpeningOne",who,tier)) end
    elseif args.kind=="rewards" then
        post(getText("IGUI_XsLootBoxes_ChatGot",tostring(args.player or getText("IGUI_XsLootBoxes_Player")),rewardText(args)))
    end
end
Events.OnServerCommand.Add(onServer)
