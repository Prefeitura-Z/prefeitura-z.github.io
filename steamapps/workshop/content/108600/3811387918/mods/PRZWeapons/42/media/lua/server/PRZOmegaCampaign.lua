-- Server-only campaign. No client command can add progress or choose a reward.
if isClient() and not isServer() then return end
require "PRZOmegaCampaignConfig"
require "PRZOmegaSupplyContracts"
PRZOmegaWeapons=PRZOmegaWeapons or {}
local W=PRZOmegaWeapons
local C={PATCH_API=1}
W.Campaign=C
local cfg=W.CampaignConfig
local counted=setmetatable({}, {__mode="k"})
local lastTick=0
local originalGrant
local function pager()return PagerContractsPRZ and PagerContractsPRZ.Server end
local function root()
    local r=ModData.getOrCreate(cfg.modDataKey)
    r.schema=cfg.schema;r.players=r.players or {}
    return r
end
local function username(p)return p and tostring(p:getUsername()) end
local function present(p)
    if not isServer() then return p~=nil end
    local players=getOnlinePlayers()
    for i=0,players:size()-1 do if players:get(i)==p then return true end end
    return false
end
local function account(p)
    local who=username(p);if not who or who=="" then return nil end
    local r=root()
    if not r.players[who] then r.players[who]={cycle=1,stage=1,progress=0,awarded={},receipts={}} end
    return r.players[who],who
end
local function currentContract(a)
    local s=pager();return s and a.contractID and s.getData().contracts[a.contractID]
end
local function activeState(p,a)
    local c=currentContract(a);local who=username(p)
    local st=c and c.acceptedBy and c.acceptedBy[who]
    if c and c.claimedByUsername==who and st and st.accepted and not st.expired and not st.completed then return c,st end
end
function C.isCurrent(p,c)
    if c and c.przArmoryKind=="supply" then return W.SupplyContracts.isCurrent(p,c) end
    local a=account(p)
    return a~=nil and c~=nil and c.przArmoryOwner==username(p)
        and c.id==a.contractID and c.przArmoryCycle==a.cycle and c.przArmoryStage==a.stage
end
function C.progress(c,who)
    if c and c.przArmoryKind=="supply" then return W.SupplyContracts.progress(c,who) end
    local a=root().players[who]
    if not a or c.przArmoryOwner~=who or a.contractID~=c.id
        or a.cycle~=c.przArmoryCycle or a.stage~=c.przArmoryStage then return 0,true end
    return math.min(cfg.stages[a.stage].target,a.progress),false
