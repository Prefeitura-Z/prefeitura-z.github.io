-- Cosmetic muzzle flashes on the actual pistol bones. Native B42 renders its
-- flash only on primaryHandModel; damage/projectiles and ammo remain native.
require "PRZArmory/AttachedLocations"
require "PRZArmory/DualFlashData"
require "PRZArmory/ModelCache"
PRZArmory=PRZArmory or {}
local F={states={},leases={},poolSize=16}
PRZArmory.DualMuzzle=F
local DATA=PRZArmory.DualFlashData
local GUN="PRZWeapons.OmegaDualInfinity"
local function location(side)return "PRZArmoryDualFlash"..side end
local function hidden(entry)
    entry.attachment:getOffset():set(0,999,0)
end
function F.clear(p)
    local s=F.states[p];if not s then return end
    for side,entry in pairs(s.entries) do
        hidden(entry)
        if p:getAttachedItem(location(side))==entry.item then p:setAttachedItem(location(side),nil) end
    end
    if s.weapon:getMuzzleFlashModelKey()==nil then s.weapon:setMuzzleFlashModelKey(s.originalMuzzleKey) end
    F.leases[s.lease]=nil;F.states[p]=nil;p:resetEquippedHandsModels()
end
local function bind(p,w)
    local lease
    for i=1,F.poolSize do if not F.leases[i] then lease=i;break end end
    if not lease then return end
    local entries={}
    for _,side in ipairs({"R","L"}) do
        local suffix=side..string.format("%02d",lease)
        local model="PRZOmegaDualFlash"..suffix
        if not PRZArmory.ModelCache.ready(model) then return end
        local script=getScriptManager():getModelScript("Base."..model)
        local attachment=script and script:getAttachmentById("PRZWeapons_DualFlash"..side)
        if not attachment then return end
        entries[side]={attachment=attachment,fullType="PRZWeapons.OmegaDualFlash"..suffix}
    end
    for _,entry in pairs(entries) do
        entry.item=instanceItem(entry.fullType)
        if not entry.item then return end
        hidden(entry)
    end
    local s={weapon=w,lease=lease,entries=entries,originalMuzzleKey=w:getMuzzleFlashModelKey()}
    F.states[p]=s;F.leases[lease]=s
    for side,entry in pairs(entries) do p:setAttachedItem(location(side),entry.item) end
    -- No second weapon/round/projectile is created. The two props have no
    -- inventory container, attack properties, loot or crafting acquisition.
    w:setMuzzleFlashModelKey(nil);p:resetEquippedHandsModels()
    return s
end
function F.updatePlayer(p)
    if isServer() or not p then return end
    local w=p:getPrimaryHandItem()
    local active=w and w:getFullType()==GUN and not p:isDead()
        and PRZArmory.Config.effectsEnabled~=false
    local s=F.states[p]
    if s and (not active or s.weapon~=w) then F.clear(p);s=nil end
    if active and not s then s=bind(p,w) end
    if s and s.untilMs and getTimestampMs()>=s.untilMs then
        for _,entry in pairs(s.entries) do hidden(entry) end
        s.untilMs=nil
    end
end
function F.emit(p,w,side)
    if not p or p:getPrimaryHandItem()~=w or w:getFullType()~=GUN then return false end
    F.updatePlayer(p)
    local s=F.states[p];if not s then return false end
    side=side=="L" and "L" or "R"
    for _,entry in pairs(s.entries) do hidden(entry) end
    local entry=s.entries[side];local pose=DATA[side]
    entry.attachment:getOffset():set(pose.offset[1],pose.offset[2],pose.offset[3])
    s.untilMs=getTimestampMs()+75;s.side=side
    return true
end
function F.update()
    local p=getSpecificPlayer(0);if p then F.updatePlayer(p) end
    if isClient() and getOnlinePlayers then
        local list=getOnlinePlayers();local online={}
        for i=0,list:size()-1 do local actor=list:get(i);online[actor]=true;F.updatePlayer(actor) end
        local departed={}
        for actor in pairs(F.states) do if actor~=p and not online[actor] then departed[#departed+1]=actor end end
        for _,actor in ipairs(departed) do F.clear(actor) end
    end
end
function F.reset()
    local actors={};for p in pairs(F.states) do actors[#actors+1]=p end
    for _,p in ipairs(actors) do F.clear(p) end
end
Events.OnPlayerUpdate.Add(F.updatePlayer)
Events.OnTick.Add(F.update)
Events.OnMainMenuEnter.Add(F.reset)
Events.OnGameStart.Add(function()
    F.reset()
    for _,side in ipairs({"R","L"}) do
        for i=1,F.poolSize do PRZArmory.ModelCache.ready("PRZOmegaDualFlash"..side..string.format("%02d",i)) end
    end
end)
return F
