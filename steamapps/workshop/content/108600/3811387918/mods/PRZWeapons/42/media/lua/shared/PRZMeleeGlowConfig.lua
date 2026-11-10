PRZMeleeGlowConfig = PRZMeleeGlowConfig or {}

function PRZMeleeGlowConfig.isEffectsEnabled()
    local sandbox = PRZMeleeSandbox
    if type(sandbox) ~= "table" or type(sandbox.isEnabled) ~= "function" then
        return true
    end

    local ok, enabled = pcall(sandbox.isEnabled)
    return not ok or enabled ~= false
end

PRZMeleeGlowConfig.Time = {
    startHour = 20,
    endHour = 8,
    boundaryCheckIntervalMs = 100,
    remoteScanIntervalMs = 1000,
}

PRZMeleeGlowConfig.Flash = {
    updateIntervalMs = 33,
    durationMs = 180,
    swingCooldownMs = 120,
}

PRZMeleeGlowConfig.Weapons = {
    ["PRZWeapons.DarkRepulsor"] = {
        daySprite = "PRZM_DarkRepulsor",
        nightSprite = "PRZM_NGW_DarkRepulsor_GlowBlueGreen",
        flashTheme = "blueGreen",
    },
    ["PRZWeapons.BlueRoseSword"] = {
        daySprite = "PRZM_BlueRoseSword",
        nightSprite = "PRZM_NGW_BlueRoseSword_GlowBlueWhite",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.Excalibur"] = {
        daySprite = "PRZM_Excalibur",
        nightSprite = "PRZM_NGW_Excalibur_GlowExcalibur",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.PRZCaliburn"] = {
        daySprite = "PRZM_PRZCaliburn",
        nightSprite = "PRZM_NGW_PRZCaliburn_GlowPRZCaliburn",
        flashTheme = "purpleWhite",
    },
    ["PRZWeapons.AndurilSword"] = {
        daySprite = "PRZM_AndurilSword",
        nightSprite = "PRZM_NGW_AndurilSword_GlowWhiteOrange",
        flashTheme = "whiteOrange",
    },
    ["PRZWeapons.PoeticMelody"] = {
        daySprite = "PRZM_PoeticMelody",
        nightSprite = "PRZM_NGW_PoeticMelody_GlowPoeticMelody",
        flashTheme = "whiteOrange",
    },
    ["PRZWeapons.Izanami"] = {
        daySprite = "PRZM_Izanami",
        nightSprite = "PRZM_NGW_Izanami_GlowRainbow",
        flashTheme = "rainbow",
    },
    ["PRZWeapons.NightSkySword"] = {
        daySprite = "PRZM_NightSkySword",
        nightSprite = "PRZM_NGW_NightSkySword_GlowNightSkySword",
        flashTheme = "purpleWhite",
    },
    ["PRZWeapons.JudgmentScythe"] = {
        daySprite = "PRZM_JudgmentScythe",
        nightSprite = "PRZM_NGW_JudgmentScythe_GlowJudgmentScythe",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.JeannedArcSword"] = {
        daySprite = "PRZM_JeannedArcSword",
        nightSprite = "PRZM_NGW_JeannedArcSword_GlowJeannedArcSword",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.ErrataKatana"] = {
        daySprite = "PRZM_ErrataKatana",
        nightSprite = "PRZM_NGW_ErrataKatana_GlowErrataKatana",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.TianLaiJiBan"] = {
        daySprite = "PRZM_TianLaiJiBan",
        nightSprite = "PRZM_NGW_TianLaiJiBan_GlowTianLaiJiBan",
        flashTheme = "whiteOrange",
    },
    ["PRZWeapons.RanLing"] = {
        daySprite = "PRZM_RanLing",
        nightSprite = "PRZM_NGW_RanLing_GlowRanLing",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.ChanShiZhe"] = {
        daySprite = "PRZM_ChanShiZhe",
        nightSprite = "PRZM_NGW_ChanShiZhe_GlowChanShiZhe",
        flashTheme = "purpleWhite",
    },
    ["PRZWeapons.OrpheusCradle"] = {
        daySprite = "PRZM_OrpheusCradle",
        nightSprite = "PRZM_NGW_OrpheusCradle_GlowOrpheusCradle",
        flashTheme = "purpleWhite",
    },
    ["PRZWeapons.StarryThunder"] = {
        daySprite = "PRZM_StarryThunder",
        nightSprite = "PRZM_NGW_StarryThunder_GlowStarryThunder",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.SurfingTunes"] = {
        daySprite = "PRZM_SurfingTunes",
        nightSprite = "PRZM_NGW_SurfingTunes_GlowSurfingTunes",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.ForestShamanPrayer"] = {
        daySprite = "PRZM_ForestShamanPrayer",
        nightSprite = "PRZM_NGW_ForestShamanPrayer_GlowBlueBlack",
        flashTheme = "purpleWhite",
    },
    ["PRZWeapons.HymnofWindandFlower"] = {
        daySprite = "PRZM_HymnofWindandFlower",
        nightSprite = "PRZM_NGW_HymnofWindandFlower_GlowHymnofWindandFlower",
        flashTheme = "blueWhite",
    },
    ["PRZWeapons.Rwbyliandao"] = {
        daySprite = "PRZM_Rwbyliandao",
        nightSprite = "PRZM_NGW_Rwbyliandao_GlowMagma",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.Taidao"] = {
        daySprite = "PRZM_Taidao",
        nightSprite = "PRZM_NGW_Taidao_GlowTaidao",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.DivinepunishmentKnife"] = {
        daySprite = "PRZM_DivinepunishmentKnife",
        nightSprite = "PRZM_NGW_DivinepunishmentKnife_GlowDivinepunishmentKnife",
    },
    ["PRZWeapons.NocturnalEdge"] = {
        daySprite = "PRZM_NocturnalEdge",
        nightSprite = "PRZM_NGW_NocturnalEdge_GlowNocturnalEdge",
        flashTheme = "redWhite",
    },
    ["PRZWeapons.GlintofClouds"] = {
        daySprite = "PRZM_GlintofClouds",
        nightSprite = "PRZM_NGW_GlintofClouds_GlowGlintofClouds",
        flashTheme = "blueWhite",
    },
}

