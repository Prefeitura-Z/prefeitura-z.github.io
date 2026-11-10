if isClient() and not isServer() then return end
require "PRZOmegaShopConfig"
local W=PRZOmegaWeapons
local seen=setmetatable({}, {__mode="k"})
local function death(z)
    if not z or seen[z] or not z:isDead() and z:getHealth()>0 then return end
    local level=math.floor(z:getZ())
    if level<W.ShopConfig.currencyMinZ or level>W.ShopConfig.currencyMaxZ then return end
    local O=PrefeituraOmega
    if not O or not O.isAtlasAt or not O.isAtlasAt(z:getX(),z:getY(),z:getZ()) then return end
    if O.option and O.option("Enabled",true)==false then return end
    if JeevesZones and JeevesZones.isHumanNPCShell and JeevesZones.isHumanNPCShell(z) then return end
    local md=z:getModData();if md.PRZOmegaCurrencyRolled then return end
    local inv=z:getInventory();if not inv then return end
    seen[z]=true;md.PRZOmegaCurrencyRolled=true
    local kind=O.actorGroup and O.actorGroup(z) or "normal"
    local drop=W.ShopConfig.drops[kind] or W.ShopConfig.drops.normal
    if ZombRand(100)>=drop.chance then return end
    local n=ZombRand(drop.min,drop.max+1)
    for i=1,n do
        local item=inv:AddItem(W.ShopConfig.currency)
        if item then item:getModData().PRZOmegaSource="AtlasCurrency" end
    end
end
Events.OnZombieDead.Add(death)
