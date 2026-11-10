-- Source mechanical parts move through private native attachment scripts.
-- Bind the gun body once; firing only changes child matrices, never equipment,
-- inventory counts, chamber state, firing cadence or native attack selection.
require "PRZArmory/Config"
require "PRZArmory/Network"
require "PRZArmory/ModelCache"
require "PRZArmory/MechanicsData"
require "PRZArmory/DualMuzzle"
require "PRZArmory/DualBallistics"
require "TimedActions/ISReloadWeaponAction"
require "TimedActions/ISRackFirearm"
require "TimedActions/ISTimedActionQueue"
PRZArmory=PRZArmory or {}
local M={states={},leases={},lastMs=nil,remoteSerials={}}
PRZArmory.GunMechanics=M
local D=PRZArmory.MechanicsData or {weapons={},poolSize=16}
local ZERO={offset={0,0,0},rotate={0,0,0}}
function PRZArmoryMechanicsLocked() return false end
local function canonical(name) return type(name)=="string" and name:gsub("^Base%.","") or name end
local function ballistic(p,w)
    local spec=w and PRZArmory.Config.weapons[w:getFullType()]
    return not isServer() and p and spec and w:isRanged() and not spec.water
        and spec.kind~="holygrenade" and PRZArmory.Config.effectsEnabled~=false and spec.visualsEnabled~=false
        and not p:isDead() and not p:isAsleep() and not p:getVehicle()
        and p:getPrimaryHandItem()==w
end
local function enabled(p,w)
    return ballistic(p,w) and not PRZArmory.Config.weapons[w:getFullType()].nativeMechanics and D.weapons[w:getFullType()]
end
local function total(w)
    return w:getCurrentAmmoCount()+(w:haveChamber() and w:isRoundChambered() and 1 or 0)
end
local function unlimited(p)
    return p:isUnlimitedAmmo()
end
local function loaded(p,w)
    -- Match native B42 canShoot: admin unlimited-ammo shots do not require a
    -- magazine/chamber. This only admits the accepted native visual callback.
    return unlimited(p) or not w:isJammed() and (w:haveChamber() and w:isRoundChambered()
        or not w:haveChamber() and w:getCurrentAmmoCount()>0)
end
local function nonWeapon(p)
    return p:isDoShove() or p:isPerformingShoveAnimation() or p:isPerformingStompAnimation()
        or p:isDoGrapple() or p:isPerformingGrappleGrabAnimation() or p:isPerformingGrappleAnimation()
end
local function holyHands(s)
    local p=s.player
    if s.weapon:getFullType()~="PRZWeapons.OmegaHolyFlame" then return end
    local play
    for _,entry in ipairs(s.entries or {}) do
        if entry.spec.socket=="PRZArmoryMechanicsLever" then play=entry.play;break end
    end
    local phase=play and play.track and math.min(1,play.elapsed/math.max(.001,play.track.duration or .001)) or 0
    local queue=ISTimedActionQueue.queues and ISTimedActionQueue.queues[p]
    local action=queue and queue.current
    local active=play~=nil and play.holy==true and not p:isPlayerMoving() and not nonWeapon(p)
        and not action and not p:isPerformingAnAction()
    p:setVariable("PRZArmoryHolyCycleActive",active)
    p:setVariable("PRZArmoryHolyCyclePhase",phase)
end
local function special(w)
    local n=PRZArmory.NewWeapons
    if n and (n.active and n.active.weapon==w or n.transform and n.transform.weapon==w
        or n.pendingStart and n.pendingStart.weapon==w) then return true end
    local a=PRZArmory.Arsenal
    if a and a.current and a.current.weapon==w then return true end
    local data=w:getModData().PRZArmoryArsenal
    return w:getFullType()=="PRZWeapons.OmegaSVDEX" and data and data.grenadeMode==true
end
local function noMag(w)
    local kind=w:getMagazineType()
    return kind and kind~="" and not w:isContainsClip()
end
local function ready(name) return name and PRZArmory.ModelCache.ready(name) end
local function sourceModel(spec,name)
    name=canonical(name)
    if spec.base=="PRZArmoryDualInfinity" and PRZArmory.DualBallistics.isBody(name) then name=name:gsub("_Muzzle%d%d$","") end
    if name==spec.body or name==spec.bodyNoMag or name==spec.base or name==spec.base.."NoMag" then
        return spec.base,spec.body,spec.bodyNoMag
    end
    for source,body in pairs(spec.bodyBySprite or {}) do
        if name==source or name==source.."NoMag" or name==body.body or name==body.bodyNoMag then
            return source,body.body,body.bodyNoMag
        end
    end
