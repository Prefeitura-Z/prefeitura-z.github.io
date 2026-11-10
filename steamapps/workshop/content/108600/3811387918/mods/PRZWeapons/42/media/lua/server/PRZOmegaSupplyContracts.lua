-- Private ammunition contracts, independent from the five-stage research.
-- Only Bashar's validated server dialogue calls grant; no client command grants
-- progress, selects a weapon, or changes the one-crate reward.
if isClient() and not isServer() then return end
require "PRZOmegaWeaponsConfig"
require "PRZOmegaSupplyConfig"
local W=PRZOmegaWeapons
local Q={}
W.SupplyContracts=Q
local cfg=W.SupplyConfig
local counted=setmetatable({}, {__mode="k"})
local durable={}
local reconcile
local function pager()return PagerContractsPRZ and PagerContractsPRZ.Server end
local function root()
    local r=ModData.getOrCreate(cfg.modDataKey)
    r.schema=cfg.schema;r.players=r.players or {};return r
end
local function username(p)return p and tostring(p:getUsername()) end
local function account(p,create)
    local who=username(p);if not who or who=="" then return end
    local r=root()
    if not r.players[who] and create then r.players[who]={cycle=1,progress=0,receipts={}} end
    if r.players[who] and reconcile then reconcile(r.players[who],who) end
    return r.players[who],who
end
local function present(p)
    if not p or p:isDead() then return false end
    if not isServer() then return true end
    local list=getOnlinePlayers()
    for i=0,list:size()-1 do if list:get(i)==p then return true end end
    return false
end
local function hours()return PagerContractsPRZ.worldAgeHours() end
local function notice(p,text)
    if isServer() then sendServerCommand(p,PagerContractsPRZ.MODULE or "PagerContractsPRZ","message",{text=text})
    elseif HaloTextHelper then HaloTextHelper.addText(p,text) end
end
local function learned(p,name)
    local known=p and p.getKnownRecipes and p:getKnownRecipes()
    return known~=nil and known:contains(name)
end
local function current(a)
    local s=pager();return s and a.contractID and s.getData().contracts[a.contractID]
end
local function matches(a,c,who)
    return a and a.offer and c and c.przArmoryKind=="supply" and c.przArmoryOwner==who
        and c.id==a.contractID and c.przArmoryCycle==a.cycle and c.przArmorySupplyProfile==a.offer.key
end
function Q.isCurrent(p,c)
    local a,who=account(p)
    return matches(a,c,who) and (cfg.enabled or c.claimedByUsername==who)
        and present(p) and learned(p,a.offer.recipe)
end
function Q.progress(c,who)
    local a=root().players[who]
    if not matches(a,c,who) then return 0,true end
    return math.min(a.offer.target,a.progress),false
end
local function journal(who,cycle,status,reward,id)
    local f=getFileWriter(cfg.journal,true,true);if not f then return false end
    local a=root().players[who];local v=a and a.offer
    if not v then f:close();return false end
    return pcall(function()
        f:writeln(table.concat({who,cycle,status,reward,tostring(id or ""),v.weapon,v.key,
            tostring(a.contractID or ""),tostring(hours()),tostring(v.target),v.objective,
            tostring(v.maxZ or ""),tostring(v.rounds)},"\t"));f:close()
    end)
