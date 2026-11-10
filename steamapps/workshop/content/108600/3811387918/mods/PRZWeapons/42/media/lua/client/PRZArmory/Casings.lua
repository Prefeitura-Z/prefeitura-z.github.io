require "ISUI/ISPanel"
require "PRZArmory/TextureCache"
require "PRZArmory/CasingsData"
PRZArmory=PRZArmory or {}
local F={active={},limit=96}
PRZArmory.Casings=F
local D=PRZArmory.CasingsData
local Panel=ISPanel:derive("PRZArmory_CasingsPanel")
local panel,lastMs
local function allowed(w)
    local c=PRZArmory.Config or {};local s=w and (c.weapons or {})[w:getFullType()]
    return not isServer() and c.effectsEnabled~=false and (not s or s.visualsEnabled~=false)
end
local function visible(x,y,z)
    local cell=getCell();local square=cell and cell:getGridSquare(math.floor(x),math.floor(y),math.floor(z))
    return square and square:isCanSee(0)
end
function F.emit(player,weapon,side,kind)
    if not player or not weapon or not allowed(weapon) or player:isDead() or not player:getCurrentSquare() then return false end
    local row=D.guns[weapon:getFullType()];local def=row and row[side or "R"]
    if not def or (kind=="rack")~=def.rackOnly or kind~="rack" and kind~="shot" then return false end
    if not visible(player:getX(),player:getY(),player:getZ()) then return false end
    local forward=player:getForwardDirection();local dx,dy=forward:getX(),forward:getY()
    local len=math.sqrt(dx*dx+dy*dy);if len<.001 then return false end
    dx,dy=dx/len,dy/len
    -- B42 exposes no Lua held-model world attachment. Keep the authored port
    -- offset, using metres/1.5 horizontal and metres/3 vertical at hand height.
    local sign=side=="L" and -1 or 1
    local port=def.port;local lateral=port[1]/1.5+(side=="L" and -.11 or .035)
    local ahead=.30+port[2]/1.5
    local x=player:getX()+dx*ahead+dy*lateral
    local y=player:getY()+dy*ahead-dx*lateral
    local floor=math.floor(player:getZ());local height=floor+.43+port[3]/3
    local seed=#F.active+math.floor(getTimestampMs()/13)
    local speed=.75+(seed%7)*.035;local drift=(seed%5-2)*.045
    local e={x=x,y=y,z=height,floor=floor,vx=dy*sign*speed+dx*drift,vy=-dx*sign*speed+dy*drift,
        vz=.72+(seed%4)*.05,age=0,life=1.0,bounced=false,type=def.type,phase=seed%16,
        frames={paths=D.types[def.type].paths},weaponType=weapon:getFullType()}
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
        e.x=e.x+e.vx*dt;e.y=e.y+e.vy*dt;e.z=e.z+e.vz*dt;e.vz=e.vz-3.1*dt
        if e.z<e.floor+.015 then
            e.z=e.floor+.015
            if not e.bounced then e.vz=math.abs(e.vz)*.25;e.vx=e.vx*.48;e.vy=e.vy*.48;e.bounced=true
            else e.vz=0;e.vx=0;e.vy=0 end
        end
        local c=PRZArmory.Config or {};local spec=(c.weapons or {})[e.weaponType]
        if e.age>=e.life or spec and spec.visualsEnabled==false then table.remove(F.active,i) end
    end
end
function Panel:prerender() end
function Panel:render()
    local player=getSpecificPlayer(0);if not player or not allowed() then return end
    local zoom=getCore():getZoom(0);local floor=math.floor(player:getZ())
    for _,e in ipairs(F.active) do
        if e.floor==floor and visible(e.x,e.y,e.floor) then
            local def=D.types[e.type];local frame=1+(math.floor(e.age*def.fps)+e.phase)%#def.paths
            local texture=PRZArmory.TextureCache.frame(e.frames,frame)
            if texture then
                local x,y=isoToScreenX(0,e.x,e.y,e.z),isoToScreenY(0,e.x,e.y,e.z)
                local size=def.size/zoom;local alpha=math.min(1,(e.life-e.age)/.20)
                if x>-size and y>-size and x<getCore():getScreenWidth()+size and y<getCore():getScreenHeight()+size then
                    self:drawTextureScaled(texture,x-size/2,y-size/2,size,size,alpha,1,1,1)
                end
            end
        end
    end
end
function F.reset() F.active={};lastMs=getTimestampMs() end
function F.create()
    panel=nil;F.reset();if isServer() then return end
    for _,def in pairs(D.types) do for _,path in ipairs(def.paths) do PRZArmory.TextureCache.request(path) end end
    panel=Panel:new(0,0,getCore():getScreenWidth(),getCore():getScreenHeight())
    panel:initialise();panel:setWantMouseEvents(false);panel:instantiate();panel:setRenderThisPlayerOnly(0)
    -- Drawing helper only: never add a full-screen panel to UIManager.
end
Events.OnGameStart.Add(F.create)
Events.OnMainMenuEnter.Add(function()F.reset();panel=nil end)
Events.OnPreUIDraw.Add(function()F.update();if panel then panel:render()end end)
return F
