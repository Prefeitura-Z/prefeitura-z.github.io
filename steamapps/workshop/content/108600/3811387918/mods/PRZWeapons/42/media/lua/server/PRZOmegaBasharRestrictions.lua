if isClient() and not isServer() then return end
require "PRZOmegaWeaponsConfig"
local function protect()
    local p=PrefeituraBasharEvents
    if p and p.FORBIDDEN_REWARDS then
        for id in pairs(PRZOmegaWeapons.RestrictedLoot) do p.FORBIDDEN_REWARDS[id]=true end
    end
end
if Events.OnServerStarted then Events.OnServerStarted.Add(protect) end
if Events.OnGameStart then Events.OnGameStart.Add(protect) end
