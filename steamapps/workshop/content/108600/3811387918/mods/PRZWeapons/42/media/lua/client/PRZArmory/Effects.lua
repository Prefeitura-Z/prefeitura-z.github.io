require "ISUI/ISPanel"
require "PRZArmory/TextureCache"

PRZArmory = PRZArmory or {}
PRZArmory.Effects = PRZArmory.Effects or {}
local Effects = PRZArmory.Effects
local EffectPanel = ISPanel:derive("PRZArmory_EffectPanel")
local active, burning, stunned = {}, {}, {}
local panel, lastTime
local MAX_EFFECTS, MAX_BURNS, MAX_STUNS = 18, 48, 32
local TAU = math.pi * 2
local durations = { blast = 1.10, flame = 0.64, sweep = 0.70,
    balrog7blast = 0.40, holyblast = 1.15,
    waterjet = 0.22, svdblast = 0.80, svdlaunch = 0.30 }
local sprites = {
    blast = {prefix = "Cannon", count = 22, fps = 20},
    flame = {prefix = "Balrog", count = 5, fps = 12.5},
    burn = {prefix = "Burn", count = 16, fps = 16},
    balrog7blast = {prefix = "Balrog7Blast", count = 5, fps = 12.5},
    holyblast = {prefix = "HolyBlast", count = 23, fps = 20},
    holyburn = {prefix = "HolyBurn", count = 15, fps = 15},
    waterjet = {prefix = "WaterJet", count = 2, fps = 10},
    svdblast = {prefix = "SVDExplosion", count = 16, fps = 20},
    svdlaunch = {prefix = "SVDLaunch", count = 30, fps = 100},
}
local textureCache = PRZArmory.TextureCache
local visualWeapons = {
    blast="PRZWeapons.OmegaBlackDragonCannon", flame="PRZWeapons.OmegaBalrog11", burn="PRZWeapons.OmegaBalrog11",
    sweep="PRZWeapons.OmegaTyphoonAxe", balrog7blast="PRZWeapons.OmegaBalrog7",
    holyblast="PRZWeapons.OmegaHolyWaterGrenade", holyburn="PRZWeapons.OmegaHolyWaterGrenade",
    svdblast="PRZWeapons.OmegaSVDEX", svdlaunch="PRZWeapons.OmegaSVDEX", stun="PRZWeapons.OmegaHolyFlame",
}
local function allowed(kind)
    local config=PRZArmory.Config or {}
    local spec=(config.weapons or {})[visualWeapons[kind]]
    return config.effectsEnabled ~= false and (not spec or spec.visualsEnabled ~= false)
end

local function sprite(kind, age)
    local def = sprites[kind]
    if age < 0 or age >= def.count / def.fps then return nil end
    local frame = math.min(def.count, math.floor(age * def.fps) + 1)
    if not def.sequence then
        def.sequence = textureCache.preloadSequence("media/textures/PRZArmory/FX/"..def.prefix.."_",def.count,1,3)
    end
    return textureCache.frame(def.sequence,frame)
end

local function clamp(v, lo, hi)
    return math.max(lo, math.min(hi, v))
end

local function singlePlayer()
    return not isServer()
end

local function project(x, y, z)
    -- Native helpers account for camera movement, zoom, viewport and B42 jitter correction.
    return isoToScreenX(0, x, y, z), isoToScreenY(0, x, y, z)
end

local function quad(ui, x1, y1, x2, y2, x3, y3, x4, y4, r, g, b, a)
    ui:drawPolygon(nil, x1, y1, x2, y2, x3, y3, x4, y4, r, g, b, a)
end

local function line(ui, x1, y1, x2, y2, width, r, g, b, a)
    ui:drawLine(nil, x1, y1, x2, y2, width, a, r, g, b)
end

local function diamond(ui, x, y, width, height, r, g, b, a)
    quad(ui, x, y - height, x + width, y, x, y + height, x - width, y, r, g, b, a)
end

local function coneDirection(e, fraction)
    local a = fraction * e.halfAngle
    local c, s = math.cos(a), math.sin(a)
    return e.dx * c - e.dy * s, e.dx * s + e.dy * c
end

-- GoldSrc sprites are camera-facing billboards, centered at their (-40,+40)
-- frame origin. PNGs retain source radiance using an alpha approximation of additive.
local function billboard(ui, texture, x, y, z, size, alpha)
    if not texture then return end
    local sx, sy = project(x, y, z)
    local width = size / getCore():getZoom(0)
    ui:drawTextureScaled(texture, sx-width/2, sy-width/2, width, width, alpha, 1, 1, 1)
end

local function drawBlast(ui, e)
    billboard(ui, sprite("blast", e.age), e.x, e.y, e.z+0.32, e.range*102, 1)
end

