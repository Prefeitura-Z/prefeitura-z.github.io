PRZWeaponVFX = PRZWeaponVFX or {}

local Config = {}
PRZWeaponVFX.Config = Config

Config.MODULE = "PRZWeaponVFX"
Config.COMMAND_SPAWN = "SpawnSlash"
Config.MAX_EFFECTS = 18
Config.DURATION = 0.34
Config.APPEAR_DURATION = 0.06
Config.DEBOUNCE_MS = 130
Config.SERVER_DEBOUNCE_MS = 115
Config.SYNC_RADIUS = 35.0
Config.MERGE_WINDOW = 0.08
Config.FOLLOW_DURATION = 0.12
Config.OVERLOAD_THRESHOLD = 10
Config.TEXTURES = { fallback = "media/white.png" }

local ROOT = "media/textures/PRZMeleeSlashVFX/seq/"

local function seq(id, w, h, pattern, firstFrame, lastFrame)
    local paths = {}
    for frame = firstFrame, lastFrame do
        paths[#paths + 1] = ROOT .. id .. "/" .. string.format(pattern, frame)
    end
    return { width = w, height = h, paths = paths }
end

local function col(r, g, b, a)
    return { r = r, g = g, b = b, a = a }
end

local function pal(...)
    return { ... }
end

local function cloneColor(c)
    return col(c.r, c.g, c.b, c.a)
end

Config.MainSequences = {
    ["0018"] = seq("0018", 363, 341, "0018_%d.png", 0, 5),
    ["0023"] = seq("0023", 258, 220, "0023_%d.png", 0, 8),
    ["0035"] = seq("0035", 826, 572, "0276_%02d.png", 15, 21),
    ["0053"] = seq("0053", 977, 490, "491-1-attack_%02d.png", 10, 21),
    ["0140"] = seq("0140", 1068, 454, "skeleton-atk2_%02d.png", 10, 28),
    ["0141"] = seq("0141", 928, 496, "skeleton-atk3_%02d.png", 10, 27),
    ["0143"] = seq("0143", 1161, 564, "skeleton-akt1_%02d.png", 10, 27),
    ["0143M"] = seq("0143M", 1161, 564, "skeleton-akt1_%02d.png", 10, 27),
    ["0146"] = seq("0146", 515, 336, "0146_%d.png", 13, 27),
    ["0164"] = seq("0164", 372, 248, "0164_%d.png", 0, 7),
    ["0292"] = seq("0292", 351, 257, "0292_%02d.png", 0, 12),
    ["0468"] = seq("0468", 377, 370, "0468_%02d.png", 0, 11),
    ["0479"] = seq("0479", 392, 357, "0479_%d.png", 10, 20),
}

Config.BurstSequences = {
    cool = seq("0015", 252, 212, "0015_%d.png", 0, 8),
    warm = seq("0492", 347, 283, "0492_%02d.png", 0, 10),
    arcane = seq("0186", 364, 363, "0186_%d.png", 0, 7),
}

local THEMES = {
    crimson = { mainGlow = col(1.00, 0.93, 0.93, 0.40), mainCore = col(1.00, 0.98, 0.98, 0.95), burst = col(1.00, 0.38, 0.30, 0.88), burstSequence = "warm" },
    frost   = { mainGlow = col(0.95, 0.99, 1.00, 0.40), mainCore = col(1.00, 1.00, 1.00, 0.95), burst = col(0.82, 0.96, 1.00, 0.88), burstSequence = "cool" },
    arcane  = { mainGlow = col(0.97, 0.93, 1.00, 0.40), mainCore = col(1.00, 0.99, 1.00, 0.95), burst = col(0.90, 0.72, 1.00, 0.88), burstSequence = "arcane" },
    solar   = { mainGlow = col(1.00, 0.97, 0.88, 0.40), mainCore = col(1.00, 0.99, 0.94, 0.95), burst = col(1.00, 0.84, 0.34, 0.88), burstSequence = "warm" },
    toxic   = { mainGlow = col(0.85, 1.00, 0.88, 0.38), mainCore = col(0.96, 1.00, 0.97, 0.94), burst = col(0.34, 1.00, 0.50, 0.84), burstSequence = "cool" },
    iron    = { mainGlow = col(0.92, 0.94, 0.97, 0.30), mainCore = col(0.98, 0.99, 1.00, 0.90), burst = col(0.82, 0.88, 0.96, 0.80), burstSequence = "cool" },
}

local PAL_CRIMSON = pal(col(1.00,0.35,0.25,0.88), col(1.00,0.56,0.30,0.88), col(1.00,0.74,0.36,0.86), col(1.00,0.88,0.58,0.82))
local PAL_STORM   = pal(col(0.50,0.82,1.00,0.92), col(0.72,0.92,1.00,0.96), col(1.00,1.00,1.00,0.99), col(0.72,0.92,1.00,0.92))
local PAL_ARCANE  = pal(col(0.82,0.60,1.00,0.86), col(0.94,0.72,1.00,0.90), col(0.76,0.52,1.00,0.84), col(0.96,0.82,1.00,0.88))
local PAL_TOXIC   = pal(col(0.28,1.00,0.44,0.84), col(0.58,1.00,0.40,0.86), col(0.82,1.00,0.56,0.82), col(0.50,1.00,0.48,0.84))
local PAL_GOLD    = pal(col(1.00,0.84,0.26,0.90), col(1.00,0.92,0.46,0.92), col(1.00,0.98,0.72,0.94), col(1.00,0.90,0.40,0.90))
local PAL_IRON    = pal(col(0.78,0.84,0.92,0.78), col(0.88,0.92,0.98,0.84), col(0.68,0.76,0.88,0.76), col(0.92,0.96,1.00,0.86))

local function buildThemeBinding(profileName, scale, themeName, extra)
    local theme = THEMES[themeName] or THEMES.frost
    local binding = {
        profile = profileName,
        scale = scale,
        mainGlow = cloneColor(theme.mainGlow),
        mainCore = cloneColor(theme.mainCore),
        burst = cloneColor(theme.burst),
        burstSequence = theme.burstSequence,
    }
    if extra then
        for key, value in pairs(extra) do
            binding[key] = value
        end
    end
    return binding
end

Config.Profiles = {
    shortblade_stab = {
        mainSequence = "0018", burstSequence = "cool", duration = 0.22, vfxDelayMs = 145,
        mainGlow = col(1,1,1,0.32), mainCore = col(1,1,1,0.90), burst = col(1,1,1,0.76),
        mainAnchorZ = 0.38, burstAnchorZ = 0.44,
        pivotForwardTiles = 0.60, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.16, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.76, handLateralTiles = 0.00,
        mainWidthTiles = 0.92, mainHeightTiles = 0.54,
        mainGlowScale = 1.04, mainCoreScale = 0.92,
        scaleIn = 1.06, scaleOut = 0.88, stretchIn = 1.02,
        angleBiasDeg = 0, burstSizeTiles = 0.50, burstLifePortion = 0.44, burstAngleOffsetDeg = 0,
        followDuration = 0.10,
    },
    shortblade_slash = {
        mainSequence = "0023", burstSequence = "warm", duration = 0.24, vfxDelayMs = 175,
        mainGlow = col(1,1,1,0.34), mainCore = col(1,1,1,0.92), burst = col(1,1,1,0.78),
        mainAnchorZ = 0.38, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.56, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.06, mainLateralOffsetTiles = 0.04,
        handForwardTiles = 0.54, handLateralTiles = 0.04,
        mainWidthTiles = 1.08, mainHeightTiles = 0.74,
        mainGlowScale = 1.08, mainCoreScale = 0.92,
        scaleIn = 1.12, scaleOut = 0.86, stretchIn = 1.02,
        angleBiasDeg = 8, burstSizeTiles = 0.56, burstLifePortion = 0.48, burstAngleOffsetDeg = -8,
        followDuration = 0.10,
    },
    smallblunt_impact = {
        mainSequence = "0140", burstSequence = "arcane", duration = 0.20, vfxDelayMs = 210,
        mainGlow = col(1,1,1,0.24), mainCore = col(1,1,1,0.74), burst = col(1,1,1,0.96),
        mainAnchorZ = 0.38, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.46, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.00, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.86, handLateralTiles = 0.00,
        mainWidthTiles = 0.54, mainHeightTiles = 0.40,
        mainGlowScale = 1.00, mainCoreScale = 0.88,
        scaleIn = 1.00, scaleOut = 0.76, stretchIn = 0.84,
        angleBiasDeg = 0, burstSizeTiles = 1.00, burstLifePortion = 0.74, burstAngleOffsetDeg = 0,
        followDuration = 0.08,
    },
    hammer_shock = {
        mainSequence = "0141", burstSequence = "cool", duration = 0.23, vfxDelayMs = 230,
        mainGlow = col(0.92,0.98,1,0.22), mainCore = col(1,1,1,0.78), burst = col(0.78,0.94,1,0.98),
        mainAnchorZ = 0.38, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.48, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.98, handLateralTiles = 0.00,
        mainWidthTiles = 0.72, mainHeightTiles = 0.42,
        mainGlowScale = 1.02, mainCoreScale = 0.90,
        scaleIn = 1.00, scaleOut = 0.76, stretchIn = 0.92,
        angleBiasDeg = 0, burstSizeTiles = 1.16, burstLifePortion = 0.76, burstAngleOffsetDeg = 0,
        followDuration = 0.08,
    },
    mace_burst = {
        mainSequence = "0053", burstSequence = "arcane", duration = 0.25, vfxDelayMs = 285,
        mainGlow = col(1,1,1,0.26), mainCore = col(1,1,1,0.82), burst = col(1,1,1,0.96),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.52, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.02, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.80, handLateralTiles = 0.00,
        mainWidthTiles = 0.80, mainHeightTiles = 0.56,
        mainGlowScale = 1.02, mainCoreScale = 0.90,
        scaleIn = 1.04, scaleOut = 0.78, stretchIn = 0.88,
        angleBiasDeg = 2, burstSizeTiles = 1.18, burstLifePortion = 0.78, burstAngleOffsetDeg = 0,
        followDuration = 0.09,
    },
    staff_pulse = {
        mainSequence = "0479", burstSequence = "cool", duration = 0.24, vfxDelayMs = 255,
        mainGlow = col(1,1,1,0.28), mainCore = col(1,1,1,0.82), burst = col(1,1,1,0.86),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.68, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.18, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.06, handLateralTiles = 0.00,
        mainWidthTiles = 1.42, mainHeightTiles = 0.50,
        mainGlowScale = 1.02, mainCoreScale = 0.90,
        scaleIn = 1.02, scaleOut = 0.80, stretchIn = 0.94,
        angleBiasDeg = 0, burstSizeTiles = 0.72, burstLifePortion = 0.52, burstAngleOffsetDeg = 0,
        followDuration = 0.09,
    },
    axe_cleave = {
        mainSequence = "0292", burstSequence = "warm", duration = 0.28, vfxDelayMs = 235,
        mainGlow = col(1,1,1,0.36), mainCore = col(1,1,1,0.92), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.56, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.08, mainLateralOffsetTiles = 0.04,
        handForwardTiles = 0.60, handLateralTiles = 0.03,
        mainWidthTiles = 1.22, mainHeightTiles = 1.00,
        mainGlowScale = 1.10, mainCoreScale = 0.93,
        scaleIn = 1.16, scaleOut = 0.84, stretchIn = 0.98,
        angleBiasDeg = 20, burstSizeTiles = 0.82, burstLifePortion = 0.52, burstAngleOffsetDeg = -10,
        followDuration = 0.10,
    },
    axe_heavy = {
        mainSequence = "0146", burstSequence = "warm", duration = 0.31, vfxDelayMs = 285,
        mainGlow = col(1,1,1,0.40), mainCore = col(1,1,1,0.94), burst = col(1,1,1,0.86),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.64, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.06,
        handForwardTiles = 0.66, handLateralTiles = 0.04,
        mainWidthTiles = 1.44, mainHeightTiles = 1.16,
        mainGlowScale = 1.02, mainCoreScale = 0.88,
        scaleIn = 1.18, scaleOut = 0.84, stretchIn = 1.00,
        angleBiasDeg = 18, burstSizeTiles = 0.90, burstLifePortion = 0.54, burstAngleOffsetDeg = -8,
        followDuration = 0.11,
    },
    polearm_thrust = {
        mainSequence = "0479", burstSequence = "cool", duration = 0.27, vfxDelayMs = 225,
        mainGlow = col(1,1,1,0.36), mainCore = col(1,1,1,0.92), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.39, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.76, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.26, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.18, handLateralTiles = 0.00,
        mainWidthTiles = 1.96, mainHeightTiles = 0.54,
        mainGlowScale = 1.06, mainCoreScale = 0.90,
        scaleIn = 1.08, scaleOut = 0.86, stretchIn = 0.90,
        angleBiasDeg = 0, burstSizeTiles = 0.58, burstLifePortion = 0.48, burstAngleOffsetDeg = 0,
        followDuration = 0.10,
    },
    polearm_sweep = {
        mainSequence = "0035", burstSequence = "cool", duration = 0.30, vfxDelayMs = 255,
        mainGlow = col(1,1,1,0.38), mainCore = col(1,1,1,0.94), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.72, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.08,
        handForwardTiles = 0.96, handLateralTiles = 0.02,
        mainWidthTiles = 1.62, mainHeightTiles = 1.04,
        mainGlowScale = 1.02, mainCoreScale = 0.93,
        scaleIn = 1.16, scaleOut = 0.84, stretchIn = 1.02,
        angleBiasDeg = 8, burstSizeTiles = 0.76, burstLifePortion = 0.52, burstAngleOffsetDeg = -8,
        followDuration = 0.11,
    },
    longblade_duelist = {
        mainSequence = "0023", burstSequence = "cool", duration = 0.28, vfxDelayMs = 220,
        mainGlow = col(1,1,1,0.38), mainCore = col(1,1,1,0.94), burst = col(1,1,1,0.80),
        mainAnchorZ = 0.39, burstAnchorZ = 0.47,
        pivotForwardTiles = 0.68, pivotLateralTiles = 0.04,
        mainForwardOffsetTiles = 0.04, mainLateralOffsetTiles = 0.03,
        handForwardTiles = 0.31, handLateralTiles = 0.07,
        mainWidthTiles = 1.44, mainHeightTiles = 1.00,
        mainGlowScale = 1.14, mainCoreScale = 0.88,
        scaleIn = 1.20, scaleOut = 0.84, stretchIn = 1.10,
        angleBiasDeg = 9, burstSizeTiles = 0.78, burstLifePortion = 0.54, burstAngleOffsetDeg = -15,
        followDuration = 0.12,
    },
    longblade_heavy = {
        mainSequence = "0143", burstSequence = "warm", duration = 0.34, vfxDelayMs = 305,
        mainGlow = col(1,1,1,0.42), mainCore = col(1,1,1,0.96), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.39, burstAnchorZ = 0.47,
        pivotForwardTiles = 0.66, pivotLateralTiles = 0.05,
        mainForwardOffsetTiles = 0.08, mainLateralOffsetTiles = 0.08,
        handForwardTiles = 0.34, handLateralTiles = 0.08,
        mainWidthTiles = 1.88, mainHeightTiles = 1.48,
        mainGlowScale = 1.16, mainCoreScale = 0.95,
        scaleIn = 1.24, scaleOut = 0.86, stretchIn = 1.18,
        angleBiasDeg = 12, burstSizeTiles = 0.96, burstLifePortion = 0.56, burstAngleOffsetDeg = -16,
        followDuration = 0.12,
    },
    longblade_arc = {
        mainSequence = "0164", burstSequence = "warm", duration = 0.32, vfxDelayMs = 275,
        mainGlow = col(1,1,1,0.40), mainCore = col(1,1,1,0.94), burst = col(1,1,1,0.82),
        mainAnchorZ = 0.39, burstAnchorZ = 0.47,
        pivotForwardTiles = 0.66, pivotLateralTiles = 0.05,
        mainForwardOffsetTiles = 0.06, mainLateralOffsetTiles = 0.08,
        handForwardTiles = 0.32, handLateralTiles = 0.08,
        mainWidthTiles = 1.72, mainHeightTiles = 1.40,
        mainGlowScale = 1.16, mainCoreScale = 0.95,
        scaleIn = 1.24, scaleOut = 0.86, stretchIn = 1.22,
        angleBiasDeg = 13, burstSizeTiles = 0.92, burstLifePortion = 0.56, burstAngleOffsetDeg = -18,
        followDuration = 0.12,
    },

    bat_impact = {
        mainSequence = "0140", burstSequence = "cool", duration = 0.24, vfxDelayMs = 245,
        mainGlow = col(1,1,1,0.28), mainCore = col(1,1,1,0.82), burst = col(1,1,1,0.90),
        mainAnchorZ = 0.39, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.66, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.12, mainLateralOffsetTiles = 0.03,
        handForwardTiles = 0.98, handLateralTiles = 0.02,
        mainWidthTiles = 1.02, mainHeightTiles = 0.46,
        mainGlowScale = 1.06, mainCoreScale = 0.90,
        scaleIn = 1.08, scaleOut = 0.82, stretchIn = 0.94,
        angleBiasDeg = 7, burstSizeTiles = 0.92, burstLifePortion = 0.66, burstAngleOffsetDeg = -4,
        followDuration = 0.09,
    },
    bat_arcane = {
        mainSequence = "0053", burstSequence = "arcane", duration = 0.26, vfxDelayMs = 250,
        mainGlow = col(1,1,1,0.30), mainCore = col(1,1,1,0.86), burst = col(1,1,1,0.94),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.68, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.03,
        handForwardTiles = 1.02, handLateralTiles = 0.02,
        mainWidthTiles = 1.28, mainHeightTiles = 0.62,
        mainGlowScale = 1.08, mainCoreScale = 0.92,
        scaleIn = 1.10, scaleOut = 0.82, stretchIn = 0.94,
        angleBiasDeg = 5, burstSizeTiles = 1.02, burstLifePortion = 0.70, burstAngleOffsetDeg = 0,
        followDuration = 0.09,
    },
    great_blunt_impact = {
        mainSequence = "0141", burstSequence = "warm", duration = 0.28, vfxDelayMs = 315,
        mainGlow = col(1,1,1,0.20), mainCore = col(1,1,1,0.72), burst = col(1,1,1,1.00),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.66, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.18, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.16, handLateralTiles = 0.00,
        mainWidthTiles = 0.92, mainHeightTiles = 0.46,
        mainGlowScale = 1.00, mainCoreScale = 0.88,
        scaleIn = 1.02, scaleOut = 0.74, stretchIn = 0.84,
        angleBiasDeg = 0, burstSizeTiles = 1.46, burstLifePortion = 0.80, burstAngleOffsetDeg = 0,
        followDuration = 0.09,
    },
    staff_long = {
        mainSequence = "0479", burstSequence = "cool", duration = 0.26, vfxDelayMs = 255,
        mainGlow = col(1,1,1,0.24), mainCore = col(1,1,1,0.82), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.39, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.84, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.26, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.34, handLateralTiles = 0.00,
        mainWidthTiles = 1.88, mainHeightTiles = 0.36,
        mainGlowScale = 1.02, mainCoreScale = 0.90,
        scaleIn = 1.04, scaleOut = 0.82, stretchIn = 0.90,
        angleBiasDeg = 0, burstSizeTiles = 0.64, burstLifePortion = 0.50, burstAngleOffsetDeg = 0,
        followDuration = 0.10,
    },
    bat_supreme_arc = {
        mainSequence = "0143", burstSequence = "warm", duration = 0.28, vfxDelayMs = 238,
        mainGlow = col(1,1,1,0.40), mainCore = col(1,1,1,0.95), burst = col(1,1,1,0.88),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.56, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.02, mainLateralOffsetTiles = 0.03,
        handForwardTiles = 0.80, handLateralTiles = 0.02,
        mainWidthTiles = 1.02, mainHeightTiles = 0.74,
        mainGlowScale = 1.02, mainCoreScale = 0.88,
        scaleIn = 1.20, scaleOut = 0.84, stretchIn = 1.04,
        angleBiasDeg = 8, burstSizeTiles = 0.74, burstLifePortion = 0.54, burstAngleOffsetDeg = -10,
        followDuration = 0.10,
    },

    -- 2.5.0 - Perfis de polimento por familia (fit visual + intensidade por raridade)
    bat_fast_polish = {
        mainSequence = "0140", burstSequence = "cool", duration = 0.20, vfxDelayMs = 225,
        mainGlow = col(1,1,1,0.20), mainCore = col(1,1,1,0.76), burst = col(1,1,1,0.76),
        mainAnchorZ = 0.39, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.62, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.08, mainLateralOffsetTiles = 0.02,
        handForwardTiles = 1.00, handLateralTiles = 0.02,
        mainWidthTiles = 1.05, mainHeightTiles = 0.36,
        mainGlowScale = 1.04, mainCoreScale = 0.90,
        scaleIn = 1.06, scaleOut = 0.84, stretchIn = 0.94,
        angleBiasDeg = 5, burstSizeTiles = 0.66, burstLifePortion = 0.58, burstAngleOffsetDeg = -4,
        followDuration = 0.08,
    },
    bat_heavy_polish = {
        mainSequence = "0140", burstSequence = "warm", duration = 0.23, vfxDelayMs = 245,
        mainGlow = col(1,1,1,0.24), mainCore = col(1,1,1,0.82), burst = col(1,1,1,0.88),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.68, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.02,
        handForwardTiles = 1.08, handLateralTiles = 0.02,
        mainWidthTiles = 1.12, mainHeightTiles = 0.42,
        mainGlowScale = 1.06, mainCoreScale = 0.90,
        scaleIn = 1.08, scaleOut = 0.80, stretchIn = 0.94,
        angleBiasDeg = 6, burstSizeTiles = 0.82, burstLifePortion = 0.66, burstAngleOffsetDeg = -4,
        followDuration = 0.09,
    },
    bat_signature = {
        mainSequence = "0141", burstSequence = "warm", duration = 0.24, vfxDelayMs = 242,
        mainGlow = col(1,1,1,0.26), mainCore = col(1,1,1,0.88), burst = col(1,1,1,0.94),
        mainAnchorZ = 0.40, burstAnchorZ = 0.47,
        pivotForwardTiles = 0.72, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.14, handLateralTiles = 0.00,
        mainWidthTiles = 1.34, mainHeightTiles = 0.58,
        mainGlowScale = 1.08, mainCoreScale = 0.92,
        scaleIn = 1.10, scaleOut = 0.80, stretchIn = 0.96,
        angleBiasDeg = 4, burstSizeTiles = 1.00, burstLifePortion = 0.70, burstAngleOffsetDeg = 0,
        mainFlipX = true, burstFlipX = true,
        followDuration = 0.09,
    },
    axe_quick_polish = {
        mainSequence = "0292", burstSequence = "warm", duration = 0.24, vfxDelayMs = 225,
        mainGlow = col(1,1,1,0.30), mainCore = col(1,1,1,0.88), burst = col(1,1,1,0.82),
        mainAnchorZ = 0.39, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.56, pivotLateralTiles = 0.02,
        mainForwardOffsetTiles = 0.06, mainLateralOffsetTiles = 0.03,
        handForwardTiles = 0.66, handLateralTiles = 0.03,
        mainWidthTiles = 1.10, mainHeightTiles = 0.82,
        mainGlowScale = 1.06, mainCoreScale = 0.91,
        scaleIn = 1.12, scaleOut = 0.84, stretchIn = 0.98,
        angleBiasDeg = 17, burstSizeTiles = 0.72, burstLifePortion = 0.50, burstAngleOffsetDeg = -8,
        followDuration = 0.09,
    },
    axe_colossal_polish = {
        mainSequence = "0292", burstSequence = "warm", duration = 0.29, vfxDelayMs = 270,
        mainGlow = col(1,1,1,0.36), mainCore = col(1,1,1,0.94), burst = col(1,1,1,0.90),
        mainAnchorZ = 0.40, burstAnchorZ = 0.47,
        pivotForwardTiles = 0.70, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.10, mainLateralOffsetTiles = 0.05,
        handForwardTiles = 0.82, handLateralTiles = 0.04,
        mainWidthTiles = 1.48, mainHeightTiles = 1.08,
        mainGlowScale = 1.10, mainCoreScale = 0.93,
        scaleIn = 1.18, scaleOut = 0.82, stretchIn = 1.02,
        angleBiasDeg = 17, burstSizeTiles = 0.94, burstLifePortion = 0.56, burstAngleOffsetDeg = -9,
        followDuration = 0.10,
    },
    polearm_thrust_polish = {
        mainSequence = "0140", burstSequence = "cool", duration = 0.20, vfxDelayMs = 210,
        mainGlow = col(1,1,1,0.18), mainCore = col(1,1,1,0.80), burst = col(1,1,1,0.84),
        mainAnchorZ = 0.40, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.90, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.32, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 1.46, handLateralTiles = 0.00,
        mainWidthTiles = 2.05, mainHeightTiles = 0.26,
        mainGlowScale = 1.02, mainCoreScale = 0.90,
        scaleIn = 1.04, scaleOut = 0.88, stretchIn = 0.90,
        angleBiasDeg = 0, burstSizeTiles = 0.52, burstLifePortion = 0.46, burstAngleOffsetDeg = 0,
        followDuration = 0.08,
    },
    polearm_sweep_polish = {
        mainSequence = "0035", burstSequence = "cool", duration = 0.27, vfxDelayMs = 245,
        mainGlow = col(1,1,1,0.30), mainCore = col(1,1,1,0.90), burst = col(1,1,1,0.82),
        mainAnchorZ = 0.40, burstAnchorZ = 0.46,
        pivotForwardTiles = 0.78, pivotLateralTiles = 0.03,
        mainForwardOffsetTiles = 0.14, mainLateralOffsetTiles = 0.06,
        handForwardTiles = 1.08, handLateralTiles = 0.02,
        mainWidthTiles = 1.78, mainHeightTiles = 0.86,
        mainGlowScale = 1.04, mainCoreScale = 0.92,
        scaleIn = 1.12, scaleOut = 0.84, stretchIn = 1.00,
        angleBiasDeg = 7, burstSizeTiles = 0.68, burstLifePortion = 0.50, burstAngleOffsetDeg = -7,
        followDuration = 0.10,
    },
    smallblunt_polish = {
        mainSequence = "0141", burstSequence = "cool", duration = 0.19, vfxDelayMs = 195,
        mainGlow = col(1,1,1,0.14), mainCore = col(1,1,1,0.66), burst = col(1,1,1,0.94),
        mainAnchorZ = 0.38, burstAnchorZ = 0.45,
        pivotForwardTiles = 0.44, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.00, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.80, handLateralTiles = 0.00,
        mainWidthTiles = 0.48, mainHeightTiles = 0.30,
        mainGlowScale = 1.00, mainCoreScale = 0.88,
        scaleIn = 1.00, scaleOut = 0.76, stretchIn = 0.82,
        angleBiasDeg = 0, burstSizeTiles = 0.78, burstLifePortion = 0.76, burstAngleOffsetDeg = 0,
        followDuration = 0.07,
    },

    short_fantasy_blunt = {
        mainSequence = "0053", burstSequence = "arcane", duration = 0.22, vfxDelayMs = 205,
        mainGlow = col(1,1,1,0.24), mainCore = col(1,1,1,0.78), burst = col(1,1,1,0.94),
        mainAnchorZ = 0.38, burstAnchorZ = 0.44,
        pivotForwardTiles = 0.50, pivotLateralTiles = 0.00,
        mainForwardOffsetTiles = 0.02, mainLateralOffsetTiles = 0.00,
        handForwardTiles = 0.72, handLateralTiles = 0.00,
        mainWidthTiles = 0.70, mainHeightTiles = 0.48,
        mainGlowScale = 1.02, mainCoreScale = 0.88,
        scaleIn = 1.04, scaleOut = 0.78, stretchIn = 0.86,
        angleBiasDeg = 2, burstSizeTiles = 0.74, burstLifePortion = 0.72, burstAngleOffsetDeg = 0,
        followDuration = 0.08,
    },

}

Config.WeaponBindings = {
    ["PRZWeapons.PunhalDraconico"]     = buildThemeBinding("shortblade_stab", 0.74, "crimson", { burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.DirkDoAbismo"]        = buildThemeBinding("shortblade_stab", 0.74, "arcane",  { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE }),
    ["PRZWeapons.GarraDoCorvo"]        = buildThemeBinding("shortblade_stab", 0.74, "frost",   { burstPalette = PAL_STORM }),
    ["PRZWeapons.PunhoDoTita"]         = buildThemeBinding("smallblunt_impact",0.90, "crimson", { burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.MarteloDoTrovao"]     = buildThemeBinding("hammer_shock",    0.94, "frost",   { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, burstSizeTiles = 1.18 }),
    ["PRZWeapons.CajadoDoLacre"]       = buildThemeBinding("staff_pulse",     1.02, "toxic",   { mainGlowPalette = PAL_TOXIC, burstPalette = PAL_TOXIC }),

    ["PRZWeapons.MachadinhaOnirica"]   = buildThemeBinding("axe_cleave",      0.88, "arcane",  { mainGlowPalette = PAL_ARCANE }),
    ["PRZWeapons.MachadoDoJarl"]       = buildThemeBinding("axe_cleave",      0.88, "frost",   { burstPalette = PAL_STORM }),
    ["PRZWeapons.MachadoCeleste"]      = buildThemeBinding("axe_heavy",       1.04, "frost",   { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),
    ["PRZWeapons.MachadoApostata"]     = buildThemeBinding("axe_heavy",       1.04, "crimson", { burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.JuizoDaFloresta"]     = buildThemeBinding("axe_heavy",       1.04, "toxic",   { burstPalette = PAL_TOXIC }),
    ["PRZWeapons.BaixoDoCarrasco"]     = buildThemeBinding("axe_heavy",       1.08, "arcane",  { mainSequence = "0146", mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.54, mainHeightTiles = 1.24 }),

    ["PRZWeapons.AlabardaDoGeneral"]   = buildThemeBinding("polearm_sweep",   1.20, "crimson", { burstPalette = PAL_CRIMSON, pivotForwardTiles = 0.90, mainForwardOffsetTiles = 0.22, handForwardTiles = 1.28, mainWidthTiles = 2.42, mainHeightTiles = 1.20, burstSizeTiles = 0.74 }),
    ["PRZWeapons.LonginusEscarlate"]   = buildThemeBinding("polearm_thrust",  1.14, "crimson", { burstPalette = PAL_CRIMSON, pivotForwardTiles = 0.84, mainForwardOffsetTiles = 0.32, mainWidthTiles = 2.34, handForwardTiles = 1.34 }),
    ["PRZWeapons.CruzDosCaidos"]       = buildThemeBinding("polearm_sweep",   1.12, "arcane",  { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, pivotForwardTiles = 0.82, mainForwardOffsetTiles = 0.16, mainWidthTiles = 2.08, handForwardTiles = 1.12 }),
    ["PRZWeapons.GlaiveDaMare"]        = buildThemeBinding("polearm_sweep",   1.12, "frost",   { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, pivotForwardTiles = 0.82, mainForwardOffsetTiles = 0.16, mainWidthTiles = 2.02, handForwardTiles = 1.12 }),
    ["PRZWeapons.GungnirDourada"]      = buildThemeBinding("polearm_thrust",  1.16, "solar",   { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, burstSequence = "warm", pivotForwardTiles = 0.86, mainForwardOffsetTiles = 0.34, mainWidthTiles = 2.40, handForwardTiles = 1.38 }),
    ["PRZWeapons.MataDragoes"]         = buildThemeBinding("longblade_heavy", 1.04, "crimson", { mainSequence = "0143M", mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 2.04, mainHeightTiles = 1.60, burstSizeTiles = 1.00 }),
    ["PRZWeapons.SolidaoEterna"]       = buildThemeBinding("longblade_arc",   0.98, "frost",   { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainSequence = "0140" }),
    ["PRZWeapons.ZangetsuSombria"]     = buildThemeBinding("longblade_heavy", 0.98, "arcane",  { mainSequence = "0053", mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.72, mainHeightTiles = 1.28 }),
    ["PRZWeapons.GramDoPrestigio"]     = buildThemeBinding("longblade_arc",   1.00, "solar",   { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, mainSequence = "0146" }),
    ["PRZWeapons.TyrfingRubra"]        = buildThemeBinding("longblade_duelist",0.88, "crimson", { burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.PresaDeJormungandr"]  = buildThemeBinding("longblade_duelist",0.88, "toxic",   { burstPalette = PAL_TOXIC }),

    -- 1.1.0 - Tacos e contundentes premium
    ["PRZWeapons.TacoEstelarVioleta"] = buildThemeBinding("bat_fast_polish", 1.00, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.04, burstSizeTiles = 0.62 }),
    ["PRZWeapons.TacoCerimonialAureum"] = buildThemeBinding("bat_fast_polish", 1.00, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, burstSequence = "warm", mainWidthTiles = 1.05, burstSizeTiles = 0.66 }),
    ["PRZWeapons.TacoTitanioDinamico"] = buildThemeBinding("bat_heavy_polish", 1.00, "iron", { mainGlowPalette = PAL_IRON, burstPalette = PAL_STORM, mainWidthTiles = 1.34, burstSizeTiles = 0.84 }),
    ["PRZWeapons.TacoCarbonoVertice"] = buildThemeBinding("bat_fast_polish", 1.00, "crimson", { mainGlowPalette = PAL_IRON, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.13, burstSizeTiles = 0.64 }),
    ["PRZWeapons.TacoDoMotim"] = buildThemeBinding("bat_heavy_polish", 0.96, "iron", { mainGlowPalette = PAL_IRON, burstPalette = PAL_IRON, mainWidthTiles = 1.11, burstSizeTiles = 0.72 }),
    ["PRZWeapons.TacoDoCerco"] = buildThemeBinding("bat_heavy_polish", 1.02, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.11, burstSizeTiles = 0.86 }),
    ["PRZWeapons.TacoSupremoZ"] = buildThemeBinding("bat_signature", 1.04, "crimson", { mainGlowPalette = PAL_CRIMSON, mainCorePalette = PAL_CRIMSON, burstPalette = PAL_GOLD, mainWidthTiles = 1.36, mainHeightTiles = 0.60, handForwardTiles = 1.16, pivotForwardTiles = 0.74, burstSizeTiles = 1.04, mainFlipX = true, burstFlipX = true }),
    ["PRZWeapons.TacoBambuKitsune"] = buildThemeBinding("bat_fast_polish", 1.00, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.22, burstSizeTiles = 0.66 }),
    ["PRZWeapons.CetroRubroArcano"]      = buildThemeBinding("staff_long",         1.04, "crimson", { mainSequence = "0479", mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_ARCANE, mainWidthTiles = 1.48, mainHeightTiles = 0.38, handForwardTiles = 1.08, burstSizeTiles = 0.60 }),
    ["PRZWeapons.MarteloHexagrama"]      = buildThemeBinding("great_blunt_impact", 1.20, "arcane",  { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainSequence = "0141", burstSizeTiles = 1.54, mainWidthTiles = 0.98 }),
    ["PRZWeapons.CetroHarmonico"]        = buildThemeBinding("short_fantasy_blunt",0.96, "frost",   { mainGlowPalette = PAL_STORM, burstPalette = PAL_ARCANE }),


    -- 2.0.0 - Arsenal refatorado com modelos não-vanilla selecionados
    ["PRZWeapons.MachadoTempestadeAbsoluta"] = buildThemeBinding("axe_quick_polish", 0.96, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainWidthTiles = 1.12 }),
    ["PRZWeapons.MachadoPangu"] = buildThemeBinding("axe_colossal_polish", 1.08, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, mainWidthTiles = 1.56, burstSizeTiles = 1.02 }),
    ["PRZWeapons.MachadoHongling"] = buildThemeBinding("axe_colossal_polish", 1.02, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.44 }),
    ["PRZWeapons.BorboletaNebulosa"] = buildThemeBinding("shortblade_slash", 0.78, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE }),
    ["PRZWeapons.PunhalCastigoDivino"] = buildThemeBinding("shortblade_stab", 0.78, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),
    ["PRZWeapons.LancaPrisma"] = buildThemeBinding("polearm_thrust_polish", 1.04, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 2.12 }),
    ["PRZWeapons.LancaBrasaPerfurante"] = buildThemeBinding("polearm_thrust_polish", 1.04, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 2.04 }),
    ["PRZWeapons.AlabardaMiragem"] = buildThemeBinding("polearm_sweep_polish", 1.04, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.88 }),
    ["PRZWeapons.LancaTrovaoFurioso"] = buildThemeBinding("polearm_thrust_polish", 1.04, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainWidthTiles = 2.12 }),
    ["PRZWeapons.MachadoGlacialLaura"] = buildThemeBinding("axe_quick_polish", 0.96, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),
    ["PRZWeapons.VeuInalcancavel"] = buildThemeBinding("staff_long", 1.10, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE }),
    ["PRZWeapons.ReliquiaJadeGelido"] = buildThemeBinding("great_blunt_impact", 1.10, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),
    ["PRZWeapons.ImperadorAbissal"] = buildThemeBinding("great_blunt_impact", 1.10, "toxic", { mainGlowPalette = PAL_TOXIC, burstPalette = PAL_TOXIC }),
    ["PRZWeapons.MotorDemolicao"] = buildThemeBinding("axe_colossal_polish", 1.06, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, burstSizeTiles = 1.00 }),
    ["PRZWeapons.TerrorNoturno"] = buildThemeBinding("smallblunt_polish", 0.96, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, burstSizeTiles = 0.74 }),
    ["PRZWeapons.CajadoAnubis"] = buildThemeBinding("polearm_sweep_polish", 1.06, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, mainWidthTiles = 1.92 }),
    ["PRZWeapons.MegabatT30"] = buildThemeBinding("bat_heavy_polish", 1.08, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.30, burstSizeTiles = 0.96 }),
    ["PRZWeapons.LancaAzazel"] = buildThemeBinding("polearm_thrust_polish", 1.04, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 2.04 }),
    ["PRZWeapons.AncoraMay"] = buildThemeBinding("axe_colossal_polish", 1.06, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainWidthTiles = 1.52 }),
    ["PRZWeapons.MarteloJustica"] = buildThemeBinding("smallblunt_polish", 1.00, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, burstSequence = "warm", burstSizeTiles = 0.82 }),
    ["PRZWeapons.MachadoReiDemonio"] = buildThemeBinding("axe_colossal_polish", 1.06, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 1.52 }),
    ["PRZWeapons.CruzProfana"] = buildThemeBinding("polearm_sweep_polish", 1.04, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.86 }),
    ["PRZWeapons.LancaInfernal"] = buildThemeBinding("polearm_thrust_polish", 1.04, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON, mainWidthTiles = 2.06 }),
    ["PRZWeapons.BrocaEscavacao"] = buildThemeBinding("smallblunt_polish", 1.00, "iron", { mainGlowPalette = PAL_IRON, burstPalette = PAL_IRON, burstSizeTiles = 0.80 }),
    ["PRZWeapons.AdagaRefud"] = buildThemeBinding("shortblade_slash", 0.78, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.TridentePoseidon"] = buildThemeBinding("polearm_sweep_polish", 1.06, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainWidthTiles = 1.92 }),
    ["PRZWeapons.MachadoLeviata"] = buildThemeBinding("axe_colossal_polish", 1.08, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainWidthTiles = 1.58, burstSizeTiles = 1.02 }),
    ["PRZWeapons.FoiceDaDama"] = buildThemeBinding("axe_colossal_polish", 1.00, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE, mainWidthTiles = 1.50, mainHeightTiles = 1.00, angleBiasDeg = 13 }),
    ["PRZWeapons.GuitarraRockstar"] = buildThemeBinding("great_blunt_impact", 1.10, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_CRIMSON }),
    ["PRZWeapons.BastaoMythril"] = buildThemeBinding("staff_long", 1.10, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),

    ["PRZWeapons.EspadaPortaoDoTempo"] = buildThemeBinding("longblade_duelist", 0.96, "frost", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM }),
    ["PRZWeapons.EspadaCavaleiroAstral"] = buildThemeBinding("longblade_duelist", 0.98, "solar", { mainGlowPalette = PAL_GOLD, burstPalette = PAL_GOLD, burstSequence = "warm" }),
    ["PRZWeapons.LaminaArcanaCrepuscular"] = buildThemeBinding("longblade_arc", 0.98, "arcane", { mainGlowPalette = PAL_ARCANE, burstPalette = PAL_ARCANE }),
    ["PRZWeapons.LaminaDoJulgamento"] = buildThemeBinding("longblade_heavy", 1.02, "crimson", { mainGlowPalette = PAL_CRIMSON, burstPalette = PAL_GOLD, burstSequence = "warm", mainWidthTiles = 1.82 }),
    ["PRZWeapons.EspadaCavaleiroFantasma"] = buildThemeBinding("longblade_arc", 0.96, "iron", { mainGlowPalette = PAL_STORM, burstPalette = PAL_STORM, mainSequence = "0140" }),
    ["PRZWeapons.EspadaBastardaClassica"] = buildThemeBinding("longblade_duelist", 0.96, "iron", { mainGlowPalette = PAL_IRON, burstPalette = PAL_IRON }),
}



