require "ISUI/ISPanel"
require "PRZArmory/TextureCache"
PRZArmory=PRZArmory or {}
local F={active={},serial=0}
PRZArmory.JanusEffects=F
local Panel=ISPanel:derive("PRZArmory_JanusEffectPanel")
local cache=PRZArmory.TextureCache
local panel,lastMs,hitFrames
local function allowed()
    local s=PRZArmory.Config and PRZArmory.Config.weapons["PRZWeapons.OmegaJanus7"]
    return not isServer() and PRZArmory.Config and PRZArmory.Config.effectsEnabled~=false
        and s and s.visualsEnabled~=false
end
function F.emit(p,z)
    if not allowed() or not p or not z then return end
    local s=PRZArmory.Config.weapons["PRZWeapons.OmegaJanus7"]
    local hold=math.max(.3,math.min(1,(s.pulseSeconds or .2)+.10))
    for _,e in ipairs(F.active) do
        if e.player==p and e.zombie==z then
            -- A continuous discharge renews this arc, rather than stacking a
            -- new bright arc or restarting its alpha/animation every pulse.
            e.sincePulse=0
            e.hold=hold
            return
        end
    end
    if #F.active>=24 then table.remove(F.active,1) end
    F.serial=F.serial+1
    local e={player=p,zombie=z,age=0,sincePulse=0,hold=hold,fade=.18,alpha=0,offsets={},
        hitFrames={paths=hitFrames and hitFrames.paths or {}}}
    -- Keep the same arc geometry during its lifetime. Per-render random offsets
    -- caused flashing in earlier sprite effects and would vary with framerate.
    for i=1,5 do e.offsets[i]=math.sin(F.serial*1.618+i*2.399)*5 end
    F.active[#F.active+1]=e
end
local function project(x,y,z) return isoToScreenX(0,x,y,z),isoToScreenY(0,x,y,z) end
local function segment(ui,texture,x1,y1,x2,y2,width,alpha)
    local dx,dy=x2-x1,y2-y1;local length=math.sqrt(dx*dx+dy*dy)
    if length<.001 then return end
    local px,py=-dy/length*width,dx/length*width
    if texture then
        ui:drawTextureAllPoint(texture,x1-px,y1-py,x2-px,y2-py,x2+px,y2+py,x1+px,y1+py,1,1,1,alpha)
    end
end
function Panel:prerender() end
function Panel:render()
    if not allowed() then return end
    local zoom=getCore():getZoom(0)
    local beam=cache.get("media/textures/PRZArmory/FX/Janus7Beam.png")
    for _,e in ipairs(F.active) do
        local p,z=e.player,e.zombie
        if p and z and not p:isDead() and z:getSquare() and z:getSquare():isCanSee(0) then
            local forward=p:getForwardDirection()
            local x1,y1=project(p:getX()+forward:getX()*.48,p:getY()+forward:getY()*.48,p:getZ()+.32)
            local x2,y2=project(z:getX(),z:getY(),z:getZ()+.32)
            local dx,dy=x2-x1,y2-y1;local length=math.sqrt(dx*dx+dy*dy)
            local alpha=e.alpha
            if length>.001 then
                local px,py=-dy/length,dx/length
                local lx,ly=x1,y1
                for i=1,6 do
                    local fraction=i/6;local offset=i<6 and e.offsets[i]/zoom or 0
                    local nx,ny=x1+dx*fraction+px*offset,y1+dy*fraction+py*offset
                    segment(self,beam,lx,ly,nx,ny,7/zoom,alpha)
                    lx,ly=nx,ny
                end
            end
            local frame=math.min(6,math.floor(e.age*18)+1)
            local hit=cache.frame(e.hitFrames,frame)
            if hit then
                local size=62/zoom
                self:drawTextureScaled(hit,x2-size/2,y2-size/2,size,size,alpha,1,1,1)
            end
        end
    end
end
function F.update()
    local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-(lastMs or now))/1000));lastMs=now
    if not allowed() then F.active={};return end
    if isGamePaused() then return end
    for i=#F.active,1,-1 do
        local e=F.active[i];e.age=e.age+dt;e.sincePulse=e.sincePulse+dt
        if e.sincePulse>e.hold then
            e.alpha=math.min(e.alpha,math.max(0,1-(e.sincePulse-e.hold)/e.fade))
        else e.alpha=math.min(1,e.alpha+dt/.08) end
        if e.sincePulse>=e.hold+e.fade or not e.zombie:getSquare() or e.player:isDead()
            or e.player.getSquare and not e.player:getSquare() then table.remove(F.active,i) end
    end
end
function F.reset()
    F.active={};lastMs=getTimestampMs()
end
local function create()
    panel=nil
    F.reset()
    if isServer() then return end
    panel=Panel:new(0,0,getCore():getScreenWidth(),getCore():getScreenHeight())
    panel:initialise();panel:setWantMouseEvents(false);panel:instantiate();panel:setRenderThisPlayerOnly(0)
    cache.request("media/textures/PRZArmory/FX/Janus7Beam.png")
    hitFrames=cache.preloadSequence("media/textures/PRZArmory/FX/Janus7Hit_",6,1,3)
end
Events.OnGameStart.Add(create)
Events.OnMainMenuEnter.Add(function() F.reset();panel=nil end)
Events.OnPreUIDraw.Add(function() F.update();if panel then panel:render() end end)
return F
