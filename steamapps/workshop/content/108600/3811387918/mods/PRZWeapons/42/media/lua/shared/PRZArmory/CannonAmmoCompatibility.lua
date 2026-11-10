-- HandWeapon.load restores saved damage over current script values. The cannon
-- now uses one harmless native carrier shot; its flame cone owns all damage.
-- Normalize the held cannon on both hosts, retaining its already paid round.
PRZArmory=PRZArmory or {}
if PRZArmory.CannonAmmoCompatibility then return PRZArmory.CannonAmmoCompatibility end
local C={}
PRZArmory.CannonAmmoCompatibility=C

function C.apply(_,weapon)
    if not weapon or weapon:getFullType()~="PRZWeapons.OmegaBlackDragonCannon" then return false end
    local changed=false
    if weapon:getMinDamage()~=0 then weapon:setMinDamage(0);changed=true end
    if weapon:getMaxDamage()~=0 then weapon:setMaxDamage(0);changed=true end
    if weapon:getProjectileCount()~=1 then weapon:setProjectileCount(1);changed=true end
    return changed
end

function C.update(player)
    if player then C.apply(player,player:getPrimaryHandItem()) end
end

Events.OnEquipPrimary.Add(C.apply)
Events.OnPlayerUpdate.Add(C.update)
return C
