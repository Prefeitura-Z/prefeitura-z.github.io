-- Keep permanent IDs/cores; old saves otherwise restore old models/combat values.
require "PRZOmegaWeaponsConfig"
require "PRZOmegaBalanceCompat"
local ids={
    ["PRZWeapons.TyrfingRubra"]=true,["PRZWeapons.PunhalCastigoDivino"]=true,
    ["PRZWeapons.TacoSupremoZ"]=true,["PRZWeapons.MarteloDoTrovao"]=true,
    ["PRZWeapons.MachadoLeviata"]=true,["PRZWeapons.TridentePoseidon"]=true,
}
local fields={"MinDamage","MaxDamage","MinRange","MaxRange","MinimumSwingTime","SwingTime",
    "BaseSpeed","EnduranceMod","CriticalChance","CriticalDamageMultiplier","MaxHitCount",
    "PushBackMod","KnockdownMod","KnockBackOnNoDeath","ConditionLowerChance","DoorDamage","TreeDamage",
    "DamageCategory","SubCategory","WeaponSprite","WeaponSpritesByIndex","StaticModel","WorldStaticModel"}
local function migrate(_,w)
    if not w or not ids[w:getFullType()] then return end
    -- Only the axe changed in this revision. Existing revision-6 axes must
    -- receive the SKULL-9 model; the other five weapons keep their revision.
    local revision=w:getFullType()=="PRZWeapons.MachadoLeviata" and 7 or 6
    local md=w:getModData();if md.PRZOmegaMeleeRevision==revision then return end
    local fresh=instanceItem(w:getFullType());if not fresh then return end
    local ok,engine=PRZOmegaBalanceCompat.begin(w);if not ok then return end
    local ratio=w:getCondition()/math.max(1,w:getConditionMax())
    for _,field in ipairs(fields) do
        local getter=(field=="KnockBackOnNoDeath" and "is" or "get")..field
        local setter="set"..field
        if w[setter] and fresh[getter] then
            local value=fresh[getter](fresh)
            if value~=nil then w[setter](w,value) end
        end
    end
    w:setConditionMax(fresh:getConditionMax())
    w:setCondition(math.floor(ratio*w:getConditionMax()+.5))
    -- A one-entry indexed model continually restores the hammer's day sprite.
    -- These six weapons use explicit day/night models, never indexed variants.
    w:setWeaponSpritesByIndex(nil)
    w:setOriginalWeaponSprite(fresh:getWeaponSprite())
    w:setWorldStaticModel(fresh:getWorldStaticModel() or fresh:getWeaponSprite())
    w:setWeaponCategories(fresh:getScriptItem():getWeaponCategories())
    if revision==7 then
        if w.setTexture and fresh.getTexture then
            local texture=fresh:getTexture()
            if texture then w:setTexture(texture) end
        end
        -- Preserve player/affix names; refresh only the default item name.
        if w.isCustomName and not w:isCustomName() and w.setName and fresh.getName then
            w:setName(fresh:getName())
        end
    end
    PRZOmegaBalanceCompat.finish(w,engine)
    md.PRZOmegaMeleeRevision=revision
end
Events.OnEquipPrimary.Add(migrate)
Events.OnEquipSecondary.Add(migrate)
local function held(p)if p then migrate(p,p:getPrimaryHandItem()) end end
Events.OnPlayerUpdate.Add(held)
local nextPoll=0
if Events.OnTick then Events.OnTick.Add(function()
    if not isServer() or getTimestampMs()<nextPoll then return end
    nextPoll=getTimestampMs()+1000
    local players=getOnlinePlayers()
    for i=0,players:size()-1 do held(players:get(i)) end
end) end
PRZOmegaWeapons.migrateMelee=migrate
