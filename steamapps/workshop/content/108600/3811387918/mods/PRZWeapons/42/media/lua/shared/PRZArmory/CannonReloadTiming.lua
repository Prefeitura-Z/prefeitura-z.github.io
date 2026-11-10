-- Keep B42's registered native action and its exact one-item transaction on
-- every host. A custom derived action type is not a network action schema.
require "PRZArmory/Config"
require "TimedActions/ISReloadWeaponAction"
PRZArmory=PRZArmory or {}
if PRZArmory.CannonReloadTiming then return PRZArmory.CannonReloadTiming end
local T={}
PRZArmory.CannonReloadTiming=T
local R=ISReloadWeaponAction
local old={getDuration=R.getDuration,adjustMaxTime=R.adjustMaxTime,start=R.start,serverStart=R.serverStart,
    update=R.update,stop=R.stop,serverStop=R.serverStop,forceCancel=R.forceCancel,
    perform=R.perform,complete=R.complete,animEvent=R.animEvent,
    forceComplete=R.forceComplete,loadAmmo=R.loadAmmo}
local READY="PRZArmoryCannonLoadReady"
local function cannon(a) return a.gun and a.gun:getFullType()=="PRZWeapons.OmegaBlackDragonCannon" end
function T.seconds()
    if PRZArmory.Sandbox and PRZArmory.Sandbox.refresh then PRZArmory.Sandbox.refresh() end
    return math.max(.1,math.min(60,tonumber(PRZArmory.Config.cannonReloadSeconds) or 3.5))
end
local function cosmetic(method,a,fraction)
    if not isServer() and PRZArmory.CannonReload and PRZArmory.CannonReload[method] then
        PRZArmory.CannonReload[method](a,fraction)
    end
end
local function begin(a)
    a.przarmoryCannonSeconds=T.seconds();a.przarmoryCannonStartedAt=getTimestampMs()
    a.przarmoryCannonLastMs=a.przarmoryCannonStartedAt;a.przarmoryCannonElapsed=0
    a.przarmoryCannonCancelled=false;a.przarmoryCannonCompleted=false;a.przarmoryCannonCommitted=false
end
local function valid(a)
    if a.przarmoryCannonCancelled or not a.character or a.character:isDead() then return false end
    if not R.isValid(a) or a.gun:getCondition()<=0 or a.gun:getCurrentAmmoCount()>=a.gun:getMaxAmmo() then return false end
    if not a.bullets or a.bullets:isEmpty() then return false end
    -- A shell moved away while the action waited cannot be loaded from the
    -- old list snapshot. Native code still performs the debit and sync below.
    return a.character:getInventory():contains(a.bullets:get(0))
end
local function serverReady(a)
    return a.przarmoryCannonStartedAt and getTimestampMs()-a.przarmoryCannonStartedAt+1 >= a.przarmoryCannonSeconds*1000
end
local function commit(a)
    if isClient() or a.przarmoryCannonCommitted or not valid(a) then return false end
    a.przarmoryCannonCommitted=true;a.przarmoryCannonCommitting=true
    -- Native loadFinished calls native loadAmmo: one physical inventory item,
    -- normal reload XP, native item-removal packet and weapon-field sync.
    old.animEvent(a,"loadFinished",nil)
    a.przarmoryCannonCommitting=false
    return true
end
function R:getDuration()
    if not cannon(self) then return old.getDuration(self) end
    -- MP completion is driven by the server event. A local finite timer could
    -- finish before the accepted server action starts across network latency.
    if isClient() or isServer() then return -1 end
    return math.max(1,math.ceil(getGameTime():getMultiplierFromTimeDelta(T.seconds())))
end
function R:adjustMaxTime(value)
    if cannon(self) then return value end
    return old.adjustMaxTime(self,value)
end
function R:start()
    if not cannon(self) then return old.start(self) end
    begin(self);old.start(self)
    if self.przarmoryCannonCancelled or not self.bullets or self.bullets:isEmpty() then
        self.przarmoryCannonCancelled=true;cosmetic("stop",self);return
    end
    cosmetic("start",self,self.przarmoryCannonSeconds)
