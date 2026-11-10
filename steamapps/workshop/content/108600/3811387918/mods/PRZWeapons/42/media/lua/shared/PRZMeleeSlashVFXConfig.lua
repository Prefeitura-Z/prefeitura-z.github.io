PRZMeleeSlashVFX = PRZMeleeSlashVFX or {}
PRZMeleeSlashVFX.Runtime = PRZMeleeSlashVFX.Runtime or {}

local Config = {}
PRZMeleeSlashVFX.Config = Config

local SQRT_HALF = 0.70710678118

Config.MODULE = "PRZMeleeSlashVFX"
Config.COMMAND_SPAWN = "SpawnSlash"

Config.MAX_EFFECTS = 28
Config.DURATION = 0.40
Config.APPEAR_DURATION = 0.07
Config.DEBOUNCE_MS = 105
Config.SERVER_DEBOUNCE_MS = 90
Config.SYNC_RADIUS = 70.0
Config.MERGE_WINDOW = 0.09
Config.FOLLOW_DURATION = 0.15
Config.OVERLOAD_THRESHOLD = 16

Config.TEXTURES = {
    fallback = "media/white.png",
}

local TEXTURE_ROOT = "media/textures/PRZMeleeSlashVFX/seq/"

local function buildSequencePaths(sequenceId, filenamePattern, firstFrame, lastFrame)
    local paths = {}

    for frame = firstFrame, lastFrame do
        paths[#paths + 1] = string.format(
            "%s%s/%s",
            TEXTURE_ROOT,
            sequenceId,
            string.format(filenamePattern, frame)
        )
    end

    return paths
end

local function sequence(sequenceId, width, height, filenamePattern, firstFrame, lastFrame)
    return {
        width = width,
        height = height,
        paths = buildSequencePaths(sequenceId, filenamePattern, firstFrame, lastFrame),
    }
end

Config.MainSequences = {
    ["0018"] = sequence("0018", 363, 341, "0018_%d.png", 0, 5),
    ["0023"] = sequence("0023", 258, 220, "0023_%d.png", 0, 8),
    ["0028"] = sequence("0028", 1101, 633, "skeleton-atk1_%02d.png", 11, 16),
    ["0035"] = sequence("0035", 826, 572, "0276_%02d.png", 15, 21),
    ["0053"] = sequence("0053", 977, 490, "491-1-attack_%02d.png", 10, 21),
    ["0054"] = sequence("0054", 1350, 471, "skeleton-atk3_%02d.png", 10, 16),
    ["0140"] = sequence("0140", 1068, 454, "skeleton-atk2_%02d.png", 10, 28),
    ["0141"] = sequence("0141", 928, 496, "skeleton-atk3_%02d.png", 10, 27),
    ["0143"] = sequence("0143", 1161, 564, "skeleton-akt1_%02d.png", 10, 27),
    ["0146"] = sequence("0146", 515, 336, "0146_%d.png", 13, 27),
    ["0164"] = sequence("0164", 372, 248, "0164_%d.png", 0, 7),
    ["0292"] = sequence("0292", 351, 257, "0292_%02d.png", 0, 12),
    ["0468"] = sequence("0468", 377, 370, "0468_%02d.png", 0, 11),
    ["0479"] = sequence("0479", 392, 357, "0479_%d.png", 10, 20),
}