local function drawExpansionBlast(ui, e)
    local square = getCell():getGridSquare(math.floor(e.x), math.floor(e.y), math.floor(e.z))
    if not square or not square:isCanSee(0) then return end
    local size = e.kind == "holyblast" and e.range*74 or e.range*90
    billboard(ui, sprite(e.kind, e.age), e.x, e.y, e.z+0.30, size, 1)
end

local function drawFlameSprites(ui, e)
    -- Fifteen staggered fireballs cover the damaging cone instead of a screen flash.
    for depth = 1, 3 do
        for ray = 1, 5 do
            local localAge = e.age - (depth-1)*0.085 - math.abs(ray-3)*0.025
            local texture = sprite("flame", localAge)
            if texture then
                local dx, dy = coneDirection(e, (ray-3)/2)
                local travel = clamp(localAge/0.4, 0, 1)
                local distance = e.range * ((depth-1)*0.27 + 0.10 + travel*0.30)
                billboard(ui, texture, e.x+dx*distance, e.y+dy*distance,
                    e.z+0.27, 60+depth*27+travel*25, 0.92)
            end
        end
    end
end

local function drawWater(ui,e)
    local texture=sprite(e.kind,e.age)
    local sq=getCell():getGridSquare(math.floor(e.x),math.floor(e.y),math.floor(e.z))
    if not sq or not sq:isCanSee(0) then return end
    local fade=math.max(0,1-e.age/e.life)
    for i=1,7 do
        local d=e.range*i/7
        billboard(ui,texture,e.x+e.dx*d,e.y+e.dy*d,e.z+0.34,28+i*2,fade*0.75)
    end
end

local function drawSVDProjectile(ui,e)
    -- The inventory cartridge is square and angled for menus. This separate
    -- mesh render has its round nose at +X and follows the flight tangent.
    local path="media/textures/PRZArmory/FX/SVDProjectile.png"
    local texture=textureCache.get(path)
    if not texture then return end
    local range=e.s.grenadeRange
    local height=e.z+.25+.18*math.sin(math.pi*e.distance/range)
    local ahead=.10
    local nextHeight=e.z+.25+.18*math.sin(math.pi*(e.distance+ahead)/range)
    local sx,sy=project(e.x,e.y,height)
    local tx,ty=project(e.x+e.dx*ahead,e.y+e.dy*ahead,nextHeight)
    local dx,dy=tx-sx,ty-sy
    local length=math.sqrt(dx*dx+dy*dy)
    if length<.0001 then return end
    dx,dy=dx/length,dy/length
    local halfLength=7/getCore():getZoom(0)
    local halfWidth=halfLength*56/128
    local ax,ay=dx*halfLength,dy*halfLength
    local bx,by=-dy*halfWidth,dx*halfWidth
    -- Texture UVs run tail->nose from the first to the second corner.
    ui:drawTextureAllPoint(texture,sx-ax-bx,sy-ay-by,sx+ax-bx,sy+ay-by,
        sx+ax+bx,sy+ay+by,sx-ax+bx,sy-ay+by,1,1,1,1)
end

local function drawSweep(ui, e)
    -- Emit begins at the action's 0.22s hit event. Match the remaining 0.48s
    -- body revolution, then let the tapered blade wake fade during recovery.
    local function smooth(value)
        value = clamp(value, 0, 1)
        return value*value*(3-2*value)
    end
    local progress = smooth(e.age/0.48)
    local head = math.atan2(e.dy, e.dx)-0.55+progress*TAU
    local fade = 1-smooth((e.age-0.43)/0.27)
    local rise = 0.18+0.82*smooth(e.age/0.07)
    local function plane(path, angle, size, alpha)
        local texture = textureCache.get(path)
        if not texture then return end
        local c,s = math.cos(angle),math.sin(angle)
        local r = e.range*1.16*size
        local function corner(x,y)
            return project(e.x+(x*c-y*s)*r,e.y+(x*s+y*c)*r,e.z+0.30)
        end
        local x1,y1=corner(-1,-1)
        local x2,y2=corner(1,-1)
        local x3,y3=corner(1,1)
        local x4,y4=corner(-1,1)
        ui:drawTextureAllPoint(texture,x1,y1,x2,y2,x3,y3,x4,y4,1,1,1,alpha)
    end
    -- Soft alpha brush textures keep the edge continuous at every camera zoom.
    -- The hollow center and tapered tails replace the old filled sector/ring.
    plane("media/textures/PRZArmory/FX/Decimate_Glow.png",head,1,0.68*rise*fade)
    plane("media/textures/PRZArmory/FX/Decimate_Blade.png",head-0.19,0.985,0.20*rise*fade)
    plane("media/textures/PRZArmory/FX/Decimate_Blade.png",head,1,0.96*rise*fade)
end

