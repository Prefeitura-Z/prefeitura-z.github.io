require "PRZArmory/AttachedLocations"
require "PRZArmory/Network"
require "PRZArmory/Config"
require "PRZArmory/Core"
require "PRZArmory/Expansion"
require "PRZArmory/Combat"
require "PRZArmory/WaterCompatibility"
require "PRZArmory/HammerKnockback"
require "TimedActions/ISBaseTimedAction"
require "TimedActions/ISReloadWeaponAction"
require "TimedActions/ISInsertMagazine"
require "TimedActions/ISTimedActionQueue"
require "ISUI/ISFirearmRadialMenu"
-- The single-player server loads ISDestroyCursor from its BuildingObjects folder.
require "TimedActions/ISDestroyStuffAction"

PRZArmory = PRZArmory or {}
local A = {projectiles = {}, delays = setmetatable({}, {__mode = "k"})}
PRZArmory.Arsenal = A
local Config, Core, Reload = PRZArmory.Config, PRZArmory.Core, ISReloadWeaponAction
local nativeAttack, nativeShoot, nativeCanShoot = Reload.attackHook, Reload.onShoot, Reload.canShoot
local nativeReload, nativeRack, nativeRadial = Reload.BeginAutomaticReload, Reload.canRack, ISFirearmRadialMenu.checkWeapon
local GR = "PRZWeapons.OmegaSVDGrenade"
local LEFT_PROP = "PRZArmoryLeftHandVisual"
local HAMMER_SECONDS, HAMMER_IMPACT_SECONDS = 1.4, 0.72
local function specFor(w) local s = w and Config.weapons[w:getFullType()]; return s and s.arsenal and s end
local function applyDualRate(w,s)
    if s.kind=="dualinfinity" then
        w:setCyclicRateMultiplier(w:getFireMode()=="Auto" and s.rapidCyclicRate or s.normalCyclicRate)
    end
end
local function waterShotSeconds(w,s)
    return s.dual and (w:getFireMode()=="Auto" and s.rapidShotSeconds or s.normalShotSeconds) or s.shotSeconds
end
local function localPlayer(p) return PRZArmory.Network.isLocal(p) end
local function nonWeapon(p)
    return p:isDoShove() or p:isPerformingShoveAnimation() or p:isPerformingStompAnimation()
        or p:isDoGrapple() or p:isPerformingGrappleGrabAnimation() or p:isPerformingGrappleAnimation()
end
local function usable(p,w,allowAction)
    return Config.effectsEnabled ~= false and localPlayer(p) and not isGamePaused() and not p:isDead() and not p:isAsleep()
        and p:getSquare() and not p:getVehicle() and not p:isSitOnGround() and not nonWeapon(p)
        and p:getPrimaryHandItem() == w and w:getCondition() > 0
        and (allowAction or not ISTimedActionQueue.isPlayerDoingAction(p))
end
local function state(w)
    local d = w:getModData();d.PRZArmoryArsenal = d.PRZArmoryArsenal or {schema=2,grenades=0,auto=w:getFireMode()=="Auto",stance=false,shots=0}
    local s=d.PRZArmoryArsenal;local spec=specFor(w)
    if s.schema~=2 then
        if spec and spec.kind=="svdex" then s.grenadeRefund=math.max(0,math.min(10,Core.count(s.grenades))-spec.grenadeCapacity) end
        s.schema=2
    end
    s.grenades=math.min(spec and spec.grenadeCapacity or 0,Core.count(s.grenades));s.shots=Core.count(s.shots)
    return s
end
A.state = state
local function waterOnly(fc)
    return fc and fc:getAmount()>0 and fc:getRatioForFluid(Fluid.Water)+fc:getRatioForFluid(Fluid.TaintedWater)>=0.9999
end
function A.syncWater(w)
    PRZArmory.WaterCompatibility.normalize(w)
    local fc=w:getFluidContainer();local amount=waterOnly(fc) and fc:getAmount() or 0
    local spec=specFor(w);local capacity=spec and spec.capacity or 0
    local count=math.min(math.floor(capacity/(Config.waterPerShot or 0.01)+0.000001),math.floor((amount+0.000001)/(Config.waterPerShot or 0.01)))
    if w:getCurrentAmmoCount() ~= count then w:setCurrentAmmoCount(count) end
    return count,amount
end
local function ready(p,w)
    if not usable(p,w) or w:isJammed() or not p:isAiming() then return false end
    local s=specFor(w)
    if s and s.kind=="hammer" and p:getStats():get(CharacterStat.ENDURANCE)<s.enduranceCost then return false end
    return (A.delays[w] or 0)<=0.000001
