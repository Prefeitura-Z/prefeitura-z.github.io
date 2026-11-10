require "TimedActions/ISBaseTimedAction"
require "TimedActions/ISTimedActionQueue"
require "PRZArmory/Combat"

PRZArmory = PRZArmory or {}
local Sweep = { duration = 0.9, impactFraction = 0.22 / 0.9 }
PRZArmory.SweepAction = Sweep
local SweepTimedAction = ISBaseTimedAction:derive("PRZArmory_SweepTimedAction")

local function singlePlayer()
    return not isServer()
end

local function permitted(action)
    local player, weapon = action.character, action.weapon
    -- This is already a timed action. Do not use Controller.canUse here: its
    -- generic action-queue guard would reject this action's own impact.
    return PRZArmory.Config.effectsEnabled ~= false and not action.cancelled and not action.finished and singlePlayer()
        and player == getSpecificPlayer(0) and not isGamePaused()
        and not player:isDead() and not player:isAsleep()
        and not player:getVehicle() and not player:isSitOnGround()
        and player:isAiming() and player:getSquare()
        and player:getPrimaryHandItem() == weapon and weapon:getCondition() > 0
        and not player:isDoShove() and not player:isPerformingShoveAnimation()
        and not player:isPerformingStompAnimation() and not player:isDoGrapple()
        and not player:isPerformingGrappleGrabAnimation()
        and not player:isPerformingGrappleAnimation()
end

local function finish(action)
    action.finished = true
    if Sweep.current == action then Sweep.current = nil end
end

function SweepTimedAction:isValid()
    return permitted(self)
end

function SweepTimedAction:isValidStart()
    return self:isValid()
end

function SweepTimedAction:adjustMaxTime(maxTime)
    -- The custom animation has fixed timing. Moodles and hand injuries must
    -- not stretch the action without also stretching its animation clip.
    return maxTime
end

function SweepTimedAction:getDuration()
    -- BaseAction counts GameTime multipliers, not milliseconds or frames.
    return math.max(1, math.ceil(getGameTime():getMultiplierFromTimeDelta(Sweep.duration)))
end

function SweepTimedAction:impact()
    if self.impacted or not permitted(self) then return false end
    -- Set first: native Hit callbacks and animation/update ordering cannot
    -- replay this release. This action never calls native DoAttack.
    self.impacted = true
    PRZArmory.Combat.attack(self.character, self.weapon, self.spec, self.charge)
    return true
end

function SweepTimedAction:start()
    if not permitted(self) then self:forceStop(); return end
    self:setActionAnim("PRZArmoryDecimate")
    self.action:setUseProgressBar(false)
    self.action:setBlockMovementEtc(true)
end

function SweepTimedAction:update()
    if not permitted(self) then Sweep.cancel(); return end
    -- The event follows the clip. Progress is a deterministic fallback when
    -- an animation event is missed; both paths share the same one-shot guard.
    if self:getJobDelta() >= Sweep.impactFraction then self:impact() end
end

function SweepTimedAction:animEvent(event)
    if not permitted(self) then return end
    if event == "PRZArmoryDecimateHit" then
        self:impact()
    elseif event == "PRZArmoryDecimateEnd" then
        self:forceComplete()
    end
end

function SweepTimedAction:stop()
    self.cancelled = true
    finish(self)
    -- The base Lua stop resets every queued action. Remove only our release;
    -- Java has already cleared its animation variables before calling here.
    local queue = ISTimedActionQueue.getTimedActionQueue(self.character)
    if queue.current == self then queue:onCompleted(self)
    else queue:removeFromQueue(self) end
end

function SweepTimedAction:perform()
    -- Covers an update that jumps directly to completion. Invalidated or
    -- cancelled releases never acquire damage from this final fallback.
    self:impact()
    finish(self)
    ISBaseTimedAction.perform(self)
end

function SweepTimedAction:forceCancel()
    self.cancelled = true
    finish(self)
end

function SweepTimedAction:new(player, weapon, spec, charge)
    local action = ISBaseTimedAction.new(self, player)
    action.weapon, action.spec, action.charge = weapon, spec, charge
    action.maxTime = action:getDuration()
    action.stopOnAim = false -- G is released while the player still aims.
    action.stopOnWalk, action.stopOnRun = true, true
    action.useProgressBar, action.retriggerLastAction = false, false
    return action
end

function Sweep.begin(player, weapon, spec, charge)
    if Sweep.current or not player or not weapon or not spec or not spec.axe
        or ISTimedActionQueue.isPlayerDoingAction(player) then return nil end
    local action = SweepTimedAction:new(player, weapon, spec, charge)
    if not action:isValidStart() then return nil end
    Sweep.current = action
    local queue = ISTimedActionQueue.add(action)
    if not queue then action:forceCancel(); return nil end
    return action
end

function Sweep.cancel()
    local action = Sweep.current
    if not action then return end
    action.cancelled = true
    if action.action then
        -- Cancel can run while paused, before Java updates timed actions.
        -- Clear only this action's animation variables and movement block.
        action.action:setBlockMovementEtc(false)
        action.action:stopTimedActionAnim()
        action:forceStop()
    end
    finish(action)
end

local function monitor()
    if Sweep.current and not permitted(Sweep.current) then Sweep.cancel() end
end

Events.OnTick.Add(monitor)
Events.OnMainMenuEnter.Add(Sweep.cancel)
Events.OnGameStart.Add(Sweep.cancel)

return Sweep