end
local function bodyTarget(s,name)
    if s.spec.base=="PRZArmoryDualInfinity" then return PRZArmory.DualBallistics.body(name,s.lease) end
    return name
end
local function refreshAction(p,w)
    local queue=ISTimedActionQueue.queues and ISTimedActionQueue.queues[p]
    local action=queue and queue.current
    if action and (action.gun==w or action.weapon==w) and action.setOverrideHandModels then
        -- Preserve native magazine/grenade props in the other hand.
        if action.Type=="ISInsertMagazine" or action.Type=="ISEjectMagazine"
            or action.Type=="ISRackFirearm" or action.Type=="ISReloadWeaponAction" then
            action:setOverrideHandModels(w,action.magazine or action.clip)
            return true
        end
    end
    return false
end
local function apply(entry,frame)
    frame=frame or ZERO
    local offset,rotate=frame.offset or ZERO.offset,frame.rotate or ZERO.rotate
    -- Native render snapshots read these vectors each frame. Every bound actor
    -- owns a distinct script slot; no global model or parent hand is rotated.
    entry.attachment:getOffset():set(offset[1],offset[2],offset[3])
    entry.attachment:getRotate():set(rotate[1],rotate[2],rotate[3])
end
local function hasType(part,types)
    if not part then return false end
    local full=part:getFullType()
    for _,name in ipairs(types or {}) do if full==name then return true end end
    return false
end
local function actorItem(s,side)
    if side=="L" then
        local left=s.player:getAttachedItem("PRZArmoryLeftHandVisual")
        return left and left.getWeaponPart and left or nil
    end
    return s.weapon
end
local function releaseEntries(s)
    local changed=false
    for _,entry in ipairs(s.entries or {}) do
        apply(entry,ZERO)
        if entry.item:getWeaponPart(entry.spec.slot)==entry.part then
            entry.item:detachWeaponPart(s.player,entry.part,false);changed=true
        end
    end
    s.entries={}
    if s.lease then
        local leases=M.leases[s.weapon:getFullType()]
        if leases and leases[s.lease]==s then leases[s.lease]=nil end
        s.lease=nil
    end
    return changed
end
local function leftModel(s,mechanical)
    local spec=s.spec.left
    local left=s.player:getAttachedItem("PRZArmoryLeftHandVisual")
    if not spec or not left or not left.setStaticModel or mechanical and not left.getWeaponPart then return false end
    local current=canonical(left:getStaticModel())
    if current~=spec.base and current~=spec.base.."NoMag" and current~=spec.body and current~=spec.bodyNoMag then return false end
    local target=mechanical and (noMag(s.weapon) and spec.bodyNoMag or spec.body)
        or (spec.base..(noMag(s.weapon) and "NoMag" or ""))
    if not ready(target) or current==target then return false end
    left:setStaticModel(target)
    if left.setWeaponSprite then left:setWeaponSprite(target) end
    return true
end
function M.unbind(s)
    if not s then return end
    if s.weapon:getFullType()=="PRZWeapons.OmegaHolyFlame" then
        s.player:setVariable("PRZArmoryHolyCycleActive",false)
        s.player:setVariable("PRZArmoryHolyCyclePhase",0)
    end
    local changed=releaseEntries(s)
    local source=sourceModel(s.spec,s.weapon:getWeaponSprite())
    if source then
        local original=source..(noMag(s.weapon) and "NoMag" or "")
        if canonical(s.weapon:getWeaponSprite())~=original and ready(original) then
            s.weapon:setWeaponSprite(original);changed=true
        end
    end
    changed=leftModel(s,false) or changed
    if changed then refreshAction(s.player,s.weapon);s.player:resetEquippedHandsModels() end
    if M.states[s.player]==s then M.states[s.player]=nil end
end
function M.suspend(p,w)
    local s=M.states[p]
    if s and (not w or s.weapon==w) then M.unbind(s) end
