-- Server-only inventory transactions, reached through Jeeves' pending offers.
-- The client sends only its offer generation and row index. A write-ahead
-- journal preserves visit stock even if world ModData is rolled back.
if isClient() and not isServer() then return end
require "PRZOmegaShopConfig"
local W=PRZOmegaWeapons
local cfg=W.ShopConfig
local S={}
W.AmmoShop=S
local loaded=false
local broken=false
local visits,transactions,serial={},{},0
local function safe(value)
    return type(value)=="string" and #value>0 and #value<=160 and not value:find("[\t\r\n]")
end
local function root()return ModData.getOrCreate(cfg.modDataKey) end
local function append(fields)
    local ok=pcall(function()
        local f=getFileWriter(cfg.journal,true,true)
        if not f then error("journal unavailable") end
        f:writeln(table.concat(fields,"\t"));f:close()
    end)
    if not ok then broken=true;print("[PRZ Omega shop] Journal unavailable; shop closed safely.") end
    return ok
end
local function mirror()
    local r=root();r.visits=visits;r.transactions=transactions;r.serial=serial;r.schema=1
end
local function apply(a)
    if a[1]=="V" then
        if not safe(a[2]) or visits[a[2]] or not tonumber(a[3]) or not tonumber(a[4]) then return false end
        local v={start=tonumber(a[3]),finish=tonumber(a[4]),stock={}}
        for i=5,#a,4 do
            local key,crate,price,limit=a[i],a[i+1],tonumber(a[i+2]),tonumber(a[i+3])
            if not safe(key) or not safe(crate) or not price or not limit or price<1 or limit<0 then return false end
            v.stock[key]={crate=crate,price=price,left=limit,limit=limit}
        end
        visits[a[2]]=v
    elseif a[1]=="R" then
        local id=tonumber(a[2]);local v=visits[a[3]];local stock=v and v.stock[a[4]]
        if not id or transactions[id] or not stock or stock.left<1 or not safe(a[5]) then return false end
        serial=math.max(serial,id);stock.left=stock.left-1
        transactions[id]={visit=a[3],key=a[4],owner=a[5],status="reserved"}
    elseif a[1]=="C" or a[1]=="F" then
        local t=transactions[tonumber(a[2])]
        if not t or t.status~="reserved" then return false end
        t.status=a[1]=="C" and "complete" or "failed"
        if a[1]=="F" then local stock=visits[t.visit].stock[t.key];stock.left=stock.left+1 end
    else return false end
    return true
