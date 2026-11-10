-- The dedicated server owns rewards, charge, ammo used by scripted skills and
-- special damage. Native firearm projectiles continue through PZ's hit packets.
if not isServer() then return end
require "PRZArmory/AttachedLocations"
require "PRZArmory/Network"
require "PRZArmory/Config"
require "PRZArmory/Core"
require "PRZArmory/Sandbox"
require "PRZArmory/CannonAmmoCompatibility"

local N,Config,Core=PRZArmory.Network,PRZArmory.Config,PRZArmory.Core
local S={players=setmetatable({},{__mode="k"}),burns={},stuns={},projectiles={},blasts={},pending={},lastMs=nil,pollMs=0}
PRZArmory.NetworkServer=S
local commands={}
S.weaponStates={}
local function connected(p)
    local list=getOnlinePlayers()
    if not list then return false end
    for i=0,list:size()-1 do if list:get(i)==p then return true end end
    return false
end
local function ledger()
    local r=ModData.getOrCreate("PRZ_WEAPONS_ARMORY_STATE_V1")
    r.weapons=r.weapons or {};return r.weapons
end
local function now() return getTimestampMs() end
local function number(value,low,high)
    local v=tonumber(value)
    if not v or v~=v or v==math.huge or v==-math.huge then return nil end
    if v<low or v>high then return nil end
    return v
end
local function send(player,command,args)
    if player then sendServerCommand(player,N.module,command,args or {})
    else sendServerCommand(N.module,command,args or {}) end
end
local function playerState(p)
    local s=S.players[p]
    if not s then s={weapons={},requests={},requestOrder={},lastKills=p:getZombieKills()};S.players[p]=s end
    return s
end
local function totalAmmo(w)
    return w:getCurrentAmmoCount()+(w:haveChamber() and w:isRoundChambered() and 1 or 0)
end
local function weaponState(p,w)
    local state=playerState(p);local id=tostring(w:getID());local s=S.weaponStates[id]
    if not s then
        local saved=ledger()[id] or {}
        s={weapon=w,ammo=totalAmmo(w),cooldowns={},hits=Core.count(saved.hits),
            uses=Core.count(saved.uses),progress=Core.count(saved.progress),
            grenades=math.min(1,Core.count(saved.grenades)),hitShots={}}
        S.weaponStates[id]=s
        state.weapons[id]=s
    end
    s.weapon=w;state.weapons[id]=s
    return s
end
local function publishWeapon(p,w,ack,requestID)
    if not w or not p:getInventory():containsRecursive(w) or not Config.weapons[w:getFullType()] then return end
    local s=weaponState(p,w);local md=w:getModData()
    ledger()[tostring(w:getID())]={hits=s.hits,uses=s.uses,progress=s.progress,grenades=s.grenades}
    s.revision=(s.revision or 0)+1
    md.PRZArmoryNewArmory=md.PRZArmoryNewArmory or {};md.PRZArmoryNewArmory.hits=s.hits
    md.PRZArmoryArmory=md.PRZArmoryArmory or {};md.PRZArmoryArmory.storedUses=s.uses;md.PRZArmoryArmory.progressShots=s.progress
    md.PRZArmoryArsenal=md.PRZArmoryArsenal or {};md.PRZArmoryArsenal.grenades=s.grenades
    local spec=Config.weapons[w:getFullType()]
    if spec and spec.kind=="janus7" then
        local electric=s.electricUntil~=nil and s.electricUntil>now()
        local sprite=electric and (spec.electricSprite or "PRZArmoryJanus7Electric")
            or s.hits>=(spec.chargeHits or 50) and "PRZArmoryJanus7Ready" or (spec.baseSprite or "PRZArmoryJanus7")
        if s.visual~=sprite then
            s.visual=sprite;s.visualRevision=(s.visualRevision or 0)+1
            w:setWeaponSprite(sprite)
            send(nil,"WeaponVisual",{attackerID=p:getOnlineID(),weaponID=w:getID(),model=sprite,revision=s.visualRevision})
        end
    end
    send(p,"WeaponState",{weaponID=w:getID(),revision=s.revision,ammo=w:getCurrentAmmoCount(),chamber=w:isRoundChambered(),
        spent=w:isSpentRoundChambered(),hits=s.hits,storedUses=s.uses,progressShots=s.progress,
        grenades=s.grenades,electric=s.electricUntil~=nil and s.electricUntil>now(),
        electricLeft=s.electricUntil and math.max(0,(s.electricUntil-now())/1000) or 0,ack=ack,requestID=requestID})
