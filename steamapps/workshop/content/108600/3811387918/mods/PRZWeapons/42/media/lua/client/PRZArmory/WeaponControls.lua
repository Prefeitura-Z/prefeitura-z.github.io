-- Discoverable controls in the existing inventory menu and native halo text.
-- No HUD window, new global shortcut, ammo mutation or automatic mode switch.
require "PRZArmory/Arsenal"
require "PRZArmory/Config"
require "ISUI/ISInventoryPane"
require "TimedActions/ISRackFirearm"
require "TimedActions/ISTimedActionQueue"
local A=PRZArmory.Arsenal
local function supported(w)
    return w and (w:getFullType()=="PRZWeapons.OmegaSVDEX" or w:getFullType()=="PRZWeapons.OmegaDualInfinity")
end
function A.notifyMode(p,w)
    if not supported(w) or not PRZArmory.Network.isLocal(p) or p:getPrimaryHandItem()~=w then return end
    local key=PRZArmory.Config.specialKey or "G"
    local text
    if w:getFullType()=="PRZWeapons.OmegaSVDEX" then
        local d=A.state(w)
        text=getText(d.grenadeMode and "IGUI_PRZOmega_SVDGrenadeMode" or "IGUI_PRZOmega_SVDRifleMode",d.grenades,key)
    else text=getText(w:getFireMode()=="Auto" and "IGUI_PRZOmega_DualAuto" or "IGUI_PRZOmega_DualSingle",key) end
    if HaloTextHelper then HaloTextHelper.addText(p,text) end
end
local function apply(p,w)
    if p:getPrimaryHandItem()==w then A.toggle(p,w) end
end
local function reload(p,w)
    if p:getPrimaryHandItem()==w then A.beginReload(p,w) end
end
local function needsChamber(w)
    return w and PRZArmory.Config.weapons[w:getFullType()] and w:isRanged()
        and w:haveChamber() and not w:isRoundChambered() and w:getCurrentAmmoCount()>0
        and not w:isJammed()
end
local warned=setmetatable({}, {__mode="k"})
function A.notifyChamber(p,w)
    if not needsChamber(w) or not PRZArmory.Network.isLocal(p) then return end
    local now=getTimestampMs()
    if now<(warned[p] or 0) then return end
    warned[p]=now+5000
    if HaloTextHelper then HaloTextHelper.addText(p,getText("IGUI_PRZOmega_ChamberEmpty")) end
end
local function rack(p,w)
    if p:getPrimaryHandItem()==w and needsChamber(w) and not ISTimedActionQueue.isPlayerDoingAction(p) then
        ISTimedActionQueue.add(ISRackFirearm:new(p,w))
    end
end
local function menu(playerIndex,context,items)
    local p=getSpecificPlayer(playerIndex);local w=p and p:getPrimaryHandItem()
    if not w or not PRZArmory.Config.weapons[w:getFullType()] then return end
    local found=false
    for _,item in ipairs(ISInventoryPane.getActualItems(items)) do if item==w then found=true;break end end
    if not found then return end
    if needsChamber(w) then context:addOption(getText("ContextMenu_PRZOmega_ChamberRound"),p,rack,w) end
    if not supported(w) or PRZArmory.Config.effectsEnabled==false then return end
    if w:getFullType()=="PRZWeapons.OmegaSVDEX" then
        local d=A.state(w)
        local key=d.grenadeMode and "ContextMenu_PRZOmega_SelectRifle" or "ContextMenu_PRZOmega_SelectGrenade"
        context:addOption(getText(key,PRZArmory.Config.specialKey),p,apply,w)
        if d.grenadeMode then context:addOption(getText("ContextMenu_PRZOmega_LoadGrenade",d.grenades),p,reload,w) end
    else context:addOption(getText("ContextMenu_PRZOmega_DualFireMode",PRZArmory.Config.specialKey),p,apply,w) end
end
Events.OnFillInventoryObjectContextMenu.Add(menu)
Events.OnEquipPrimary.Add(function(p,w)
    if supported(w) then A.notifyMode(p,w) end
    A.notifyChamber(p,w)
end)
return {menu=menu}