end
function A.canShoot(p,w)
    local s=specFor(w);if not s then return nativeCanShoot(p,w) end
    if Config.effectsEnabled == false then
        if s.water then return false end
        return nativeCanShoot(p,w)
    end
    if s.kind=="hammer" then return true end
    if not ready(p,w) then return false end
    if s.water then return A.syncWater(w)>0 end
    if s.kind=="svdex" and state(w).grenadeMode then return state(w).grenades>0 end
    if w:haveChamber() and not w:isRoundChambered() then return false end
    if not w:haveChamber() and w:getCurrentAmmoCount()<1 then return false end
    return nativeCanShoot(p,w)
end
Reload.canShoot=A.canShoot

local function releaseSlow()
    local h=A.slow
    if h and math.abs(h.p:getSlowFactor()-h.applied)<0.00001 and h.p:getSlowTimer()<=0.17 then
        h.p:setSlowFactor(h.before);h.p:setSlowTimer(math.max(0,h.timer or 0))
    end
    A.slow=nil
end
local function slow(p,s)
    if not A.slow then A.slow={p=p,before=p:getSlowFactor(),timer=p:getSlowTimer(),applied=s.slowFactor} end
    local h=A.slow
    if p:getSlowFactor()>h.applied+0.00001 then return end
    p:setSlowFactor(h.applied);p:setSlowTimer(0.16)
    h.timer=math.max(0,(h.timer or 0)-0.1)
end
local function detachVisual()
    local v=A.visual;if not v then return end
    if v.p:getAttachedItem(LEFT_PROP)==v.item then v.p:setAttachedItem(LEFT_PROP,nil) end
    if v.previous and not v.p:getSecondaryHandItem() and v.p:getInventory():containsRecursive(v.previous) then v.p:setSecondaryHandItem(v.previous) end
    v.p:setVariable("PRZArmoryDual",false);v.p:setVariable("PRZArmoryFireLeft",false)
    v.p:resetEquippedHandsModels();A.visual=nil
end
local function bindVisual(p,w,v)
    detachVisual()
    A.visual={p=p,weapon=w,item=v,previous=p:getSecondaryHandItem()}
    if p:getSecondaryHandItem() then p:setSecondaryHandItem(nil) end
    p:setAttachedItem(LEFT_PROP,v);p:setVariable("PRZArmoryDual",true);p:resetEquippedHandsModels()
end
function A.onNetworkVisual(p,w,item)
    local spec=specFor(w)
    if not localPlayer(p) or p:getPrimaryHandItem()~=w or not spec or not spec.dual
        or not item or item:getFullType()~=spec.leftVisual
        or not p:getInventory():containsRecursive(item)
        or tostring(item:getModData().PRZArmoryVisualWeaponID)~=tostring(w:getID()) then return false end
    if A.visual and A.visual.weapon==w and A.visual.item==item then return true end
    bindVisual(p,w,item)
    return true
end
local function attachVisual(p,w,s)
    if A.visual and A.visual.weapon==w then
        if not A.visual.hidden and p:getAttachedItem(LEFT_PROP)~=A.visual.item then p:setAttachedItem(LEFT_PROP,A.visual.item) end
        p:setVariable("PRZArmoryDual",true);return
    end
    detachVisual()
    if isClient() then
        local item=p:getInventory():getFirstEvalRecurse(function(i)
            return i:getFullType()==s.leftVisual and tostring(i:getModData().PRZArmoryVisualWeaponID)==tostring(w:getID())
        end)
        if item then A.onNetworkVisual(p,w,item);return end
        A.visualRequests=A.visualRequests or setmetatable({},{__mode="k"})
        local now=getTimestampMs()
        if now>=(A.visualRequests[w] or 0) then
            A.visualRequests[w]=now+1000
            PRZArmory.Network.weaponRequest(p,w,"DualVisual")
        end
        return
    end
    -- One inventory weapon owns both guns. This normal item is a transient,
    -- uncontained render prop: no second usable gun, magazine or water tank.
    local v=instanceItem(s.leftVisual)
    if not v then return end
    bindVisual(p,w,v)
end
-- A native equip/reload action may temporarily park the left visual at the
-- belt. Keep one uncontained prop and restore it on completion/cancellation.
function A.setDualVisualVisible(p,visible)
    local v=A.visual;if not v or v.p~=p then return end
    v.hidden=not visible
    p:setAttachedItem(LEFT_PROP,visible and v.item or nil)
    p:resetEquippedHandsModels()
