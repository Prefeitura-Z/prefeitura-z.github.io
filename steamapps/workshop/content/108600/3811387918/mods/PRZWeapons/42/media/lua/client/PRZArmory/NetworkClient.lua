require "PRZArmory/Network"
require "PRZArmory/CannonEffects"
local N=PRZArmory.Network
local C={nextHello=0,started=false,pendingVisuals={},weaponRevisions={},visualRevisions={},playerRevision=0}
PRZArmory.NetworkClient=C
local function zombie(id)
    local cell=getCell();local list=cell and cell:getZombieList()
    if not list then return nil end
    for i=0,list:size()-1 do local q=list:get(i);if tostring(q:getOnlineID())==tostring(id) then return q end end
end
local function player(id)
    local p=getPlayerByOnlineID and getPlayerByOnlineID(id)
    if p then return p end
    local localPlayer=getSpecificPlayer(0)
    if localPlayer and tostring(localPlayer:getOnlineID())==tostring(id) then return localPlayer end
end
local function inventoryItem(inv,id,depth)
    depth=depth or 0;if not inv or depth>20 then return nil end
    local items=inv:getItems()
    for i=0,items:size()-1 do
        local item=items:get(i)
        if tostring(item:getID())==tostring(id) then return item end
        if instanceof(item,"InventoryContainer") then
            local found=inventoryItem(item:getItemContainer(),id,depth+1)
            if found then return found end
        end
    end
end
local function weapon(p,id)
    if not p then return nil end
    local w=p:getPrimaryHandItem()
    if w and tostring(w:getID())==tostring(id) then return w end
    return inventoryItem(p:getInventory(),id)
