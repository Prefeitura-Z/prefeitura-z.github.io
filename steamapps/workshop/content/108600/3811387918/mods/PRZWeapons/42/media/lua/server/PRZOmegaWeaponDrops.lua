-- Server/SP authority only: clients never roll or grant components.
if isClient() and not isServer() then return end
require "PRZOmegaWeaponsConfig"
local W = PRZOmegaWeapons
local handled = setmetatable({}, {__mode="k"})
local warned = false
local function ready()
    local O = PrefeituraOmega
    return O and type(O.isAtlasAt)=="function" and type(O.isOccultZombie)=="function"
end
local function onStart()
    if not ready() and not warned then
        warned=true
        print("[PRZWeapons Omega] Drops desativados: falta a API PrefeituraOmega (isAtlasAt/isOccultZombie). Atualize PrefeituraZones.")
    end
end
local function eligible(zombie)
    if not zombie or not ready() then return false end
    local O=PrefeituraOmega
    if O.option and O.option("Enabled",true)==false then return false end
    if JeevesZones and JeevesZones.isHumanNPCShell and JeevesZones.isHumanNPCShell(zombie) then return false end
    -- Check the death location against exact Atlas rooms, including the floor.
    return O.isAtlasAt(zombie:getX(),zombie:getY(),zombie:getZ())
        and O.isOccultZombie(zombie)==true
end
local function pickPart()
    local total=0
    for _,p in ipairs(W.Config.parts) do total=total+p.weight end
    if total<=0 then return nil end
    local roll=ZombRand(total)
    for _,p in ipairs(W.Config.parts) do
        if roll<p.weight then return p.id end
        roll=roll-p.weight
    end
    return nil
end
local function onDeath(zombie)
    if not zombie or handled[zombie] then return end
    local md=zombie:getModData()
    if md.PRZOmegaWeaponDropRolled then return end
    local ok,allowed=pcall(eligible,zombie)
    if not ok or not allowed then return end
    local inv=zombie:getInventory()
    if not inv then return end
    handled[zombie]=true
    md.PRZOmegaWeaponDropRolled=true -- Failed rolls also cannot be repeated.
    local chance=math.max(0,math.min(100,tonumber(W.Config.dropChancePercent) or 0))
    if ZombRand(10000)>=math.floor(chance*100) then return end
    local id=pickPart()
    if not id then return end
    -- Native corpse creation inherits the zombie inventory and replicates it.
    local item=inv:AddItem(id)
    if not item then
        print("[PRZWeapons Omega] Componente nao criado: "..id)
        return
    end
    local data=item:getModData()
    data.PRZOmegaSource="AtlasMain"
    data.PRZOmegaWeaponComponent=true
end
Events.OnZombieDead.Add(onDeath)
if Events.OnServerStarted then Events.OnServerStarted.Add(onStart) end
if Events.OnGameStart then Events.OnGameStart.Add(onStart) end