end
local durable={}
local function choose(a,who)
    local receipt=who and durable[who.."/"..tostring(a.cycle)..":5"]
    if receipt then a.reward=receipt.itemType;return a.reward end
    if a.reward then return a.reward end
    local pool={}
    for _,entry in ipairs(W.Firearms) do
        if not cfg.preferUnawarded or not a.awarded[entry.manual] then pool[#pool+1]=entry.manual end
    end
    if #pool==0 then
        if not cfg.repeatAfterCollection then return nil end
        for _,entry in ipairs(W.Firearms) do pool[#pool+1]=entry.manual end
    end
    if #pool>0 then a.reward=pool[ZombRand(#pool)+1] end
    return a.reward
end
-- A durable pre-delivery reservation makes abrupt crashes fail closed. A missing
-- item after a process kill is ambiguous: automatic retries must not duplicate a
-- manual that could have been saved in another container/player. Clean restarts
-- and ordinary AddItem failure are recovered automatically.
local function journal(who,token,status,itemType,itemID)
    local f=getFileWriter("PRZWeaponsOmegaReceipts.log",true,true)
    if not f then return false end
    local ok=pcall(function()
        f:writeln(who.."\t"..token.."\t"..status.."\t"..tostring(itemType).."\t"..tostring(itemID or ""))
        f:close()
    end)
    return ok
end
local function loadJournal()
    durable={}
    local f=getFileReader("PRZWeaponsOmegaReceipts.log",false)
    if not f then return end
    while true do
        local line=f:readLine();if not line then break end
        local who,token,status,itemType,itemID=string.match(line,"^([^\t]+)\t([^\t]+)\t([^\t]+)\t([^\t]+)\t?(.*)$")
        if who then durable[who.."/"..token]={status=status,itemType=itemType,itemID=itemID} end
    end
    f:close()
end
local function findReceipt(inv,token,who)
    if not inv then return nil end
    local list=inv:getItems()
    for i=0,list:size()-1 do
        local item=list:get(i)
        if item:getModData().PRZOmegaReceipt==token and item:getModData().PRZOmegaOwner==who then return item end
        if instanceof(item,"InventoryContainer") then
            local found=findReceipt(item:getItemContainer(),token,who);if found then return found end
        end
    end
end
function C.deliver(p,c,st)
    if c and c.przArmoryKind=="supply" then return W.SupplyContracts.deliver(p,c,st) end
    -- Pager calls this ONLY after its authoritative progress check completes.
    if not p or not present(p) or p:isDead() or not st or not st.completed then return false end
    local a,who=account(p)
    local token=tostring(c.przArmoryCycle)..":"..tostring(c.przArmoryStage)
    local receipt=a and a.receipts[token]
    if receipt and receipt.delivered then st.rewardClaimed=true;return true end
    if not C.isCurrent(p,c) or a.progress<cfg.stages[a.stage].target then return false end
    if a.stage==5 then
        local log=durable[who.."/"..token]
        if log then a.reward=log.itemType end
        local reward=choose(a,who);if not reward then return false end
        local inv=p:getInventory();if not inv then return false end
        local item=findReceipt(inv,token,who)
        if log and log.itemType~=reward then return false end
        if not item and log and log.status~="failed" then
            -- A known committed delivery is never recreated, even if transferred.
            if log.status~="delivered" then a.deliveryReview=token;return false end
        elseif not item then
            if not getScriptManager():getItem(reward) then return false end
            if not journal(who,token,"reserved",reward) then return false end
            durable[who.."/"..token]={status="reserved",itemType=reward}
            local ok,result=pcall(function()return inv:AddItem(reward)end)
            if not ok then a.deliveryReview=token;return false end
            item=result
            if not item then
                if journal(who,token,"failed",reward) then durable[who.."/"..token].status="failed" end
                return false
            end
            item:getModData().PRZOmegaReceipt=token
            item:getModData().PRZOmegaOwner=who
            -- Mark before publishing. A failed network send re-syncs the existing item.
            if not journal(who,token,"delivered",reward,item:getID()) then a.deliveryReview=token;return false end
            durable[who.."/"..token]={status="delivered",itemType=reward,itemID=tostring(item:getID())}
        end
        if item and (not log or log.status~="delivered") then
            if not journal(who,token,"delivered",reward,item:getID()) then return false end
            durable[who.."/"..token]={status="delivered",itemType=reward,itemID=tostring(item:getID())}
        end
        a.awarded[reward]=true
        a.receipts[token]={delivered=true,itemType=reward,itemID=item and tostring(item:getID()) or log and log.itemID}
        a.deliveryReview=nil
        if item and isServer() then pcall(sendAddItemToContainer,inv,item) end
    else a.receipts[token]={delivered=true} end
    st.rewardClaimed=true
    a.progress=0;a.contractID=nil
    if a.stage==5 then a.stage=1;a.cycle=a.cycle+1;a.reward=nil else a.stage=a.stage+1 end
    return true
end
function C.grant(p,schedule)
    local s=pager();local o=PrefeituraOmega
    if not s or s.PRZ_ARMORY_PATCH_API~=C.PATCH_API or not o or not o.isAtlasAt or not o.actorGroup then
        print("[PRZWeapons] Campanha indisponivel: falta API Atlas/Pager ou patch PRZ_ARMORY_PATCH_API=1.")
        return false
    end
    if not p or p:isDead() or not schedule or not schedule.event or not schedule.event.omega
        or os.time()<schedule.startEpoch or os.time()>=schedule.endEpoch then return false end
    -- Preserve the existing operation's spawns and status; do not grant its older
    -- parallel contract or replace its damage, schedule, templates or rewards.
    local op=o.ensureOperation(schedule)
    if not op or op.status~="active" then return false end
    local a,who=account(p);local contract=currentContract(a)
    if contract then
        local st=contract.acceptedBy and contract.acceptedBy[who]
        if st and st.completed then C.deliver(p,contract,st);contract=currentContract(a) end
        if contract and (contract.enabled==false or st and st.expired) then a.contractID=nil;contract=nil end
    end
    if a.stage==1 and not cfg.repeatAfterCollection then
        local all=true;for _,e in ipairs(W.Firearms) do if not a.awarded[e.manual] then all=false end end
        if all then return false end
    end
    if not contract then
        local stage=cfg.stages[a.stage]
        local rewards={}
        if a.stage==5 then
            local reward=choose(a,who);if not reward then return false end
            rewards={{itemType=reward,amount=1,displayName="Dossie de fabricacao Omega"}}
        end
        contract=s.publishNPCContract({przNpcExclusive=true,
            przStoryKey="PRZ_ARMORY_"..who.."_"..a.cycle.."_"..a.stage.."_"..tostring(a.reissue or 0),
            przArmoryOwner=who,przArmoryCycle=a.cycle,przArmoryStage=a.stage,
            customIconKey="OMEGA",title="Bashar / "..stage.title,
            description=stage.description.." Aceite no Pager antes dos abates. Somente o seu progresso validado no Atlas conta. Volte a conversar com Bashar para a proxima etapa. Ciclo "..a.cycle..". A quinta etapa concede um dossie; as anteriores nao concedem itens ou pontos.",
            shortDescription="Operacao Omega / Complexo Atlas / "..a.stage.." de 5",
            type=PagerContractsPRZ.TYPE_ZOMBIES,targetAmount=stage.target,rewardAmount=0,
            rewardItems=rewards,deadlineHours=cfg.deadlineHours,difficulty=PagerContractsPRZ.DIFFICULTY_HARDCORE})
        if not contract then return false end
        a.contractID=contract.id;a.reissue=(a.reissue or 0)+1
    end
    return s.grantNPCContract(p,contract.id)
end
function C.death(z,proposedKiller,confirmedByAtlas)
    W.SupplyContracts.death(z,proposedKiller,confirmedByAtlas)
    if not z or counted[z] then return end
    if not confirmedByAtlas and not z:isDead() and z:getHealth()>0 then return end
    local o=PrefeituraOmega
    if not o or not o.actorGroup or not o.isAtlasAt or not o.isAtlasAt(z:getX(),z:getY(),z:getZ()) then return end
    if JeevesZones and JeevesZones.isHumanNPCShell(z) then return end
    local kind=o.actorGroup(z);if not kind then return end
    local p=confirmedByAtlas and proposedKiller or z:getAttackedBy()
    if not p or not instanceof(p,"IsoPlayer") or not present(p) or p:isDead() or not o.isAtlasAt(p:getX(),p:getY(),p:getZ()) then return end
    local a=account(p);if not a then return end
    local c=activeState(p,a);if not c or not C.isCurrent(p,c) then return end
    counted[z]=true -- One death can advance only the stage accepted at death time.
    local md=z:getModData();if md.PRZArmoryCampaignCounted then return end
    md.PRZArmoryCampaignCounted=true
    local st=cfg.stages[a.stage]
    if st.maxZ and (math.floor(z:getZ())>st.maxZ or math.floor(p:getZ())>st.maxZ) then return end
    if st.objective=="all" or st.objective==kind or st.objective=="mutant" and kind=="boss" then
        a.progress=math.min(st.target,a.progress+1)
        local s=pager();if s.updatePlayerProgressAndSync then s.updatePlayerProgressAndSync(p) end
    end
end
local function install()
    local o=PrefeituraOmega
    if o and o.grantContract and o.grantContract~=C.grant then
        originalGrant=o.grantContract
        o.grantContract=C.grant -- Bashar's existing validated dialogue calls this API.
        o.contractTimeNotice=function()
            return "A campanha do Arsenal tem cinco etapas individuais no Atlas. Aceite cada etapa no Pager e volte a conversar comigo para a proxima. O progresso da campanha e a colecao de dossies acompanham sua conta. Prazo por contrato: "..tostring(cfg.deadlineHours).." horas do mundo; se expirar, consulte Bashar para retomar a mesma etapa."
        end
    end
    -- The Atlas combat bridge resolves server corpse/attacker packets which can
    -- arrive after OnZombieDead. Use its actual confirmed-death API as well.
    if o and o.recordCombatDeath and o.recordCombatDeath~=C.recordDeath then
        local realDeath=o.recordCombatDeath
        C.recordDeath=function(z,killer)
            local result=realDeath(z,killer)
            C.death(z,killer,true)
            return result
        end
        o.recordCombatDeath=C.recordDeath
    end
end
function C.tick()
    if getTimestampMs()<lastTick+1000 then return end
    lastTick=getTimestampMs();install()
end
-- Trusted server API for an administrator resolving a durable reservation after
-- an abrupt process kill. It is intentionally absent from normal client commands.
-- Retry requires an explicit inventory/world/offline-save audit by the operator.
function C.resolveDeliveryReview(actor,target,token,decision)
    if not actor or not actor.getAccessLevel or tostring(actor:getAccessLevel()):lower()~="admin" then return false end
    if not target or target:isDead() then return false end
    local a,who=account(target)
    if not a or a.deliveryReview~=token or token~=tostring(a.cycle)..":5" or a.stage~=5 then return false end
    local log=durable[who.."/"..token]
    if not log or log.status~="reserved" then return false end
    a.reward=log.itemType
    local players=getOnlinePlayers();local found
    for i=0,players:size()-1 do
        found=findReceipt(players:get(i):getInventory(),token,who)
        if found then break end
    end
    if found then
        if not journal(who,token,"delivered",a.reward,found:getID()) then return false end
        durable[who.."/"..token]={status="delivered",itemType=a.reward,itemID=tostring(found:getID())}
    elseif decision=="retryAfterAudit" then
        if not journal(who,token,"failed",a.reward,"admin:"..username(actor)) then return false end
        durable[who.."/"..token]={status="failed",itemType=a.reward}
    else return false end
    a.deliveryReview=nil
    local c=currentContract(a);local st=c and c.acceptedBy and c.acceptedBy[who]
    return c and st and C.deliver(target,c,st) or false
end
Events.OnZombieDead.Add(C.death)
Events.OnTick.Add(C.tick)
Events.OnInitGlobalModData.Add(function()root();loadJournal();install()end)
if Events.OnServerStarted then Events.OnServerStarted.Add(install) end
if Events.OnGameStart then Events.OnGameStart.Add(install) end
