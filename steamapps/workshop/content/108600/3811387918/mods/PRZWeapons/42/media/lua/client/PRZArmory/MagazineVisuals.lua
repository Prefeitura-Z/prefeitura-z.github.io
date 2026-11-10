-- Magazine appearance follows the actual inserted-clip flag, never its ammo
-- count. This module changes render models only, on local and remote actors.
require "PRZArmory/ModelCache"
require "TimedActions/ISTimedActionQueue"
PRZArmory=PRZArmory or {}
local M={}
PRZArmory.MagazineVisuals=M
local supported={}
for _,name in ipairs({"Balrog7","MG3Gold","DualInfinity","SVDEX","AS50Gold","MG36Xmas","Gatling","Janus7",
    "DualInfinityLeft","Janus7Ready","Janus7Electric"}) do
    supported["PRZArmory"..name]=true
end
for _,range in ipairs({{"Transform",7},{"Revert",7},{"Change",31},{"Return",26}}) do
    for i=1,range[2] do supported["PRZArmoryJanus7"..range[1]..string.format("%02d",i)]=true end
end
local function canonical(name)
    local prefix,base=name:match("^(Base%.)(.+)$")
    return prefix or "",(base or name):gsub("NoMag$","")
end
function M.spriteFor(weapon,name)
    if not weapon or type(name)~="string" then return name end
    local prefix,base=canonical(name)
    if not supported[base] then return name end
    local magazine=weapon.getMagazineType and weapon:getMagazineType()
    local absent=magazine and magazine~="" and weapon.isContainsClip and not weapon:isContainsClip()
    return prefix..base..(absent and "NoMag" or "")
end
local function ready(name)
    return PRZArmory.ModelCache and PRZArmory.ModelCache.ready(name)
end
local function currentAction(player,weapon)
    local queues=ISTimedActionQueue and ISTimedActionQueue.queues
    local queue=queues and queues[player]
    local action=queue and queue.current
    if action and (action.gun==weapon or action.weapon==weapon or action.item==weapon)
        and action.setOverrideHandModels then
        if action.Type=="PRZArmory_JanusTransform" or action.Type=="PRZArmory_ArsenalSkill" and action.kind=="launch" then
            return action,nil
        end
        if action.Type=="ISInsertMagazine" or action.Type=="ISEjectMagazine" or action.Type=="ISRackFirearm" then
            return action,action.magazine or action.clip
        end
        -- A third-party/native action can carry another prop in its left-hand
        -- override. Its opaque override must not be replaced with nil.
    end
end
function M.updatePlayer(player)
    if isServer() or not player or player:isDead() then return false end
    local weapon=player:getPrimaryHandItem()
    if not weapon or not weapon.getWeaponSprite then return false end
    local sprite=weapon:getWeaponSprite();local desired=M.spriteFor(weapon,sprite)
    local heldChanged=false
    if desired~=sprite and ready(desired) then weapon:setWeaponSprite(desired);heldChanged=true end
    local leftChanged=false
    local left=player.getAttachedItem and player:getAttachedItem("PRZArmoryLeftHandVisual")
    if left and left.getStaticModel and left.setStaticModel then
        local original=left:getStaticModel();local nextModel=M.spriteFor(weapon,original)
        if nextModel~=original and ready(nextModel) then left:setStaticModel(nextModel);leftChanged=true end
    end
    if heldChanged or leftChanged then
        local action,secondary
        if heldChanged then action,secondary=currentAction(player,weapon) end
        if action then action:setOverrideHandModels(weapon,secondary) end
        if not action or leftChanged then player:resetEquippedHandsModels() end
        return true
    end
    return false
end
function M.update()
    if isServer() then return end
    local localPlayer=getSpecificPlayer(0)
    if localPlayer then M.updatePlayer(localPlayer) end
    if isClient() and getOnlinePlayers then
        local players=getOnlinePlayers()
        if players then
            for i=0,players:size()-1 do
                local player=players:get(i)
                if player and player~=localPlayer then M.updatePlayer(player) end
            end
        end
    end
end
function M.preload()
    if isServer() then return end
    for name in pairs(supported) do ready(name.."NoMag") end
end
Events.OnGameStart.Add(M.preload)
Events.OnTick.Add(M.update)
Events.OnEquipPrimary.Add(function(player)M.updatePlayer(player)end)
Events.OnEquipSecondary.Add(function(player)M.updatePlayer(player)end)
return M
