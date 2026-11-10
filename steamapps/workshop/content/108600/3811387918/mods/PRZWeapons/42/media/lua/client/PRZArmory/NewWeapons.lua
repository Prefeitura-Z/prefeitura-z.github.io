require "PRZArmory/Config"
require "PRZArmory/Network"
require "PRZArmory/JanusEffects"
require "PRZArmory/ModelCache"
require "PRZArmory/MagazineVisuals"
require "TimedActions/ISReloadWeaponAction"
require "TimedActions/ISTimedActionQueue"

-- Native projectiles, penetration, magazines and bolt cycling remain engine-owned.
-- The hooks add shot intervals, one saving roll per Gatling discharge and JANUS.
local N={delays=setmetatable({},{__mode="k"}),active=nil,transform=nil,ticket=nil}
PRZArmory.NewWeapons=N
local Config,Reload=PRZArmory.Config,ISReloadWeaponAction
local nativeShoot,nativeAttack,nativeCanShoot=Reload.onShoot,Reload.attackHook,Reload.canShoot
local JANUS="PRZWeapons.OmegaJanus7"

local function localPlayer(p)
    return PRZArmory.Network.isLocal(p)
end
local function specFor(w)
    local s=w and Config.weapons[w:getFullType()]
    return s and s.newpack and s
end
local function nonWeapon(p)
    return p:isDoShove() or p:isPerformingShoveAnimation() or p:isPerformingStompAnimation()
        or p:isDoGrapple() or p:isPerformingGrappleGrabAnimation() or p:isPerformingGrappleAnimation()
end
local function usable(p,w,busy)
    return Config.effectsEnabled~=false and localPlayer(p) and w and not p:isDead() and not p:isAsleep()
        and not p:getVehicle() and not p:isSitOnGround() and not isGamePaused() and not nonWeapon(p)
        and p:getPrimaryHandItem()==w and w:getCondition()>0
        and p:isAuthorizedHandToHandAction() and (busy or not ISTimedActionQueue.isPlayerDoingAction(p))
end
local function chamber(w) return w:haveChamber() and w:isRoundChambered() end
local function loaded(w) return not w:isJammed() and (chamber(w) or not w:haveChamber() and w:getCurrentAmmoCount()>0) end
local function data(w)
    local md=w:getModData()
    if type(md.PRZArmoryNewArmory)~="table" then md.PRZArmoryNewArmory={} end
    local d=md.PRZArmoryNewArmory
    local hits=tonumber(d.hits)
    if not hits or hits~=hits or hits==math.huge or hits==-math.huge then hits=0 end
    d.hits=math.max(0,math.min(100000,math.floor(hits)))
    return d
end
local function model(p,w,name,action)
    if PRZArmory.MagazineVisuals then name=PRZArmory.MagazineVisuals.spriteFor(w,name) end
    if PRZArmory.GunMechanics then name=PRZArmory.GunMechanics.spriteFor(w,name) end
    if w:getWeaponSprite()==name then return true end
    if PRZArmory.ModelCache and not PRZArmory.ModelCache.ready(name) then return false end
    w:setWeaponSprite(name)
    -- Timed actions cache the override model name, not a live weapon sprite.
    -- Refresh that override on a stage change instead of destroying/rebuilding
    -- the normal equipped model under a stale action override every frame.
    if action then action:setOverrideHandModels(w,nil)
    elseif p and p:getPrimaryHandItem()==w then p:resetEquippedHandsModels() end
    return true
end
local function restore(p,w)
    local s=specFor(w)
    if s and s.kind=="janus7" then model(p,w,s.baseSprite or "PRZArmoryJanus7") end
end

function N.canShoot(p,w)
    local s=specFor(w)
    if s and s.kind~="minigun" and localPlayer(p) and Config.effectsEnabled~=false then
        if not usable(p,w,true) or (N.delays[w] or 0)>0 or N.transform and N.transform.weapon==w then return false end
        if N.active and N.active.weapon==w or N.pendingStart and N.pendingStart.weapon==w then return false end
    end
    return nativeCanShoot(p,w)
end

