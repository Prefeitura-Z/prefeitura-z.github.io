-- Cosmetic rendering of the original Cannon open / insert / close sequence.
-- Native timed-action / server code owns ammunition and completion.
require "PRZArmory/Config"
require "PRZArmory/ModelCache"
PRZArmory=PRZArmory or {}
local R={states=setmetatable({}, {__mode="k"})}
PRZArmory.CannonReload=R
local BASE="PRZArmoryBlackDragonCannon"
local function cannon(p,w)
    return not isServer() and p and w and w:getFullType()=="PRZWeapons.OmegaBlackDragonCannon"
        and p:getPrimaryHandItem()==w and not p:isDead() and not p:getVehicle()
        and PRZArmory.Config.effectsEnabled~=false and PRZArmory.Config.weapons[w:getFullType()]
        and PRZArmory.Config.weapons[w:getFullType()].visualsEnabled~=false
end
local function clearFlags(p)
    for _,kind in ipairs({"Reload","Fire","Draw"}) do
        p:setVariable("PRZArmoryCannon"..kind.."Hands",false)
        p:setVariable("PRZArmoryCannon"..kind.."Phase",0)
    end
end
local function ready(name)
    -- loadZomboidModel returns an opaque native Model. Model methods are not
    -- exposed to Lua: even indexing asset.isReady throws in the real game.
    -- Use only the existing public preload/texture cache gate.
    return PRZArmory.ModelCache.ready(name)
end
local function sprite(state,name)
    if not name or not ready(name) or state.weapon:getWeaponSprite()==name then return end
    state.weapon:setWeaponSprite(name)
    if state.hands and state.action and state.action.setOverrideHandModels then
        state.action:setOverrideHandModels(state.weapon,nil)
    end
    state.player:resetEquippedHandsModels()
end
function R.stop(action)
    local s=action and action.przarmoryCannonCosmetic
    if not s and action and action.getPrimaryHandItem then s=R.states[action] end
    if not s then return end
    local w=s.weapon
    local name=w:getWeaponSprite()
    if type(name)=="string" and (name:find("^PRZArmoryBlackDragonCannonReload") or name:find("^PRZArmoryBlackDragonCannonFire") or name:find("^PRZArmoryBlackDragonCannonDraw")) then
        sprite(s,BASE)
    end
    clearFlags(s.player)
    if s.action then s.action.przarmoryCannonCosmetic=nil end
    if R.states[s.player]==s then R.states[s.player]=nil end
end
local function exitHandAction(s)
    if s.actionExited then return end
    s.actionExited=true
    -- Native actions remain active even when no animation node matches.
    -- Exit that presentation layer without cancelling the reload timer.
    local native=s.action and s.action.action
    if native and native.stopTimedActionAnim then native:stopTimedActionAnim() end
end
local function begin(p,w,kind,action,seconds)
    if not cannon(p,w) then return nil end
    if R.states[p] then R.stop(p) end
    local s={player=p,weapon=w,kind=kind,action=action,seconds=seconds or 3.5,
        hands=kind=="Reload" or not p:isPlayerMoving(),phase=0,started=getTimestampMs(),lastMs=getTimestampMs(),elapsed=0}
    R.states[p]=s
    if action then action.przarmoryCannonCosmetic=s end
    return s
end
local function present(s,fraction)
    local p=s.player
    if not cannon(p,s.weapon) then R.stop(s.action or p);return end
    if s.kind~="Reload" and p:isPlayerMoving() and s.hands then
        s.hands=false;exitHandAction(s)
    end
    local fraction=math.max(0,math.min(1,fraction or 0))
    s.phase=math.max(s.phase or 0,fraction)
    p:setVariable("PRZArmoryCannon"..s.kind.."Hands",s.hands)
    p:setVariable("PRZArmoryCannon"..s.kind.."Phase",math.min(.999999,s.phase))
    local count=s.kind=="Reload" and 30 or s.kind=="Draw" and 15 or 7
    local index=math.min(count,math.floor(s.phase*(count-1)+.5)+1)
    if s.kind=="Draw" then
        local frame=s.phase*40
        index=frame>=39.5 and 15 or math.min(14,math.floor(frame/3+.5)+1)
    end
    sprite(s,BASE..s.kind..string.format("%02d",index))
end
function R.start(action,seconds)
    if not action then return end
    local s=begin(action.character,action.gun or action.weapon,"Reload",action,seconds)
    if not s then return end
    -- Reload is an upper-body substate. The native movement root keeps its
    -- original leg gait while the opening / round insertion track continues.
    action:setActionAnim("PRZArmoryCannonReload")
    present(s,0)
end
function R.update(action,fraction)
    local s=action and action.przarmoryCannonCosmetic
    if s then present(s,fraction) end
end
function R.fire(p,w)
    local s=begin(p,w,"Fire",nil,.6)
    if s then present(s,0) end
end
function R.draw(p,w)
    local s=begin(p,w,"Draw",nil,40/30)
    if s then present(s,0) end
end
function R.tick()
    local remove={}
    for p,s in pairs(R.states) do
        if not cannon(p,s.weapon) then remove[#remove+1]=s.action or p
        elseif s.kind~="Reload" then
            local now=getTimestampMs();local dt=math.max(0,math.min(.1,(now-s.lastMs)/1000));s.lastMs=now
            if not isGamePaused() and getGameTime():getMultiplier()>0 then s.elapsed=s.elapsed+dt end
            present(s,s.elapsed/s.seconds)
            if s.elapsed>=s.seconds then remove[#remove+1]=p end
        end
    end
    for _,value in ipairs(remove) do R.stop(value) end
end
function R.preload()
    if isServer() then return end
    ready(BASE)
    for i=1,30 do ready(BASE.."Reload"..string.format("%02d",i)) end
    for i=1,7 do ready(BASE.."Fire"..string.format("%02d",i)) end
    for i=1,15 do ready(BASE.."Draw"..string.format("%02d",i)) end
end
function R.reset()
    local list={};for p in pairs(R.states) do list[#list+1]=p end
    for _,p in ipairs(list) do R.stop(p) end
    R.states=setmetatable({}, {__mode="k"})
end
Events.OnEquipPrimary.Add(function(p,w)
    if cannon(p,w) then R.draw(p,w)
    elseif R.states[p] then R.stop(p) end
end)
Events.OnTick.Add(R.tick)
Events.OnGameStart.Add(function()
    R.reset();R.preload()
    local p=getSpecificPlayer and getSpecificPlayer(0)
    local w=p and p:getPrimaryHandItem()
    if cannon(p,w) and w:getWeaponSprite()~=BASE then
        local name=w:getWeaponSprite()
        if type(name)=="string" and name:find("^PRZArmoryBlackDragonCannon") then w:setWeaponSprite(BASE);p:resetEquippedHandsModels() end
    end
end)
Events.OnSave.Add(R.reset)
Events.OnMainMenuEnter.Add(R.reset)
return R
