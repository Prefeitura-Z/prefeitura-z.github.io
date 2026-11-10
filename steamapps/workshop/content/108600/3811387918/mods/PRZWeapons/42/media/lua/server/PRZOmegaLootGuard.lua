if isClient() and not isServer() then return end
require "PRZOmegaWeaponsConfig"
local W=PRZOmegaWeapons
-- Remove exact IDs and numeric weights from ordinary loot tables.
local function clean(value,seen)
    if type(value)~="table" or seen[value] then return end
    seen[value]=true
    local i=#value-1
    while i>=1 do
        if type(value[i])=="string" and W.RestrictedLoot[value[i]] and type(value[i+1])=="number" then
            table.remove(value,i+1);table.remove(value,i)
        end
        i=i-1
    end
    for _,child in pairs(value) do if type(child)=="table" then clean(child,seen) end end
end
local function sanitize()
    local seen={}
    clean(ProceduralDistributions,seen)
    clean(Distributions,seen)
    clean(SuburbsDistributions,seen)
    -- Attached weapons use plain, unweighted lists.
    if type(AttachedWeaponDefinitions)=="table" then
        local visited={}
        local function attached(value)
            if type(value)~="table" or visited[value] then return end
            visited[value]=true
            for i=#value,1,-1 do
                if type(value[i])=="string" and W.RestrictedLoot[value[i]] then table.remove(value,i) end
            end
            for _,child in pairs(value) do if type(child)=="table" then attached(child) end end
        end
        attached(AttachedWeaponDefinitions)
    end
end
if Events.OnPreDistributionMerge then Events.OnPreDistributionMerge.Add(sanitize) end
if Events.OnPostBoot then Events.OnPostBoot.Add(sanitize) end
if Events.OnServerStarted then Events.OnServerStarted.Add(sanitize) end
if Events.OnGameStart then Events.OnGameStart.Add(sanitize) end
