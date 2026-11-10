require "ISUI/ISPanel"
require "PRZArmory/TextureCache"

PRZArmory=PRZArmory or {}
local F={active={},limit=12}
PRZArmory.CannonEffects=F
local Panel=ISPanel:derive("PRZArmory_CannonEffectPanel")
local panel,lastMs,flameFrames,smokeFrames
local TYPE="PRZWeapons.OmegaBlackDragonCannon"
local function allowed()
    local c=PRZArmory.Config or {};local s=(c.weapons or {})[TYPE]
    return not isServer() and c.effectsEnabled~=false and (not s or s.visualsEnabled~=false)
end
local function finite(n) return type(n)=="number" and n==n and n~=math.huge and n~=-math.huge end
local function square(x,y,z)
    local cell=getCell()
    return cell and cell:getGridSquare(math.floor(x),math.floor(y),math.floor(z))
end
local function visible(x,y,z)
    local sq=square(x,y,z)
    return sq and sq:isCanSee(0)
end
local function clear(x,y,z,tx,ty)
    return square(tx,ty,z) and not LosUtil.lineClearCollide(math.floor(x),math.floor(y),math.floor(z),
        math.floor(tx),math.floor(ty),math.floor(z),false)
end
-- Cosmetic only. Combat supplies the accepted shot's muzzle/direction so no
-- impact explosion or independently travelling damage projectile is created.
-- The 22 flame frames are the original client flame_puff01.spr, unchanged.
-- Ten expanding rays follow the supplied recreation's forward-puff pattern;
-- speed/scale are adapted to PZ tiles, not claimed to be native PRZArmory code.
function F.emit(player,weapon,origin)
    if not allowed() or not panel or not player or player:isDead() or not weapon
        or weapon:getFullType()~=TYPE or not player:getCurrentSquare() then return false end
    origin=origin or {}
    local forward=player:getForwardDirection()
    local dx,dy=origin.dx or forward:getX(),origin.dy or forward:getY()
    if not finite(dx) or not finite(dy) then return false end
    local length=math.sqrt(dx*dx+dy*dy);if length<.0001 then return false end
    dx,dy=dx/length,dy/length
    local x=origin.x or player:getX()+dx*.55
    local y=origin.y or player:getY()+dy*.55
    local z=origin.z or player:getZ()+.35
    local range=origin.range or 6
    local halfAngle=origin.halfAngle or math.rad(28)
    if not finite(x) or not finite(y) or not finite(z) or not finite(range) or not finite(halfAngle) then return false end
    if not visible(x,y,z) or not clear(player:getX(),player:getY(),z,x,y) then return false end
    range=math.max(.1,math.min(40,range));halfAngle=math.max(0,math.min(math.pi/2,halfAngle))
    local e={x=x,y=y,z=z,dx=dx,dy=dy,age=0,life=1.10,range=range,rays={},
        flame={paths=flameFrames.paths},smoke={paths=smokeFrames.paths}}
    for i=1,10 do
        local angle=halfAngle*((i-1)/9*2-1)
        local ca,sa=math.cos(angle),math.sin(angle)
        local rx,ry=dx*ca-dy*sa,dx*sa+dy*ca
        local reach=0
        -- Keep particles in the same visible corridor as the shot. A blocked
        -- ray stops at the last clear quarter-tile rather than crossing walls.
        local steps=math.ceil(range/.25)
        for n=1,steps do
            local distance=math.min(range,n*.25)
            if not clear(x,y,z,x+rx*distance,y+ry*distance) then break end
            reach=distance
        end
        e.rays[i]={dx=rx,dy=ry,range=reach,
            -- Stable offsets; never use per-render random jitter or restarts.
            speedScale=.86+(i%3)*.07,sizeScale=.92+(i%4)*.045}
    end
    if #F.active>=F.limit then table.remove(F.active,1) end
    F.active[#F.active+1]=e
    return true
end
function F.update()
    local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-(lastMs or now))/1000));lastMs=now
    if not allowed() or not getSpecificPlayer(0) then F.active={};return end
    if isGamePaused() then return end
    for i=#F.active,1,-1 do
        local e=F.active[i];e.age=e.age+dt
        if e.age>=e.life then table.remove(F.active,i) end
    end
end
local function billboard(ui,texture,x,y,z,size,alpha)
    if not texture or not visible(x,y,z) then return end
    local sx,sy=isoToScreenX(0,x,y,z),isoToScreenY(0,x,y,z)
    local width=size/getCore():getZoom(0)
    if sx < -width or sy < -width or sx > getCore():getScreenWidth()+width
        or sy > getCore():getScreenHeight()+width then return end
    ui:drawTextureScaled(texture,sx-width/2,sy-width/2,width,width,alpha,1,1,1)
end
function Panel:prerender() end
function Panel:render()
    local player=getSpecificPlayer(0);if not player or not allowed() then return end
    local floor=math.floor(player:getZ())
    for _,e in ipairs(F.active) do
        if math.floor(e.z)==floor then
            -- All source frames advance monotonically. Late asynchronous
            -- frames hold the last ready texture through TextureCache.frame.
            local frame=math.min(22,math.floor(e.age*20)+1)
            local flame=PRZArmory.TextureCache.frame(e.flame,frame)
            local fade=math.min(1,math.max(0,(e.life-e.age)/.34))
            for _,ray in ipairs(e.rays) do
                local distance=math.min(ray.range,e.range*e.age/.78*ray.speedScale)
                billboard(self,flame,e.x+ray.dx*distance,e.y+ray.dy*distance,e.z,
                    (70+math.min(1,e.age/.55)*58)*ray.sizeScale,fade*.82)
            end
            if e.age<1/3 then
                local smoke=PRZArmory.TextureCache.frame(e.smoke,math.min(10,math.floor(e.age*30)+1))
                billboard(self,smoke,e.x,e.y,e.z,56+e.age*60,1)
            end
        end
    end
end
function F.reset() F.active={};lastMs=getTimestampMs() end
function F.create()
    panel=nil;F.reset();if isServer() then return end
    flameFrames=PRZArmory.TextureCache.preloadSequence("media/textures/PRZArmory/FX/Cannon_",22,1,3)
    smokeFrames=PRZArmory.TextureCache.preloadSequence("media/textures/PRZArmory/FX/CannonSmoke_",10,1,3)
    panel=Panel:new(0,0,getCore():getScreenWidth(),getCore():getScreenHeight())
    panel:initialise();panel:setWantMouseEvents(false);panel:instantiate();panel:setRenderThisPlayerOnly(0)
    -- Drawing helper only: never join UIManager or intercept clicks.
end
Events.OnGameStart.Add(F.create)
Events.OnMainMenuEnter.Add(function()F.reset();panel=nil end)
Events.OnPreUIDraw.Add(function()F.update();if panel then panel:render()end end)
return F
