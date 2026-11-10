XsLootBoxes = XsLootBoxes or {}
XsLootBoxes.Store = {}
local S = XsLootBoxes.Store
local X = XsLootBoxes
local MAX_ENTRIES = 200

local function newBox()
    return { entries={}, rolls={min=1,max=1} }
end

local function newConfig()
    local cfg={ version=X.CONFIG_SCHEMA_VERSION, displayNames={}, chatRarePctEnabled={}, boxes={} }
    for _,color in ipairs(X.COLORS) do
        cfg.displayNames[color]=X.DEFAULT_DISPLAY_NAMES[color]
        cfg.chatRarePctEnabled[color]=true
        cfg.boxes[color]=newBox()
    end
    return cfg
end

local function cleanName(value, fallback)
    local s=tostring(value or "")
    s=string.gsub(s,"[%c]"," ")
    s=string.gsub(s,"^%s+","")
    s=string.gsub(s,"%s+$","")
    if #s > X.MAX_TIER_NAME_LEN then s=string.sub(s,1,X.MAX_TIER_NAME_LEN) end
    if s=="" then return fallback end
    return s
end

local function cleanEntry(entry)
    if type(entry)~="table" then return nil end
    local ft=tostring(entry.item or entry.type or "")
    if ft=="" or not string.find(ft,".",1,true) then return nil end
    local weight=tonumber(entry.weight) or 0
    if weight<=0 then return nil end
    if weight>1000000 then weight=1000000 end
    return { item=ft, weight=weight }
end

function S.sanitizeConfig(raw)
    local out=newConfig()
    if type(raw)~="table" then return out end
    for _,color in ipairs(X.COLORS) do
        if type(raw.displayNames)=="table" then
            out.displayNames[color]=cleanName(raw.displayNames[color],X.DEFAULT_DISPLAY_NAMES[color])
        end
        if type(raw.chatRarePctEnabled)=="table" then
            out.chatRarePctEnabled[color]=raw.chatRarePctEnabled[color]==true
        end
        local src=type(raw.boxes)=="table" and raw.boxes[color] or nil
        if type(src)=="table" then
            out.boxes[color].rolls=X.clampRolls(src.rolls)
            if type(src.entries)=="table" then
                for i=1,math.min(#src.entries,MAX_ENTRIES) do
                    local e=cleanEntry(src.entries[i])
                    if e then out.boxes[color].entries[#out.boxes[color].entries+1]=e end
                end
            end
        end
    end
    return out
end

local function backingTable()
    if ModData and ModData.getOrCreate then return ModData.getOrCreate(X.MD_CONFIG) end
    X._fallbackConfig=X._fallbackConfig or {}
    return X._fallbackConfig
end

local function replaceBacking(cfg)
    local md=backingTable()
    for k in pairs(md) do md[k]=nil end
    for k,v in pairs(cfg) do md[k]=v end
    return md
end

function S.getConfig()
    local md=backingTable()
    if tonumber(md.version)~=X.CONFIG_SCHEMA_VERSION or type(md.boxes)~="table" then
        md=replaceBacking(newConfig())
    else
        md=replaceBacking(S.sanitizeConfig(md))
    end
    return md
end

function S.setConfig(raw, skipDisk)
    local cfg=replaceBacking(S.sanitizeConfig(raw))
    X.applySyncedDisplayNames(cfg)
    if not skipDisk and X.FileConfig and X.FileConfig.save then pcall(X.FileConfig.save,cfg) end
    S.transmitConfig()
    return cfg
end

function S.getBox(color)
    if not X.isKnownColor(color) then return nil end
    return S.getConfig().boxes[color]
end

function S.validateSetTablePayload(args)
    if type(args)~="table" or not X.isKnownColor(args.box) then return false end
    if type(args.entries)~="table" or #args.entries<1 or #args.entries>MAX_ENTRIES then return false end
    local rolls=X.clampRolls(args.rolls)
    if not rolls then return false end
    for i=1,#args.entries do if not cleanEntry(args.entries[i]) then return false end end
    return true
end

function S.validateSetNamesPayload(args)
    if type(args)~="table" or type(args.displayNames)~="table" then return false end
    for _,color in ipairs(X.COLORS) do
        local v=args.displayNames[color]
        if v~=nil and type(v)~="string" then return false end
    end
    return true
end

function S.setBoxTable(args)
    if not S.validateSetTablePayload(args) then return false end
    local cfg=S.getConfig()
    local entries={}
    for i=1,#args.entries do entries[#entries+1]=cleanEntry(args.entries[i]) end
    cfg.boxes[args.box]={ entries=entries, rolls=X.clampRolls(args.rolls) }
    if args.chatRarePctEnabled~=nil then cfg.chatRarePctEnabled[args.box]=args.chatRarePctEnabled==true end
    S.setConfig(cfg)
    return true
end

function S.resetBox(color)
    if not X.isKnownColor(color) then return false end
    local cfg=S.getConfig()
    cfg.boxes[color]=newBox()
    cfg.chatRarePctEnabled[color]=true
    S.setConfig(cfg)
    return true
end

function S.setDisplayNames(args)
    if not S.validateSetNamesPayload(args) then return false end
    local cfg=S.getConfig()
    for _,color in ipairs(X.COLORS) do
        cfg.displayNames[color]=cleanName(args.displayNames[color],X.DEFAULT_DISPLAY_NAMES[color])
    end
    S.setConfig(cfg)
    return true
end

function S.transmitConfig()
    local cfg=S.getConfig()
    X.applySyncedDisplayNames(cfg)
    if ModData and ModData.transmit then pcall(ModData.transmit,X.MD_CONFIG) end
end

function S.totalWeight(entries)
    local total=0
    for _,e in ipairs(entries or {}) do total=total+math.max(0,tonumber(e.weight) or 0) end
    return total
end

function S.pick(entries)
    local total=S.totalWeight(entries)
    if total<=0 then return nil end
    local r=(X.randInt(0,1000000)/1000000)*total
    local acc=0
    for _,e in ipairs(entries) do
        acc=acc+(tonumber(e.weight) or 0)
        if r<acc then return e end
    end
    return entries[#entries]
end
