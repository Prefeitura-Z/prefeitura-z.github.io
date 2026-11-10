-- PRZWeapons 3.2.0: shared restrictions for loot and external economy integrations.
PRZOmegaWeapons = PRZOmegaWeapons or {}
local W = PRZOmegaWeapons
W.VERSION = "3.2.0"
W.Config = {
    dropChancePercent = 20,
    parts = {
        {id="PRZWeapons.LigaOmega", weight=12},
        {id="PRZWeapons.CircuitoOmega", weight=12},
        {id="PRZWeapons.BobinaOmega", weight=12},
        {id="PRZWeapons.CatalisadorOmega", weight=12},
        {id="PRZWeapons.CondutorOmega", weight=12},
        {id="PRZWeapons.EmpunhaduraOmega", weight=12},
        {id="PRZWeapons.SeloOmega", weight=12},
        {id="PRZWeapons.NucleoTyrfingRubra", weight=4},
        {id="PRZWeapons.NucleoPunhalCastigoDivino", weight=4},
        {id="PRZWeapons.NucleoTacoSupremoZ", weight=4},
        {id="PRZWeapons.NucleoMarteloDoTrovao", weight=4},
        {id="PRZWeapons.NucleoMachadoLeviata", weight=4},
        {id="PRZWeapons.NucleoTridentePoseidon", weight=4},
    },
}
W.RestrictedWeapons = {
    ["PRZWeapons.TyrfingRubra"]=true,
    ["PRZWeapons.PunhalCastigoDivino"]=true,
    ["PRZWeapons.TacoSupremoZ"]=true,
    ["PRZWeapons.MarteloDoTrovao"]=true,
    ["PRZWeapons.MachadoLeviata"]=true,
    ["PRZWeapons.TridentePoseidon"]=true,
}
function W.isRestrictedWeapon(fullType) return W.RestrictedWeapons[fullType] == true end
W.RestrictedLoot = {}
for id in pairs(W.RestrictedWeapons) do W.RestrictedLoot[id]=true end
for _,part in ipairs(W.Config.parts) do W.RestrictedLoot[part.id]=true end
W.BattlePassReward = "PRZWeapons.LaminaDoJulgamento"

W.Recipes = {
    "PRZOmega_TyrfingRubra",
    "PRZOmega_PunhalCastigoDivino",
    "PRZOmega_TacoSupremoZ",
    "PRZOmega_MarteloDoTrovao",
    "PRZOmega_MachadoLeviata",
    "PRZOmega_TridentePoseidon",
}
W.LegacyCores = {
    "PRZWeapons.NucleoPunhalDraconico",
    "PRZWeapons.NucleoLonginusEscarlate",
}
for _,id in ipairs(W.LegacyCores) do W.RestrictedLoot[id]=true end

-- Season 2 acquisition boundary used by loot, Bashar, Pager, shop and lootboxes.
require "PRZOmegaCatalog"
for _,crate in ipairs(W.SupplyCrates or {}) do
    W.RestrictedLoot[crate.id]=true
    W.RestrictedLoot[crate.ammo]=true