end
function A.beginDualMotion(action,w)
    local s=specFor(w)
    if not s or not s.dual or not localPlayer(action.character) then return false end
    attachVisual(action.character,w,s);A.dualMotion=action;action.przarmoryDualWeapon=w
    return true
end
function A.endDualMotion(action)
    if A.dualMotion~=action then return end
    A.dualMotion=nil
    if action.character:getPrimaryHandItem()==action.przarmoryDualWeapon then A.setDualVisualVisible(action.character,true)
    else detachVisual() end
end
local function extinguishZombie(z)
    if z:isOnFire() then z:StopBurning() end
    for _,list in ipairs({PRZArmory.Combat.burns,PRZArmory.Expansion.burns}) do
        for i=#list,1,-1 do if list[i].zombie==z then table.remove(list,i) end end
    end
    if PRZArmory.Effects and PRZArmory.Effects.extinguish then PRZArmory.Effects.extinguish(z) end
end
local function clearLine(x,y,z,tx,ty,tz)
    return math.floor(z)==math.floor(tz) and not LosUtil.lineClearCollide(math.floor(x),math.floor(y),math.floor(z),math.floor(tx),math.floor(ty),math.floor(tz),false)
end
local function waterJet(p,w,s)
    local f=p:getForwardDirection();local dx,dy=f:getX(),f:getY();local len=math.sqrt(dx*dx+dy*dy)
    if len<0.001 then return end
    dx,dy=dx/len,dy/len
    local x,y,z=p:getX(),p:getY(),p:getZ();local reach=0.25
    for d=0.5,s.range,0.25 do
        local tx,ty=x+dx*d,y+dy*d
        local sq=getCell():getGridSquare(math.floor(tx),math.floor(ty),math.floor(z))
        if not sq or not clearLine(x,y,z,tx,ty,z) then break end
        reach=d
        if sq:has(IsoFlagType.burning) then sq:stopFire() end
        local moving=sq:getMovingObjects()
        for i=0,moving:size()-1 do
            local chr=moving:get(i)
            if instanceof(chr,"IsoGameCharacter") and chr:isOnFire() then chr:StopBurning() end
            if instanceof(chr,"IsoZombie") then extinguishZombie(chr) end
        end
    end
    if PRZArmory.Effects then PRZArmory.Effects.emit("waterjet",x,y,z,dx,dy,reach,0,1) end
    return x,y,z,dx,dy,reach
end
local function damage(z,p,w,amount)
    if amount<=0 or z:isDead() or z:isInvulnerable() or not z:getSquare() or p:isDead() then return end
    z:setAttackedBy(p);z:applyDamage(amount)
    if z:getHealth()<=0 and not z:isOnKillDone() then p:setZombieKills(p:getZombieKills()+1);z:Kill(w,p) end
end
local function fireWater(p,w,s)
    -- Water has no cartridge/BallisticsController. Never enter DoAttack or the
    -- native ranged hit-list path, even for an empty tank. One finite water
    -- transaction extinguishes fire only; it never damages, stuns or kills.
    if not usable(p,w,true) or not p:isAiming() or nonWeapon(p) or A.syncWater(w)<1 then return false end
    if isClient() then
        if not PRZArmory.Network.weaponRequest(p,w,"WaterJet") then return false end
        state(w).shots=state(w).shots+1
        A.delays[w]=waterShotSeconds(w,s)
        A.waterHeld=s.dual and w:getFireMode()~="Auto" and w or nil
        p:playSound(w:getSwingSound())
        return true
    end
    local fc=w:getFluidContainer()
    fc:adjustAmount(math.max(0,fc:getAmount()-(Config.waterPerShot or 0.01)))
    A.syncWater(w);w:syncItemFields();syncHandWeaponFields(p,w)
    waterJet(p,w,s)
    p:playSound(w:getSwingSound());p:addWorldSoundUnlessInvisible(w:getSoundRadius(),w:getSoundVolume(),true)
    state(w).shots=state(w).shots+1
    A.delays[w]=waterShotSeconds(w,s)
    A.waterHeld=s.dual and w:getFireMode()~="Auto" and w or nil
    return true