end
function M.spriteFor(w,name)
    -- JANUS's model selector must compare against the same body alias, otherwise
    -- its idle polling would switch base/body twice per frame.
    if not w or special(w) then return name end
    for _,s in pairs(M.states) do
        if s.weapon==w and s.lease then
            local _,body,bodyNoMag=sourceModel(s.spec,name)
            if body then return noMag(w) and bodyNoMag or body end
        end
    end
    return name
end
local function allocate(s)
    local full=s.weapon:getFullType();local leases=M.leases[full]
    if not leases then leases={};M.leases[full]=leases end
    for i=1,(D.poolSize or 16) do
        if not leases[i] then leases[i]=s;s.lease=i;return true end
    end
    return false -- An overfull visible crowd keeps its complete original mesh.
end
local function bind(p,w)
    local spec=D.weapons[w:getFullType()]
    local source,body,bodyNoMag=sourceModel(spec,w:getWeaponSprite())
    if not source or not ready(noMag(w) and bodyNoMag or body) then return nil end
    local s={player=p,weapon=w,spec=spec,source=source,entries={},elapsed=0}
    if not allocate(s) then return nil end
    if not ready(bodyTarget(s,noMag(w) and bodyNoMag or body)) then releaseEntries(s);return nil end
    -- Preflight every child before creating/attaching anything. Otherwise one
    -- pending mesh repeatedly creates and discards the earlier parts each tick.
    local prepared={}
    for _,partSpec in ipairs(spec.parts or {}) do
        local item=actorItem(s,partSpec.side)
        if item then
            local name=partSpec.models[s.lease]
            local script=ready(name) and getScriptManager():getModelScript(name:find("%.") and name or "Base."..name)
            local attachment=script and script:getAttachmentById(partSpec.socket)
            local existing=item:getWeaponPart(partSpec.slot)
            if not attachment or existing and not hasType(existing,partSpec.items) then
                releaseEntries(s);return nil
            end
            prepared[#prepared+1]={item=item,existing=existing,attachment=attachment,spec=partSpec}
        end
    end
    for _,entry in ipairs(prepared) do
        local part=instanceItem(entry.spec.items[s.lease])
        if not part then releaseEntries(s);return nil end
        if entry.existing then entry.item:detachWeaponPart(p,entry.existing,false) end
        entry.part=part;entry.item:attachWeaponPart(p,part,false)
        s.entries[#s.entries+1]=entry
        if entry.item:getWeaponPart(entry.spec.slot)~=part then releaseEntries(s);return nil end
        apply(entry,ZERO)
    end
    if #s.entries==0 then releaseEntries(s);return nil end
    local target=bodyTarget(s,noMag(w) and bodyNoMag or body)
    if spec.base=="PRZArmoryDualInfinity" then PRZArmory.DualBallistics.reset(s.lease) end
    w:setWeaponSprite(target);leftModel(s,true)
    M.states[p]=s;refreshAction(p,w);p:resetEquippedHandsModels()
    return s
end
local function reconcileEntries(s)
    local changed=false
    for _,entry in ipairs(s.entries or {}) do
        local current=entry.item:getWeaponPart(entry.spec.slot)
        if current~=entry.part then
            if current and current:getFullType()==entry.part:getFullType() then
                -- A native MP field packet may deserialize an equivalent part.
                entry.part=current
            else
                if current and not hasType(current,entry.spec.items) then return false,false end
                if current then entry.item:detachWeaponPart(s.player,current,false) end
                -- Restore this actor's existing cosmetic part after an MP weapon
                -- update clears client-only parts. Never send inventory packets,
                -- recreate the gun, or change ammunition for visual recovery.
                entry.item:attachWeaponPart(s.player,entry.part,false)
                if entry.item:getWeaponPart(entry.spec.slot)~=entry.part then return false,false end
                changed=true
            end
        end
    end
    return true,changed
end
local function sample(track,t)
    local frames=track and track.frames
    if not frames or #frames==0 then return ZERO end
    if t<=frames[1].t then return frames[1] end
    for i=2,#frames do
        local b=frames[i]
        if t<=b.t then
            local a=frames[i-1];local f=(t-a.t)/math.max(.000001,b.t-a.t)
            local out={offset={},rotate={}}
            for j=1,3 do
                out.offset[j]=a.offset[j]+(b.offset[j]-a.offset[j])*f
                local delta=(b.rotate[j]-a.rotate[j]+180)%360-180
                out.rotate[j]=a.rotate[j]+delta*f
            end
            return out
        end
    end
    return frames[#frames]
end
M.sample=sample
local function casing(p,w,side,kind)
    if PRZArmory.Casings and PRZArmory.Casings.emit then PRZArmory.Casings.emit(p,w,side,kind) end
end
local function rackSeconds(p,w)
    -- Native B42 animation durations (seconds before ReloadSpeed), not the
    -- PRZArmory source reload length. The original Rack action owns the lifecycle.
    local spec=PRZArmory.Config.weapons[w:getFullType()]
    if spec and spec.dual then return 1.2 end
    local kind=tostring(w:getWeaponReloadType())
    if kind=="handgun" then return 4/3 end
    if kind=="shotgun" then return p:isAiming() and 23/30 or 1.4 end
    return p:isAiming() and 5/3 or 53/30
end
M.rackSeconds=rackSeconds
local function start(p,w,kind,side,empty,remote,rackAction)
    if not ballistic(p,w) or special(w) or nonWeapon(p) then return false end
    local s=enabled(p,w) and (M.states[p] or bind(p,w))
    if s and s.weapon~=w then return false end
    local config=PRZArmory.Config.weapons[w:getFullType()]
    side=config.dual and side=="L" and "L" or "R"
    local current=total(w)
    if empty and s then s.predictedEmpty={ammo=current,untilMs=getTimestampMs()+1500} end
    if kind=="shot" then
        if config.dual then
            if remote then p:setVariable("PRZArmoryFireLeft",side=="L") end
            if s then PRZArmory.DualBallistics.prepare(p,w,side,s.lease) end
            PRZArmory.DualMuzzle.emit(p,w,side)
        end
        for _,entry in ipairs(s and s.entries or {}) do
            if not entry.spec.side or entry.spec.side==side then
                local tracks=entry.spec.tracks or {}
                entry.play={track=empty and tracks.shoot_empty or tracks.shoot,elapsed=0,
                    holy=w:getFullType()=="PRZWeapons.OmegaHolyFlame" and entry.spec.socket=="PRZArmoryMechanicsLever"}
            end
        end
        if not w:isRackAfterShoot() then casing(p,w,side,"shot") end
    elseif kind=="rack" then
        if s then s.predictedEmpty=nil end
        for _,entry in ipairs(s and s.entries or {}) do
            local track=(entry.spec.tracks or {}).rack
            if track then entry.play={track=track,elapsed=0,rack=true,action=rackAction,
                rackSeconds=rackSeconds(p,w)} end
        end
    elseif kind=="dry" then
        for _,entry in ipairs(s and s.entries or {}) do
            local track=(entry.spec.tracks or {}).dry
            if track then entry.play={track=track,elapsed=0} end
        end
    else return false end
    if s then holyHands(s) end
    if isClient() and not remote and PRZArmory.Network.isLocal(p) then
        PRZArmory.Network.weaponRequest(p,w,"MechanicsVisual",{kind=kind,side=side,empty=empty==true})
    end
    return true
end
local function finishRack(action)
    local s=M.states[action.character]
    if not s or s.weapon~=action.gun then return end
    for _,entry in ipairs(s.entries) do
        if entry.play and entry.play.action==action then entry.play=nil;apply(entry,ZERO) end
    end
    holyHands(s)
end
function M.onRemote(p,w,args)
    if PRZArmory.Network.isLocal(p) or not ballistic(p,w) or special(w) or nonWeapon(p) then return end
    local key=tostring(p:getOnlineID())..":"..tostring(w:getID())
    if (args.serial or 0)<=(M.remoteSerials[key] or 0) then return end
    M.remoteSerials[key]=args.serial
    if args.kind=="rackEject" then
        if w:isRackAfterShoot() then casing(p,w,"R","rack") end
        return
    end
    return start(p,w,args.kind,args.side,args.empty==true,true)
end
function M.updatePlayer(p,dt)
    local w=p and p:getPrimaryHandItem();local s=M.states[p]
    if s and (s.weapon~=w or not enabled(p,w) or special(w) or not sourceModel(s.spec,w:getWeaponSprite())) then
        M.unbind(s);s=nil
    end
    if not enabled(p,w) or special(w) then return end
    s=s or bind(p,w);if not s then return end
    local intact,partsChanged=reconcileEntries(s)
    if not intact then M.unbind(s);return end
    local dry=not unlimited(p) and PRZArmory.Network.isLocal(p) and p:isRangedWeaponEmpty()
    if dry and not s.wasDry then
        start(p,w,"dry","R",false,false)
        if PRZArmory.Arsenal.notifyChamber then PRZArmory.Arsenal.notifyChamber(p,w) end
    end
    s.wasDry=dry
    local _,body,bodyNoMag=sourceModel(s.spec,w:getWeaponSprite())
    local target=bodyTarget(s,noMag(w) and bodyNoMag or body)
    local changed=partsChanged
    if target and canonical(w:getWeaponSprite())~=target and ready(target) then
        w:setWeaponSprite(target);changed=true
    end
    local left=p:getAttachedItem("PRZArmoryLeftHandVisual")
    if s.spec.left and left~=s.left then
        -- The reliable native item/attachment packet can arrive after a shot.
        -- Rebind once when the actual left prop becomes available.
        local hadLeft=false
        for _,entry in ipairs(s.entries) do if entry.spec.side=="L" then hadLeft=true;break end end
        s.left=left
        if left and left.getWeaponPart and not hadLeft then M.unbind(s);s=bind(p,w);if not s then return end end
    end
    changed=leftModel(s,true) or changed
    if changed then refreshAction(p,w);p:resetEquippedHandsModels() end
    if s.predictedEmpty and (getTimestampMs()>s.predictedEmpty.untilMs or total(w)>s.predictedEmpty.ammo) then s.predictedEmpty=nil end
    local empty=not unlimited(p) and (w:haveChamber() and not w:isRoundChambered() or total(w)==0 or s.predictedEmpty~=nil)
    local speed=p:getVariableFloat("ReloadSpeed",1)
    for _,entry in ipairs(s.entries) do
        local play=entry.play;local frame
        if play and play.track then
            if play.action then
                local queue=ISTimedActionQueue.queues and ISTimedActionQueue.queues[p]
                if queue and queue.current and queue.current~=play.action then entry.play=nil;play=nil end
            end
        end
        if play and play.track then
            local scale=play.rack and math.max(.1,speed)*(play.track.duration or 0)/play.rackSeconds or 1
            play.elapsed=play.elapsed+(dt or 0)*scale
            frame=sample(play.track,play.elapsed)
            if play.elapsed>=(play.track.duration or 0) then
                entry.play=nil
                frame=empty and (entry.spec.tracks or {}).empty or ZERO
            end
        else
            frame=empty and (entry.spec.tracks or {}).empty or ZERO
        end
        apply(entry,frame)
    end
    holyHands(s)
end
local seenActors,removedStates={},{}
function M.update()
    if isServer() then return end
    local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-(M.lastMs or now))/1000));M.lastMs=now
    if isGamePaused() then dt=0 end
    for actor in pairs(seenActors) do seenActors[actor]=nil end
    for i=#removedStates,1,-1 do removedStates[i]=nil end
    local seen=seenActors;local p=getSpecificPlayer(0)
    if p then seen[p]=true;M.updatePlayer(p,dt) end
    if isClient() and getOnlinePlayers then
        local players=getOnlinePlayers()
        if players then for i=0,players:size()-1 do
            p=players:get(i)
            if p and not seen[p] then seen[p]=true;M.updatePlayer(p,dt) end
        end end
    end
    local remove=removedStates
    for actor,s in pairs(M.states) do if not seen[actor] then remove[#remove+1]=s end end
    for _,s in ipairs(remove) do M.unbind(s) end
end
function M.preload()
    if isServer() then return end
    for _,spec in pairs(D.weapons or {}) do
        ready(spec.base);ready(spec.body);ready(spec.bodyNoMag)
        if spec.base=="PRZArmoryDualInfinity" then
            for i=1,(D.poolSize or 16) do ready(PRZArmory.DualBallistics.body(spec.body,i));ready(PRZArmory.DualBallistics.body(spec.bodyNoMag,i)) end
        end
        if spec.left then ready(spec.left.body);ready(spec.left.bodyNoMag) end
        for _,body in pairs(spec.bodyBySprite or {}) do ready(body.body);ready(body.bodyNoMag) end
        for _,part in ipairs(spec.parts or {}) do for _,name in ipairs(part.models or {}) do ready(name) end end
    end
end
function M.reset()
    local list={};for _,s in pairs(M.states) do list[#list+1]=s end
    for _,s in ipairs(list) do M.unbind(s) end
    M.states={};M.leases={};M.remoteSerials={};M.lastMs=getTimestampMs()
    for actor in pairs(seenActors) do seenActors[actor]=nil end
    for i=#removedStates,1,-1 do removedStates[i]=nil end
end
function M.installHooks()
    if M.hooked then return end
    M.hooked=true
    local previous=ISReloadWeaponAction.onShoot
    local function shoot(p,w)
        local candidate=ballistic(p,w) and PRZArmory.Network.isLocal(p) and not special(w)
            and not nonWeapon(p) and (unlimited(p) or not p:isRangedWeaponEmpty()) and loaded(p,w)
        local spec=candidate and PRZArmory.Config.weapons[w:getFullType()]
        if candidate and spec.kind=="minigun" then
            local committed=PRZArmory.Expansion and PRZArmory.Expansion.committed
            candidate=committed and committed.player==p and committed.weapon==w
                and getTimestampMs()<=(committed.untilMs or 0)
        end
        local before=candidate and total(w) or 0
        local side=candidate and spec.dual and p:getVariableBoolean("PRZArmoryFireLeft") and "L" or "R"
        local result=previous(p,w)
        if candidate then
            -- Native CombatManager invokes this collision callback for local
            -- accepted fire. Its original onShoot owns every ammo mutation.
            -- In MP the server owns the magazine debit, so use the pre-shot
            -- last-round observation only as a short cosmetic latch.
            start(p,w,"shot",side,not unlimited(p) and (total(w)==0 or isClient() and before<=w:getAmmoPerShoot()),false)
        end
        return result
    end
    Events.OnWeaponSwingHitPoint.Remove(previous)
    ISReloadWeaponAction.onShoot=shoot
    Events.OnWeaponSwingHitPoint.Add(shoot)
    local rackStart,rackEvent=ISRackFirearm.start,ISRackFirearm.animEvent
    local rackStop,rackPerform=ISRackFirearm.stop,ISRackFirearm.perform
    function ISRackFirearm:start()
        -- Native start may immediately force-complete an empty/invalid rack.
        -- Observe its eligibility before start clears spent-round fields, and
        -- resolve the same authoritative inventory item used by native MP.
        local gun=self.gun
        if isClient() and gun then gun=self.character:getInventory():getItemById(gun:getID()) end
        local accepted=PRZArmory.Network.isLocal(self.character) and ballistic(self.character,gun)
            and ISReloadWeaponAction.canRack(gun)
        self.przarmoryMechanicsHadSpent=accepted and (gun:isSpentRoundChambered() or gun:getSpentRoundCount()>0)
        local result=rackStart(self)
        if accepted and ballistic(self.character,self.gun) then
            start(self.character,self.gun,"rack","R",false,false,self)
        end
        return result
    end
    function ISRackFirearm:animEvent(event,parameter)
        local result=rackEvent(self,event,parameter)
        if event=="rackBullet" and not self.przarmoryMechanicsEjected
            and self.przarmoryMechanicsHadSpent and PRZArmory.Network.isLocal(self.character) and ballistic(self.character,self.gun)
            and self.gun:isRackAfterShoot() then
            self.przarmoryMechanicsEjected=true;casing(self.character,self.gun,"R","rack")
            if isClient() then PRZArmory.Network.weaponRequest(self.character,self.gun,"MechanicsVisual",{kind="rackEject",side="R"}) end
        end
        return result
    end
    function ISRackFirearm:stop()
        finishRack(self)
        if rackStop then return rackStop(self) end
    end
    function ISRackFirearm:perform()
        finishRack(self)
        if rackPerform then return rackPerform(self) end
    end
    Events.OnTick.Add(M.update)
end
-- Controller requires this module after its firearm hook chain, before adding
-- its own charge callback. Preserve that callback order (notably cannon shot
-- tickets); deferring replacement until GameStart would reverse the two.
M.installHooks()
Events.OnGameStart.Add(function()M.reset();M.preload();M.update()end)
Events.OnMainMenuEnter.Add(M.reset)
Events.OnSave.Add(M.reset)
return M
