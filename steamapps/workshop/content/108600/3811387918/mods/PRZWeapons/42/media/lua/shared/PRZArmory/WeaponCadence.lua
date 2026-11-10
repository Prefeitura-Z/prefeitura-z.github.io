-- HandWeapon.load restores saved recoilDelay, overriding the current script.
-- Migrate only the recognizable previous defaults, preserving attachment
-- modifiers and leaving custom item-editor values untouched on both hosts.
PRZArmory=PRZArmory or {}
if PRZArmory.WeaponCadence then return PRZArmory.WeaponCadence end
local B={seen=setmetatable({}, {__mode="k"})}
PRZArmory.WeaponCadence=B
local oldDefaults={["PRZWeapons.OmegaSL8"]=6,["PRZWeapons.OmegaGatling"]=8}
local function integer(value)
    return value<0 and math.ceil(value) or math.floor(value)
end
function B.apply(_,weapon)
    if not weapon then return end
    local old=oldDefaults[weapon:getFullType()]
    if not old then return end
    local current=weapon:getRecoilDelay()
    if B.seen[weapon]==current then return end
    local target=3 -- Matching native script defaults for these two weapons.
    local parts=weapon:getAllWeaponParts()
    for i=0,parts:size()-1 do
        local modifier=parts:get(i):getRecoilDelay()
        old=integer(old+modifier);target=integer(target+modifier)
    end
    if current==old and current~=target then
        weapon:setRecoilDelay(target)
        current=target
    end
    B.seen[weapon]=current
end
function B.update(player)
    if player then B.apply(player,player:getPrimaryHandItem()) end
end
Events.OnEquipPrimary.Add(B.apply)
Events.OnPlayerUpdate.Add(B.update)
Events.OnGameStart.Add(function() B.seen=setmetatable({}, {__mode="k"}) end)
return B