PRZMeleeGlowConfig.FlashThemes = {
    blueGreen = {
        { f = 0.36, s = -0.26, r = 0.08, g = 0.40, b = 0.58, radius = 2 },
        { f = 0.68, s = -0.08, r = 0.18, g = 0.78, b = 0.62, radius = 3 },
        { f = 0.98, s = 0.10,  r = 0.12, g = 0.62, b = 0.74, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.04, g = 0.26, b = 0.40, radius = 2 },
    },
    blueWhite = {
        { f = 0.36, s = -0.26, r = 0.16, g = 0.42, b = 1.00, radius = 2 },
        { f = 0.68, s = -0.08, r = 0.48, g = 0.72, b = 1.00, radius = 3 },
        { f = 0.98, s = 0.10,  r = 0.28, g = 0.56, b = 1.00, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.10, g = 0.30, b = 0.92, radius = 2 },
    },
    orangeWhite = {
        { f = 0.36, s = -0.26, r = 1.00, g = 0.95, b = 0.88, radius = 2 },
        { f = 0.68, s = -0.08, r = 1.00, g = 0.66, b = 0.16, radius = 3 },
        { f = 0.98, s = 0.10,  r = 1.00, g = 0.80, b = 0.34, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.94, g = 0.44, b = 0.10, radius = 2 },
    },
    purpleWhite = {
        { f = 0.36, s = -0.26, r = 0.98, g = 0.94, b = 1.00, radius = 2 },
        { f = 0.68, s = -0.08, r = 0.64, g = 0.34, b = 1.00, radius = 3 },
        { f = 0.98, s = 0.10,  r = 0.76, g = 0.46, b = 1.00, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.42, g = 0.18, b = 0.82, radius = 2 },
    },
    redWhite = {
        { f = 0.36, s = -0.26, r = 1.00, g = 0.94, b = 0.94, radius = 2 },
        { f = 0.68, s = -0.08, r = 1.00, g = 0.24, b = 0.28, radius = 3 },
        { f = 0.98, s = 0.10,  r = 1.00, g = 0.38, b = 0.32, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.76, g = 0.12, b = 0.12, radius = 2 },
    },
    rainbow = {
        { f = 0.30, s = -0.28, r = 1.00, g = 0.28, b = 0.28, radius = 2 },
        { f = 0.56, s = -0.12, r = 1.00, g = 0.80, b = 0.16, radius = 2 },
        { f = 0.82, s = 0.00,  r = 0.30, g = 0.96, b = 0.34, radius = 2 },
        { f = 1.08, s = 0.14,  r = 0.16, g = 0.54, b = 1.00, radius = 2 },
        { f = 1.30, s = 0.28,  r = 0.76, g = 0.28, b = 1.00, radius = 2 },
    },
    orangeYellow = {
        { f = 0.36, s = -0.26, r = 0.72, g = 0.34, b = 0.04, radius = 2 },
        { f = 0.68, s = -0.08, r = 1.00, g = 0.68, b = 0.08, radius = 3 },
        { f = 0.98, s = 0.10,  r = 1.00, g = 0.88, b = 0.18, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.82, g = 0.44, b = 0.04, radius = 2 },
    },
    magma = {
        { f = 0.36, s = -0.26, r = 0.48, g = 0.03, b = 0.00, radius = 2 },
        { f = 0.68, s = -0.08, r = 0.96, g = 0.12, b = 0.02, radius = 3 },
        { f = 0.98, s = 0.10,  r = 1.00, g = 0.30, b = 0.04, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.52, g = 0.05, b = 0.00, radius = 2 },
    },
    whiteOrange = {
        { f = 0.36, s = -0.26, r = 0.88, g = 0.42, b = 0.10, radius = 2 },
        { f = 0.68, s = -0.08, r = 1.00, g = 0.94, b = 0.88, radius = 3 },
        { f = 0.98, s = 0.10,  r = 1.00, g = 0.76, b = 0.28, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.94, g = 0.48, b = 0.12, radius = 2 },
    },
    blueBlack = {
        { f = 0.36, s = -0.26, r = 0.05, g = 0.10, b = 0.34, radius = 2 },
        { f = 0.68, s = -0.08, r = 0.08, g = 0.18, b = 0.62, radius = 3 },
        { f = 0.98, s = 0.10,  r = 0.10, g = 0.24, b = 0.78, radius = 3 },
        { f = 1.22, s = 0.24,  r = 0.03, g = 0.08, b = 0.26, radius = 2 },
    },
}
