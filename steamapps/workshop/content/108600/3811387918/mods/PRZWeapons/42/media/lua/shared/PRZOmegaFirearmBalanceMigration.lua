require "PRZOmegaEndgameStats"
require "PRZOmegaBalanceCompat"
local config=PRZOmegaEndgameStats
local fields={MinDamage="MinDamage",MaxDamage="MaxDamage",CriticalChance="CriticalChance",
    CritDmgMultiplier="CriticalDamageMultiplier",MaxRange="MaxRange",
    ConditionLowerChanceOneIn="ConditionLowerChance"}
local function migrate(_,item)
    if not item then return end
    local stats=config.firearms[item:getType()]
    if not stats or item:getFullType()~="PRZWeapons."..item:getType() then return end
    local md=item:getModData()
    if md.PRZOmegaFirearmBalanceRevision==config.revision then return end
    local fresh=instanceItem(item:getFullType())
    if not fresh then return end
    local ok,engine=PRZOmegaBalanceCompat.begin(item)
    if not ok then return end
    local ratio=math.min(1,math.max(0,item:getCondition()/math.max(1,item:getConditionMax())))
    for key,field in pairs(fields) do
        if stats[key] then item["set"..field](item,fresh["get"..field](fresh)) end
    end
    item:setActualWeight(fresh:getActualWeight())
    item:setConditionMax(fresh:getConditionMax())
    item:setCondition(math.floor(ratio*item:getConditionMax()+.5))
    PRZOmegaBalanceCompat.finish(item,engine)
    md.PRZOmegaFirearmBalanceRevision=config.revision
end
Events.OnEquipPrimary.Add(migrate)
Events.OnEquipSecondary.Add(migrate)
-- Server and split-screen need no inventory/world scan or per-frame hook.
Events.OnCreatePlayer.Add(function(_,p) if p then migrate(p,p:getPrimaryHandItem()) end end)
Events.OnGameStart.Add(function()
    for i=0,getNumActivePlayers()-1 do
        local p=getSpecificPlayer(i);if p then migrate(p,p:getPrimaryHandItem()) end
    end
end)
PRZOmegaEndgameStats.migrateFirearm=migrate