end
local function publishPlayer(_) end -- No global kill/rage replication: source axe is not imported.
local function usable(p,args,kind)
    if not p or not connected(p) or p:isDead() or not p:getSquare() or p:isAsleep() or p:getVehicle()
        or p:isSitOnGround() or Config.effectsEnabled==false then return nil end
    local w=p:getPrimaryHandItem();local spec=w and Config.weapons[w:getFullType()]
    if not w or not spec or not p:getInventory():containsRecursive(w) or w:getCondition()<=0 or tostring(w:getID())~=tostring(args.weaponID)
        or kind and spec.kind~=kind then return nil end
    if spec.kind=="cannon" and PRZArmory.CannonAmmoCompatibility then PRZArmory.CannonAmmoCompatibility.apply(p,w) end
    if p:isDoShove() or p:isPerformingShoveAnimation() or p:isPerformingStompAnimation() then return nil end
    return w,spec,weaponState(p,w)
end
local function cooldown(s,key,seconds)
    local t=now()
    if (s.cooldowns[key] or 0)>t then return false end
    s.cooldowns[key]=t+math.max(0,seconds or 0)*1000
    return true
end
local function clearLine(x,y,z,q)
    local sq=q and q:getSquare()
    return sq and math.floor(z)==math.floor(q:getZ()) and not LosUtil.lineClearCollide(
        math.floor(x),math.floor(y),math.floor(z),sq:getX(),sq:getY(),sq:getZ(),false)