Config.BurstSequences = {
    cool = sequence("0015", 252, 212, "0015_%d.png", 0, 8),
    warm = sequence("0492", 347, 283, "0492_%02d.png", 0, 10),
    arcane = sequence("0186", 364, 363, "0186_%d.png", 0, 7),
}
Config.Profiles = {
    repulsor_cyan_arc = {
        mainSequence = "0479",
        burstSequence = "cool",
        duration = 0.36,
        mainGlow = { r = 1.00, g = 1.00, b = 1.00, a = 0.74 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 1.00 },
        burst = { r = 0.90, g = 0.99, b = 1.00, a = 0.90 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.46,
        pivotForwardTiles = 0.78,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.28,
        handLateralTiles = 0.07,
        mainWidthTiles = 1.50,
        mainHeightTiles = 0.90,
        mainGlowScale = 1.26,
        mainCoreScale = 1.00,
        scaleIn = 1.36,
        scaleOut = 0.86,
        stretchIn = 1.42,
        angleBiasDeg = 9.0,
        burstSizeTiles = 0.92,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    frost_blade = {
        mainSequence = "0023",
        burstSequence = "cool",
        mainGlow = { r = 0.98, g = 0.99, b = 1.00, a = 0.46 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 0.98 },
        burst = { r = 0.95, g = 0.99, b = 1.00, a = 0.90 },
        mainAnchorZ = 0.38,
        burstAnchorZ = 0.46,
        pivotForwardTiles = 0.66,
        pivotLateralTiles = 0.05,
        handForwardTiles = 0.28,
        handLateralTiles = 0.07,
        mainWidthTiles = 1.74,
        mainHeightTiles = 1.58,
        mainGlowScale = 1.18,
        mainCoreScale = 0.94,
        scaleIn = 1.28,
        scaleOut = 0.84,
        stretchIn = 1.26,
        angleBiasDeg = 12.0,
        burstSizeTiles = 0.90,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -22.0,
        followDuration = 0.15,
    },
    solar_arc = {
        mainSequence = "0292",
        burstSequence = "warm",
        mainGlow = { r = 1.00, g = 0.97, b = 0.88, a = 0.45 },
        mainCore = { r = 1.00, g = 0.98, b = 0.92, a = 0.97 },
        burst = { r = 1.00, g = 0.88, b = 0.58, a = 0.88 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.68,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 1.84,
        mainHeightTiles = 1.60,
        mainGlowScale = 1.18,
        mainCoreScale = 0.95,
        scaleIn = 1.30,
        scaleOut = 0.84,
        stretchIn = 1.30,
        angleBiasDeg = 13.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    crimson_arc = {
        mainSequence = "0164",
        burstSequence = "warm",
        mainGlow = { r = 1.00, g = 0.94, b = 0.94, a = 0.44 },
        mainCore = { r = 1.00, g = 0.97, b = 0.97, a = 0.97 },
        burst = { r = 1.00, g = 0.42, b = 0.30, a = 0.90 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.68,
        pivotLateralTiles = 0.05,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 1.82,
        mainHeightTiles = 1.56,
        mainGlowScale = 1.16,
        mainCoreScale = 0.95,
        scaleIn = 1.30,
        scaleOut = 0.84,
        stretchIn = 1.32,
        angleBiasDeg = 13.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    arcane_arc = {
        mainSequence = "0468",
        burstSequence = "arcane",
        mainGlow = { r = 0.97, g = 0.92, b = 1.00, a = 0.44 },
        mainCore = { r = 1.00, g = 0.98, b = 1.00, a = 0.97 },
        burst = { r = 0.94, g = 0.72, b = 1.00, a = 0.88 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.66,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.28,
        handLateralTiles = 0.07,
        mainWidthTiles = 1.76,
        mainHeightTiles = 1.60,
        mainGlowScale = 1.20,
        mainCoreScale = 0.95,
        scaleIn = 1.28,
        scaleOut = 0.82,
        stretchIn = 1.24,
        angleBiasDeg = 14.0,
        burstSizeTiles = 0.90,
        burstLifePortion = 0.62,
        burstAngleOffsetDeg = -22.0,
        followDuration = 0.15,
    },
    moon_prism = {
        mainSequence = "0018",
        burstSequence = "cool",
        mainGlow = { r = 0.94, g = 0.97, b = 1.00, a = 0.46 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 0.98 },
        burst = { r = 0.88, g = 0.98, b = 1.00, a = 0.86 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.64,
        pivotLateralTiles = 0.03,
        handForwardTiles = 0.26,
        handLateralTiles = 0.06,
        mainWidthTiles = 1.54,
        mainHeightTiles = 1.58,
        mainGlowScale = 1.16,
        mainCoreScale = 0.95,
        scaleIn = 1.22,
        scaleOut = 0.84,
        stretchIn = 1.18,
        angleBiasDeg = 11.0,
        burstSizeTiles = 0.82,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    rainbow_prism = {
        mainSequence = "0053",
        burstSequence = "arcane",
        duration = 0.36,
        mainGlow = { r = 1.00, g = 1.00, b = 1.00, a = 0.72 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 1.00 },
        burst = { r = 0.98, g = 0.94, b = 1.00, a = 0.92 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.68,
        pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.02,
        mainLateralOffsetTiles = 0.04,
        handForwardTiles = 0.28,
        handLateralTiles = 0.06,
        mainWidthTiles = 2.10,
        mainHeightTiles = 1.92,
        mainGlowScale = 1.22,
        mainCoreScale = 1.00,
        scaleIn = 1.30,
        scaleOut = 0.86,
        stretchIn = 1.16,
        angleBiasDeg = 5.0,
        burstSizeTiles = 1.02,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -12.0,
        followDuration = 0.15,
    },
    abyss_arc = {
        mainSequence = "0018",
        burstSequence = "arcane",
        mainGlow = { r = 0.82, g = 0.92, b = 1.00, a = 0.36 },
        mainCore = { r = 0.96, g = 1.00, b = 1.00, a = 0.92 },
        burst = { r = 0.78, g = 0.88, b = 1.00, a = 0.82 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.66,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.28,
        handLateralTiles = 0.07,
        mainWidthTiles = 1.76,
        mainHeightTiles = 1.60,
        mainGlowScale = 1.20,
        mainCoreScale = 0.95,
        scaleIn = 1.26,
        scaleOut = 0.82,
        stretchIn = 1.24,
        angleBiasDeg = 14.0,
        burstSizeTiles = 0.88,
        burstLifePortion = 0.60,
        burstAngleOffsetDeg = -22.0,
        followDuration = 0.15,
    },
    amber_fang = {
        mainSequence = "0146",
        burstSequence = "warm",
        mainGlow = { r = 1.00, g = 0.95, b = 0.76, a = 0.40 },
        mainCore = { r = 1.00, g = 0.98, b = 0.88, a = 0.94 },
        burst = { r = 1.00, g = 0.74, b = 0.32, a = 0.90 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.74,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.32,
        mainHeightTiles = 1.08,
        mainGlowScale = 1.10,
        mainCoreScale = 0.92,
        scaleIn = 1.32,
        scaleOut = 0.86,
        stretchIn = 1.50,
        angleBiasDeg = 12.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    thunder_loop = {
        mainSequence = "0140",
        burstSequence = "cool",
        mainGlow = { r = 0.86, g = 0.98, b = 1.00, a = 0.40 },
        mainCore = { r = 0.98, g = 1.00, b = 1.00, a = 0.94 },
        burst = { r = 0.88, g = 0.98, b = 1.00, a = 0.88 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.72,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.18,
        mainHeightTiles = 1.16,
        mainGlowScale = 1.10,
        mainCoreScale = 0.92,
        scaleIn = 1.30,
        scaleOut = 0.84,
        stretchIn = 1.44,
        angleBiasDeg = 13.0,
        burstSizeTiles = 0.90,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -20.0,
        followDuration = 0.15,
    },
    surfing_wave_arc = {
        mainSequence = "0054",
        burstSequence = "cool",
        duration = 0.36,
        mainGlow = { r = 1.00, g = 1.00, b = 1.00, a = 0.74 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 1.00 },
        burst = { r = 0.90, g = 0.99, b = 1.00, a = 0.88 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.72,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.30,
        mainHeightTiles = 1.18,
        mainGlowScale = 1.24,
        mainCoreScale = 1.00,
        scaleIn = 1.36,
        scaleOut = 0.86,
        stretchIn = 1.48,
        angleBiasDeg = 8.0,
        burstSizeTiles = 0.90,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -20.0,
        followDuration = 0.15,
    },
    petal_frost = {
        mainSequence = "0141",
        burstSequence = "cool",
        mainGlow = { r = 0.94, g = 1.00, b = 1.00, a = 0.42 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 0.95 },
        burst = { r = 0.92, g = 0.99, b = 1.00, a = 0.88 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.70,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.02,
        mainHeightTiles = 1.30,
        mainGlowScale = 1.12,
        mainCoreScale = 0.93,
        scaleIn = 1.28,
        scaleOut = 0.84,
        stretchIn = 1.34,
        angleBiasDeg = 12.0,
        burstSizeTiles = 0.90,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -20.0,
        followDuration = 0.15,
    },
    blood_comet = {
        mainSequence = "0143",
        burstSequence = "warm",
        mainGlow = { r = 1.00, g = 0.94, b = 0.94, a = 0.40 },
        mainCore = { r = 1.00, g = 0.98, b = 0.96, a = 0.95 },
        burst = { r = 1.00, g = 0.48, b = 0.34, a = 0.90 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.72,
        pivotLateralTiles = 0.05,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.18,
        mainHeightTiles = 1.26,
        mainGlowScale = 1.10,
        mainCoreScale = 0.92,
        scaleIn = 1.32,
        scaleOut = 0.86,
        stretchIn = 1.42,
        angleBiasDeg = 13.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.58,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    jeanne_crimson_sigil = {
        mainSequence = "0035",
        burstSequence = "arcane",
        duration = 0.34,
        mainGlow = { r = 1.00, g = 1.00, b = 1.00, a = 0.72 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 1.00 },
        burst = { r = 1.00, g = 0.88, b = 0.98, a = 0.88 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.72,
        pivotLateralTiles = 0.05,
        mainForwardOffsetTiles = 0.06,
        mainLateralOffsetTiles = -0.06,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.02,
        mainHeightTiles = 1.42,
        mainGlowScale = 1.16,
        mainCoreScale = 1.00,
        scaleIn = 1.28,
        scaleOut = 0.88,
        stretchIn = 1.28,
        angleBiasDeg =23.0,
        burstSizeTiles = 0.96,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -16.0,
        followDuration = 0.15,
    },
    sunfang = {
        mainSequence = "0146",
        burstSequence = "warm",
        mainGlow = { r = 1.00, g = 0.98, b = 0.84, a = 0.44 },
        mainCore = { r = 1.00, g = 1.00, b = 0.92, a = 0.97 },
        burst = { r = 1.00, g = 0.90, b = 0.52, a = 0.88 },
        mainAnchorZ = 0.39,
        burstAnchorZ = 0.47,
        pivotForwardTiles = 0.68,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.30,
        handLateralTiles = 0.08,
        mainWidthTiles = 1.90,
        mainHeightTiles = 1.42,
        mainGlowScale = 1.14,
        mainCoreScale = 0.94,
        scaleIn = 1.30,
        scaleOut = 0.84,
        stretchIn = 1.30,
        angleBiasDeg = 13.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
    poetic_blossom = {
        mainSequence = "0028",
        burstSequence = "arcane",
        duration = 0.34,
        mainGlow = { r = 1.00, g = 1.00, b = 1.00, a = 0.70 },
        mainCore = { r = 1.00, g = 1.00, b = 1.00, a = 1.00 },
        burst = { r = 1.00, g = 0.78, b = 0.96, a = 0.90 },
        mainAnchorZ = 0.40,
        burstAnchorZ = 0.48,
        pivotForwardTiles = 0.78,
        pivotLateralTiles = 0.04,
        handForwardTiles = 0.32,
        handLateralTiles = 0.08,
        mainWidthTiles = 2.18,
        mainHeightTiles = 1.34,
        mainGlowScale = 1.24,
        mainCoreScale = 1.00,
        scaleIn = 1.34,
        scaleOut = 0.88,
        stretchIn = 1.42,
        angleBiasDeg = 9.0,
        burstSizeTiles = 0.94,
        burstLifePortion = 0.56,
        burstAngleOffsetDeg = -18.0,
        followDuration = 0.15,
    },
}

Config.Weapons = {
    ["PRZWeapons.DarkRepulsor"] = { profile = "repulsor_cyan_arc" },
    ["PRZWeapons.BlueRoseSword"] = { profile = "frost_blade" },
    ["PRZWeapons.Excalibur"] = { profile = "sunfang", mainWidthTiles = 1.71, mainHeightTiles = 1.278 },
    ["PRZWeapons.PRZCaliburn"] = { profile = "sunfang", mainWidthTiles = 1.71, mainHeightTiles = 1.278 },
    ["PRZWeapons.AndurilSword"] = { profile = "solar_arc" },
    ["PRZWeapons.PoeticMelody"] = { profile = "poetic_blossom", scale = 0.80 },
    ["PRZWeapons.Izanami"] = {
        profile = "rainbow_prism",
        scale = 1.20,
        pivotForwardTiles = 0.48,
        handForwardTiles = 0.30,
        burstSizeTiles = 0.51,
    },
    ["PRZWeapons.NightSkySword"] = { profile = "arcane_arc" },
    ["PRZWeapons.JudgmentScythe"] = {
        profile = "petal_frost",
        mainSequence = "0018",
        burstSequence = "cool",
        scale = 1.80,
        pivotForwardTiles = 1.48,
        handForwardTiles = 0.72,
    },
    ["PRZWeapons.JeannedArcSword"] = { profile = "jeanne_crimson_sigil", scale = 1.4, burstSizeTiles = 0.48 },
    ["PRZWeapons.ErrataKatana"] = {
        profile = "crimson_arc",
        scale = 1.06,
        pivotForwardTiles = 1.03,
        handForwardTiles = 0.50,
        mainWidthTiles = 1.68,
        mainHeightTiles = 1.21,
        burstSizeTiles = 1.06,
    },
    ["PRZWeapons.TianLaiJiBan"] = {
        profile = "moon_prism",
        scale = 1.18,
        pivotForwardTiles = 1.64,
        handForwardTiles = 0.50,
        mainWidthTiles = 1.94,
        mainHeightTiles = 1.92,
        stretchIn = 1.24,
    },
    ["PRZWeapons.RanLing"] = {
        profile = "crimson_arc",
        scale = 1.06,
        pivotForwardTiles = 1.03,
        handForwardTiles = 0.50,
        mainWidthTiles = 1.68,
        mainHeightTiles = 1.21,
        burstSizeTiles = 1.06,
    },
    ["PRZWeapons.ChanShiZhe"] = {
        profile = "moon_prism",
        scale = 1.18,
        pivotForwardTiles = 1.64,
        handForwardTiles = 0.50,
        mainWidthTiles = 2.02,
        mainHeightTiles = 1.96,
        stretchIn = 1.26,
    },
    ["PRZWeapons.OrpheusCradle"] = { profile = "arcane_arc" },
    ["PRZWeapons.StarryThunder"] = {
        profile = "thunder_loop",
        scale = 1.18,
        mainWidthTiles = 2.34,
        mainHeightTiles = 1.24,
        burstSizeTiles = 0.96,
    },
    ["PRZWeapons.SurfingTunes"] = { profile = "surfing_wave_arc", scale = 0.80 },
    ["PRZWeapons.ForestShamanPrayer"] = {
        profile = "abyss_arc",
        burstSequence = "cool",
        scale = 1.80,
        pivotForwardTiles = 1.52,
        handForwardTiles = 0.76,
    },
    ["PRZWeapons.HymnofWindandFlower"] = { profile = "petal_frost" },
    ["PRZWeapons.Rwbyliandao"] = { profile = "blood_comet", scale = 1.30 },
    ["PRZWeapons.Taidao"] = { profile = "amber_fang", scale = 0.80, mainWidthTiles = 2.088, mainHeightTiles = 0.972 },
    ["PRZWeapons.DivinepunishmentKnife"] = { enabled = false },
    ["PRZWeapons.NocturnalEdge"] = {
        profile = "crimson_arc",
        scale = 1.06,
        pivotForwardTiles = 1.03,
        handForwardTiles = 0.50,
        mainWidthTiles = 1.68,
        mainHeightTiles = 1.21,
        burstSizeTiles = 1.06,
    },
    ["PRZWeapons.GlintofClouds"] = {
        profile = "moon_prism",
        scale = 1.50,
        pivotForwardTiles = 1.50,
        handForwardTiles = 0.48,
    },
}

function Config.normalize(x, y)
    local length = math.sqrt(x * x + y * y)
    if length <= 0.0001 then
        return 1.0, 0.0
    end
    return x / length, y / length
end

function Config.getDirectionVector(dir)
    if dir == IsoDirections.N then return 0.0, -1.0 end
    if dir == IsoDirections.NE then return SQRT_HALF, -SQRT_HALF end
    if dir == IsoDirections.E then return 1.0, 0.0 end
    if dir == IsoDirections.SE then return SQRT_HALF, SQRT_HALF end
    if dir == IsoDirections.S then return 0.0, 1.0 end
    if dir == IsoDirections.SW then return -SQRT_HALF, SQRT_HALF end
    if dir == IsoDirections.W then return -1.0, 0.0 end
    if dir == IsoDirections.NW then return -SQRT_HALF, -SQRT_HALF end
    return 1.0, 0.0
end

function Config.getCurveSign(dir)
    if dir == IsoDirections.S or dir == IsoDirections.SW
        or dir == IsoDirections.W or dir == IsoDirections.NW then
        return -1
    end
    return 1
end

function Config.getProfile(profileName)
    if profileName and Config.Profiles[profileName] then
        return Config.Profiles[profileName]
    end
    return Config.Profiles.frost_blade
end

function Config.isEffectsEnabled()
    local sandbox = PRZMeleeSandbox
    if type(sandbox) ~= "table" or type(sandbox.isEnabled) ~= "function" then
        return true
    end

    local ok, enabled = pcall(sandbox.isEnabled)
    return not ok or enabled ~= false
end

function Config.isWeaponGlowActive(weapon)
    if not Config.isEffectsEnabled() then
        return false
    end

    local glowSystem = PRZMeleeNightGlow
    if type(glowSystem) ~= "table" or type(glowSystem.isWeaponSelfLuminous) ~= "function" then
        return false
    end

    local ok, active = pcall(glowSystem.isWeaponSelfLuminous, weapon)
    return ok and active == true
end

function Config.getWeaponBinding(fullType)
    local binding = fullType and Config.Weapons[fullType] or nil
    if not binding or binding.enabled == false then
        return nil
    end

    local profileName = binding.profile
    if not profileName or not Config.Profiles[profileName] then
        return nil
    end

    return binding
end