end
local function loadJournal()
    durable={}
    local f=getFileReader(cfg.journal,false);if not f then return end
    while true do
        local line=f:readLine();if not line then break end
        local fields={}
        for field in string.gmatch(line.."\t","([^\t]*)\t") do fields[#fields+1]=field end
        local who,cycle,status,reward,id=fields[1],fields[2],fields[3],fields[4],fields[5]
        if who and cycle and tonumber(cycle) and reward then
            durable[who.."/"..cycle]={status=status,reward=reward,itemID=id,owner=who,cycle=tonumber(cycle),
                weapon=fields[6],key=fields[7],contractID=tonumber(fields[8]),hour=tonumber(fields[9]),
                target=tonumber(fields[10]),objective=fields[11],maxZ=tonumber(fields[12]),rounds=tonumber(fields[13])}
        end
    end
    f:close()
end
reconcile=function(a,who)
    local latest
    for _,log in pairs(durable) do
        if log.owner==who and log.cycle>=a.cycle and (not latest or log.cycle>latest.cycle) then latest=log end
    end
    if not latest or a.offer and a.cycle==latest.cycle and latest.status~="delivered" then return end
    local cycle=tostring(latest.cycle)
    a.cycle=latest.cycle
    if latest.status=="delivered" then
        a.receipts[cycle]={delivered=true,contractID=latest.contractID,reward=latest.reward,itemID=latest.itemID}
        a.lastWeapon=latest.weapon;a.notBefore=(latest.hour or hours())+cfg.cooldownHours
        a.cycle=a.cycle+1;a.offer=nil;a.contractID=nil;a.progress=0;return
    end
    for _,weapon in ipairs(W.SupplyWeapons) do
        if weapon.id==latest.weapon then
            for _,profile in ipairs(weapon.offers) do
                if profile.key==latest.key and profile.reward==latest.reward then
                    a.offer={weapon=weapon.id,recipe=weapon.recipe,weaponName=weapon.name}
                    for k,v in pairs(profile) do a.offer[k]=v end
                    for _,k in ipairs({"target","objective","maxZ","rounds"}) do
                        if latest[k]~=nil then a.offer[k]=latest[k] end
                    end
                    a.contractID=latest.contractID
                    if latest.status=="reserved" then a.progress=a.offer.target end
                    return
                end
            end
        end
    end
    a.deliveryReview=cycle -- Removed/changed profile requires an operator audit.
end
local function findReceipt(inv,cycle,who,reward)
    if not inv then return end
    local items=inv:getItems()
    for i=0,items:size()-1 do
        local item=items:get(i);local md=item:getModData()
        if md.PRZOmegaSupplyReceipt==cycle and md.PRZOmegaSupplyOwner==who and item:getFullType()==reward then return item end
        if instanceof(item,"InventoryContainer") then
            local found=findReceipt(item:getItemContainer(),cycle,who,reward);if found then return found end
        end
    end
end
function Q.deliver(p,c,st)
    if not present(p) or not c or not st or not st.completed or c.przArmoryOwner~=username(p)
        or not c.acceptedBy or c.acceptedBy[username(p)]~=st or c.claimedByUsername~=username(p) then return false end
    local a,who=account(p);if not a then return false end
    local cycle=tostring(c.przArmoryCycle)
    local receipt=a.receipts[cycle]
    if receipt and receipt.delivered and receipt.contractID==c.id then st.rewardClaimed=true;return true end
    if not Q.isCurrent(p,c) or st.expired or c.enabled==false or a.progress<a.offer.target then return false end
    local reward=a.offer.reward
    local log=durable[who.."/"..cycle]
    if log and log.reward~=reward then a.deliveryReview=cycle;return false end
    local inv=p:getInventory();if not inv then return false end
    local item=findReceipt(inv,cycle,who,reward)
    if not item and log and log.status~="failed" and log.status~="offered" then
        if log.status~="delivered" then a.deliveryReview=cycle;return false end
    elseif not item then
        if not getScriptManager():getItem(reward) or not journal(who,cycle,"reserved",reward) then return false end
        durable[who.."/"..cycle]={status="reserved",reward=reward}
        local ok,result=pcall(function()return inv:AddItem(reward)end)
        if not ok then a.deliveryReview=cycle;return false end
        item=result
        if not item then
            if journal(who,cycle,"failed",reward) then durable[who.."/"..cycle].status="failed" end
            return false
        end
        item:getModData().PRZOmegaSupplyReceipt=cycle
        item:getModData().PRZOmegaSupplyOwner=who
    end
    if item and (not log or log.status~="delivered") then
        if not journal(who,cycle,"delivered",reward,item:getID()) then a.deliveryReview=cycle;return false end
        durable[who.."/"..cycle]={status="delivered",reward=reward,itemID=tostring(item:getID())}
    end
    a.receipts[cycle]={delivered=true,contractID=c.id,reward=reward,itemID=item and tostring(item:getID()) or log and log.itemID}
    st.rewardClaimed=true;a.deliveryReview=nil
    a.lastWeapon=a.offer.weapon;a.offer=nil;a.contractID=nil;a.progress=0
    a.cycle=a.cycle+1;a.notBefore=hours()+cfg.cooldownHours
    if item and isServer() then pcall(sendAddItemToContainer,inv,item) end
    return true
end
local function choose(p,a)
    local eligible={}
    for _,weapon in ipairs(W.SupplyWeapons) do
        if learned(p,weapon.recipe) then eligible[#eligible+1]=weapon end
    end
    if #eligible==0 then return end
    if cfg.preferDifferentWeapon and #eligible>1 and a.lastWeapon then
        local filtered={}
        for _,w in ipairs(eligible) do if w.id~=a.lastWeapon then filtered[#filtered+1]=w end end
        if #filtered>0 then eligible=filtered end
    end
    local weapon=eligible[ZombRand(#eligible)+1]
    local profile=weapon.offers[ZombRand(#weapon.offers)+1]
    local offer={weapon=weapon.id,recipe=weapon.recipe,weaponName=weapon.name}
    for k,v in pairs(profile) do offer[k]=v end
    return offer
end
function Q.grant(p,schedule)
    local s=pager();local o=PrefeituraOmega
    if not cfg.enabled or not s or s.PRZ_ARMORY_PATCH_API~=1 or not o or not o.ensureOperation
        or not present(p) or not schedule or not schedule.event or not schedule.event.omega
        or os.time()<schedule.startEpoch or os.time()>=schedule.endEpoch then return false end
    local op=o.ensureOperation(schedule);if not op or op.status~="active" then return false end
    local a,who=account(p,true);local c=current(a)
    local pending=durable[who.."/"..tostring(a.cycle)]
    local currentState=c and c.acceptedBy and c.acceptedBy[who]
    if pending and pending.status=="reserved" and not (currentState and currentState.completed) then
        -- Never overwrite an unfinished delivery reservation with a fresh offer
        -- after expiration or a world-save rollback.
        a.deliveryReview=tostring(a.cycle)
        notice(p,"A entrega anterior esta reservada e exige verificacao administrativa.");return false
    end
    if c then
        local st=c.acceptedBy and c.acceptedBy[who]
        if st and st.completed then
            if not Q.deliver(p,c,st) then notice(p,"Abastecimento pendente: consulte o Pager; a mesma recompensa sera retomada.");return false end
            c=nil
        elseif c.enabled==false or st and st.expired then
            -- Expiration does not reroll the weapon or ammunition. A new
            -- acceptance starts fresh progress for this same snapshotted offer.
            a.contractID=nil;a.progress=0;c=nil
        elseif c.claimedByUsername then
            notice(p,"Seu contrato de abastecimento ja esta no Pager. Conclua o objetivo aceito.");return true
        end
    end
    if (a.notBefore or 0)>hours() then
        notice(p,"Bashar prepara outro lote. Retorne em "..math.ceil(a.notBefore-hours()).." horas do mundo.");return false
    end
    if a.deliveryReview then notice(p,"A entrega anterior exige verificacao administrativa antes de outro abastecimento.");return false end
    if not a.offer then a.offer=choose(p,a) end
    if not a.offer or not learned(p,a.offer.recipe) then
        notice(p,"Leia primeiro um dossie de arma Omega que use cartuchos. Emissores de agua nao usam municao.");return false
    end
    if not c then
        -- Persist the quoted weapon/profile before publishing it. Reopening a
        -- dialogue or a crash before the next world save cannot reroll the offer.
        if not journal(who,tostring(a.cycle),"offered",a.offer.reward) then return false end
        local v=a.offer
        local where=v.maxZ and " nos pisos "..v.maxZ.." a -8" or " no laboratorio"
        local targets=v.objective=="mutant" and "mutantes (Tanks tambem contam)" or "ocultistas"
        c=s.publishNPCContract({przNpcExclusive=true,
            przStoryKey="PRZ_SUPPLY_"..who.."_"..a.cycle.."_"..tostring(a.reissue or 0),
            przArmoryOwner=who,przArmoryKind="supply",przArmoryCycle=a.cycle,przArmorySupplyProfile=v.key,
            customIconKey="OMEGA",title="Bashar / Abastecimento "..v.weaponName,
            description="Elimine "..v.target.." "..targets..where.." do Atlas, depois de aceitar. Recompensa: uma caixa de "..v.label.." com "..v.rounds.." unidades, para "..v.weaponName..". Abra a caixa pelo craft ou duplo clique. O Pager permite um contrato ativo por vez; a pesquisa dos dossies continua separada.",
            shortDescription=v.weaponName.." / "..v.label.." / "..v.rounds.." unidades",
            type=PagerContractsPRZ.TYPE_ZOMBIES,targetAmount=v.target,rewardAmount=0,
            rewardItems={{itemType=v.reward,amount=1,displayName="Caixa Omega / "..v.label}},
            deadlineHours=cfg.deadlineHours,difficulty=PagerContractsPRZ.DIFFICULTY_HARDCORE})
        if not c then return false end
        a.contractID=c.id;a.reissue=(a.reissue or 0)+1
        if not journal(who,tostring(a.cycle),"offered",a.offer.reward) then return false end
    end
    return s.grantNPCContract(p,c.id)
end
function Q.death(z,proposedKiller,confirmedByAtlas)
    if not z or counted[z] or not confirmedByAtlas and not z:isDead() and z:getHealth()>0 then return end
    local o=PrefeituraOmega
    if not o or not o.actorGroup or not o.isAtlasAt or not o.isAtlasAt(z:getX(),z:getY(),z:getZ()) then return end
    if JeevesZones and JeevesZones.isHumanNPCShell(z) then return end
    local kind=o.actorGroup(z);if not kind then return end
    local p=confirmedByAtlas and proposedKiller or z:getAttackedBy()
    if not p or not instanceof(p,"IsoPlayer") or not present(p) or not o.isAtlasAt(p:getX(),p:getY(),p:getZ()) then return end
    -- Remember a confirmed death even when no supply contract is accepted yet.
    -- Its delayed Atlas packet must not credit a contract accepted afterwards.
    local md=z:getModData();if md.PRZOmegaSupplyCounted then return end
    counted[z]=true;md.PRZOmegaSupplyCounted=true
    local a,who=account(p);if not a then return end
    local c=current(a);if not c or not Q.isCurrent(p,c) then return end
    local st=c.acceptedBy and c.acceptedBy[who]
    if c.claimedByUsername~=who or not st or not st.accepted or st.completed or st.expired then return end
    local v=a.offer
    if v.maxZ and (math.floor(z:getZ())>v.maxZ or math.floor(p:getZ())>v.maxZ) then return end
    if v.objective~=kind and not (v.objective=="mutant" and kind=="boss") then return end
    a.progress=math.min(v.target,a.progress+1)
    if pager().updatePlayerProgressAndSync then pager().updatePlayerProgressAndSync(p) end
end
-- Explicit server-only recovery after an operator audits offline inventories.
-- This API is not exposed through OnClientCommand.
function Q.resolveDeliveryReview(actor,target,cycle,decision)
    if not actor or not actor.getAccessLevel or tostring(actor:getAccessLevel()):lower()~="admin" or not present(target) then return false end
    local a,who=account(target)
    if not a or a.deliveryReview~=cycle or tostring(a.cycle)~=cycle or not a.offer then return false end
    local log=durable[who.."/"..cycle]
    if not log or log.status~="reserved" or log.reward~=a.offer.reward then return false end
    local c=current(a);local st=c and c.acceptedBy and c.acceptedBy[who]
    if not c or not st or not st.accepted or c.enabled==false or not Q.isCurrent(target,c) then return false end
    local found;local list=getOnlinePlayers()
    for i=0,list:size()-1 do found=findReceipt(list:get(i):getInventory(),cycle,who,log.reward);if found then break end end
    if found then
        if not journal(who,cycle,"delivered",log.reward,found:getID()) then return false end
        durable[who.."/"..cycle]={status="delivered",reward=log.reward,itemID=tostring(found:getID())}
    elseif decision=="retryAfterAudit" then
        if not journal(who,cycle,"failed",log.reward) then return false end
        durable[who.."/"..cycle]={status="failed",reward=log.reward}
    else return false end
    a.deliveryReview=nil
    -- A server-written reservation proves this cycle passed completion before
    -- the crash. An explicit operator audit can restore those lost flags only.
    a.progress=a.offer.target;st.completed=true;st.expired=false
    return c and st and Q.deliver(target,c,st) or false
end
Events.OnInitGlobalModData.Add(function()root();loadJournal()end)
function Q.report()
    local r={weapons=0,crates=0,conventionalRecipes=0,problems={}}
    local function problem(s)r.problems[#r.problems+1]=s;print("[PRZ Omega supply] "..s)end
    local manager=getScriptManager()
    for _,w in ipairs(W.SupplyWeapons) do
        local gun=instanceItem(w.id)
        if not gun or not gun:getAmmoType() or gun:getAmmoType():getItemKey()~=w.ammoItem then
            problem("Municao divergente: "..w.id)
        else r.weapons=r.weapons+1 end
    end
    for _,box in ipairs(W.SupplyCrates) do
        local item=instanceItem(box.id)
        local recipe=manager:getCraftRecipe("PRZWeapons."..box.recipe)
        if not item or not recipe or recipe:needToBeLearn() or not manager:getItem(box.ammo) then
            problem("Caixa/receita ausente: "..box.id)
        else r.crates=r.crates+1 end
    end
    for _,key in ipairs({"9mm","556","308","Shells"}) do
        local recipe=manager:getCraftRecipe("PRZWeapons.PRZOmega_Municao_"..key)
        if recipe and recipe:needToBeLearn() then r.conventionalRecipes=r.conventionalRecipes+1
        else problem("Receita convencional ausente: "..key) end
    end
    print("[PRZ Omega supply] weapons="..r.weapons.."/"..#W.SupplyWeapons.." crates="..r.crates.."/"..#W.SupplyCrates.." conventionalRecipes="..r.conventionalRecipes.."/4 problems="..#r.problems)
    return r
end
if Events.OnServerStarted then Events.OnServerStarted.Add(Q.report) end
