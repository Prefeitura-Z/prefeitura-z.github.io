XsLootBoxes = XsLootBoxes or {}
XsLootBoxes.FirearmGrant = {}
local F = XsLootBoxes.FirearmGrant

local function call(obj,name,...)
    if not obj then return nil end
    local fn=obj[name]
    if type(fn)~="function" then return nil end
    local ok,res=pcall(fn,obj,...)
    if ok then return res end
    return nil
end

local function isRanged(item)
    if not item then return false end
    if instanceof and not instanceof(item,"HandWeapon") then return false end
    return call(item,"isRanged")==true
end

local function normalizeType(item, value)
    if not value then return nil end
    local s=tostring(value)
    if s=="" or s=="null" then return nil end
    if string.find(s,".",1,true) then return s end
    local full=tostring(call(item,"getFullType") or "Base.Unknown")
    local p=string.find(full,".",1,true)
    local mod=p and string.sub(full,1,p-1) or "Base"
    return mod.."."..s
end

function F.magazineFullTypeOf(item)
    if not isRanged(item) then return nil end
    return normalizeType(item,call(item,"getMagazineType"))
end

function F.looseAmmoFullTypeOf(item)
    if not isRanged(item) then return nil end
    local ammo=call(item,"getAmmoType")
    if not ammo then return nil end
    local key=call(ammo,"getItemKey")
    return normalizeType(item,key)
end

function F.prepareGrantedItem(player,item)
    if not isRanged(item) then return end
    call(item,"setSpentRoundCount",0)
    call(item,"setSpentRoundChambered",false)
    call(item,"setRoundChambered",false)
    call(item,"setCurrentAmmoCount",0)
    call(item,"setContainsClip",false)
    if player and syncHandWeaponFields then pcall(syncHandWeaponFields,player,item) end
end

local function addOne(inv,ft)
    if not inv or not inv.AddItem then return nil end
    local ok,item=pcall(function() return inv:AddItem(ft) end)
    if ok then return item end
    return nil
end

function F.grantCompanionMagazine(player,inv,weapon,dropFn)
    local ft=F.magazineFullTypeOf(weapon)
    if not ft then return nil end
    local mag=addOne(inv,ft)
    if mag then
        call(mag,"setCurrentAmmoCount",0)
        if sendAddItemToContainer then pcall(sendAddItemToContainer,inv,mag) end
        return ft
    end
    return nil
end

function F.grantCompanionAmmo(player,inv,weapon,dropFn,color)
    if XsLootBoxes.isGunAmmoGrantEnabled and not XsLootBoxes.isGunAmmoGrantEnabled() then return nil end
    local ft=F.looseAmmoFullTypeOf(weapon)
    if not ft then return nil end
    local A=XsLootBoxes.AmmoGrant
    if A and A.grantLooseRounds and A.grantLooseRounds(inv,player,ft,A.roundsPerDraw(color),dropFn) then return ft end
    return nil
end
