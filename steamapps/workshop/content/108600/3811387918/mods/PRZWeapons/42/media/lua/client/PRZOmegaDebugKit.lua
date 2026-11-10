-- Testing convenience only: never enabled in MP or ordinary SP.
require "PRZOmegaWeaponsConfig"
require "PRZOmegaCraftDiagnostics"
local W = PRZOmegaWeapons
local function allowed()
    return not isClient() and not isServer() and isDebugEnabled and isDebugEnabled()
end
if not allowed() then return end

local function giveKit(player)
    if not allowed() or not player then return end
    local inventory = player:getInventory()
    if not inventory then return end
    -- Six of each common part, one of each core: enough for the six recipes.
    for _,part in ipairs(W.Config.parts) do
        local amount = string.find(part.id, ".Nucleo", 1, true) and 1 or 6
        for i=1,amount do inventory:AddItem(part.id) end
    end
    inventory:AddItem("Base.BallPeenHammer")
    inventory:AddItem("Base.Screwdriver")
    print("[PRZWeapons " .. W.VERSION .. "] kit de teste SP: 48 componentes e 2 ferramentas; habilidades nao alteradas.")
end

local function fillMenu(playerIndex, context, worldObjects, test)
    if test or not allowed() then return end
    local player = getSpecificPlayer(playerIndex)
    if not player then return end
    context:addOption(getText("ContextMenu_PRZ_OmegaTestKit"), player, giveKit)
    context:addOption(getText("ContextMenu_PRZ_OmegaDiagnostics"), nil, W.Diagnostics.report)
end
Events.OnFillWorldObjectContextMenu.Add(fillMenu)
