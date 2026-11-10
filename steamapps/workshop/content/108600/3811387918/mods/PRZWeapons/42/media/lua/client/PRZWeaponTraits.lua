-- PRZWeapons 2.0 - masterias exclusivas
-- Os bônus são aplicados SOMENTE às armas incluídas no pacote PRZ (nativas + XH integrado) e sempre restauram os valores-base
-- antes de qualquer nova aplicação, impedindo acúmulo ao equipar/relogar.

local PRZTraits = {}

local weaponCategories = {
    ["PRZWeapons.AndurilSword"] = "longblade",
    ["PRZWeapons.AngryThunderLance"] = "spear",
    ["PRZWeapons.Bahamut"] = "longblade",
    ["PRZWeapons.BlueRoseSword"] = "longblade",
    ["PRZWeapons.BlueSteelMachete"] = "longblade",
    ["PRZWeapons.CardCaptorSakuraCrowbar"] = "blunt",
    ["PRZWeapons.CarrotNightSticks"] = "smallblunt",
    ["PRZWeapons.ChanShiZhe"] = "longblade",
    ["PRZWeapons.ClaymoreSword"] = "blunt",
    ["PRZWeapons.CuteRabbitKnife"] = "smallblade",
    ["PRZWeapons.DarkRepulsor"] = "longblade",
    ["PRZWeapons.DivinepunishmentKnife"] = "smallblade",
    ["PRZWeapons.ErrataKatana"] = "longblade",
    ["PRZWeapons.Excalibur"] = "longblade",
    ["PRZWeapons.FeiyuzhuohuaMachete"] = "longblade",
    ["PRZWeapons.ForestShamanPrayer"] = "longblade",
    ["PRZWeapons.FuxiaoYanlingMachete"] = "longblade",
    ["PRZWeapons.HandandahalfSwordClassic"] = "longblade",
    ["PRZWeapons.HexagramGiantSwordHammer"] = "blunt",
    ["PRZWeapons.HonglingAxe"] = "axe",
    ["PRZWeapons.HymnofWindandFlower"] = "longblade",
    ["PRZWeapons.Izanami"] = "longblade",
    ["PRZWeapons.JeannedArcSword"] = "longblade",
    ["PRZWeapons.JudgmentScythe"] = "longblade",
    ["PRZWeapons.LauraIceAxe"] = "axe",
    ["PRZWeapons.LumberingAxeold"] = "axe",
    ["PRZWeapons.MirageHalberd"] = "spear",
    ["PRZWeapons.NebulaButterflyKnife"] = "smallblade",
    ["PRZWeapons.NightFalcon"] = "longblade",
    ["PRZWeapons.NightSkySword"] = "longblade",
    ["PRZWeapons.OrpheusCradle"] = "longblade",
    ["PRZWeapons.PoeticMelody"] = "longblade",
    ["PRZWeapons.PurplestarBaseballBat"] = "blunt",
    ["PRZWeapons.RainbowWave"] = "spear",
    ["PRZWeapons.RanLing"] = "longblade",
    ["PRZWeapons.RanLingKnife"] = "smallblade",
    ["PRZWeapons.Rwbyliandao"] = "longblade",
    ["PRZWeapons.SpaaerShovelShovel"] = "blunt",
    ["PRZWeapons.StabbingEmbersLance"] = "spear",
    ["PRZWeapons.StarryThunder"] = "longblade",
    ["PRZWeapons.SurfingTunes"] = "longblade",
    ["PRZWeapons.TacticalHatchetX"] = "axe",
    ["PRZWeapons.Taidao"] = "longblade",
    ["PRZWeapons.TianLaiJiBan"] = "longblade",
    ["PRZWeapons.VillageSword"] = "longblade",
    ["PRZWeapons.PRZCaliburn"] = "longblade",
    ["PRZWeapons.XunXueHandAxe"] = "axe",
    ["PRZWeapons.AdagaRefud"] = "smallblade",
    ["PRZWeapons.AlabardaDoGeneral"] = "spear",
    ["PRZWeapons.AlabardaMiragem"] = "spear",
    ["PRZWeapons.AncoraMay"] = "axe",
    ["PRZWeapons.BaixoDoCarrasco"] = "axe",
    ["PRZWeapons.BastaoMythril"] = "blunt",
    ["PRZWeapons.BorboletaNebulosa"] = "smallblade",
    ["PRZWeapons.BrocaEscavacao"] = "smallblunt",
    ["PRZWeapons.CajadoAnubis"] = "spear",
    ["PRZWeapons.CajadoDoLacre"] = "blunt",
    ["PRZWeapons.CetroHarmonico"] = "smallblunt",
    ["PRZWeapons.CetroRubroArcano"] = "blunt",
    ["PRZWeapons.CruzDosCaidos"] = "spear",
    ["PRZWeapons.CruzProfana"] = "spear",
    ["PRZWeapons.DirkDoAbismo"] = "smallblade",
    ["PRZWeapons.EspadaBastardaClassica"] = "longblade",
    ["PRZWeapons.EspadaCavaleiroAstral"] = "longblade",
    ["PRZWeapons.EspadaCavaleiroFantasma"] = "longblade",
    ["PRZWeapons.EspadaPortaoDoTempo"] = "longblade",
    ["PRZWeapons.FoiceDaDama"] = "axe",
    ["PRZWeapons.GarraDoCorvo"] = "smallblade",
    ["PRZWeapons.GlaiveDaMare"] = "spear",
    ["PRZWeapons.GramDoPrestigio"] = "longblade",
    ["PRZWeapons.GuitarraRockstar"] = "blunt",
    ["PRZWeapons.GungnirDourada"] = "spear",
    ["PRZWeapons.ImperadorAbissal"] = "blunt",
    ["PRZWeapons.JuizoDaFloresta"] = "axe",
    ["PRZWeapons.LaminaArcanaCrepuscular"] = "longblade",
    ["PRZWeapons.LaminaDoJulgamento"] = "longblade",
    ["PRZWeapons.LancaAzazel"] = "spear",
    ["PRZWeapons.LancaBrasaPerfurante"] = "spear",
    ["PRZWeapons.LancaInfernal"] = "spear",
    ["PRZWeapons.LancaPrisma"] = "spear",
    ["PRZWeapons.LancaTrovaoFurioso"] = "spear",
    ["PRZWeapons.LonginusEscarlate"] = "spear",
    ["PRZWeapons.MachadinhaOnirica"] = "axe",
    ["PRZWeapons.MachadoApostata"] = "axe",
    ["PRZWeapons.MachadoCeleste"] = "axe",
    ["PRZWeapons.MachadoDoJarl"] = "axe",
    ["PRZWeapons.MachadoGlacialLaura"] = "axe",
    ["PRZWeapons.MachadoHongling"] = "axe",
    ["PRZWeapons.MachadoLeviata"] = "axe",
    ["PRZWeapons.MachadoPangu"] = "axe",
    ["PRZWeapons.MachadoReiDemonio"] = "axe",
    ["PRZWeapons.MachadoTempestadeAbsoluta"] = "axe",
    ["PRZWeapons.MarteloDoTrovao"] = "smallblunt",
    ["PRZWeapons.MarteloHexagrama"] = "blunt",
    ["PRZWeapons.MarteloJustica"] = "smallblunt",
    ["PRZWeapons.MataDragoes"] = "longblade",
    ["PRZWeapons.MegabatT30"] = "blunt",
    ["PRZWeapons.MotorDemolicao"] = "axe",
    ["PRZWeapons.PresaDeJormungandr"] = "longblade",
    ["PRZWeapons.PunhalCastigoDivino"] = "smallblade",
    ["PRZWeapons.PunhalDraconico"] = "smallblade",
    ["PRZWeapons.PunhoDoTita"] = "smallblunt",
    ["PRZWeapons.ReliquiaJadeGelido"] = "blunt",
    ["PRZWeapons.SolidaoEterna"] = "longblade",
    ["PRZWeapons.TacoBambuKitsune"] = "blunt",
    ["PRZWeapons.TacoCarbonoVertice"] = "blunt",
    ["PRZWeapons.TacoCerimonialAureum"] = "blunt",
    ["PRZWeapons.TacoDoCerco"] = "blunt",
    ["PRZWeapons.TacoDoMotim"] = "blunt",
    ["PRZWeapons.TacoEstelarVioleta"] = "blunt",
    ["PRZWeapons.TacoSupremoZ"] = "blunt",
    ["PRZWeapons.TacoTitanioDinamico"] = "blunt",
    ["PRZWeapons.TerrorNoturno"] = "smallblunt",
    ["PRZWeapons.TridentePoseidon"] = "spear",
    ["PRZWeapons.TyrfingRubra"] = "longblade",
    ["PRZWeapons.VeuInalcancavel"] = "blunt",
    ["PRZWeapons.ZangetsuSombria"] = "longblade",
}

    weaponCategories["PRZWeapons.GlintofClouds"]="longblade"
    weaponCategories["PRZWeapons.NocturnalEdge"]="longblade"
    weaponCategories["PRZWeapons.IridescentGalaxy"]="blunt"

