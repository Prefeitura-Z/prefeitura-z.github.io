require "PRZArmory/Config"
require "PRZArmory/Network"
require "TimedActions/ISTimedActionQueue"

-- Grip profiles affect the upper body while aiming, including aim-walking.
-- Native movement nodes retain the legs, movement and turning.
PRZArmory=PRZArmory or {}
local P={players=setmetatable({}, {__mode="k"}),variables=setmetatable({}, {__mode="k"})}
PRZArmory.SourcePose=P
local profiles={
    ["PRZWeapons.OmegaJanus7"]="long",
    ["PRZWeapons.OmegaBalrog7"]="hipBalrog",
    ["PRZWeapons.OmegaM95"]="m95",
    ["PRZWeapons.OmegaBlackDragonCannon"]="hipCannon",
    ["PRZWeapons.OmegaAS50Gold"]="stock",["PRZWeapons.OmegaBalrog11"]="shotgun",
    ["PRZWeapons.OmegaHolyFlame"]="holy",["PRZWeapons.OmegaMG3Gold"]="stock",
    ["PRZWeapons.OmegaMG36Xmas"]="stockForward",["PRZWeapons.OmegaSVDEX"]="stock",
}
local function variable(p,name,value)
    local last=P.variables[p]
    if not last then last={};P.variables[p]=last end
    if last[name]~=value then p:setVariable(name,value);last[name]=value end
end
local function flags(p,rifle,minigun,profile)
    variable(p,"PRZArmorySourceRiflePose",rifle and true or false)
    variable(p,"PRZArmorySourceMinigunPose",minigun and true or false)
    variable(p,"PRZArmorySourceGrip",profile or "rifle")
end
function P.update(p)
    if isServer() or not p then return end
    local own=PRZArmory.Network.isLocal(p)
    if not own and not isClient() then return end
    P.players[p]=own
    local w=p:getPrimaryHandItem()
    variable(p,"PRZOmegaCaravan",w~=nil and w:getFullType()=="PRZWeapons.OmegaHolyFlame")
    local s=w and PRZArmory.Config.weapons[w:getFullType()]
    variable(p,"PRZOmegaNativeGun",s~=nil and s.nativeMechanics==true)
    local enabled=PRZArmory.Config.effectsEnabled~=false and s and w:isRanged()
        and not s.nativePose and not s.water and not s.dual and s.kind~="holygrenade"
        and p:getSecondaryHandItem()==w and not p:isDead() and not p:isAsleep()
        and not p:getVehicle() and not p:isSitOnGround()
        and not p:isDoShove() and not p:isPerformingShoveAnimation()
        and not p:isPerformingStompAnimation() and not p:isDoGrapple()
        and not p:isPerformingGrappleGrabAnimation() and not p:isPerformingGrappleAnimation()
        and not (own and ISTimedActionQueue.isPlayerDoingAction(p)
            or not own and p:isPerformingAnAction())
    local profile=w and profiles[w:getFullType()] or "rifle"
    flags(p,enabled and s.kind~="minigun",enabled and s.kind=="minigun",profile)
    if not own then
        -- Native player packets do not carry arbitrary animation selectors.
        -- Derive remote presentation from synchronized equipment only; never
        -- create attached items, queue actions, change ammo or execute attacks.
        local dual=PRZArmory.Config.effectsEnabled~=false and s and s.dual
            and p:getAttachedItem("PRZArmoryLeftHandVisual")~=nil and not p:isDead()
            and not p:isPerformingAnAction()
        variable(p,"PRZArmoryDual",dual and true or false)
    end
end
function P.updateRemotes()
    if not isClient() or isServer() or not getOnlinePlayers then return end
    local players=getOnlinePlayers()
    if not players then return end
    for i=0,players:size()-1 do
        local p=players:get(i)
        if not PRZArmory.Network.isLocal(p) then P.update(p) end
    end
end
function P.reset()
    for p,own in pairs(P.players) do
        flags(p,false,false)
        if not own then p:setVariable("PRZArmoryDual",false) end
    end
    P.players=setmetatable({}, {__mode="k"})
    P.variables=setmetatable({}, {__mode="k"})
end
Events.OnPlayerUpdate.Add(P.update)
Events.OnTick.Add(P.updateRemotes)
Events.OnEquipPrimary.Add(P.update)
Events.OnEquipSecondary.Add(P.update)
Events.OnGameStart.Add(function() P.reset();P.update(getSpecificPlayer(0)) end)
Events.OnMainMenuEnter.Add(P.reset)
return P