Config.GlowBindings = {
    ["PRZWeapons.TyrfingRubra"] = { r = 1, g = 0.25, b = 0.28, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.PunhalCastigoDivino"] = { r = 0.3, g = 0.65, b = 1, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.TacoSupremoZ"] = { r = 1, g = 0.4, b = 0.3, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.MarteloDoTrovao"] = { r = 0.3, g = 0.6, b = 1, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.MachadoLeviata"] = { r = 0.4, g = 0.8, b = 1, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.TridentePoseidon"] = { r = 0.4, g = 0.85, b = 1, radius = 3, life = 0.18, count = 3, spacing = 0.20 },
    ["PRZWeapons.DirkDoAbismo"]          = { r = 0.78, g = 0.56, b = 1.00, radius = 3, life = 0.16, count = 3, spacing = 0.18 },
    ["PRZWeapons.GarraDoCorvo"]          = { r = 0.60, g = 0.85, b = 1.00, radius = 3, life = 0.16, count = 3, spacing = 0.18 },
    ["PRZWeapons.BorboletaNebulosa"]     = { r = 0.82, g = 0.58, b = 1.00, radius = 3, life = 0.16, count = 3, spacing = 0.18 },
    ["PRZWeapons.AdagaRefud"]            = { r = 1.00, g = 0.42, b = 0.35, radius = 3, life = 0.16, count = 3, spacing = 0.18 },
    ["PRZWeapons.EspadaPortaoDoTempo"]   = { r = 0.62, g = 0.90, b = 1.00, radius = 4, life = 0.20, count = 4, spacing = 0.22 },
    ["PRZWeapons.EspadaCavaleiroAstral"] = { r = 1.00, g = 0.86, b = 0.34, radius = 4, life = 0.20, count = 4, spacing = 0.22 },
    ["PRZWeapons.LaminaArcanaCrepuscular"] = { r = 0.84, g = 0.60, b = 1.00, radius = 4, life = 0.20, count = 4, spacing = 0.22 },
    ["PRZWeapons.LaminaDoJulgamento"]    = { r = 1.00, g = 0.42, b = 0.35, radius = 5, life = 0.22, count = 4, spacing = 0.24 },
    ["PRZWeapons.EspadaCavaleiroFantasma"] = { r = 0.74, g = 0.86, b = 1.00, radius = 4, life = 0.20, count = 4, spacing = 0.22 },
    ["PRZWeapons.EspadaBastardaClassica"] = { r = 0.82, g = 0.88, b = 0.98, radius = 4, life = 0.20, count = 4, spacing = 0.22 },
}

function Config.getWeaponBinding(fullType)
    local binding = Config.WeaponBindings[fullType]
    if not binding or not Config.Profiles[binding.profile] then
        return nil
    end
    return binding
end

function Config.getProfile(name)
    return Config.Profiles[name] or Config.Profiles.longblade_arc
end

function Config.getGlowBinding(fullType)
    return Config.GlowBindings[fullType]
end

function Config.normalize(x, y)
    local length = math.sqrt(x * x + y * y)
    if length < 0.0001 then return 1, 0 end
    return x / length, y / length
end

function Config.getDirectionVector(direction)
    if direction == IsoDirections.N then return 0, -1
    elseif direction == IsoDirections.NE then return 0.70710678, -0.70710678
    elseif direction == IsoDirections.E then return 1, 0
    elseif direction == IsoDirections.SE then return 0.70710678, 0.70710678
    elseif direction == IsoDirections.S then return 0, 1
    elseif direction == IsoDirections.SW then return -0.70710678, 0.70710678
    elseif direction == IsoDirections.W then return -1, 0
    elseif direction == IsoDirections.NW then return -0.70710678, -0.70710678 end
    return 1, 0
end

function Config.getCurveSign(direction)
    if direction == IsoDirections.S or direction == IsoDirections.SW or direction == IsoDirections.W or direction == IsoDirections.NW then
        return -1
    end
    return 1
end

function Config.isWeaponGlowActive(weapon)
    return weapon and Config.getWeaponBinding(weapon:getFullType()) ~= nil
end