local traitForCategory = {
    blunt = CharacterTrait.MURALHACHOQUE,
    smallblunt = CharacterTrait.PUNHODEFERRO,
    axe = CharacterTrait.CARRASCO,
    spear = CharacterTrait.LANCEIRO,
    smallblade = CharacterTrait.CIRURGIAOCAOS,
    longblade = CharacterTrait.ESPADACHIMAPOCALIPSE,
}

local function hasTrait(player, trait)
    if not player or not player.hasTrait or not trait then return false end
    local ok, value = pcall(function() return player:hasTrait(trait) end)
    return ok and value == true
end

local function saveBase(item)
    if not item or not item.getModData then return end
    local md = item:getModData()
    if md.PRZTraitBaseSaved then return end
    md.PRZTraitBaseSaved = true
    md.PRZTraitMinDamage = item:getMinDamage()
    md.PRZTraitMaxDamage = item:getMaxDamage()
    md.PRZTraitCriticalChance = item:getCriticalChance()
    md.PRZTraitBaseSpeed = item:getBaseSpeed()
    md.PRZTraitEnduranceMod = item:getEnduranceMod()
    md.PRZTraitConditionLowerChance = item:getConditionLowerChance()
    md.PRZTraitDoorDamage = item:getDoorDamage()
    md.PRZTraitTreeDamage = item:getTreeDamage()
