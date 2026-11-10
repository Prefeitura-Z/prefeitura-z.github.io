-- B42 reads the muzzle on primaryHandModel for every native projectile. Each
-- bound dual user owns a private body socket; accepted left shots select the
-- left muzzle fitted to the authored collision pose. Aim/FireL/FireR have the
-- same initial pose. Ordinary clients need no debug/reflection or Java add-on.
require "PRZArmory/DualFlashData"
PRZArmory=PRZArmory or {}
local B={last=setmetatable({}, {__mode="k"})}
PRZArmory.DualBallistics=B
local POSE=PRZArmory.DualNativeMuzzlePose
function B.body(name,lease)return name.."_Muzzle"..string.format("%02d",lease) end
function B.isBody(name)return name and name:match("^PRZArmoryDualInfinityMechanicsBody.*_Muzzle%d%d$")~=nil end
local function apply(lease,pose)
    for _,base in ipairs({"PRZArmoryDualInfinityMechanicsBody","PRZArmoryDualInfinityMechanicsBodyNoMag"}) do
        local script=getScriptManager():getModelScript("Base."..B.body(base,lease))
        local muzzle=script and script:getAttachmentById("muzzle")
        if not muzzle then return false end
        muzzle:getOffset():set(pose.offset[1],pose.offset[2],pose.offset[3])
        muzzle:getRotate():set(pose.rotate[1],pose.rotate[2],pose.rotate[3])
    end
    return true
end
function B.reset(lease)return apply(lease,POSE.R) end
function B.prepare(p,w,side,lease)
    if not p or not w or w:getFullType()~="PRZWeapons.OmegaDualInfinity" or not lease then return false end
    side=side=="L" and "L" or "R"
    local pose=POSE[side];local ok=apply(lease,pose)
    if ok then B.last[p]={side=side,lease=lease,offset=pose.offset,rotate=pose.rotate} end
    return ok
end
return B