end
local function boot()
    if loaded then return not broken end
    loaded=true
    local ok=pcall(function()
        local f=getFileReader(cfg.journal,false)
        if not f then
            if root().schema then error("missing existing journal") end
            return
        end
        while true do
            local line=f:readLine();if not line then break end
            local a={};for field in line:gmatch("[^\t]+") do a[#a+1]=field end
            if not apply(a) then f:close();error("invalid journal record") end
        end
        f:close()
    end)
    broken=not ok
    if not broken then mirror() else print("[PRZ Omega shop] Journal needs operator review; no sales allowed.") end
    return not broken
end
local function record(a)
    if not append(a) then return false end
    if not apply(a) then broken=true;return false end
    mirror();return true
end
local function validActor(p,rec)
    return p and not p:isDead() and safe(p:getUsername()) and rec and rec.meta
        and rec.meta.pbeBashar==true and safe(rec.meta.pbeOccurrence)
end
local function visit(p,rec,schedule)
    if not cfg.enabled or not validActor(p,rec) or not boot() then return end
    if not schedule or not schedule.event or not schedule.event.omega
        or schedule.occurrenceId~=rec.meta.pbeOccurrence
        or os.time()<schedule.startEpoch or os.time()>=schedule.endEpoch then return end
    local id=schedule.occurrenceId
    if not visits[id] then
        local a={"V",id,tostring(schedule.startEpoch),tostring(schedule.endEpoch)}
        for _,row in ipairs(cfg.stock) do
            a[#a+1]=row.key;a[#a+1]=row.crate;a[#a+1]=tostring(row.price);a[#a+1]=tostring(row.limit)
        end
        if not record(a) then return end
    end
    return visits[id]
end
function S.open(p,rec,schedule)
    local v=visit(p,rec,schedule);if not v then return false end
    local deals={}
    for _,row in ipairs(cfg.stock) do
        local stock=v.stock[row.key]
        if stock and stock.left>0 then
            deals[#deals+1]={label=getItemName(stock.crate).." - "..stock.price.." fichas (estoque: "..stock.left..")",
                sku="omega:"..row.key,group="buy",przOmegaAmmo=true,
                pbeOccurrence=schedule.occurrenceId,pbeSku=row.key,
                give={{item=cfg.currency,count=stock.price}},get={{item=stock.crate,count=1}}}
        end
    end
    -- An empty offer closes the old generation, so a sold-out row cannot linger.
    if #deals==0 then JeevesNPC.API.closeTrade(p);return false end
    return JeevesNPC.API.openTrade(p,rec.id,{title="Bashar / Municao Omega / Fichas Atlas",deals=deals})
end
function S.validate(p,rec,deal,schedule)
    if not cfg.enabled or not boot() or not validActor(p,rec) or not deal or deal.przOmegaAmmo~=true then return false,"forbiddenreward" end
    if schedule and (not schedule.event or not schedule.event.omega or schedule.occurrenceId~=deal.pbeOccurrence
        or os.time()<schedule.startEpoch or os.time()>=schedule.endEpoch) then return false,"eventended" end
    local v=visits[deal.pbeOccurrence]
    if not v or rec.meta.pbeOccurrence~=deal.pbeOccurrence or os.time()<v.start or os.time()>=v.finish then return false,"staleevent" end
    local stock=v.stock[deal.pbeSku]
    if not stock or stock.left<1 then return false,"limit" end
    -- Historical visits stay readable after an arsenal removal. Their old SKU
    -- must not remain purchasable through a quote from before the update.
    local active=false
    for _,row in ipairs(cfg.stock) do
        if row.key==deal.pbeSku and row.crate==stock.crate then active=true;break end
    end
    if not active then return false,"forbiddenreward" end
    local give,get=deal.give,deal.get
    if not give or #give~=1 or give[1].item~=cfg.currency or give[1].count~=stock.price
        or not get or #get~=1 or get[1].item~=stock.crate or get[1].count~=1 then return false,"forbiddenreward" end
    for _,t in pairs(transactions) do
        if t.owner==p:getUsername() and t.status=="reserved" then return false,"pendingreview" end
    end
    return true
end
local function sync(fn,container,item)if fn then pcall(fn,container,item) end end
function S.executeDeal(p,rec,deal)
    local ok,why=S.validate(p,rec,deal);if not ok then return false,why end
    local JN=JeevesNPC
    if not JN or not JN._srv or not JN._srv.playerNear or not JN._srv.playerNear(p,rec) then return false,"toofar" end
    local inv=p:getInventory();if not inv then return false,"cannotafford" end
    local list=inv:getAllTypeRecurse(cfg.currency)
    local stock=visits[deal.pbeOccurrence].stock[deal.pbeSku]
    if not list or list:size()<stock.price then return false,"cannotafford" end
    local coins={}
    for i=0,stock.price-1 do
        local item=list:get(i);local container=item:getContainer()
        if not container or item:getFullType()~=cfg.currency then return false,"cannotafford" end
        coins[#coins+1]={item=item,container=container}
    end
    local id=serial+1
    if not record({"R",tostring(id),deal.pbeOccurrence,deal.pbeSku,p:getUsername()}) then return false,"pendingreview" end
    local added
    ok=pcall(function()added=inv:AddItem(stock.crate) end)
    if not ok or not added then record({"F",tostring(id)});return false,"grantfailed" end
    added:getModData().PRZOmegaShopReceipt=id
    local removed={}
    ok=pcall(function()
        for _,coin in ipairs(coins) do
            coin.container:Remove(coin.item)
            removed[#removed+1]=coin
        end
    end)
    if not ok then
        local restored=pcall(function()
            inv:Remove(added)
            for _,coin in ipairs(removed) do coin.container:AddItem(coin.item) end
        end)
        if restored then
            record({"F",tostring(id)})
            return false,"grantfailed"
        end
        return false,"pendingreview"
    end
    for _,coin in ipairs(coins) do sync(sendRemoveItemFromContainer,coin.container,coin.item) end
    sync(sendAddItemToContainer,inv,added)
    -- If closing the receipt fails, the stock remains reserved and further
    -- purchases by this account require review. Never repeat or mint a refund.
    record({"C",tostring(id)})
    return true
end
-- Operator-only server API after checking inventory + receipt + currency debit.
-- No client command exposes it, and expiry/reconnect never clears reservations.
function S.resolveReview(admin,id,outcome)
    if not admin or admin:getAccessLevel()~="admin" or not boot() then return false end
    local t=transactions[tonumber(id)]
    if not t or t.status~="reserved" then return false end
    if outcome=="completedAfterAudit" then return record({"C",tostring(id)}) end
    if outcome=="notExecutedAfterAudit" then return record({"F",tostring(id)}) end
    return false
end
function S.stock(occurrence)
    if not boot() then return end
    -- Diagnostic copy prevents a caller accidentally modifying the live stock.
    local out={};local v=visits[occurrence]
    if v then for k,row in pairs(v.stock) do out[k]=row.left end end
    return out
end