local function drawStun(ui, effect)
    local zombie = effect.zombie
    local square = zombie:getCurrentSquare()
    if not square or not square:isCanSee(0) then return end
    local zoom = getCore():getZoom(0)
    local sx, sy = project(zombie:getX(), zombie:getY(), zombie:getZ() + 0.63)
    if sx < -80 or sy < -80 or sx > ui.width + 80 or sy > ui.height + 80 then return end
    local fade = math.min(1, (effect.life - effect.age) * 5)
    local px, py
    for i = 0, 16 do
        local a = i / 16 * TAU + effect.age * 3
        local x, y = sx + math.cos(a) * 14 / zoom, sy + math.sin(a) * 5 / zoom
        if px then line(ui, px, py, x, y, 2 / zoom, 1, 0.88, 0.3, 0.85 * fade) end
        px, py = x, y
    end
    for i = 1, 3 do
        local a = i / 3 * TAU + effect.age * 3
        diamond(ui, sx + math.cos(a) * 14 / zoom, sy + math.sin(a) * 5 / zoom,
            3 / zoom, 4 / zoom, 1, 0.95, 0.65, fade)
    end
end

local function drawBurn(ui, b)
    local zombie = b.zombie
    local square = zombie:getCurrentSquare()
    if not square or not square:isCanSee(0) then return end
    local zoom = getCore():getZoom(0)
    local sx, sy = project(zombie:getX(), zombie:getY(), zombie:getZ())
    local holy = b.kind == "holyburn"
    local width, height = (holy and 112 or 64)/zoom, (holy and 112 or 128)/zoom
    if sx < -width or sy < -8/zoom or sx > ui.width+width or sy-height > ui.height then return end
    -- Preserve the supplied 64x128 aspect ratio and loop all 16 frames.
    -- Gameplay refresh extends visibility without resetting animation phase.
    local texture = sprite(b.kind or "burn", b.age % 1)
    if texture then
        ui:drawTextureScaled(texture, sx-width/2, sy-height+8/zoom,
            width, height, math.min(1,b.left*5), 1, 1, 1)
    end
end

function EffectPanel:prerender()
    -- No opaque panel background: this object is only a drawing helper.
end

function EffectPanel:render()
    local player = getSpecificPlayer(0)
    if not player or not player:getCurrentSquare() or (PRZArmory.Config or {}).effectsEnabled == false then return end
    local floor = math.floor(player:getZ())
    for _, e in ipairs(active) do
        if allowed(e.kind) and math.floor(e.z) == floor then
            local sx, sy = project(e.x, e.y, e.z)
            local pad = e.range * 100 / getCore():getZoom(0)
            if sx > -pad and sy > -pad and sx < self.width + pad and sy < self.height + pad then
                if e.kind == "blast" then drawBlast(self, e)
                elseif e.kind == "flame" then drawFlameSprites(self, e)
                elseif e.kind == "sweep" then drawSweep(self, e)
                elseif e.kind == "waterjet" then drawWater(self,e)
                elseif e.kind == "svdlaunch" then billboard(self,sprite(e.kind,e.age),e.x+e.dx*.55,e.y+e.dy*.55,e.z+.35,54,1) end
                if e.kind == "balrog7blast" or e.kind == "holyblast" or e.kind == "svdblast" then drawExpansionBlast(self, e) end
            end
        end
    end
    for _, b in ipairs(burning) do
        if allowed(b.kind) and math.floor(b.zombie:getZ()) == floor then drawBurn(self, b) end
    end
    for _, s in ipairs(stunned) do
        if allowed("stun") and math.floor(s.zombie:getZ()) == floor then drawStun(self, s) end
    end
    if PRZArmory.Arsenal then
        for _,e in ipairs(PRZArmory.Arsenal.projectiles) do
            local sq=getCell():getGridSquare(math.floor(e.x),math.floor(e.y),math.floor(e.z))
            if allowed("svdlaunch") and math.floor(e.z)==floor and sq and sq:isCanSee(0) then
                drawSVDProjectile(self,e)
            end
        end
    end
    local weapon=player:getPrimaryHandItem()
    if not player:isDead() and weapon and weapon:getFullType()=="PRZWeapons.OmegaTyphoonAxe"
        and allowed("sweep") and PRZArmory.Rage and PRZArmory.Rage.ready(player) then
        local path="media/textures/PRZArmory/HUD/RageReady.png"
        local texture=textureCache.get(path)
        if texture then
            local sx,sy=project(player:getX(),player:getY(),player:getZ()+1.1)
            self:drawTextureScaled(texture,sx-12,sy-28,24,24,1,1,1,1)
        end
    end
end

