XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

local ALLOWED = { admin=true, moderator=true }

function X.isStaffPlayer(player)
    if not player then return false end
    if player.getRole and Capability and Capability.SandboxOptions then
        local ok,role=pcall(function() return player:getRole() end)
        if ok and role and role.hasCapability then
            local allowed,hasCapability=pcall(function() return role:hasCapability(Capability.SandboxOptions) end)
            if allowed then return hasCapability==true end
            return false
        end
    end
    local ok, access = pcall(function() return player:getAccessLevel() end)
    if not ok then return false end
    local level = string.lower(tostring(access or ""))
    return ALLOWED[level] == true
end