function N.onShoot(p,w)
    local s=specFor(w)
    if not s or s.kind=="minigun" or not localPlayer(p) or Config.effectsEnabled==false then return nativeShoot(p,w) end
    N.ticket=nil
    if not usable(p,w,true) or p:isRangedWeaponEmpty() or not loaded(w)
        or N.transform and N.transform.weapon==w or N.active and N.active.weapon==w then return end
    local before,wasChambered,spent=w:getCurrentAmmoCount(),chamber(w),w:isSpentRoundChambered()
    w:setAmmoPerShoot(1)
    nativeShoot(p,w)
    if isClient() then
        if s.shotSeconds then N.delays[w]=s.shotSeconds end
        if s.kind=="gatling" then PRZArmory.Network.weaponRequest(p,w,"WeaponShot") end
        return
    end
    local paid=w:getCurrentAmmoCount()==before-1 or wasChambered and not chamber(w) and w:getCurrentAmmoCount()==before
    if not paid then return end
    if s.shotSeconds then N.delays[w]=s.shotSeconds end
    if s.kind=="gatling" and ZombRand(100000)/1000<math.max(0,math.min(100,s.freeAmmoChance or 20)) then
        -- Restore exactly the discharged round, never manufacture a round in an
        -- empty weapon or reroll on individual pellets/penetrating targets.
        w:setCurrentAmmoCount(before)
        w:setRoundChambered(wasChambered)
        w:setSpentRoundChambered(spent)
        syncHandWeaponFields(p,w)
    elseif s.kind=="janus7" then
        N.ticket={player=p,weapon=w,untilMs=getTimestampMs()+2000,seen=setmetatable({},{__mode="k"})}
    end
end

function N.onHitZombie(z,p,bodyPart,w)
    local t=N.ticket
    if not t or t.player~=p or t.weapon~=w or getTimestampMs()>t.untilMs or t.seen[z]
        or not usable(p,w,true) or not z or z:isDead() or z:isInvulnerable() or not z:getSquare()
        or PRZArmory.Combat and PRZArmory.Combat.active then return end
    local s=specFor(w)
    if not s or s.kind~="janus7" or N.active or N.transform then return end
    t.seen[z]=true
    local d=data(w);local required=math.max(1,s.chargeHits or 50)
    d.hits=math.min(required,d.hits+1)
end

