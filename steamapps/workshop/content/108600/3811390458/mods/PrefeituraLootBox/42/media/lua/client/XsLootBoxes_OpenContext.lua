require "ISUI/ISContextMenu"
XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

local function itemId(item)
    local ok,id=pcall(function() return item:getID() end)
    if ok then return id end
    return nil
end
local function fullType(item)
    local ok,ft=pcall(function() return item:getFullType() end)
    if ok then return tostring(ft) end
    return ""
end
local function countType(inv,ft)
    local count=0
    if inv and inv.getItems then
        local items=inv:getItems()
        for i=0,items:size()-1 do if fullType(items:get(i))==ft then count=count+1 end end
    end
    return count
end

local function openOne(player,item)
    sendClientCommand(player,X.MODULE,X.CMD_OPEN_BOX,{boxFullType=fullType(item),itemId=itemId(item)})
end
local function openAll(player,item,count)
    sendClientCommand(player,X.MODULE,X.CMD_OPEN_BOX_ALL,{boxFullType=fullType(item),count=count})
end
local function view(item)
    if X.ViewContentsUI and X.ViewContentsUI.open then X.ViewContentsUI.open(X.colorFromFullType(fullType(item))) end
end

local function addMenu(playerIndex,context,items)
    local player=getSpecificPlayer(playerIndex); if not player then return end
    local selected=nil
    for _,wrapper in ipairs(items or {}) do
        local item=wrapper and (wrapper.items and wrapper.items[1] or wrapper) or nil
        if item and X.colorFromFullType(fullType(item)) then selected=item; break end
    end
    if not selected then return end
    local ft=fullType(selected); local count=countType(player:getInventory(),ft)
    context:addOption(getText("IGUI_XsLootBoxes_OpenBox"),player,function(p) openOne(p,selected) end)
    if count>1 then context:addOption(getText("IGUI_XsLootBoxes_OpenAll",math.min(count,X.OPEN_ALL_BOX_CAP)),player,function(p) openAll(p,selected,count) end) end
    context:addOption(getText("IGUI_XsLootBoxes_ViewContents"),selected,view)
    if X.isStaffPlayer and X.isStaffPlayer(player) then
        context:addOption(getText("IGUI_XsLootBoxes_AdminButton"),player,function()
            if X.openAdminConfig then X.openAdminConfig() end
        end)
    end
end
if X._inventoryContextHandler then Events.OnFillInventoryObjectContextMenu.Remove(X._inventoryContextHandler) end
X._inventoryContextHandler=addMenu
Events.OnFillInventoryObjectContextMenu.Add(addMenu)
