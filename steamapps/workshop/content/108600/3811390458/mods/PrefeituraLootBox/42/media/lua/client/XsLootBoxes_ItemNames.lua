XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

local function syncNames(key,data)
    if key~=X.MD_CONFIG or type(data)~="table" then return end
    X.applySyncedDisplayNames(data)
end
if Events.OnReceiveGlobalModData then Events.OnReceiveGlobalModData.Add(syncNames) end

if getItemNameFromFullType and not _G.__XsLootBoxesCleanNameHook then
    _G.__XsLootBoxesCleanNameHook=true
    local original=getItemNameFromFullType
    function getItemNameFromFullType(fullType)
        local color=X.colorFromFullType(fullType)
        if color then return X.tierDisplayLabel(color) end
        return original(fullType)
    end
end