local function targets(p,s)
    local list=getCell():getZombieList();local out={}
    for i=0,list:size()-1 do
        local z=list:get(i)
        if z and not z:isDead() and not z:isInvulnerable() and z:getSquare()
            and math.floor(z:getZ())==math.floor(p:getZ()) then
            local dx,dy=z:getX()-p:getX(),z:getY()-p:getY();local d=dx*dx+dy*dy
            if d<=s.electricRange*s.electricRange and not LosUtil.lineClearCollide(p:getX(),p:getY(),p:getZ(),z:getX(),z:getY(),z:getZ(),false) then
                out[#out+1]={zombie=z,distance=d}
            end
        end
    end
    table.sort(out,function(a,b)return a.distance<b.distance end)
    return out
end
function N.pulse(p,w,s)
    if not usable(p,w) or not p:isAiming() or not loaded(w) or not nativeCanShoot(p,w) then return false end
    if isClient() then
        N.delays[w]=s.pulseSeconds or .2
        return PRZArmory.Network.weaponRequest(p,w,"JanusPulse")
    end
    local found=targets(p,s)
    if #found==0 then return false end
    local before,wasChambered=w:getCurrentAmmoCount(),chamber(w)
    w:setAmmoPerShoot(1)
    nativeShoot(p,w)
    if not (w:getCurrentAmmoCount()==before-1 or wasChambered and not chamber(w) and w:getCurrentAmmoCount()==before) then return false end
    for i=1,math.min(#found,s.electricTargets or 3) do
        local z=found[i].zombie
        if PRZArmory.JanusEffects and s.visualsEnabled~=false then PRZArmory.JanusEffects.emit(p,z) end
        z:setAttackedBy(p)
        z:applyDamage(s.electricDamage or .20)
        if z:getHealth()<=0 and not z:isOnKillDone() then
            p:setZombieKills(p:getZombieKills()+1)
            z:Kill(w,p)
        end
    end
    p:playSound("PRZArmory_Janus7Electric")
    p:addWorldSoundUnlessInvisible(80,30,true)
    N.delays[w]=s.pulseSeconds or .2
    return true
end

local Transform=ISBaseTimedAction:derive("PRZArmory_JanusTransform")
function Transform:isValid()
    return not self.cancelled and usable(self.character,self.weapon,true)
end
function Transform:isValidStart() return self:isValid() end
function Transform:adjustMaxTime(t) return t end
function Transform:getDuration() return math.max(1,math.ceil(getGameTime():getMultiplierFromTimeDelta(self.seconds))) end
function Transform:start()
    if not self:isValid() then self:forceStop();return end
    self.handsActive=not self.character:isPlayerMoving()
    self:setAnimVariable("PRZArmoryJanusHandsActive",self.handsActive)
    -- The normal equipped weapon already supplies the render model. A hand
    -- override is unnecessary and can survive after the gesture was stopped.
    if self.handsActive then
        self:setActionAnim(self.reverting and "PRZArmoryJanusRevert" or "PRZArmoryJanusTransform")
    end
    self.action:setUseProgressBar(false)
    self.action:setBlockMovementEtc(false)
end
function Transform:update()
    if not self:isValid() then self:forceStop();return end
    -- Walking keeps the native carrying pose. Once movement interrupts the
    -- gesture, do not restart its first frame against a later gun-shape phase.
    if self.handsActive and self.character:isPlayerMoving() then
        self.handsActive=false
        -- A failed node condition alone leaves the native actions substate
        -- alive. Exit that layer while retaining this timed action and timer.
        self.action:stopTimedActionAnim()
        self.character:clearVariable("PRZArmoryJanusHandsActive")
    end
    local progress=math.max(0,math.min(1,self:getJobDelta()))
    local count=self.reverting and 26 or 31
    local step=math.min(count,math.floor(progress*count)+1)
    model(self.character,self.weapon,(self.reverting and "PRZArmoryJanus7Return" or "PRZArmoryJanus7Change")..string.format("%02d",step))
    local soundAt=self.reverting and 7/51 or 20/61
    if not self.soundPlayed and progress>=soundAt then
        self.soundPlayed=true
        self.character:playSound(self.reverting and "PRZArmory_Janus7Revert" or "PRZArmory_Janus7Transform")
    end
end
function Transform:animEvent() end -- Presentation never inserts/removes ammunition.
local function finishTransform(self)
    self.character:clearVariable("isLoading")
    self.character:clearVariable("WeaponReloadType")
    self.character:clearVariable("PRZArmoryJanusHandsActive")
    if N.transform==self then N.transform=nil end
end
function Transform:stop()
    if self.stopped then return end
    self.stopped=true
    self.cancelled=true;restore(self.character,self.weapon);finishTransform(self)
    local queue=ISTimedActionQueue.getTimedActionQueue(self.character)
    if queue.current==self then queue:onCompleted(self) else queue:removeFromQueue(self) end
end
function Transform:forceCancel()
    if self.finished or self.stopped or self.cancelled then return end
    self.cancelled=true;restore(self.character,self.weapon);finishTransform(self)
end
function Transform:perform()
    if self.finished or self.stopped or self.cancelled then return end
    if self:isValid() and not self.reverting then
        if isClient() then
            N.pendingStart={player=self.character,weapon=self.weapon,spec=self.spec,untilMs=getTimestampMs()+5000}
            PRZArmory.Network.weaponRequest(self.character,self.weapon,"JanusStart")
        else
        data(self.weapon).hits=0
        N.active={player=self.character,weapon=self.weapon,spec=self.spec,left=self.spec.electricSeconds or 8}
        model(self.character,self.weapon,self.spec.electricSprite or "PRZArmoryJanus7Electric")
        end
    else restore(self.character,self.weapon) end
    self.finished=true;finishTransform(self)
    ISBaseTimedAction.perform(self)
end
function Transform:new(p,w,s,reverting)
    local o=ISBaseTimedAction.new(self,p)
    o.weapon,o.spec,o.reverting=w,s,reverting
    o.seconds=reverting and (s.revertSeconds or 51/30) or (s.transformSeconds or 61/30)
    o.stopOnWalk,o.stopOnRun,o.stopOnAim,o.useProgressBar=false,false,false,false
    o.maxTime=o:getDuration()
    return o
end
N.Transform=Transform
local function beginTransform(p,w,s,reverting)
    if N.transform or not usable(p,w) then return false end
    local action=Transform:new(p,w,s,reverting);N.transform=action;N.ticket=nil
    if not ISTimedActionQueue.add(action) then N.transform=nil;restore(p,w);return false end
    return true
end
function N.activate(p,w)
    local s=specFor(w)
    if not s or s.kind~="janus7" or not usable(p,w) then return false end
    if N.pendingStart then return false end
    if N.active and N.active.weapon==w then
        N.active=nil
        if isClient() then PRZArmory.Network.weaponRequest(p,w,"JanusEnd") end
        return beginTransform(p,w,s,true)
    end
    if data(w).hits<math.max(1,s.chargeHits or 50) then return false end
    return beginTransform(p,w,s,false)
end

function N.attackHook(p,charge,w)
    local s=specFor(w)
    if not s or s.kind=="minigun" or not localPlayer(p) or Config.effectsEnabled==false or nonWeapon(p) then return nativeAttack(p,charge,w) end
    if not usable(p,w) or (N.delays[w] or 0)>0 or N.transform and N.transform.weapon==w
        or N.pendingStart and N.pendingStart.weapon==w then return end
    if N.active and N.active.weapon==w then return N.pulse(p,w,s) end
    if isClient() then PRZArmory.Network.weaponRequest(p,w,"WeaponPrepare") end
    return nativeAttack(p,charge,w)
end

function N.onNetworkState(p,w,args)
    local s=specFor(w)
    if not localPlayer(p) or not s or s.kind~="janus7" then return end
    local pending=N.pendingStart and N.pendingStart.weapon==w
    if pending and (args.electric or args.ack=="JanusStart") then N.pendingStart=nil end
    if args.electric and p:getPrimaryHandItem()==w and not (N.transform and N.transform.reverting) then
        N.active={player=p,weapon=w,spec=s,left=math.max(0,tonumber(args.electricLeft) or 0)}
        model(p,w,s.electricSprite or "PRZArmoryJanus7Electric")
    else
        local wasActive=N.active and N.active.weapon==w
        if wasActive then N.active=nil end
        if not N.transform and not N.pendingStart then
            if wasActive and not beginTransform(p,w,s,true) then restore(p,w)
            elseif not wasActive then
                local ready=data(w).hits>=math.max(1,s.chargeHits or 50)
                model(p,w,ready and "PRZArmoryJanus7Ready" or s.baseSprite or "PRZArmoryJanus7")
            end
        end
    end
end

local moveRates={
    {"PRZArmorySFRate_defaultWalk",1.04},{"PRZArmorySFRate_sneakWalk","sneakLimpSpeedScale"},
    {"PRZArmorySFRate_sneakWalkLow","sneakLimpSpeedScale"},{"PRZArmorySFRate_defaultRun",1.04},
    {"PRZArmorySFRate_sneakRun",.92},{"PRZArmorySFRate_sneakRunLow",1.04},{"PRZArmorySFRate_defaultSprint",.96},
    {"PRZArmorySFRate_strafeDefault","StrafeSpeed"},{"PRZArmorySFRate_strafeDefault_NoAim","StrafeSpeed"},
}
function N.updateMovement(p)
    if not localPlayer(p) then return end
    local w=p:getPrimaryHandItem();local s=specFor(w)
    local enabled=s and s.kind=="speedgun" and p:getSecondaryHandItem()==w and usable(p,w,true)
    p:setVariable("PRZArmorySFMoveBoost",enabled and true or false)
    if enabled then
        local multiplier=math.max(1,math.min(2,s.moveMultiplier or 1.2))
        for _,row in ipairs(moveRates) do
            local base=type(row[2])=="number" and row[2] or p:getVariableFloat(row[2],1)
            p:setVariable(row[1],base*multiplier)
        end
    end
end

function N.update()
    local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-(N.lastMs or now))/1000));N.lastMs=now
    local p=getSpecificPlayer(0)
    if not localPlayer(p) or p:isDead() or Config.effectsEnabled==false then N.reset();return end
    N.updateMovement(p)
    if isGamePaused() then return end
    for w,left in pairs(N.delays) do N.delays[w]=math.max(0,left-dt) end
    if N.ticket and (now>N.ticket.untilMs or N.ticket.weapon~=p:getPrimaryHandItem()) then N.ticket=nil end
    local w=p:getPrimaryHandItem();local s=specFor(w)
    if N.pendingStart and (N.pendingStart.weapon~=w or not usable(p,w,true) or now>N.pendingStart.untilMs) then
        restore(N.pendingStart.player,N.pendingStart.weapon)
        N.pendingStart=nil
        if isClient() then PRZArmory.Network.request(p,"Hello") end
    end
    local active=N.active
    if active then
        if active.weapon~=w or not usable(p,w,true) then
            restore(active.player,active.weapon);N.active=nil
        else
            active.left=math.max(0,active.left-dt)
            if active.left<=0 then
                N.active=nil
                if isClient() then PRZArmory.Network.weaponRequest(p,w,"JanusEnd") end
                if not beginTransform(p,w,s,true) then restore(p,w) end
            end
        end
    elseif w and s and s.kind=="janus7" and not N.transform and not N.pendingStart then
        local ready=data(w).hits>=math.max(1,s.chargeHits or 50)
        model(p,w,ready and "PRZArmoryJanus7Ready" or s.baseSprite or "PRZArmoryJanus7")
    end
    local down=isKeyDown(Keyboard["KEY_"..Config.specialKey] or Keyboard.KEY_G)
    if N.lastWeapon~=w then N.lastWeapon,N.down=w,down;return end
    if down and not N.down and s and s.kind=="janus7" then N.activate(p,w) end
    N.down=down