end
local function targets(x,y,z,dx,dy,radius,angle)
    local list=getCell():getZombieList();local out={}
    for i=0,list:size()-1 do
        local q=list:get(i)
        if q and not q:isDead() and not q:isInvulnerable() and q:getSquare()
            and not (JeevesZones and JeevesZones.isHumanNPCShell and JeevesZones.isHumanNPCShell(q))
            and Core.inShape(x,y,z,q:getX(),q:getY(),q:getZ(),dx,dy,radius,angle)
            and clearLine(x,y,z,q) then
            out[#out+1]={zombie=q,distance=(q:getX()-x)^2+(q:getY()-y)^2}
        end
    end
    table.sort(out,function(a,b)return a.distance<b.distance end)
    return out
end
local function healthSnapshot(q,p,w,knockback)
    send(nil,"ZombieState",{zombieID=q:getOnlineID(),health=q:getHealth(),dead=q:isOnKillDone(),
        attackerID=p:getOnlineID(),weaponType=w:getFullType(),knockback=knockback==true,
        x=q:getX(),y=q:getY(),z=q:getZ()})
end
local function damage(q,p,w,amount,knockback)
    if JeevesZones and JeevesZones.isHumanNPCShell and JeevesZones.isHumanNPCShell(q) then return false end
    if amount<=0 or q:isDead() or q:isInvulnerable() or not q:getSquare() or p:isDead() or not connected(p) then return false end
    q:setAttackedBy(p)
    if PrefeituraOmega and PrefeituraOmega.noteAttack then PrefeituraOmega.noteAttack(p,q) end
    q:applyDamage(amount)
    if q:getHealth()<=0 and not q:isOnKillDone() then
        p:setZombieKills(p:getZombieKills()+1)
        q:Kill(w,p)
        q:die() -- Native dedicated-server death/corpse packet and inventory.
    end
    healthSnapshot(q,p,w,knockback)
    return true
end
local function ignite(q,p,w,spec)
    if not spec.burnSeconds or spec.burnSeconds<=0 or q:isDead() then return end
    for _,b in ipairs(S.burns) do
        if b.zombie==q then b.left=math.max(b.left,spec.burnSeconds);b.player=p;b.weapon=w;
            b.damage=math.max(b.damage,spec.burnDamage or 0);return end
    end
    if #S.burns<(Config.maxBurning or 96) then
        S.burns[#S.burns+1]={zombie=q,player=p,weapon=w,left=spec.burnSeconds,tick=0,damage=spec.burnDamage or 0}
    end
end
local function effect(kind,p,x,y,z,dx,dy,radius,angle,extra)
    local e=extra or {};e.kind=kind;e.attackerID=p:getOnlineID();e.x=x;e.y=y;e.z=z;
    e.dx=dx or 1;e.dy=dy or 0;e.radius=radius or 1;e.angle=angle or math.pi
    send(nil,"CombatEffect",e)
end
local function blast(p,w,spec,x,y,z,kind)
    local radius=spec.blastRadius or 1.8
    local selected=targets(x,y,z,1,0,radius,math.pi)
    for i=1,math.min(#selected,Config.maxTargets or 64) do
        local q=selected[i].zombie
        damage(q,p,w,spec.blastDamage or spec.damage or .45)
        if kind=="holyblast" then ignite(q,p,w,spec) end
    end
    effect(kind,p,x,y,z,1,0,radius,math.pi)
end
local function takeRound(w)
    if w:isJammed() or totalAmmo(w)<1 then return false end
    if w:haveChamber() then
        if not w:isRoundChambered() then return false end
        if w:getCurrentAmmoCount()>0 then w:setCurrentAmmoCount(w:getCurrentAmmoCount()-1)
        else w:setRoundChambered(false) end
        w:setSpentRoundChambered(false)
    else w:setCurrentAmmoCount(w:getCurrentAmmoCount()-1) end
    return true
end
local function updateRage(p)
    local md=p:getModData();local kills=Core.count(p:getZombieKills());local d=md.PRZArmoryTyphoonRage
    if type(d)~="table" then d={schema=1,kills=0,lastKills=kills};md.PRZArmoryTyphoonRage=d end
    local w=p:getPrimaryHandItem();local needed=Config.axeRageKills or 25
    if w and w:getFullType()=="PRZWeapons.OmegaTyphoonAxe" and Config.effectsEnabled~=false then
        d.kills=math.min(needed,Core.count(d.kills)+math.max(0,kills-Core.count(d.lastKills)))
    end
    d.lastKills=kills
end
local function cleanupVisuals(p)
    local w=p:getPrimaryHandItem();local spec=w and Config.weapons[w:getFullType()]
    local keep=not p:isDead() and spec and spec.dual and spec.leftVisual or nil
    local inv=p:getInventory()
    for _,full in ipairs({"PRZWeapons.OmegaDualInfinityHandVisual","PRZWeapons.OmegaDualInfinityMechanicalHandVisual"}) do
        if full~=keep then
            local items=inv:getAllTypeRecurse(full);local remove={}
            for i=0,items:size()-1 do
                local item=items:get(i)
                if item:getModData().PRZArmoryVisualWeaponID then remove[#remove+1]=item end
            end
            for _,item in ipairs(remove) do
                if p:getAttachedItem("PRZArmoryLeftHandVisual")==item then
                    p:setAttachedItem("PRZArmoryLeftHandVisual",nil)
                    send(nil,"VisualClear",{attackerID=p:getOnlineID()})
                end
                local bag=item:getContainer()
                if bag then bag:Remove(item);N.removed(bag,item) end
            end
        end
    end
end
commands.Hello=function(p,args)
    
    local w=p:getPrimaryHandItem()
    if w and Config.weapons[w:getFullType()] then publishWeapon(p,w) end
    publishPlayer(p)

    local online=getOnlinePlayers()
    for i=0,online:size()-1 do
        local other=online:get(i);local held=other:getPrimaryHandItem()
        if other~=p and held and held:getFullType()=="PRZWeapons.OmegaJanus7" then
            local state=weaponState(other,held)
            send(p,"WeaponVisual",{attackerID=other:getOnlineID(),weaponID=held:getID(),
                model=state.visual or "PRZArmoryJanus7",revision=state.visualRevision or 1})
        end
    end
end
commands.WeaponShot=function(p,args)
    local w,spec,s=usable(p,args)
    if not w or spec.kind~="cannon" and spec.kind~="flame" and spec.kind~="gatling" then return end
    if spec.kind=="cannon" and (not s.cannonPrepared or (s.cannonPreparedUntil or 0)<now()
        or args.prepareID~=s.cannonPrepareID) then return end
    if (s.nativeCredit or 0)<1 or (s.nativeUntil or 0)<now() then return false end
    local interval=spec.kind=="cannon" and 1 or spec.kind=="gatling" and .15 or .15
    if (s.nextPaidShot or 0)>now() then return end
    local remaining=totalAmmo(w)
    -- Only native ammunition already removed by PZ can create a shot ticket.
    if remaining>=s.ammo then return false end
    local paid=1;s.ammo=remaining
    s.nativeCredit=s.nativeCredit-1;s.nextPaidShot=now()+interval*1000
    if spec.kind=="cannon" then s.cannonPrepared=false end
    if spec.kind=="gatling" then
        local restored=0
        for i=1,paid do if ZombRand(100000)/1000<(spec.freeAmmoChance or 20) then restored=restored+1 end end
        if restored>0 then w:setCurrentAmmoCount(math.min(w:getMaxAmmo(),w:getCurrentAmmoCount()+restored)) end
        s.ammo=totalAmmo(w)
    elseif spec.kind=="cannon" or args.special==true then
        s.shotCredit=math.min(8,(s.shotCredit or 0)+paid);s.shotUntil=now()+2000
    end
    if spec.kind=="flame" and args.special~=true then
        local required=math.max(1,spec.shotsPerUse or 5)
        s.progress=s.progress+paid;s.uses=s.uses+math.floor(s.progress/required);s.progress=s.progress%required
    end
    publishWeapon(p,w)
    return true
end
commands.CannonPrepare=function(p,args)
    local w,spec,s=usable(p,args,"cannon")
    if not w then return end
    local nonce=number(args.prepareNonce,1,1000000000000)
    if not nonce or nonce~=math.floor(nonce) then return end
    local actual=totalAmmo(w)
    local ready=not w:isJammed() and actual>=1
    if ready and nonce==s.cannonPrepareNonce then
        ready=s.cannonPrepared==true
        if ready then s.cannonPreparedUntil=now()+10000 end
    elseif ready and (not s.cannonPrepareNonce or nonce>s.cannonPrepareNonce) then
        -- Only an acknowledged, already loaded server weapon may create the
        -- one-round baseline. Client counts and positions are never read.
        S.cannonPrepareSequence=(S.cannonPrepareSequence or 0)+1
        s.ammo=actual;s.cannonPrepareNonce=nonce;s.cannonPrepareID=S.cannonPrepareSequence
        s.cannonPrepared=true;s.cannonPreparedUntil=now()+10000
    else ready=false end
    -- A delayed retry after native ammo reached0 must not revoke a paid shot
    -- whose WeaponShot command is still arriving on another reliable stream.
    send(p,"CannonPrepared",{weaponID=w:getID(),requestID=args.requestID,prepareNonce=nonce,
        prepareID=ready and s.cannonPrepareID or nil,ready=ready})
end
commands.WeaponPrepare=function(p,args)
    local w=usable(p,args)
    if w then
        local s=weaponState(p,w);local ammo=totalAmmo(w)
        if ammo>s.ammo then s.ammo=ammo end
    end
end
commands.DualVisual=function(p,args)
    local w,spec=usable(p,args)
    if not w or not spec.dual or not spec.leftVisual then return end
    local inv=p:getInventory();local prop=inv:getFirstTypeRecurse(spec.leftVisual)
    if not prop then
        prop=instanceItem(spec.leftVisual)
        if not prop or not inv:AddItem(prop) or not inv:containsRecursive(prop) then return end
        prop:getModData().PRZArmoryVisualWeaponID=tostring(w:getID())
        N.added(inv,prop)
    else prop:getModData().PRZArmoryVisualWeaponID=tostring(w:getID());prop:syncItemFields() end
    send(p,"DualVisualState",{weaponID=w:getID(),itemID=prop:getID()})
end
-- Presentation only. A request cannot change ammunition, create a projectile,
-- award charge or damage a target. Native attack packets remain authoritative.
commands.MechanicsVisual=function(p,args)
    local w,spec,s=usable(p,args)
    if not w or not w:isRanged() or spec.water or spec.kind=="holygrenade"
        or Config.effectsEnabled==false or spec.visualsEnabled==false then return end
    if spec.kind=="janus7" and s.electricUntil and s.electricUntil>now() then return end
    local kind=args.kind
    if kind~="shot" and kind~="rack" and kind~="rackEject" and kind~="dry" then return end
    if kind=="rackEject" and not w:isRackAfterShoot() then return end
    if not cooldown(s,"mechanics_"..kind,kind=="shot" and .025 or .10) then return end
    s.mechanicsSerial=(s.mechanicsSerial or 0)+1
    send(nil,"MechanicsVisual",{attackerID=p:getOnlineID(),weaponID=w:getID(),serial=s.mechanicsSerial,
        kind=kind,side=spec.dual and args.side=="L" and "L" or "R",empty=args.empty==true})
end
commands.Attack=function(p,args)
    local w,spec,s=usable(p,args)
    if not w or spec.kind~="cannon" and spec.kind~="flame" and not spec.axe then return end
    if spec.axe then
        updateRage(p);local rage=p:getModData().PRZArmoryTyphoonRage
        if rage.kills<(Config.axeRageKills or 25) or p:getStats():get(CharacterStat.ENDURANCE)<spec.enduranceCost
            or not cooldown(s,"axe",spec.cooldown) then publishPlayer(p);return end
        rage.kills=0
        p:getStats():set(CharacterStat.ENDURANCE,math.max(0,p:getStats():get(CharacterStat.ENDURANCE)-spec.enduranceCost))
    else
        -- Retry after the reliable native weapon-field packet when it arrives
        -- later than this command. The request cannot manufacture paid rounds.
        if not s.shotCredit or s.shotCredit<1 or (s.shotUntil or 0)<now() then return false end
        if spec.kind=="flame" then if s.uses<1 then return end;s.uses=s.uses-1 end
        s.shotCredit=s.shotCredit-1
    end
    local f=p:getForwardDirection();local x,y,z=p:getX(),p:getY(),p:getZ();local dx,dy=f:getX(),f:getY()
    local radius,angle=spec.range,spec.axe and math.pi or spec.halfAngle
    local selected=targets(x,y,z,dx,dy,radius,angle)
    for i=1,math.min(#selected,Config.maxTargets or 64) do
        local q=selected[i].zombie;local amount=spec.damage
        if spec.axe and selected[i].distance<(radius*spec.outerEdge)^2 then amount=amount*spec.innerDamageMultiplier end
        if spec.kind=="cannon" then
            -- The native carrier is harmless. One cone applies one direct
            -- damage transaction per selected zombie, with native recoil.
            q:Hit(w,p,0,true,1.25,true)
            q:setHitForce(1.25)
            q:getHitDir():set(q:getX()-x,q:getY()-y);q:getHitDir():normalize()
        end
        damage(q,p,w,amount);ignite(q,p,w,spec)
    end
    if spec.kind=="cannon" then
        effect("cannon",p,x+dx*.55,y+dy*.55,z+.35,dx,dy,radius,angle,{weaponID=w:getID()})
    else
        effect(spec.kind,p,x,y,z,dx,dy,radius,angle,{outerEdge=spec.outerEdge,sound=spec.specialSound})
    end
    publishWeapon(p,w);publishPlayer(p)
    return true
end
commands.Hammer=function(p,args)
    local w,spec,s=usable(p,args,"hammer")
    if not w or p:getStats():get(CharacterStat.ENDURANCE)<spec.enduranceCost or not cooldown(s,"hammer",spec.cooldown) then return end
    local f=p:getForwardDirection();local selected=targets(p:getX(),p:getY(),p:getZ(),f:getX(),f:getY(),spec.range,spec.halfAngle)
    for i=1,math.min(#selected,Config.maxTargets or 64) do
        local q=selected[i].zombie
        q:Hit(w,p,0,true,2.5,true)
        q:setHitForce(2.5);q:getHitDir():set(q:getX()-p:getX(),q:getY()-p:getY());q:getHitDir():normalize()
        damage(q,p,w,spec.damage,spec.knockbackEnabled~=false)
    end
    p:getStats():set(CharacterStat.ENDURANCE,math.max(0,p:getStats():get(CharacterStat.ENDURANCE)-spec.enduranceCost))
    effect("hammer",p,p:getX(),p:getY(),p:getZ(),1,0,spec.range,math.pi,{sound=#selected>0 and "PRZArmory_StormHammerHeavyHit" or nil})
end
commands.SVDLoad=function(p,args)
    local w,spec,s=usable(p,args,"svdex")
    if not w or s.grenades>=1 or not cooldown(s,"svdload",spec.grenadeReloadSeconds) then return end
    local inv=p:getInventory();local item=inv:getFirstTypeRecurse("PRZWeapons.OmegaSVDGrenade")
    if not item or not item:getContainer() then return end
    local bag=item:getContainer();bag:Remove(item)
    if inv:containsRecursive(item) then return end
    N.removed(bag,item);s.grenades=1;publishWeapon(p,w)
end
commands.SVDLaunch=function(p,args)
    local w,spec,s=usable(p,args,"svdex")
    if not w or not p:isAiming() or s.grenades<1 or #S.projectiles>=64 or not cooldown(s,"svdlaunch",.5) then return end
    local f=p:getForwardDirection();local dx,dy=f:getX(),f:getY();local length=math.sqrt(dx*dx+dy*dy)
    if length<.001 then return end
    s.grenades=s.grenades-1;dx,dy=dx/length,dy/length
    S.projectiles[#S.projectiles+1]={player=p,weapon=w,spec=spec,x=p:getX(),y=p:getY(),z=p:getZ(),dx=dx,dy=dy,distance=0}
    effect("svdlaunch",p,p:getX(),p:getY(),p:getZ(),dx,dy,1,0);publishWeapon(p,w)
end
commands.WaterJet=function(p,args)
    local w,spec,s=usable(p,args)
    if not w or not spec.water or not p:isAiming() then return end
    local interval=spec.shotSeconds or (w:getFireMode()=="Auto" and spec.rapidShotSeconds or spec.normalShotSeconds) or .08
    local tank=w:getFluidContainer();local amount=Config.waterPerShot or .01
    if not tank or tank:getAmount()<amount or tank:getRatioForFluid(Fluid.Water)+tank:getRatioForFluid(Fluid.TaintedWater)<.9999
        or not cooldown(s,"water",interval) then return end
    tank:adjustAmount(math.max(0,tank:getAmount()-amount));w:syncItemFields()
    local f=p:getForwardDirection();local dx,dy=f:getX(),f:getY();local length=math.sqrt(dx*dx+dy*dy)
    if length<.001 then return end;dx,dy=dx/length,dy/length
    local x,y,z=p:getX(),p:getY(),p:getZ();local reach=.25
    for d=.5,spec.range,.25 do
        local tx,ty=x+dx*d,y+dy*d;local sq=getCell():getGridSquare(math.floor(tx),math.floor(ty),math.floor(z))
        if not sq or LosUtil.lineClearCollide(math.floor(x),math.floor(y),math.floor(z),math.floor(tx),math.floor(ty),math.floor(z),false) then break end
        reach=d;if sq:has(IsoFlagType.burning) then sq:stopFire() end
        local moving=sq:getMovingObjects()
        for i=0,moving:size()-1 do
            local chr=moving:get(i)
            if instanceof(chr,"IsoGameCharacter") and chr:isOnFire() then chr:StopBurning() end
            if instanceof(chr,"IsoZombie") then for n=#S.burns,1,-1 do if S.burns[n].zombie==chr then table.remove(S.burns,n) end end end
        end
    end
    effect("waterjet",p,x,y,z,dx,dy,reach,0)
    send(p,"WaterState",{weaponID=w:getID(),amount=tank:getAmount()})
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
commands.WaterRefill=function(p,args)
    local w,spec,s=usable(p,args)
    if not w or not spec.water or not cooldown(s,"refill",1.5) then return end
    local src=inventoryItem(p:getInventory(),args.sourceID)
    if not src or src==w or not p:getInventory():containsRecursive(src) then return end
    local tank,source=w:getFluidContainer(),src:getFluidContainer()
    if not tank or not source or source:getAmount()<=0
        or source:getRatioForFluid(Fluid.Water)+source:getRatioForFluid(Fluid.TaintedWater)<.9999 then return end
    local amount=math.min(tank:getFreeCapacity(),source:getAmount())
    if amount<=0 then return end
    FluidContainer.Transfer(source,tank,amount)
    w:syncItemFields();src:syncItemFields()
    send(p,"WaterState",{weaponID=w:getID(),amount=tank:getAmount(),sourceID=src:getID(),sourceAmount=source:getAmount()})
end
commands.JanusStart=function(p,args)
    local w,spec,s=usable(p,args,"janus7")
    if not w or s.hits<(spec.chargeHits or 50) or s.electricUntil and s.electricUntil>now() then publishWeapon(p,w,"JanusStart",args.requestID);return end
    s.hits=0;s.electricUntil=now()+(spec.electricSeconds or 8)*1000;s.ammo=totalAmmo(w)
    publishWeapon(p,w,"JanusStart",args.requestID)
end
commands.JanusEnd=function(p,args)
    local s=playerState(p).weapons[tostring(args.weaponID)]
    local w=s and s.weapon
    -- A cancellation may arrive after the physical hand has already changed.
    -- It may end this player's existing session, never another owner's weapon.
    if w and p:getInventory():containsRecursive(w) and w:getFullType()=="PRZWeapons.OmegaJanus7" then
        s.electricUntil=nil;publishWeapon(p,w,"JanusEnd",args.requestID)
    end
end
commands.JanusPulse=function(p,args)
    local w,spec,s=usable(p,args,"janus7")
    if not w or not p:isAiming() then return end
    if not w or not s.electricUntil or s.electricUntil<=now() then if w then publishWeapon(p,w) end;return end
    local selected=targets(p:getX(),p:getY(),p:getZ(),1,0,spec.electricRange or 60,math.pi)
    if #selected==0 or not cooldown(s,"electric",spec.pulseSeconds or .2) or not takeRound(w) then return end
    local ids={}
    for i=1,math.min(#selected,spec.electricTargets or 3) do
        local q=selected[i].zombie;ids[#ids+1]=q:getOnlineID();damage(q,p,w,spec.electricDamage or .20)
    end
    s.ammo=totalAmmo(w)
    effect("janus",p,p:getX(),p:getY(),p:getZ(),1,0,spec.electricRange or 60,math.pi,{targets=ids,sound="PRZArmory_Janus7Electric"})
    publishWeapon(p,w);publishPlayer(p)
end

function S.onClientCommand(module,command,p,args)
    if module~=N.module or not commands[command] or not p or not connected(p) or p:isDead() or type(args)~="table" then return end
    local request=number(args.requestID,1,1000000000000)
    if not request or request~=math.floor(request) then return end
    local s=playerState(p)
    if request<=(s.lastRequest or 0) then return end
    s.lastRequest=request
    s.requests[request]=true;s.requestOrder[#s.requestOrder+1]=request
    if #s.requestOrder>128 then s.requests[table.remove(s.requestOrder,1)]=nil end
    if PRZArmory.Sandbox then PRZArmory.Sandbox.refresh() end
    local ok,result=pcall(commands[command],p,args)
    if not ok then print("[PRZArmory multiplayer] "..command..": "..tostring(result))
    elseif result==false and (command=="WeaponShot" or command=="Attack") and #S.pending<128 then
        S.pending[#S.pending+1]={player=p,command=command,args=args,untilMs=now()+1500}
    end
end
local function shotKey(p)
    -- B42.21: NetworkPlayerAI.getShotID exists in Java but is not exposed
    -- to Kahlua. The old protected call always failed on the dedicated
    -- server and used this same 100 ms fallback, logging a stack per hit.
    -- Keep the existing grouping and native hit validation unchanged.
    return math.floor(now()/100)
end
-- This event is fired by B42's verified remote PlayerHitZombiePacket. Client
-- requests cannot invent a hit, passive roll or JANUS charge point.
function S.onNativeHit(p,w,q,amount)
    if JeevesZones and JeevesZones.isHumanNPCShell and JeevesZones.isHumanNPCShell(q) then return end
    if not p or not w or not q or not instanceof(q,"IsoZombie") or Config.effectsEnabled==false
        or not connected(p) or p:isDead() or p:isDoShove() or p:getPrimaryHandItem()~=w
        or not p:getInventory():containsRecursive(w) or w:getCondition()<=0 then return end
    local spec=Config.weapons[w:getFullType()]
    if not spec then return end
    local dx,dy=q:getX()-p:getX(),q:getY()-p:getY()
    if math.floor(q:getZ())~=math.floor(p:getZ()) or dx*dx+dy*dy>(w:getMaxRange()+2)^2
        or LosUtil.lineClearCollide(math.floor(p:getX()),math.floor(p:getY()),math.floor(p:getZ()),
            math.floor(q:getX()),math.floor(q:getY()),math.floor(q:getZ()),false) then return end
    local s=weaponState(p,w);local key=tostring(shotKey(p));local id=tostring(q:getOnlineID())
    if s.nativeShotKey~=key then
        s.nativeShotKey=key;s.nativeCredit=1;s.nativeUntil=now()+1500
    end
    if s.lastShot~=key then s.lastShot=key;s.hitShots={};s.rolledShot=nil end
    if s.hitShots[id] then return end;s.hitShots[id]=true
    if s.electricUntil and s.electricUntil<=now() then s.electricUntil=nil end
    if spec.kind=="janus7" and not s.electricUntil then
        s.hits=math.min(spec.chargeHits or 50,s.hits+1);publishWeapon(p,w)
    elseif spec.onHitStun and not q:isDead() and not q:isInvulnerable() then
        local chance=spec.stunChance or 100
        if chance>0 and (chance>=100 or ZombRand(100)<chance) then
            local previous=S.stuns[q];local original=q:isUseless()
            if previous then original=previous.useless end
            S.stuns[q]={left=math.max(previous and previous.left or 0,spec.stunSeconds or 2),
                useless=original,player=p}
            q:setUseless(true);q:setTarget(nil)
            send(nil,"StunState",{zombieID=q:getOnlineID(),seconds=spec.stunSeconds or 2,attackerID=p:getOnlineID()})
        end
    elseif spec.kind=="balrog7" and not s.rolledShot then
        s.rolledShot=key
        if ZombRand(100)<(spec.procChance or 20) then
            S.blasts[#S.blasts+1]={player=p,weapon=w,spec=spec,x=q:getX(),y=q:getY(),z=q:getZ(),kind="balrog7blast"}
        end
    end
end
local exploded=setmetatable({},{__mode="k"})
function S.onThrowableExplode(trap,square)
    if not trap or not square or exploded[trap] or Config.effectsEnabled==false then return end
    local w,p=trap:getHandWeapon(),trap:getAttacker()
    if not w or not p or w:getFullType()~="PRZWeapons.OmegaHolyWaterGrenade" then return end
    exploded[trap]=true
    S.blasts[#S.blasts+1]={player=p,weapon=w,spec=Config.weapons[w:getFullType()],
        x=square:getX()+.5,y=square:getY()+.5,z=square:getZ(),kind="holyblast"}
end
function S.update()
    for p,state in pairs(S.players) do
        if not connected(p) or p:isDead() then
            for _,ws in pairs(state.weapons) do
                ws.electricUntil=nil;ws.nativeCredit=0;ws.shotCredit=0;ws.cannonPrepared=false
            end
            S.players[p]=nil
        end
    end
    local t=now();local dt=math.max(0,math.min(.1,(t-(S.lastMs or t))/1000));S.lastMs=t
    -- Custom commands and native ammunition packets use independent reliable
    -- streams. Retain an authenticated request briefly until its paid native
    -- shot is visible, without accepting a client-supplied ammo count.
    for i=1,#S.pending do
        local e=S.pending[i]
        if e and e.untilMs>t and not e.player:isDead() and connected(e.player) then
            local ok,result=pcall(commands[e.command],e.player,e.args)
            if not ok or result~=false then e.untilMs=0 end
        end
    end
    for i=#S.pending,1,-1 do if S.pending[i].untilMs<=t then table.remove(S.pending,i) end end
    for i=#S.blasts,1,-1 do local e=S.blasts[i];table.remove(S.blasts,i);blast(e.player,e.weapon,e.spec,e.x,e.y,e.z,e.kind) end
    for q,s in pairs(S.stuns) do
        s.left=s.left-dt
        if s.left<=0 or q:isDead() or not q:getSquare() then
            q:setUseless(s.useless);S.stuns[q]=nil;send(nil,"StunState",{zombieID=q:getOnlineID(),seconds=0})
        else q:setUseless(true);q:setTarget(nil) end
    end
    for i=#S.burns,1,-1 do
        local b=S.burns[i]
        if b.zombie:isDead() or not b.zombie:getSquare() or b.player:isDead() or not connected(b.player) then table.remove(S.burns,i)
        else
            local step=math.min(dt,b.left);b.left=b.left-step;b.tick=b.tick+step
            if b.tick>=(Config.burnInterval or .5) or b.left<=0 then damage(b.zombie,b.player,b.weapon,b.damage*b.tick);b.tick=0 end
            if b.left<=0 then table.remove(S.burns,i) end
        end
    end
    for i=#S.projectiles,1,-1 do
        local e=S.projectiles[i];local travel=math.min(e.spec.grenadeSpeed*dt,e.spec.grenadeRange-e.distance);local done=e.player:isDead() or not connected(e.player)
        while travel>0 and not done do
            local step=math.min(.2,travel);local nx,ny=e.x+e.dx*step,e.y+e.dy*step
            if not getCell():getGridSquare(math.floor(nx),math.floor(ny),math.floor(e.z))
                or LosUtil.lineClearCollide(math.floor(e.x),math.floor(e.y),math.floor(e.z),math.floor(nx),math.floor(ny),math.floor(e.z),false) then done=true
            else e.x,e.y=nx,ny;e.distance=e.distance+step;travel=travel-step
                if #targets(e.x,e.y,e.z,1,0,.35,math.pi)>0 or e.distance>=e.spec.grenadeRange-.001 then done=true end
            end
        end
        if done then if not e.player:isDead() and connected(e.player) then blast(e.player,e.weapon,e.spec,e.x,e.y,e.z,"svdblast") end;table.remove(S.projectiles,i) end
    end
    if t>=S.pollMs then
        S.pollMs=t+500
        local players=getOnlinePlayers()
        for i=0,players:size()-1 do
            local p=players:get(i)
            cleanupVisuals(p)
            local current=p:getPrimaryHandItem()
            for _,saved in pairs(playerState(p).weapons) do
                if saved.electricUntil and (saved.electricUntil<=t or saved.weapon~=current or p:isDead()) then
                    saved.electricUntil=nil;publishWeapon(p,saved.weapon)
                end
            end
            if not p:isDead() then
                
                local w=p:getPrimaryHandItem()
                if w and Config.weapons[w:getFullType()] then
                    local s=weaponState(p,w);local ammo=totalAmmo(w)
                    if ammo>s.ammo then s.ammo=ammo end
                    if s.electricUntil and s.electricUntil<=t then s.electricUntil=nil;publishWeapon(p,w) end
                end
                publishPlayer(p)
            end
        end
    end
end
Events.OnClientCommand.Add(S.onClientCommand)
Events.OnTick.Add(S.update)
Events.OnWeaponHitXp.Add(S.onNativeHit)
Events.OnThrowableExplode.Add(S.onThrowableExplode)

if PRZWeaponsTestHarness then S._commands=commands;S._weaponState=weaponState end
return S
