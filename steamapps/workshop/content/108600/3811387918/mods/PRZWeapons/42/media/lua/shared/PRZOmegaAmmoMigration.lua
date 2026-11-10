-- InventoryItem serializes AmmoType. Rebind only our own existing firearms and
-- magazines to the new script value, preserving their round/chamber counts.
require "PRZOmegaWeaponsConfig"
local magazines={}
for _,entry in ipairs(PRZOmegaWeapons.Firearms or {}) do
    if entry.magazine then magazines[entry.id]=entry.magazine end
end
local function normalizeMagazineMapping(fullType,magazine)
    -- GunZ scans other mods into a short-name magazine compatibility table.
    -- Its preferred-magazine restore subsequently writes that short name back
    -- to our weapon. Canonicalize only the entries for our own fixed magazines.
    local map=rawget(_G,"AWCWF_WeaponMagazineType")
    if not map then return end
    local short=fullType:match("%.(.+)$")
    for _,key in ipairs({fullType,short}) do
        local allowed=map[key]
        -- An absent own short-name entry makes GunZ's fallback strip the
        -- module as well, so register this one permitted magazine explicitly.
        if (key==short or allowed) and (not allowed or #allowed~=1 or allowed[1]~=magazine) then map[key]={magazine} end
    end
end
local function migrate(item)
    if not item or not item:getFullType():match("^PRZWeapons%.Omega") then return end
    local script=item:getScriptItem()
    local ammo=script and script:getAmmoType()
    if ammo and item:getAmmoType()~=ammo then item:setAmmoType(ammo) end
    -- MagazineType is serialized too. Earlier instances may retain an
    -- unqualified name, which native ejection cannot instantiate in PRZWeapons.
    local magazine=magazines[item:getFullType()]
    if magazine then
        normalizeMagazineMapping(item:getFullType(),magazine)
        if item:getMagazineType()~=magazine then item:setMagazineType(magazine) end
    end
end
local function walk(inv)
    if not inv then return end
    local items=inv:getItems()
    for i=0,items:size()-1 do
        local item=items:get(i)
        migrate(item)
        if instanceof(item,"InventoryContainer") then walk(item:getInventory()) end
    end
end
Events.OnEquipPrimary.Add(function(player,item)migrate(item) end)
Events.OnEquipSecondary.Add(function(player,item)migrate(item) end)
Events.OnCreatePlayer.Add(function(index,player)walk(player:getInventory()) end)
Events.OnGameStart.Add(function()
    if getSpecificPlayer then local p=getSpecificPlayer(0);if p then walk(p:getInventory()) end end
end)
-- Loaded world containers and corpses are migrated without touching native ammo.
if Events.OnRefreshInventoryWindowContainers then
    Events.OnRefreshInventoryWindowContainers.Add(function(invPage,stage)
        if stage=="end" and invPage and invPage.inventory then walk(invPage.inventory) end
    end)
end