end

function N.getHUD(p,w,s)
    local d=s.kind=="janus7" and data(w) or {}
    local active=N.active and N.active.weapon==w and N.active
    local hits=math.min(d.hits or 0,math.max(1,s.chargeHits or 50))
    local ammo=w:getCurrentAmmoCount()+(chamber(w) and 1 or 0)
    return {name=w:getDisplayName(),itemType=w:getFullType(),iconName=s.iconName,mode=s.kind,newpack=true,expansion=true,
        ammo=ammo,maxAmmo=math.max(w:getMaxAmmo(),ammo),magazineMax=w:getMaxAmmo(),keyName=Config.specialKey,
        passive=true,penetration=s.penetration,shotSeconds=s.shotSeconds,freeAmmoChance=s.freeAmmoChance,
        moveMultiplier=s.moveMultiplier,moveActive=s.kind=="speedgun" and p:getSecondaryHandItem()==w,
        janusHits=hits,janusRequired=s.chargeHits or 50,janusElectric=active and true or false,
        janusSeconds=active and active.left or 0,transforming=N.transform and N.transform.weapon==w or N.pendingStart and N.pendingStart.weapon==w or false,
        specialMode=active and true or false,cooldown=N.delays[w] or 0}
end
function N.reset()
    if isClient() and N.active then PRZArmory.Network.weaponRequest(N.active.player,N.active.weapon,"JanusEnd") end
    if N.active then restore(N.active.player,N.active.weapon) end
    if N.transform then
        local action=N.transform
        if action.action then action:forceStop() end
        action:stop()
    end
    local p=getSpecificPlayer(0)
    if localPlayer(p) then
        p:setVariable("PRZArmorySFMoveBoost",false)
        local w=p:getPrimaryHandItem();if w and w:getFullType()==JANUS then restore(p,w) end
    end
    N.active,N.transform,N.pendingStart,N.ticket,N.down,N.lastWeapon=nil,nil,nil,nil,false,nil
    N.delays=setmetatable({},{__mode="k"});N.lastMs=getTimestampMs()
end
Hook.Attack.Remove(nativeAttack);Reload.attackHook=N.attackHook;Hook.Attack.Add(N.attackHook)
Events.OnWeaponSwingHitPoint.Remove(nativeShoot);Reload.onShoot=N.onShoot;Events.OnWeaponSwingHitPoint.Add(N.onShoot)
Reload.canShoot=N.canShoot
Events.OnHitZombie.Add(N.onHitZombie)
Events.OnTick.Add(N.update)
Events.OnEquipPrimary.Add(N.updateMovement)
Events.OnEquipSecondary.Add(N.updateMovement)
Events.OnGameStart.Add(N.reset)
Events.OnMainMenuEnter.Add(N.reset)
return N
