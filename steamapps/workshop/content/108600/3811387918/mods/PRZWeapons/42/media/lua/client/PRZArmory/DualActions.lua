-- Scoped presentation around native B42 equipment and magazine actions.
-- Native animEvent/perform/complete methods retain every item/ammo transaction.
require "TimedActions/ISEquipWeaponAction"
require "TimedActions/ISUnequipAction"
require "TimedActions/ISAttachItemHotbar"
require "TimedActions/ISEjectMagazine"
require "TimedActions/ISRackFirearm"
require "PRZArmory/Network"
require "PRZArmory/Config"

local A,Config=PRZArmory.Arsenal,PRZArmory.Config
local function dual(p,w)
    local s=w and Config.weapons[w:getFullType()]
    return s and s.arsenal and s.dual and Config.effectsEnabled~=false
        and PRZArmory.Network.isLocal(p)
end
local function finish(self)
    if self.przarmoryDualCycle then A.endDualMotion(self);self.przarmoryDualCycle=nil end
end
local function wrap(class,kind)
    if not class then return end
    local originalStart,originalEvent=class.start,class.animEvent
    local originalStop,originalPerform,originalCancel=class.stop,class.perform,class.forceCancel
    function class:start()
        local w=self.gun or self.item
        local applicable=dual(self.character,w)
        if kind=="draw" then
            applicable=applicable and self.primary and not self:isAlreadyEquipped()
        elseif kind=="holster" then
            applicable=applicable and self.character:getPrimaryHandItem()==w
                and self.reason~="drop" and self.reason~="place"
        elseif kind=="attach" then
            applicable=applicable and self.character:getPrimaryHandItem()==w
        elseif kind=="eject" then
            applicable=applicable and w:isContainsClip()
        end
        if not applicable then return originalStart(self) end
        self.przarmoryDualCycle=true
        A.beginDualMotion(self,w)
        originalStart(self)
        self:setOverrideHandModels(w,nil)
        local spec=Config.weapons[w:getFullType()]
        if (kind=="eject" or kind=="insert") and spec.reloadSeconds then
            -- Authored clips are 1.2s eject + 1.5s insert. One shared speed
            -- gives a 3s magazine exchange, rather than 3s for each stage.
            -- Native end events still own every magazine/ammunition change.
            local seconds=math.max(.1,tonumber(spec.reloadSeconds) or 3)
            self.przarmoryDualReloadSeconds=seconds*(kind=="eject" and 1.2 or 1.5)/2.7
            self.character:setVariable("ReloadSpeed",2.7/seconds)
        end
        if kind=="draw" or kind=="holster" or kind=="attach" then
            self.character:setVariable("PRZArmoryDualActionSpeed",1.0)
            self:setActionAnim(kind=="draw" and "PRZArmoryDualDraw" or "PRZArmoryDualHolster")
        end
    end
    function class:animEvent(event,parameter)
        if not self.przarmoryDualCycle then
            if originalEvent then return originalEvent(self,event,parameter) end
            return
        end
        if event=="PRZArmoryDualHideLeft" then A.setDualVisualVisible(self.character,false);return end
        if event=="PRZArmoryDualShowLeft" then A.setDualVisualVisible(self.character,true);return end
        if event=="PRZArmoryDualActionEnd" then
            if not self.przarmoryDualEnded then self.przarmoryDualEnded=true;self:forceComplete() end
            return
        end
        if event=="detachConnect" or event=="attachConnect" then
            -- Preserve the native hotbar connection, but play the remaining
            -- recovery keys before its usual maxTime=-1 early completion.
            if kind~="attach" and not self.fromHotbar then return end
            local saved=self.maxTime;self.maxTime=0
            if originalEvent then originalEvent(self,event,parameter) end
            self.maxTime=saved
            if event=="attachConnect" then A.setDualVisualVisible(self.character,false) end
            return
        end
        if originalEvent then return originalEvent(self,event,parameter) end
    end
    function class:stop()
        finish(self)
        if originalStop then return originalStop(self) end
    end
    function class:perform()
        local result
        if originalPerform then result=originalPerform(self) end
        finish(self)
        return result
    end
    function class:forceCancel()
        finish(self)
        if originalCancel then return originalCancel(self) end
    end
    -- Never wrap .new: B42 NetTimedAction serializes constructor parameters by
    -- their Lua prototype names. A vararg wrapper silently loses those fields
    -- for EVERY weapon, including vanilla/GunZ, when sent to the server.
    -- Keep native durations as well; cosmetics must not stall inventory actions
    -- waiting for a custom animation event that a remote client may not have.
end
wrap(ISInsertMagazine,"insert")
wrap(ISEjectMagazine,"eject")
wrap(ISRackFirearm,"rack")
wrap(ISEquipWeaponAction,"draw")
wrap(ISUnequipAction,"holster")
wrap(ISAttachItemHotbar,"attach")
return A