end
function C.onServerCommand(module,command,args)
    if not isClient() or module~=N.module or type(args)~="table" then return end
    local p=getSpecificPlayer(0)
    if command=="CannonPrepared" then
        if p and PRZArmory.CannonAmmo then PRZArmory.CannonAmmo.acceptPrepared(p,args) end
    elseif command=="WeaponState" and p then
        local w=weapon(p,args.weaponID)
        if not w then return end
        local key=tostring(args.weaponID)
        if (args.revision or 0)<=(C.weaponRevisions[key] or 0) then return end
        C.weaponRevisions[key]=args.revision
        w:setCurrentAmmoCount(args.ammo or 0);w:setRoundChambered(args.chamber==true);w:setSpentRoundChambered(args.spent==true)
        if PRZArmory.CannonAmmo then PRZArmory.CannonAmmo.onNetworkState(p,w,args) end
        local md=w:getModData()
        md.PRZArmoryNewArmory=md.PRZArmoryNewArmory or {};md.PRZArmoryNewArmory.hits=args.hits or 0
        md.PRZArmoryArmory=md.PRZArmoryArmory or {};md.PRZArmoryArmory.storedUses=args.storedUses or 0;md.PRZArmoryArmory.progressShots=args.progressShots or 0
        md.PRZArmoryArsenal=md.PRZArmoryArsenal or {};md.PRZArmoryArsenal.grenades=args.grenades or 0
        if PRZArmory.NewWeapons and PRZArmory.NewWeapons.onNetworkState then PRZArmory.NewWeapons.onNetworkState(p,w,args) end
    elseif command=="WeaponVisual" then
        local actor=player(args.attackerID)
        if not actor or N.isLocal(actor) then return end
        local w=actor:getPrimaryHandItem();local key=tostring(args.attackerID)..":"..tostring(args.weaponID)
        if not w or tostring(w:getID())~=tostring(args.weaponID) or w:getFullType()~="PRZWeapons.OmegaJanus7"
            or (args.revision or 0)<=(C.visualRevisions[key] or 0) then return end
        if args.model~="PRZArmoryJanus7" and args.model~="PRZArmoryJanus7Ready" and args.model~="PRZArmoryJanus7Electric" then return end
        C.visualRevisions[key]=args.revision
        if w:getWeaponSprite()~=args.model then w:setWeaponSprite(args.model);actor:resetEquippedHandsModels() end
    elseif command=="MechanicsVisual" then
        local actor=player(args.attackerID)
        local w=actor and actor:getPrimaryHandItem()
        if actor and not N.isLocal(actor) and w and tostring(w:getID())==tostring(args.weaponID)
            and PRZArmory.GunMechanics then PRZArmory.GunMechanics.onRemote(actor,w,args) end
    elseif command=="VisualClear" then
        local actor=player(args.attackerID)
        if actor then actor:setAttachedItem("PRZArmoryLeftHandVisual",nil);actor:setVariable("PRZArmoryDual",false) end
    elseif command=="DualVisualState" and p then
        C.pendingVisuals[tostring(args.weaponID)]={itemID=args.itemID,untilMs=getTimestampMs()+5000}
    elseif command=="WaterState" and p then
        local w=weapon(p,args.weaponID);local fc=w and w:getFluidContainer()
        if fc and args.amount then fc:adjustAmount(args.amount) end
        if args.sourceID then
            local src=inventoryItem(p:getInventory(),args.sourceID);local source=src and src:getFluidContainer()
            if source and args.sourceAmount then source:adjustAmount(args.sourceAmount) end
        end
        if w and PRZArmory.Arsenal then PRZArmory.Arsenal.syncWater(w) end
    elseif command=="ZombieState" then
        local q=zombie(args.zombieID)
        if not q then return end
        local attacker=player(args.attackerID)
        if attacker then q:setAttackedBy(attacker) end
        -- Native later bullet hits must never be healed by an earlier skill
        -- snapshot. Native CharacterDeath packets create the corpse once.
        q:setHealth(math.min(q:getHealth(),math.max(0,args.health or q:getHealth())))
        if args.knockback and not q:isDead() and attacker and PRZArmory.HammerKnockback then
            N.applying=true;PRZArmory.HammerKnockback.start(q,attacker);N.applying=false
        end
    elseif command=="StunState" then
        local q=zombie(args.zombieID);local attacker=player(args.attackerID)
        if not q or not PRZArmory.Combat then return end
        if (args.seconds or 0)>0 and attacker then
            N.applying=true;PRZArmory.Combat.stun(q,attacker,args.seconds);N.applying=false
        else
            local stun=PRZArmory.Combat.stunByZombie[q]
            if stun then stun.left=0 end
        end
    elseif command=="CombatEffect" then
        local attacker=player(args.attackerID)
        if args.kind=="cannon" then
            local w=attacker and weapon(attacker,args.weaponID)
            if w and w:getFullType()=="PRZWeapons.OmegaBlackDragonCannon" and PRZArmory.CannonEffects then
                PRZArmory.CannonEffects.emit(attacker,w,{x=args.x,y=args.y,z=args.z,
                    dx=args.dx,dy=args.dy,range=args.radius,halfAngle=args.angle})
                if not N.isLocal(attacker) and PRZArmory.CannonReload then PRZArmory.CannonReload.fire(attacker,w) end
            end
        elseif args.kind=="janus" then
            if attacker and PRZArmory.JanusEffects and (PRZArmory.Config.weapons["PRZWeapons.OmegaJanus7"] or {}).visualsEnabled~=false then
                for _,id in ipairs(args.targets or {}) do local q=zombie(id);if q then PRZArmory.JanusEffects.emit(attacker,q) end end
            end
        elseif args.kind~="hammer" and PRZArmory.Effects then
            PRZArmory.Effects.emit(args.kind,args.x,args.y,args.z,args.dx,args.dy,args.radius,args.angle,1,args.outerEdge)
        end
        if attacker and args.sound then attacker:playSound(args.sound) end
    end
end
function C.hello(p)
    if not isClient() or not N.isLocal(p) or p:isDead() then return end
    N.request(p,"Hello");C.started=true;C.nextHello=getTimestampMs()+30000
end
local function update()
    if not isClient() then return end
    local p=getSpecificPlayer(0)
    for id,pending in pairs(C.pendingVisuals) do
        local w=p and weapon(p,id);local item=p and inventoryItem(p:getInventory(),pending.itemID)
        if w and item and PRZArmory.Arsenal and PRZArmory.Arsenal.onNetworkVisual then
            item:getModData().PRZArmoryVisualWeaponID=id
            PRZArmory.Arsenal.onNetworkVisual(p,w,item);C.pendingVisuals[id]=nil
        elseif pending.untilMs<=getTimestampMs() then C.pendingVisuals[id]=nil end
    end
    if p and not p:isDead() and (not C.started or getTimestampMs()>=C.nextHello) then C.hello(p) end
end
Events.OnServerCommand.Add(C.onServerCommand)
Events.OnTick.Add(update)
Events.OnCreatePlayer.Add(function(_,p)C.hello(p)end)
Events.OnEquipPrimary.Add(function(p)if isClient() and N.isLocal(p) then C.hello(p) end end)
Events.OnGameStart.Add(function()C.started=false;C.weaponRevisions={};C.visualRevisions={};C.playerRevision=0;update()end)
Events.OnMainMenuEnter.Add(function()C.started=false;C.nextHello=0;C.pendingVisuals={};C.weaponRevisions={};C.visualRevisions={};C.playerRevision=0 end)
return C
