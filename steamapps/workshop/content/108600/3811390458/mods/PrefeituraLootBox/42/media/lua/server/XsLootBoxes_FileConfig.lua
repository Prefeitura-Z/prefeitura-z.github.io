XsLootBoxes = XsLootBoxes or {}
local wasLoaded = type(XsLootBoxes.FileConfig)=="table"
XsLootBoxes.FileConfig = {}
local F = XsLootBoxes.FileConfig
local X = XsLootBoxes
local PATH = "XsLootBoxes/loottables.json"

local function readAll(path)
    if not getFileReader then return nil end
    local reader=getFileReader(path,false)
    if not reader then return nil end
    local parts={}
    local line=reader:readLine()
    while line do parts[#parts+1]=line; line=reader:readLine() end
    reader:close()
    return table.concat(parts,"\n")
end

local function parser(text)
    local s=tostring(text or "")
    s=string.gsub(s,"^\239\187\191","")
    s=string.gsub(s,"^"..string.char(65279),"")
    local i,n=1,#s
    local function ws() while i<=n and string.match(string.sub(s,i,i),"%s") do i=i+1 end end
    local parseValue
    local function parseUnicodeUnit()
        local hex=string.sub(s,i,i+3)
        if #hex~=4 or not string.match(hex,"^%x%x%x%x$") then error("bad unicode escape") end
        i=i+4
        return tonumber(hex,16)
    end
    local function parseString()
        if string.sub(s,i,i)~='"' then error("expected string") end
        i=i+1; local out={}
        while i<=n do
            local c=string.sub(s,i,i); i=i+1
            if c=='"' then return table.concat(out) end
            if c=='\\' then
                local e=string.sub(s,i,i); i=i+1
                local map={ ['"']='"', ['\\']='\\', ['/']='/', ['b']='\b', ['f']='\f', ['n']='\n', ['r']='\r', ['t']='\t' }
                if e=='u' then
                    local code=parseUnicodeUnit()
                    -- PZ/Kahlua uses Java UTF-16 strings, not UTF-8 byte strings.
                    if code>=55296 and code<=56319 then
                        if string.sub(s,i,i+1)~='\\u' then error("missing low surrogate") end
                        i=i+2
                        local low=parseUnicodeUnit()
                        if low<56320 or low>57343 then error("bad low surrogate") end
                        out[#out+1]=string.char(code)..string.char(low)
                    elseif code>=56320 and code<=57343 then
                        error("unexpected low surrogate")
                    else
                        out[#out+1]=string.char(code)
                    end
                elseif map[e] then
                    out[#out+1]=map[e]
                else
                    error("bad string escape")
                end
            else
                if string.byte(c)<32 then error("unescaped control character") end
                out[#out+1]=c
            end
        end
        error("unterminated string")
    end
    local function parseNumber()
        local start=i
        while i<=n and string.match(string.sub(s,i,i),"[%d%+%-%e%E%.]") do i=i+1 end
        local v=tonumber(string.sub(s,start,i-1)); if v==nil then error("bad number") end
        return v
    end
    local function parseArray()
        i=i+1; ws(); local out={}
        if string.sub(s,i,i)==']' then i=i+1; return out end
        while true do
            out[#out+1]=parseValue(); ws()
            local c=string.sub(s,i,i); i=i+1
            if c==']' then return out end
            if c~=',' then error("expected comma") end
            ws()
        end
    end
    local function parseObject()
        i=i+1; ws(); local out={}
        if string.sub(s,i,i)=='}' then i=i+1; return out end
        while true do
            local key=parseString(); ws()
            if string.sub(s,i,i)~=':' then error("expected colon") end
            i=i+1; out[key]=parseValue(); ws()
            local c=string.sub(s,i,i); i=i+1
            if c=='}' then return out end
            if c~=',' then error("expected comma") end
            ws()
        end
    end
    parseValue=function()
        ws(); local c=string.sub(s,i,i)
        if c=='"' then return parseString() end
        if c=='{' then return parseObject() end
        if c=='[' then return parseArray() end
        if string.sub(s,i,i+3)=='true' then i=i+4; return true end
        if string.sub(s,i,i+4)=='false' then i=i+5; return false end
        if string.sub(s,i,i+3)=='null' then i=i+4; return nil end
        return parseNumber()
    end
    local value=parseValue(); ws()
    if i<=n then error("trailing data") end
    return value
end

local function escape(s)
    s=tostring(s or "")
    local out={}
    -- ASCII JSON is safe across file encodings; decode restores Unicode units.
    for j=1,#s do
        local code=string.byte(s,j)
        if code==34 then out[#out+1]='\\"'
        elseif code==92 then out[#out+1]='\\\\'
        elseif code<32 or code>126 then out[#out+1]=string.format("\\u%04x",code)
        else out[#out+1]=string.char(code) end
    end
    return table.concat(out)
end

local function encodeValue(v,depth)
    depth=depth or 0; local pad=string.rep("  ",depth); local nextPad=string.rep("  ",depth+1)
    local t=type(v)
    if t=="nil" then return "null" end
    if t=="boolean" then return v and "true" or "false" end
    if t=="number" then return tostring(v) end
    if t=="string" then return '"'..escape(v)..'"' end
    if t~="table" then return '"'..escape(tostring(v))..'"' end
    local isArray=true; local max=0
    for k in pairs(v) do if type(k)~="number" then isArray=false; break end; if k>max then max=k end end
    local parts={}
    if isArray then
        for j=1,max do parts[#parts+1]=nextPad..encodeValue(v[j],depth+1) end
        if #parts==0 then return "[]" end
        return "[\n"..table.concat(parts,",\n").."\n"..pad.."]"
    end
    local keys={}; for k in pairs(v) do keys[#keys+1]=tostring(k) end; table.sort(keys)
    for _,k in ipairs(keys) do parts[#parts+1]=nextPad..'"'..escape(k)..'": '..encodeValue(v[k],depth+1) end
    if #parts==0 then return "{}" end
    return "{\n"..table.concat(parts,",\n").."\n"..pad.."}"
end

function F.decode(text)
    local ok,value=pcall(parser,text)
    if ok and type(value)=="table" then return value end
    return nil
end

function F.encode(value) return encodeValue(value,0).."\n" end

function F.save(config)
    if not getFileWriter then return false end
    local writer=getFileWriter(PATH,true,false)
    if not writer then return false end
    writer:write(F.encode(config)); writer:close(); return true
end

function F.repairNames(cfg)
    if type(cfg.displayNames)~="table" then return end
    for _,color in ipairs(X.COLORS) do
        local name=cfg.displayNames[color]
        if type(name)=="string" then
            if X.repairTierDisplayName then
                cfg.displayNames[color]=X.repairTierDisplayName(color,name)
            else
                -- Compatible with a server whose shared Lua is still the old version.
                local lower=string.lower(name)
                if color=="Purple" and string.sub(lower,1,8)=="lootbox " and (string.find(name,"?",1,true) or string.find(name,string.char(65533),1,true)) and string.find(lower,"pica",1,true) then
                    cfg.displayNames[color]="Lootbox "..string.char(201).."pica"
                end
            end
        end
    end
end

function F.pushSnapshot()
    if not sendServerCommand or (isServer and not isServer()) then return end
    if isServer and isServer() and not X._przNetworkReady then return end
    local cfg=X.Store.getConfig()
    local codes={}
    for _,color in ipairs(X.COLORS) do
        local name=cfg.displayNames[color] or ""
        codes[color]={}
        for j=1,#name do codes[color][j]=string.byte(name,j) end
    end
    sendServerCommand(X.MODULE,X.SRV_CONFIG_SYNC or "SRV_CONFIG_SYNC",{config=cfg,displayNameCodes=codes})
end

function F.installLiveSync()
    local store=X.Store
    if not store or store._przDirectSync then return end
    local original=store.transmitConfig
    function store.transmitConfig(...)
        original(...)
        if X.FileConfig and X.FileConfig.pushSnapshot then X.FileConfig.pushSnapshot() end
    end
    store._przDirectSync=true
end

function F.bootstrapFromDisk()
    F.installLiveSync()
    local text=readAll(PATH)
    if text and text~="" then
        local cfg=F.decode(text)
        if cfg then F.repairNames(cfg); X.Store.setConfig(cfg,true); return true end
        print("[XsLootBoxes] loottables.json invalido; usando configuracao salva/padrao.")
    end
    local cfg=X.Store.getConfig()
    F.save(cfg)
    return false
end

function F.reloadFromDisk()
    local text=readAll(PATH)
    if not text or text=="" then
        print("[XsLootBoxes] Reload cancelado: Lua/"..PATH.." ausente ou vazio; tabela atual preservada.")
        return false
    end
    local cfg=F.decode(text)
    if not cfg or tonumber(cfg.version)~=X.CONFIG_SCHEMA_VERSION or type(cfg.boxes)~="table" then
        print("[XsLootBoxes] Reload cancelado: loottables.json invalido; tabela atual preservada.")
        return false
    end
    if not X.Store or not X.Store.setConfig then
        print("[XsLootBoxes] Reload cancelado: Store ainda nao inicializado.")
        return false
    end
    F.installLiveSync()
    F.repairNames(cfg)
    local applied=X.Store.setConfig(cfg,true)
    local purple=applied.boxes and applied.boxes.Purple
    print("[XsLootBoxes] Reload aplicado: Purple="..tostring(purple and #purple.entries or 0).." itens; nomes e tabelas sincronizados.")
    return true
end

-- An existing FileConfig means this is a reload. Initial boot uses OnInitGlobalModData.
-- This file registers no events, so repeated reloads do not stack callbacks.
if wasLoaded and X.Store and X.Store.setConfig then
    local ok,err=pcall(F.reloadFromDisk)
    if not ok then print("[XsLootBoxes] Reload falhou: "..tostring(err)) end
end
