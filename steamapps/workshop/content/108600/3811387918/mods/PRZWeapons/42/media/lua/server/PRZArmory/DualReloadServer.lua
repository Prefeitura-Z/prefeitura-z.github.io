-- Eject + insert form one three-second magazine swap. Keep native action types
-- and their original inventory transactions; only the server event clocks vary.
if not isServer() then return end
require "PRZArmory/Config"
require "TimedActions/ISReloadWeaponAction"
require "TimedActions/ISEjectMagazine"
require "TimedActions/ISInsertMagazine"
local nativeEject,nativeInsert=ISEjectMagazine.serverStart,ISInsertMagazine.serverStart
local function seconds(action,fraction)
    if not action.gun or action.gun:getFullType()~="PRZWeapons.OmegaDualInfinity" then return nil end
    local spec=PRZArmory.Config.weapons["PRZWeapons.OmegaDualInfinity"]
    return math.max(.1,(spec.reloadSeconds or 3)*fraction)
end
function ISEjectMagazine:serverStart()
    local duration=seconds(self,1.2/2.7)
    if not duration then return nativeEject(self) end
    self:initVars()
    emulateAnimEventOnce(self.netAction,duration*1000,"unloadFinished",nil)
end
function ISInsertMagazine:serverStart()
    local duration=seconds(self,1.5/2.7)
    if not duration then return nativeInsert(self) end
    if not self.magazine then self.netAction:forceComplete();return end
    self:initVars()
    emulateAnimEventOnce(self.netAction,duration*1000,"loadFinished",nil)
end
