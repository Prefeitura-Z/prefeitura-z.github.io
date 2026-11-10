XsLootBoxes = XsLootBoxes or {}
XsLootBoxes.Open = {}
local O = XsLootBoxes.Open
local X = XsLootBoxes

local function send(player,command,payload)
    if player and sendServerCommand then sendServerCommand(player,X.MODULE,command,payload or {}) end
end

local function nameOf(player)
    if not player then return "Player" end
    local ok,name=pcall(function() return player:getUsername() end)
    if ok and name and tostring(name)~="" then return tostring(name) end
    return "Player"
end

local function inventory(player)
    local ok,inv=pcall(function() return player:getInventory() end)
    if ok then return inv end
    return nil
end

local function itemId(item)
    local ok,id=pcall(function() return item:getID() end)
    if ok then return id end
    return nil
end

local function fullType(item)
    local ok,ft=pcall(function() return item:getFullType() end)
    if ok then return tostring(ft) end
    return ""
end

local function scanContainer(container, wantedId, wantedType, out)
    if not container or not container.getItems then return nil end
    local items=container:getItems()
    if not items then return nil end
    for i=0,items:size()-1 do
        local item=items:get(i)
        if item then
            if wantedId~=nil and tostring(itemId(item))==tostring(wantedId) then return item,container end
            if wantedType and fullType(item)==wantedType then out[#out+1]={item=item,container=container} end
            local inner=nil
            pcall(function() if item.getInventory then inner=item:getInventory() end end)
            if inner then
                local found,owner=scanContainer(inner,wantedId,wantedType,out)
                if found then return found,owner end
            end
        end
    end
    return nil
end

local function findById(player,id)
    local out={}; return scanContainer(inventory(player),id,nil,out)
end

local function collectByType(player,ft)
    local out={}; scanContainer(inventory(player),nil,ft,out); return out
end

local function remove(item,container)
    if not item then return false end
    local owner=container
    if not owner then pcall(function() owner=item:getContainer() end) end
    if not owner then return false end
    local ok=pcall(function() owner:Remove(item) end)
    if ok and sendRemoveItemFromContainer then pcall(sendRemoveItemFromContainer,owner,item) end
    return ok
end

local function dropOnGround(player,item)
    local sq=player and player:getSquare() or nil
    if not sq or not item then return false end
    return pcall(function() sq:AddWorldInventoryItem(item,0.5,0.5,0) end)
end

local function addItem(player,ft)
    local inv=inventory(player)
    if not inv then return nil end
    local ok,item=pcall(function() return inv:AddItem(ft) end)
    if ok and item then
        if sendAddItemToContainer then pcall(sendAddItemToContainer,inv,item) end
        return item
    end
    if instanceItem then
        local ok2,item2=pcall(instanceItem,ft)
        if ok2 and item2 and dropOnGround(player,item2) then return item2 end
    end
    return nil
end

local function totalWeight(entries)
    return X.Store.totalWeight(entries)
end

local function chatEntry(ft,weight,total)
    return { fullType=ft, name=X.resolveItemDisplayName(ft), pct=X.formatWeightSharePct(weight,total) }
end

local function grantOne(player,entry,color)
    local ft=tostring(entry.item or "")
    if ft=="" then return nil,nil,nil end
    local inv=inventory(player)
    if not inv then return nil,nil,nil end
    local A=X.AmmoGrant
    if A and A.isAmmoLootFullType(ft) then
        local granted=A.grantLooseAmmo(inv,player,ft,color,dropOnGround,1)
        if granted then return A.resolveGrantFullType(ft),nil,nil end
    end
    local item=addItem(player,ft)
    if not item then return nil,nil,nil end
    if X.FirearmGrant then
        X.FirearmGrant.prepareGrantedItem(player,item)
        X.FirearmGrant.grantCompanionMagazine(player,inv,item,dropOnGround)
        X.FirearmGrant.grantCompanionAmmo(player,inv,item,dropOnGround,color)
    end
    local nested=nil
    if X.isNestedLootBoxFullType(ft) then nested={ fullType=ft, itemId=itemId(item), color=X.nestedLootBoxColor(ft) } end
    return ft,item,nested
end

local function rollBox(player,box,color)
    local rolls=X.clampRolls(box.rolls)
    local count=rolls.min
    if rolls.max>rolls.min then count=X.randInt(rolls.min,rolls.max+1) end
    local multiplier=X.getQuantityMultiplier()
    local granted,chat,nested={},{},{}
    local total=totalWeight(box.entries)
    for _=1,count do
        local entry=X.Store.pick(box.entries)
        if entry then
            for _copy=1,multiplier do
                local ft,_,nb=grantOne(player,entry,color)
                if ft then
                    granted[#granted+1]=ft
                    chat[#chat+1]=chatEntry(ft,entry.weight,total)
                    if nb then nested[#nested+1]=nb end
                end
            end
        end
    end
    return granted,chat,nested,multiplier
end

local function broadcast(payload)
    if not getOnlinePlayers or not sendServerCommand then return end
    local players=getOnlinePlayers()
    if not players then return end
    for i=0,players:size()-1 do
        local p=players:get(i)
        if p then send(p,X.SRV_CHAT_BROADCAST,payload) end
    end
end

local function playStart(player)
    pcall(function() if player and player.getEmitter then player:getEmitter():playSound(X.SOUND_OPEN_SHAKE) end end)
end

local function announceOpen(player,color,count)
    broadcast({ kind="opening", player=nameOf(player), color=color, count=count or 1, tier=X.tierDisplayLabel(color) })
end

local function announceRewards(player,color,items)
    if #items>0 then broadcast({ kind="rewards", player=nameOf(player), color=color, items=items }) end
end

local function configuredBox(color)
    local box=X.Store.getBox(color)
    if not box or type(box.entries)~="table" or #box.entries<1 then return nil end
    return box
end

function O.handle(player,args)
    if not player or type(args)~="table" then return end
    local requested=tostring(args.boxFullType or "")
    local color=X.colorFromFullType(requested)
    if not color then return end
    local item,container=findById(player,args.itemId)
    if not item then send(player,X.SRV_OPEN_FAILED,{color=color,reason="item_missing",chainReveal=args.chainReveal}); return end
    if fullType(item)~=requested then send(player,X.SRV_OPEN_FAILED,{color=color,reason="item_mismatch",chainReveal=args.chainReveal}); return end
    local box=configuredBox(color)
    if not box then send(player,X.SRV_OPEN_FAILED,{color=color,reason="empty_table"}); return end
    announceOpen(player,color,1); playStart(player)
    if not remove(item,container) then send(player,X.SRV_OPEN_FAILED,{color=color,reason="item_missing"}); return end
    local granted,chat,nested,mult=rollBox(player,box,color)
    announceRewards(player,color,chat)
    send(player,X.SRV_OPEN_RESULT,{color=color,granted=granted,nestedBoxes=nested,quantityMultiplier=mult,chainReveal=args.chainReveal==true})
end

function O.handleAll(player,args)
    if not player or type(args)~="table" then return end
    local requested=tostring(args.boxFullType or "")
    local color=X.colorFromFullType(requested)
    if not color then return end
    local list=collectByType(player,requested)
    if #list<1 then send(player,X.SRV_OPEN_FAILED,{color=color,reason="item_missing"}); return end
    local box=configuredBox(color)
    if not box then send(player,X.SRV_OPEN_FAILED,{color=color,reason="empty_table"}); return end
    local wanted=math.floor(tonumber(args.count) or #list)
    local n=math.min(#list,math.max(1,wanted),X.OPEN_ALL_BOX_CAP)
    if n==1 then O.handle(player,{boxFullType=requested,itemId=itemId(list[1].item)}); return end
    announceOpen(player,color,n); playStart(player)
    for i=1,n do remove(list[i].item,list[i].container) end
    local all,allChat,allNested={},{},{}; local maxMult=1; local boosted=0
    for _=1,n do
        local g,c,nb,m=rollBox(player,box,color)
        for _,v in ipairs(g) do all[#all+1]=v end
        for _,v in ipairs(c) do allChat[#allChat+1]=v end
        for _,v in ipairs(nb) do allNested[#allNested+1]=v end
        if m>1 then boosted=boosted+1; if m>maxMult then maxMult=m end end
    end
    announceRewards(player,color,allChat)
    send(player,X.SRV_OPEN_RESULT,{color=color,granted=all,boxCount=n,nestedBoxes=allNested,quantityMultiplier=maxMult,boostedBoxCount=boosted})
end