-- Call only when gameplay accepts an attack. halfAngle is in radians; positions/range are tiles.
function Effects.emit(kind, x, y, z, dx, dy, range, halfAngle, scale, outerEdge)
    if not allowed(kind) or not panel or not durations[kind] or not singlePlayer() then return end
    local length = math.sqrt(dx * dx + dy * dy)
    if length < 0.0001 then return end
    if #active >= MAX_EFFECTS then table.remove(active, 1) end
    active[#active + 1] = {
        kind = kind, x = x, y = y, z = z, dx = dx / length, dy = dy / length,
        range = clamp(range or 4, 0.05, 100), halfAngle = clamp(halfAngle or 0.45, 0, math.pi),
        scale = clamp(scale or 1, 0.1, 2), age = 0, life = durations[kind],
        outerEdge = clamp(outerEdge or 0.62, 0.1, 0.95),
    }
end

-- Attached visual only. Damage/burning state is owned by the gameplay controller.
local function attachedBurn(zombie, kind)
    if not allowed(kind) or not panel or not zombie or not singlePlayer() or zombie:isDead() then return end
    for _, b in ipairs(burning) do
        if b.zombie == zombie and b.kind == kind then b.left = 0.8; return end
    end
    if #burning >= MAX_BURNS then table.remove(burning, 1) end
    burning[#burning + 1] = { zombie = zombie, kind = kind, age = 0, left = 0.8 }
end

function Effects.burn(zombie) attachedBurn(zombie, "burn") end
function Effects.extinguish(zombie)
    for i=#burning,1,-1 do if burning[i].zombie==zombie then table.remove(burning,i) end end
end
function Effects.holyBurn(zombie) attachedBurn(zombie, "holyburn") end

function Effects.stun(zombie, seconds)
    if not allowed("stun") or not panel or not zombie or not singlePlayer() or zombie:isDead() then return end
    local life = clamp(seconds or 2, 0.1, 10)
    for _, s in ipairs(stunned) do
        if s.zombie == zombie then s.age = 0; s.life = life; return end
    end
    if #stunned >= MAX_STUNS then table.remove(stunned, 1) end
    stunned[#stunned + 1] = { zombie = zombie, age = 0, life = life }
end

function Effects.clear()
    active, burning, stunned = {}, {}, {}
    for _,def in pairs(sprites) do def.sequence=nil end
    lastTime = nil
    panel = nil
end

local function onPreUIDraw()
    if panel then panel:render() end
end

local function onTick()
    if not panel then return end
    local now = getTimestampMs()
    local dt = clamp((now - (lastTime or now)) / 1000, 0, 0.1)
    lastTime = now
    if not getSpecificPlayer(0) then Effects.clear(); return end
    local width, height = getCore():getScreenWidth(), getCore():getScreenHeight()
    if panel.width ~= width then panel:setWidth(width) end
    if panel.height ~= height then panel:setHeight(height) end
    if getGameSpeed() == 0 then return end
    for i = #active, 1, -1 do
        local e = active[i]
        e.age = e.age + dt
        if e.age >= e.life then table.remove(active, i) end
    end
    for i = #burning, 1, -1 do
        local b = burning[i]
        b.age = b.age + dt
        b.left = b.left - dt
        if b.left <= 0 or b.zombie:isDead() or not b.zombie:getCurrentSquare() then
            table.remove(burning, i)
        end
    end
    for i = #stunned, 1, -1 do
        local s = stunned[i]
        s.age = s.age + dt
        if s.age >= s.life or s.zombie:isDead() or not s.zombie:getCurrentSquare() then
            table.remove(stunned, i)
        end
    end
end

local function onGameStart()
    Effects.clear()
    if not singlePlayer() then return end
    -- B42 loads shared textures asynchronously. Queue complete clips before
    -- combat so a newly selected frame never binds the native error texture.
    for _,def in pairs(sprites) do
        def.sequence=textureCache.preloadSequence("media/textures/PRZArmory/FX/"..def.prefix.."_",def.count,1,3)
    end
    for _,name in ipairs({"SVDProjectile","Decimate_Glow","Decimate_Blade"}) do
        textureCache.request("media/textures/PRZArmory/FX/"..name..".png")
    end
    textureCache.request("media/textures/PRZArmory/HUD/RageReady.png")
    panel = EffectPanel:new(0, 0, getCore():getScreenWidth(), getCore():getScreenHeight())
    panel:initialise()
    panel:setWantMouseEvents(false)
    -- B42 right-click/held-button hit tests ignore setWantMouseEvents(false).
    -- Instantiate for drawing, but never register this full-screen object with UIManager.
    panel:instantiate()
    panel:setRenderThisPlayerOnly(0)
    lastTime = getTimestampMs()
end

Events.OnGameStart.Add(onGameStart)
Events.OnTick.Add(onTick)
Events.OnPreUIDraw.Add(onPreUIDraw)
Events.OnMainMenuEnter.Add(Effects.clear)
