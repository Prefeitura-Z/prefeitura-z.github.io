require "ISUI/ISButton"
XsLootBoxes=XsLootBoxes or {}
local X=XsLootBoxes

local function player0()
    local player=getPlayer and getPlayer() or nil
    if not player and getSpecificPlayer then player=getSpecificPlayer(0) end
    return player
end

function X.openAdminConfig()
    if not X.isStaffPlayer or not X.isStaffPlayer(player0()) then return end
    if not X.ConfigUI then require "XsLootBoxes_ConfigUI" end
    return X.ConfigUI.open()
end

local function ensureButton(panel)
    if not panel or not panel.cancel then return end
    local allowed=X.isStaffPlayer and X.isStaffPlayer(player0()) or false
    local button=panel._lootBoxesButton
    if not allowed then
        if button then button:setVisible(false); button.enable=false end
        return
    end
    local height=getTextManager():getFontHeight(UIFont.Small)+8
    if not button then
        button=ISButton:new(11,0,panel:getWidth()-22,height,getText("IGUI_XsLootBoxes_AdminButton"),panel,function() X.openAdminConfig() end)
        button:initialise(); button:instantiate()
        button._xsLootBoxes=true
        -- Other mods sort native admin buttons using .internal. Keep this footer out of their grid.
        button.internal=nil
        button.borderColor={r=0.58,g=0.38,b=0.72,a=1}
        button.backgroundColor={r=0.19,g=0.12,b=0.25,a=1}
        panel:addChild(button)
        panel._lootBoxesButton=button
    end
    button:setVisible(true); button.enable=true
    local bottom=0
    for _,child in pairs(panel:getChildren()) do
        if child~=panel.cancel and child~=button and child.getBottom then bottom=math.max(bottom,child:getBottom()) end
    end
    button:setX(11); button:setY(bottom+8); button:setWidth(panel:getWidth()-22); button:setHeight(height)
    panel.cancel:setY(button:getBottom()+8)
    panel.cancel:setX((panel:getWidth()-panel.cancel:getWidth())/2)
    local total=panel.cancel:getBottom()+11
    if panel:getHeight()~=total then
        panel:setHeight(total)
        local maxY=math.max(10,getCore():getScreenHeight()-total-12)
        if panel:getY()>maxY then panel:setY(maxY) end
    end
end

function X.installAdminPanelHook()
    if not ISAdminPanelUI then pcall(require,"ISUI/AdminPanel/ISAdminPanelUI") end
    local class=ISAdminPanelUI
    if not class then return false end
    if class._przLootBoxesPrerender==class.prerender then return true end
    local original=class.prerender
    if not original then return false end
    local function prerender(panel,...)
        -- All create()/createChildren() hooks and other mods' layout passes have finished here.
        ensureButton(panel)
        return original(panel,...)
    end
    class.prerender=prerender
    class._przLootBoxesPrerender=prerender
    return true
end

X.installAdminPanelHook()
if X._adminPanelStartHandler then Events.OnGameStart.Remove(X._adminPanelStartHandler) end
X._adminPanelStartHandler=X.installAdminPanelHook
Events.OnGameStart.Add(X._adminPanelStartHandler)