end

local function restoreBase(item)
    if not item or not item.getModData then return end
    local md = item:getModData()
    if not md.PRZTraitBaseSaved then return end
    if md.PRZTraitMinDamage then item:setMinDamage(md.PRZTraitMinDamage) end
    if md.PRZTraitMaxDamage then item:setMaxDamage(md.PRZTraitMaxDamage) end
    if md.PRZTraitCriticalChance then item:setCriticalChance(md.PRZTraitCriticalChance) end
    if md.PRZTraitBaseSpeed then item:setBaseSpeed(md.PRZTraitBaseSpeed) end
    if md.PRZTraitEnduranceMod then item:setEnduranceMod(md.PRZTraitEnduranceMod) end
    if md.PRZTraitConditionLowerChance then item:setConditionLowerChance(md.PRZTraitConditionLowerChance) end
    if md.PRZTraitDoorDamage then item:setDoorDamage(md.PRZTraitDoorDamage) end
    if md.PRZTraitTreeDamage then item:setTreeDamage(md.PRZTraitTreeDamage) end
    md.PRZTraitApplied = nil
end

local function applyMastery(player, item)
    if not item or not item.getFullType then return end
    local category = weaponCategories[item:getFullType()]
    if not category then return end

    saveBase(item)
    restoreBase(item)

    local trait = traitForCategory[category]
    if not trait or not hasTrait(player, trait) then return end

    local md = item:getModData()
    if category == "blunt" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.12)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.12)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.08)
        item:setEnduranceMod(md.PRZTraitEnduranceMod * 0.88)
        item:setConditionLowerChance(math.max(1, math.floor(md.PRZTraitConditionLowerChance * 1.15 + 0.5)))
    elseif category == "smallblunt" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.10)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.10)
        item:setCriticalChance(md.PRZTraitCriticalChance + 12)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.15)
        item:setEnduranceMod(md.PRZTraitEnduranceMod * 0.90)
    elseif category == "axe" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.15)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.15)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.08)
        item:setEnduranceMod(md.PRZTraitEnduranceMod * 0.90)
        item:setDoorDamage(math.floor(md.PRZTraitDoorDamage * 1.20 + 0.5))
        item:setTreeDamage(math.floor(md.PRZTraitTreeDamage * 1.20 + 0.5))
    elseif category == "spear" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.12)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.12)
        item:setCriticalChance(md.PRZTraitCriticalChance + 15)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.08)
    elseif category == "smallblade" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.10)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.10)
        item:setCriticalChance(md.PRZTraitCriticalChance + 15)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.10)
        item:setEnduranceMod(md.PRZTraitEnduranceMod * 0.85)
    elseif category == "longblade" then
        item:setMinDamage(md.PRZTraitMinDamage * 1.12)
        item:setMaxDamage(md.PRZTraitMaxDamage * 1.12)
        item:setBaseSpeed(md.PRZTraitBaseSpeed * 1.08)
        item:setEnduranceMod(md.PRZTraitEnduranceMod * 0.88)
        item:setConditionLowerChance(math.max(1, math.floor(md.PRZTraitConditionLowerChance * 1.15 + 0.5)))
    end
    md.PRZTraitApplied = category
end

local lastPrimary = {}

-- Bandits/NPCs also fire OnEquipPrimary when changing weapons.
-- They are IsoZombie-based actors, not IsoPlayer, so never let them enter
-- the trait/mastery path (getPlayerNum/getPrimaryHandItem/hasTrait).
local function isLocalPlayerActor(character)
    if not character then return false end

    local okClass, isPlayer = pcall(function()
        return instanceof(character, "IsoPlayer")
    end)
    if not okClass or not isPlayer then return false end

    local okLocal, isLocal = pcall(function()
        return character:isLocalPlayer()
    end)
    return okLocal and isLocal == true
end

local function refreshPlayer(player)
    if not isLocalPlayerActor(player) then return end
    local key = player:getPlayerNum() or 0
    local current = player:getPrimaryHandItem()
    local previous = lastPrimary[key]
    if previous and previous ~= current then
        restoreBase(previous)
    end
    if current and weaponCategories[current:getFullType()] then
        applyMastery(player, current)
    end
    lastPrimary[key] = current
end

local function onEquipPrimary(player, item)
    if not isLocalPlayerActor(player) then return end
    refreshPlayer(player)
end

local tick = 0
local function onPlayerUpdate(player)
    if not isLocalPlayerActor(player) then return end
    tick = tick + 1
    if tick % 90 ~= 0 then return end
    refreshPlayer(player)
end

Events.OnEquipPrimary.Add(onEquipPrimary)
Events.OnPlayerUpdate.Add(onPlayerUpdate)