end
function R:serverStart()
    if not cannon(self) then return old.serverStart(self) end
    begin(self);self:initVars();self:ejectSpentRounds()
    if not valid(self) then self.przarmoryCannonCancelled=true;self.netAction:forceComplete();return end
    -- A private event prevents early native animation load/rack events from
    -- ending the action. A second wall-clock check protects direct callbacks.
    emulateAnimEventOnce(self.netAction,math.ceil(self.przarmoryCannonSeconds*1000),READY,nil)
end
function R:update()
    if not cannon(self) then return old.update(self) end
    if self.przarmoryCannonCancelled or self.przarmoryCannonCompleted then return end
    local now=getTimestampMs();local dt=math.max(0,math.min(.25,(now-(self.przarmoryCannonLastMs or now))/1000))
    self.przarmoryCannonLastMs=now
    if not isGamePaused() then self.przarmoryCannonElapsed=(self.przarmoryCannonElapsed or 0)+dt end
    local fraction
    if not isClient() and not isServer() then fraction=self:getJobDelta()
    else fraction=(self.przarmoryCannonElapsed or 0)/(self.przarmoryCannonSeconds or T.seconds()) end
    fraction=math.max(0,math.min(1,fraction))
    self.gun:setJobDelta(fraction);cosmetic("update",self,fraction)
end
function R:animEvent(event,parameter)
    if not cannon(self) then return old.animEvent(self,event,parameter) end
    if self.przarmoryCannonCancelled or self.przarmoryCannonCompleted then return end
    if event==READY then
        if isServer() and serverReady(self) and not commit(self) and not self.przarmoryCannonCommitted then
            self.przarmoryCannonCancelled=true;self.netAction:forceComplete()
        end
        return
    end
    if event=="loadFinished" or event=="rackingFinished" then return end
    return old.animEvent(self,event,parameter)
end
function R:loadAmmo()
    if cannon(self) and not self.przarmoryCannonCommitting then return end
    return old.loadAmmo(self)
end
function R:forceComplete()
    if cannon(self) then
        if self.przarmoryCannonPerforming or self.przarmoryCannonCancelled or not self.przarmoryCannonCommitted then return end
    end
    return old.forceComplete(self)
end
function R:perform()
    if not cannon(self) then return old.perform(self) end
    if self.przarmoryCannonCancelled or self.przarmoryCannonCompleted then return end
    if not isClient() then
        if isServer() then
            if not serverReady(self) then return end
        elseif self:getJobDelta()<.999 then return end
        self.przarmoryCannonPerforming=true
        if not self.przarmoryCannonCommitted and not commit(self) then
            self.przarmoryCannonPerforming=false;self:stop();return
        end
    end
    self.przarmoryCannonCompleted=true;cosmetic("stop",self)
    old.perform(self);self.przarmoryCannonPerforming=false
end
function R:complete()
    if not cannon(self) then return old.complete(self) end
    -- The client NetTimedAction and local LuaTimedAction share this table.
    -- Network acknowledgement must not suppress the later local perform()
    -- that clears animation variables and removes the drawing override.
    if isClient() then return old.complete(self) end
    if self.przarmoryCannonCancelled then return true end
    if self.przarmoryCannonCompleted then return true end
    if not isServer() or not serverReady(self) then return false end
    if not self.przarmoryCannonCommitted and not commit(self) then return false end
    self.przarmoryCannonCompleted=true
    return old.complete(self)
end
function R:stop()
    if cannon(self) then self.przarmoryCannonCancelled=true;cosmetic("stop",self) end
    return old.stop(self)
end
function R:serverStop()
    if cannon(self) then self.przarmoryCannonCancelled=true end
    if old.serverStop then return old.serverStop(self) end
end
function R:forceCancel()
    if cannon(self) then self.przarmoryCannonCancelled=true;cosmetic("stop",self) end
    if old.forceCancel then return old.forceCancel(self) end
end
return T