end
W.RestrictedLoot["PRZWeapons.OmegaToken"]=true
W.ReservedEquivalentIDs={
    ["PRZWeapons.AngryThunderLance"]=true,
    ["PRZWeapons.DivinepunishmentKnife"]=true,
    ["PRZWeapons.HonglingAxe"]=true,
    ["PRZWeapons.IridescentGalaxy"]=true,
    ["PRZWeapons.LancaTrovaoFurioso"]=true,
    ["PRZWeapons.MachadoHongling"]=true,
    ["PRZWeapons.NocturnalEdge"]=true,
}
for _,entry in ipairs(W.Firearms) do W.RestrictedWeapons[entry.id]=true end
for id in pairs(W.ReservedEquivalentIDs) do W.RestrictedWeapons[id]=true end
for id in pairs(W.RestrictedWeapons) do W.RestrictedLoot[id]=true end
W.RestrictedLoot["PRZWeapons.BobinaOmega"]=true
W.RestrictedLoot["PRZWeapons.CatalisadorOmega"]=true
W.RestrictedLoot["PRZWeapons.CircuitoOmega"]=true
W.RestrictedLoot["PRZWeapons.CondutorOmega"]=true
W.RestrictedLoot["PRZWeapons.EmpunhaduraOmega"]=true
W.RestrictedLoot["PRZWeapons.LigaOmega"]=true
W.RestrictedLoot["PRZWeapons.MachadoLeviata"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaAS50Gold"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaBalrog11"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaBalrog7"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaDualInfinity"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaGatling"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaHolyFlame"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaJanus7"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaMG36Xmas"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaMG3Gold"]=true
W.RestrictedLoot["PRZWeapons.ManualOmegaSVDEX"]=true
W.RestrictedLoot["PRZWeapons.MarteloDoTrovao"]=true
W.RestrictedLoot["PRZWeapons.NucleoLonginusEscarlate"]=true
W.RestrictedLoot["PRZWeapons.NucleoMachadoLeviata"]=true
W.RestrictedLoot["PRZWeapons.NucleoMarteloDoTrovao"]=true
W.RestrictedLoot["PRZWeapons.NucleoPunhalCastigoDivino"]=true
W.RestrictedLoot["PRZWeapons.NucleoPunhalDraconico"]=true
W.RestrictedLoot["PRZWeapons.NucleoTacoSupremoZ"]=true
W.RestrictedLoot["PRZWeapons.NucleoTridentePoseidon"]=true
W.RestrictedLoot["PRZWeapons.NucleoTyrfingRubra"]=true
W.RestrictedLoot["PRZWeapons.OmegaAS50Gold"]=true
W.RestrictedLoot["PRZWeapons.OmegaAS50GoldMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaBalrog11"]=true
W.RestrictedLoot["PRZWeapons.OmegaBalrog7"]=true
W.RestrictedLoot["PRZWeapons.OmegaBalrog7Magazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaBullets50"]=true
W.RestrictedLoot["PRZWeapons.OmegaBullets50Box"]=true
W.RestrictedLoot["PRZWeapons.OmegaDualInfinity"]=true
W.RestrictedLoot["PRZWeapons.OmegaDualInfinityHandVisual"]=true
W.RestrictedLoot["PRZWeapons.OmegaDualInfinityMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaDualInfinityMechanicalHandVisual"]=true
W.RestrictedLoot["PRZWeapons.OmegaGatling"]=true
W.RestrictedLoot["PRZWeapons.OmegaGatlingMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaHolyFlame"]=true
W.RestrictedLoot["PRZWeapons.OmegaJanus7"]=true
W.RestrictedLoot["PRZWeapons.OmegaJanus7Magazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaMG36Xmas"]=true
W.RestrictedLoot["PRZWeapons.OmegaMG36XmasMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaMG3Gold"]=true
W.RestrictedLoot["PRZWeapons.OmegaMG3GoldMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_AS50GoldP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog11P2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_Balrog7P2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityLeftP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_DualInfinityP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP3_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_GatlingP4_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_HolyFlameP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG36XmasP3_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_MG3GoldP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP1_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_01"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_02"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_03"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_04"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_05"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_06"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_07"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_08"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_09"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_10"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_11"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_12"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_13"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_14"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_15"]=true
W.RestrictedLoot["PRZWeapons.OmegaMech_SVDEXP2_16"]=true
W.RestrictedLoot["PRZWeapons.OmegaSVDEX"]=true
W.RestrictedLoot["PRZWeapons.OmegaSVDEXMagazine"]=true
W.RestrictedLoot["PRZWeapons.OmegaSVDGrenade"]=true
W.RestrictedLoot["PRZWeapons.PunhalCastigoDivino"]=true
W.RestrictedLoot["PRZWeapons.SeloOmega"]=true
W.RestrictedLoot["PRZWeapons.TacoSupremoZ"]=true
W.RestrictedLoot["PRZWeapons.TridentePoseidon"]=true
W.RestrictedLoot["PRZWeapons.TyrfingRubra"]=true
function W.isRestrictedLoot(fullType)
    if type(fullType)~="string" then return false end
    if fullType:match("^PRZWeapons%.OmegaDualFlash[RL]%d%d$") then return true end
    return W.RestrictedLoot[fullType]==true

end
-- This function grants nothing. External integrations must enforce it before
-- charging, rolling, consuming a box or mutating an inventory.
function W.canAcquire(fullType,source)
    if not W.isRestrictedLoot(fullType) then return true end
    return source=="omegaCraft" or source=="omegaCampaign" or source=="atlasComponent" or source=="admin"
end


-- Six learnable melee blueprints; only the existing Atlas occult drop path.
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaTyrfingRubra",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaTyrfingRubra"]=true
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaPunhalCastigoDivino",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaPunhalCastigoDivino"]=true
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaTacoSupremoZ",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaTacoSupremoZ"]=true
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaMarteloDoTrovao",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaMarteloDoTrovao"]=true
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaMachadoLeviata",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaMachadoLeviata"]=true
table.insert(W.Config.parts,{id="PRZWeapons.ProjetoOmegaTridentePoseidon",weight=1})
W.RestrictedLoot["PRZWeapons.ProjetoOmegaTridentePoseidon"]=true
