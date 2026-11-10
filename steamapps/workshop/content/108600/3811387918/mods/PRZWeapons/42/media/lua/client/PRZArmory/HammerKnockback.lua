require "PRZArmory/Network"
-- Short native impulses supplement the engine's ordinary knockdown animation.
-- No position, floor, reanimation timer or state-machine lock is overwritten.
PRZArmory = PRZArmory or {}
local K = {active = {}, distance = 1.6, seconds = 0.30}
PRZArmory.HammerKnockback = K

local function supported(x,y,z)
    local cell=getCell()
    local square=cell and cell:getGridSquare(math.floor(x),math.floor(y),math.floor(z))
    return square and square:TreatAsSolidFloor()
end

local function clearStep(q,x,y,tx,ty,z)
    -- Test the centre and shoulder-width margins, including unloaded squares
    -- and floor edges. Native postupdate also resolves doors, furniture and
    -- vehicles when it consumes the queued impulses.
    for _,offset in ipairs({{0,0},{-.18,-.18},{-.18,.18},{.18,-.18},{.18,.18}}) do
        local ox,oy=offset[1],offset[2]
        if not supported(tx+ox,ty+oy,z)
            or LosUtil.lineClearCollide(math.floor(x+ox),math.floor(y+oy),math.floor(z),
                math.floor(tx+ox),math.floor(ty+oy),math.floor(z),false) then
            return false
        end
    end
    return true
end

function K.start(q,p)
    local config = PRZArmory.Config or {}
    local spec = (config.weapons or {})["PRZWeapons.OmegaStormHammer"] or {}
    local distance = spec.knockbackDistance or K.distance
    if config.effectsEnabled == false or spec.knockbackEnabled == false or distance <= 0 then return false end
    if (isClient() and not PRZArmory.Network.applying) or isServer() or isGamePaused() or not q or not p
        or q:isDead() or q:isInvulnerable() or p:isDead() or not q:getSquare()
        or q:isOnFloor() or K.active[q]
        or math.floor(q:getZ())~=math.floor(p:getZ()) then return false end
    local dx,dy=q:getX()-p:getX(),q:getY()-p:getY()
    local length=math.sqrt(dx*dx+dy*dy)
    if length<.001 then
        local forward=p:getForwardDirection();dx,dy=forward:getX(),forward:getY()
        length=math.sqrt(dx*dx+dy*dy)
    end
    if length<.001 then return false end
    dx,dy=dx/length,dy/length
    -- Hit's damage consequences choose knockdown from ordinary critical-hit
    -- rules. The dedicated native call guarantees this heavy attack falls,
    -- reports wasHit once, and lets native OnGround/GetUp own recovery.
    q:knockDown(false)
    q:getHitDir():set(dx,dy)
    q:setHitForce(2.5)
    q:setTarget(p)
    K.active[q]={dx=dx,dy=dy,left=K.seconds,distance=distance,speed=distance/K.seconds,z=q:getZ()}
    return true
end

function K.update(dt)
    local config = PRZArmory.Config or {}
    local spec = (config.weapons or {})["PRZWeapons.OmegaStormHammer"] or {}
    if config.effectsEnabled == false or spec.knockbackEnabled == false or isServer() then K.reset();return end
    if isGamePaused() then return end
    dt=math.max(0,math.min(.1,tonumber(dt) or 0))
    if dt<=0 then return end
    for q,e in pairs(K.active) do
        -- A lethal hit may still be in its native falling animation. Complete
        -- this already accepted impulse until landing or corpse creation.
        if q:isOnDeathDone() or not q:getSquare() or q:isOnFloor()
            or math.abs(q:getZ()-e.z)>.1 then K.active[q]=nil
        else
            local elapsed=math.min(dt,e.left)
            local travel=math.min(e.distance,(e.speed or K.distance/K.seconds)*elapsed)
            local x,y=q:getNextX()+q:getImpulsex(),q:getNextY()+q:getImpulsey()
            local steps=math.max(1,math.ceil(travel/.12))
            local stride=travel/steps;local moved=0;local blocked=false
            for i=1,steps do
                local tx,ty=x+e.dx*stride,y+e.dy*stride
                if not clearStep(q,x,y,tx,ty,e.z) then blocked=true;break end
                x,y=tx,ty;moved=moved+stride
            end
            if moved>0 then
                q:setImpulsex(q:getImpulsex()+e.dx*moved)
                q:setImpulsey(q:getImpulsey()+e.dy*moved)
            end
            e.left=e.left-elapsed;e.distance=e.distance-moved
            if blocked or e.left<=.000001 or e.distance<=.000001 then K.active[q]=nil end
        end
    end
end

function K.reset()
    -- Releasing our impulse records never interrupts the native fall/get-up.
    K.active={}
end

return K