end
local function candidates(x,y,z,dx,dy,range,angle)
    local list=getCell():getZombieList();local out={}
    for i=0,list:size()-1 do
        local q=list:get(i)
        if q and not q:isDead() and not q:isInvulnerable() and q:getSquare()
            and Core.inShape(x,y,z,q:getX(),q:getY(),q:getZ(),dx,dy,range,angle)
            and clearLine(x,y,z,q:getX(),q:getY(),q:getZ()) then
            out[#out+1]={z=q,d=(q:getX()-x)^2+(q:getY()-y)^2}
        end
    end
    table.sort(out,function(a,b)return a.d<b.d end);return out
end
function A.blast(e)
    if Config.effectsEnabled == false or e.p:isDead() or not getCell():getGridSquare(math.floor(e.x),math.floor(e.y),math.floor(e.z)) then return end
    local targets=candidates(e.x,e.y,e.z,1,0,e.s.blastRadius,math.pi)
    for i=1,math.min(#targets,Config.maxTargets) do damage(targets[i].z,e.p,e.w,e.s.blastDamage) end
    e.p:playSound("PRZArmory_SVDEXExplosion")
    if PRZArmory.Effects then PRZArmory.Effects.emit("svdblast",e.x,e.y,e.z,1,0,e.s.blastRadius,math.pi,1) end
end
function A.launch(p,w,s)
    if not ready(p,w) or state(w).grenades<1 or #A.projectiles>=16 then return false end
    local f=p:getForwardDirection();local dx,dy=f:getX(),f:getY();local len=math.sqrt(dx*dx+dy*dy);if len<0.001 then return false end
    dx,dy=dx/len,dy/len
    if not A.beginLaunch(p,w,s) then return false end
    if isClient() then
        A.delays[w]=0.5
        p:playSound("PRZArmory_SVDEXLaunch")
        return PRZArmory.Network.weaponRequest(p,w,"SVDLaunch")
    end
    state(w).grenades=state(w).grenades-1;A.delays[w]=0.5
    A.projectiles[#A.projectiles+1]={p=p,w=w,s=s,x=p:getX(),y=p:getY(),z=p:getZ(),dx=dx,dy=dy,distance=0,age=0}
    p:playSound("PRZArmory_SVDEXLaunch");p:addWorldSoundUnlessInvisible(100,40,true)
    if PRZArmory.Effects then PRZArmory.Effects.emit("svdlaunch",p:getX(),p:getY(),p:getZ(),dx,dy,1,0,1) end
    return true
end
local function demolition(p,w)
    if not ISDestroyCursor then return false end
    local cursor=ISDestroyCursor:new(p,false,w);local f=p:getForwardDirection();local best,nearest=nil,math.huge
    for x=math.floor(p:getX())-2,math.floor(p:getX())+2 do
        for y=math.floor(p:getY())-2,math.floor(p:getY())+2 do
            local sq=getCell():getGridSquare(x,y,math.floor(p:getZ()))
            if sq then
                local objects=sq:getObjects()
                for i=objects:size()-1,0,-1 do
                    local o=objects:get(i);local props=o:getProperties()
                    if props and not props:has(IsoFlagType.solidfloor)
                        and Core.inShape(p:getX(),p:getY(),p:getZ(),x+0.5,y+0.5,p:getZ(),f:getX(),f:getY(),1.6,math.rad(30))
                        and cursor:canDestroy(o) then
                        local d=(x+.5-p:getX())^2+(y+.5-p:getY())^2
                        if d<nearest then best,nearest=o,d end
                    end
                end
            end
        end
    end
    if best then
        -- Native demolition owns corner walls, windows, barricades, stairs,
        -- dropped contents and condition loss; no raw RemoveTileObject shortcut.
        local action=ISDestroyStuffAction:new(p,best)
        if action:isValid() then action:complete();return true end
    end
    return false
end
function A.hammerImpact(p,w,s)
    if not usable(p,w,true) or not state(w).stance or p:getStats():get(CharacterStat.ENDURANCE)<s.enduranceCost then return false end
    if isClient() then
        A.delays[w]=s.cooldown
        return PRZArmory.Network.weaponRequest(p,w,"Hammer")
    end
    local f=p:getForwardDirection();local x,y,z=p:getX(),p:getY(),p:getZ();local targets=candidates(x,y,z,f:getX(),f:getY(),s.range,s.halfAngle)
    for i=1,math.min(#targets,Config.maxTargets) do
        local q=targets[i].z
        -- Native zero-damage shove selects a legal fall/recoil state; health
        -- damage follows separately so melee skill scaling cannot erase it.
        local wasActive=PRZArmory.Combat.active;PRZArmory.Combat.active=true
        local ok,err=pcall(function() q:Hit(w,p,0,true,2.5,false) end)
        PRZArmory.Combat.active=wasActive
        if not ok then error(err) end
        q:setHitForce(2.5);q:getHitDir():set(q:getX()-x,q:getY()-y);q:getHitDir():normalize()
        PRZArmory.HammerKnockback.start(q,p)
        damage(q,p,w,s.damage)
    end
    local demolished=#targets==0 and demolition(p,w)
    local stats=p:getStats();stats:set(CharacterStat.ENDURANCE,math.max(0,stats:get(CharacterStat.ENDURANCE)-s.enduranceCost))
    if #targets>0 then p:playSound("PRZArmory_StormHammerHeavyHit")
    elseif demolished then p:playSound("PRZArmory_StormHammerHeavyWall") end
    p:addWorldSoundUnlessInvisible(30,25,true)
    A.delays[w]=s.cooldown;return true
end

local Skill=ISBaseTimedAction:derive("PRZArmory_ArsenalSkill")
function Skill:isValid()
    return not self.cancelled and usable(self.character,self.weapon,true)
        and (self.kind~="waterfire" or self.character:isAiming())
        and (self.kind~="hammer" or (self.character:isAiming() and state(self.weapon).stance
            and self.character:getStats():get(CharacterStat.ENDURANCE)>=self.spec.enduranceCost))
end
function Skill:isValidStart() return self:isValid() end
function Skill:adjustMaxTime(t) return t end
function Skill:getDuration() return math.max(1,math.ceil(getGameTime():getMultiplierFromTimeDelta(self.seconds))) end
function Skill:start()
    if not self:isValid() then self:forceStop();return end
    if self.kind=="waterfire" then
        if self.committed then return end
        if self.spec.dual then attachVisual(self.character,self.weapon,self.spec) end
        local left=state(self.weapon).shots%2==1
        self.character:setVariable("PRZArmoryFireLeft",left)
        self.character:setVariable("PRZArmoryWaterShotSpeed",(self.spec.dual and 0.36 or 0.10)/self.seconds)
        self:setActionAnim("PRZArmoryWaterFire")
        self:setOverrideHandModels(self.weapon,nil)
        self.action:setUseProgressBar(false);self.action:setBlockMovementEtc(false)
        self.committed=fireWater(self.character,self.weapon,self.spec)
        if not self.committed then self:forceStop() end
        return
    end
    self:setActionAnim(self.kind=="hammer" and "PRZArmoryHammerHeavy" or self.kind=="grenade" and "PRZArmorySVDLoad" or self.kind=="launch" and "PRZArmorySVDLaunch" or self.spec.dual and "PRZArmoryDualRefill" or "fill_container_tap")
    if self.kind=="water" and self.spec.dual then
        A.beginDualMotion(self,self.weapon);self:setOverrideHandModels(self.weapon,nil)
    end
    self.action:setUseProgressBar(false);self.action:setBlockMovementEtc(self.kind=="hammer")
    if self.kind=="grenade" then self:setOverrideHandModels(self.weapon,instanceItem(GR));self.character:playSound("PRZArmory_SVDEXGrenadeLoad") end
    if self.kind=="launch" then self:setOverrideHandModels(self.weapon,nil) end
    if self.kind=="hammer" then self.character:playSound("PRZArmory_StormHammerHeavySwing") end
end
function Skill:impact()
    if self.impacted or not self:isValid() then return false end
    self.impacted=true;return A.hammerImpact(self.character,self.weapon,self.spec)
end
function Skill:update()
    if not self:isValid() then self:forceStop();return end
    if self.kind=="hammer" and self:getJobDelta()>=HAMMER_IMPACT_SECONDS/HAMMER_SECONDS then self:impact() end
end
function Skill:animEvent(e)
    if e=="PRZArmoryDualHideLeft" then A.setDualVisualVisible(self.character,false)
    elseif e=="PRZArmoryDualShowLeft" then A.setDualVisualVisible(self.character,true) end
    if self.kind=="hammer" and e=="PRZArmoryHammerHit" then self:impact()
    elseif self.kind=="hammer" and e=="PRZArmoryHammerEnd" then self:forceComplete() end
end
local function finishSkill(self)
    A.endDualMotion(self)
    if A.current==self then A.current=nil end
end
function Skill:stop()
    self.cancelled=true;finishSkill(self)
    local queue=ISTimedActionQueue.getTimedActionQueue(self.character)
    if queue.current==self then queue:onCompleted(self) else queue:removeFromQueue(self) end
end
function Skill:forceCancel() self.cancelled=true;finishSkill(self) end
function Skill:perform()
    if self.finished then return end
    if self:isValid() then
        if self.kind=="hammer" then self:impact()
        elseif self.kind=="grenade" then
            if isClient() then
                PRZArmory.Network.weaponRequest(self.character,self.weapon,"SVDLoad")
            else
            local inv=self.character:getInventory();local bullet=inv:getFirstTypeRecurse(GR)
            local d=state(self.weapon)
            if bullet and d.grenades<self.spec.grenadeCapacity then
                local bag=bullet:getContainer()
                if bag then bag:Remove(bullet);d.grenades=d.grenades+1 end
            end
            end
        elseif self.kind=="water" then
            if isClient() then
                if self.source then PRZArmory.Network.weaponRequest(self.character,self.weapon,"WaterRefill",{sourceID=self.source:getID()}) end
            else
            local fc=self.weapon:getFluidContainer();local src=self.source
            if src and self.character:getInventory():containsRecursive(src) and waterOnly(src:getFluidContainer()) then
                FluidContainer.Transfer(src:getFluidContainer(),fc,math.min(fc:getFreeCapacity(),src:getFluidContainer():getAmount()))
                self.weapon:syncItemFields();src:syncItemFields();A.syncWater(self.weapon)
            end
            end
        end
    end
    self.finished=true;finishSkill(self);ISBaseTimedAction.perform(self)
end
function Skill:new(p,w,s,kind,seconds,source)
    local o=ISBaseTimedAction.new(self,p);o.weapon,o.spec,o.kind,o.seconds,o.source=w,s,kind,seconds,source
    o.stopOnAim=false;o.stopOnWalk=kind~="waterfire";o.stopOnRun=kind~="waterfire";o.useProgressBar=false;o.maxTime=o:getDuration();return o
end
A.Skill=Skill
local function beginSkill(p,w,s,kind,seconds,source)
    if A.current or not usable(p,w) then return false end
    local action=Skill:new(p,w,s,kind,seconds,source);A.current=action
    if not ISTimedActionQueue.add(action) then A.current=nil;return false end
    return true
end
function A.beginLaunch(p,w,s) return beginSkill(p,w,s,"launch",0.36) end
function A.beginReload(p,w)
    local s=specFor(w)
    if not s or (Config.effectsEnabled == false and not s.water) then return nativeReload(p,w) end
    if not usable(p,w) then return end
    if s.water then
        local fc=w:getFluidContainer();if not fc or fc:getFreeCapacity()<0.001 then return end
        local src=p:getInventory():getFirstEvalRecurse(function(i)return i~=w and waterOnly(i:getFluidContainer()) end)
        if src then return beginSkill(p,w,s,"water",1.5,src) end
        return
    end
    if s.kind=="svdex" and state(w).grenadeMode then
        if state(w).grenades<s.grenadeCapacity and p:getInventory():getCountTypeRecurse(GR)>0 then
            return beginSkill(p,w,s,"grenade",s.grenadeReloadSeconds)
        end
        return
    end
    return nativeReload(p,w)
end
Reload.BeginAutomaticReload=A.beginReload
Reload.canRack=function(w) local s=specFor(w);if s and s.water then return false end;return nativeRack(w) end
ISFirearmRadialMenu.checkWeapon=function(p)
    local w=p and p:getPrimaryHandItem();local s=specFor(w)
    if s and (s.water or (Config.effectsEnabled ~= false and s.kind=="svdex" and state(w).grenadeMode)) then return false end
    return nativeRadial(p)
end
function A.attackHook(p,charge,w)
    local s=specFor(w);if not s then return nativeAttack(p,charge,w) end
    if not localPlayer(p) then return nativeAttack(p,charge,w) end
    if Config.effectsEnabled == false then
        if s.water then return end
        return nativeAttack(p,charge,w)
    end
    if nonWeapon(p) then return nativeAttack(p,charge,w) end
    if not usable(p,w) then return end
    if not p:isAuthorizeMeleeAction() or not p:isAuthorizedHandToHandAction() then return end
    if s.kind=="hammer" and state(w).stance then
        if ready(p,w) then beginSkill(p,w,s,"hammer",HAMMER_SECONDS) end
        return
    end
    if s.kind=="svdex" and state(w).grenadeMode then A.launch(p,w,s);return end
    if s.water then
        if ready(p,w) and A.syncWater(w)>0 and A.waterHeld~=w then
            return beginSkill(p,w,s,"waterfire",waterShotSeconds(w,s))
        end
        return
    end
    applyDualRate(w,s)
    if (A.delays[w] or 0)>0.000001 then return end
    if s.dual and not p:isAttackStarted() then p:setVariable("PRZArmoryFireLeft",state(w).shots%2==1) end
    return nativeAttack(p,charge,w)
end
function A.onShoot(p,w)
    local s=specFor(w);if not s or s.kind=="hammer" then return nativeShoot(p,w) end
    -- Cosmetic water actions own their shot at start and never accept native
    -- swing-hit callbacks (including a stale callback from an older save).
    if s.water then return end
    if Config.effectsEnabled == false then return nativeShoot(p,w) end
    if not usable(p,w,true) or nonWeapon(p) or p:isRangedWeaponEmpty() then return end
    if s.kind=="svdex" and state(w).grenadeMode then return end
    if isClient() then
        w:setAmmoPerShoot(1)
        nativeShoot(p,w)
    else
    do
        local before=w:getCurrentAmmoCount();local chamber=w:haveChamber() and w:isRoundChambered()
        w:setAmmoPerShoot(1);nativeShoot(p,w)
        local final=chamber and not w:isRoundChambered() and before==w:getCurrentAmmoCount()
        if w:getCurrentAmmoCount()==before and not final then
            if before>0 then w:setCurrentAmmoCount(before-1)
            elseif chamber then w:setRoundChambered(false);w:setSpentRoundChambered(false)
            else return end
            syncHandWeaponFields(p,w)
        end
    end
    end
    state(w).shots=state(w).shots+1
    if s.kind=="dualinfinity" then
        A.delays[w]=w:getFireMode()=="Auto" and s.rapidShotSeconds or s.normalShotSeconds
    elseif s.shotSeconds then A.delays[w]=s.shotSeconds end
end
function A.toggle(p,w)
    local s=specFor(w);if not s or not usable(p,w) or p:isAttackStarted() then return end
    local d=state(w)
    if s.dual then d.auto=w:getFireMode()~="Auto";w:setFireMode(d.auto and "Auto" or "Single");p:setFireMode(w:getFireMode());applyDualRate(w,s)
    elseif s.kind=="svdex" then d.grenadeMode=not d.grenadeMode
    elseif s.kind=="hammer" then d.stance=not d.stance;p:setVariable("PRZArmoryHammerStance",d.stance);if not d.stance then releaseSlow() end end
    if A.notifyMode then A.notifyMode(p,w) end
end
function A.onAttackFinished(p,w)
    local s=specFor(w)
    if s and s.dual and localPlayer(p) and p:getPrimaryHandItem()==w then
        -- Change selectors between accepted native attacks, never during the
        -- collision event: a mid-clip node switch could fire its event twice.
        p:setVariable("PRZArmoryFireLeft",state(w).shots%2==1)
    end
end
function A.update()
    local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-(A.lastMs or now))/1000));A.lastMs=now
    local p=getSpecificPlayer(0)
    if not localPlayer(p) or p:isDead() then A.reset();return end
    local w=p:getPrimaryHandItem();local s=specFor(w)
    if Config.effectsEnabled == false then A.reset(); return end
    if not p:isAttackButtonDown() or A.waterHeld~=w then A.waterHeld=nil end
    local key=Keyboard["KEY_"..Config.specialKey] or Keyboard.KEY_G;local down=isKeyDown(key)
    if isGamePaused() then
        releaseSlow();A.gDown=down
        if A.current and A.current.action then A.current.cancelled=true;A.current.action:setBlockMovementEtc(false);A.current:forceStop();A.current=nil end
        return
    end
    for item,left in pairs(A.delays) do A.delays[item]=math.max(0,left-dt) end
    PRZArmory.HammerKnockback.update(dt)
    if A.weapon~=w then
        if not A.dualMotion then detachVisual() end
        releaseSlow();p:setVariable("PRZArmoryHammerStance",false);A.weapon=w
        if s and s.dual then w:setFireMode(state(w).auto and "Auto" or "Single") end
    end
    if s and usable(p,w,true) then
        local saved=state(w)
        if not isClient() and s.kind=="svdex" and p:getInventory():containsRecursive(w) then
            for i=1,math.min(9,Core.count(saved.grenadeRefund)) do
                if p:getInventory():AddItem(GR) then saved.grenadeRefund=saved.grenadeRefund-1 else break end
            end
        end
        if s.dual then state(w).auto=w:getFireMode()=="Auto";applyDualRate(w,s) end
        if s.water then A.syncWater(w) end
        if s.dual and not ISTimedActionQueue.isPlayerDoingAction(p) then attachVisual(p,w,s) end
        if s.kind=="hammer" and state(w).stance and p:isAiming() then p:setVariable("PRZArmoryHammerStance",true);slow(p,s)
        else releaseSlow();p:setVariable("PRZArmoryHammerStance",false) end
        if down and not A.gDown and not (PRZArmory.HUD and PRZArmory.HUD.isEditing()) then A.toggle(p,w) end
    else if not A.dualMotion then detachVisual() end;releaseSlow();p:setVariable("PRZArmoryHammerStance",false) end
    A.gDown=down
    for i=#A.projectiles,1,-1 do
        local e=A.projectiles[i];local exploded,expired=false,false;e.age=e.age+dt
        if e.p:isDead() then table.remove(A.projectiles,i)
        else
            local travel=math.min(e.s.grenadeSpeed*dt,e.s.grenadeRange-e.distance)
            local steps=math.max(1,math.ceil(travel/.2));local step=travel/steps
            for j=1,steps do
                local tx,ty=e.x+e.dx*step,e.y+e.dy*step
                if not getCell():getGridSquare(math.floor(tx),math.floor(ty),math.floor(e.z)) then expired=true;break end
                if not clearLine(e.x,e.y,e.z,tx,ty,e.z) then exploded=true;break end
                e.x,e.y,e.distance=tx,ty,e.distance+step
                if #candidates(e.x,e.y,e.z,e.dx,e.dy,.35,math.pi)>0 or e.distance>=e.s.grenadeRange-.001 then exploded=true;break end
            end
            if expired or exploded then if exploded then A.blast(e) end;table.remove(A.projectiles,i) end
        end
    end
end
function A.onKey(key)
    local p=getSpecificPlayer(0);local w=p and p:getPrimaryHandItem();local s=specFor(w)
    if s and (s.water or (s.kind=="svdex" and state(w).grenadeMode)) and getCore():isKey(KeybindId.RELOAD_WEAPON,key) then A.beginReload(p,w) end
end
function A.reset()
    A.visualRequests=nil
    A.dualMotion=nil
    detachVisual();releaseSlow()
    PRZArmory.HammerKnockback.reset()
    if A.current and A.current.action then A.current.cancelled=true;A.current.action:setBlockMovementEtc(false);A.current:forceStop() end
    A.current,A.weapon,A.projectiles,A.waterHeld=nil,nil,{},nil;A.gDown=false;A.lastMs=getTimestampMs();A.delays=setmetatable({}, {__mode="k"})
    local p=getSpecificPlayer(0);if p then p:setVariable("PRZArmoryDual",false);p:setVariable("PRZArmoryHammerStance",false) end
    if p then
        p:setAttachedItem(LEFT_PROP,nil)
        local secondary=p:getSecondaryHandItem()
        if secondary and (secondary:getFullType()=="PRZWeapons.OmegaDualInfinityHandVisual") then p:setSecondaryHandItem(nil) end
    end
end
local oldHUD=PRZArmory.Expansion.getHUD
PRZArmory.Expansion.getHUD=function(p,w,s)
    if not s.arsenal then return oldHUD(p,w,s) end
    local d=state(w);local n=w:getCurrentAmmoCount()+(w:haveChamber() and w:isRoundChambered() and 1 or 0)
    local amount=0;if s.water then n,amount=A.syncWater(w) end
    return {name=w:getDisplayName(),itemType=w:getFullType(),iconName=s.iconName,mode=s.kind,expansion=true,passive=true,arsenal=true,
        ammo=n,maxAmmo=s.water and math.floor(s.capacity/(Config.waterPerShot or 0.01)+0.000001) or w:getMaxAmmo(),grenades=d.grenades,grenadeCapacity=s.grenadeCapacity,grenadeMode=d.grenadeMode==true,
        auto=w:getFireMode()=="Auto",water=s.water,waterLitres=amount,waterCapacity=s.capacity,stance=d.stance==true,
        cooldown=math.max(0,A.delays[w] or 0),keyName=Config.specialKey,axe=false,
        waterPerShot=Config.waterPerShot,reloadSeconds=s.grenadeReloadSeconds,skillCooldown=s.cooldown}
end
Hook.Attack.Remove(nativeAttack);Reload.attackHook=A.attackHook;Hook.Attack.Add(A.attackHook)
Events.OnWeaponSwingHitPoint.Remove(nativeShoot);Reload.onShoot=A.onShoot;Events.OnWeaponSwingHitPoint.Add(A.onShoot)
Events.OnTick.Add(A.update);Events.OnKeyPressed.Add(A.onKey)
Events.OnPlayerAttackFinished.Add(A.onAttackFinished)
Events.OnGameStart.Add(A.reset);Events.OnMainMenuEnter.Add(A.reset)
require "PRZArmory/DualActions"
return A
