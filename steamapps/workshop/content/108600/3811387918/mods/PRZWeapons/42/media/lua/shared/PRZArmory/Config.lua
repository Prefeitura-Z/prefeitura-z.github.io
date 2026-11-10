PRZArmory = PRZArmory or {}

-- Gameplay prototype values. Distances are tiles, times are unpaused real seconds.
-- User-facing knobs live here; no dependency on another mod or ModOptions.
PRZArmory.Config = {
    version = "3.2.0",
    effectsEnabled = true,
    axeRageKills = 25,
    maxEnergy = 100, -- legacy meter migration only; BALROG uses stored counts
    specialKey = "G", -- Keyboard.KEY_<name>, e.g. G, V, B
    testKit = false, -- deprecated debug kits are unavailable in normal play
    maxTargets = 64,
    maxBurning = 96,
    maxStunned = 96,
    burnInterval = 0.5,
    holyShotSeconds = 1,
    cannonReloadSeconds = 3.5,
    waterPerShot = 0.01, -- litres: 10 mL
    weapons = {




        ["PRZWeapons.OmegaAS50Gold"] = { expansion=true, newpack=true, kind="sniperauto", iconName="AS50Gold", shotSeconds=1, penetration=8 },
        ["PRZWeapons.OmegaMG36Xmas"] = { expansion=true, newpack=true, kind="machinegun", iconName="MG36Xmas", penetration=1 },
        ["PRZWeapons.OmegaGatling"] = { expansion=true, newpack=true, kind="gatling", iconName="Gatling", shotSeconds=.2, freeAmmoChance=20, penetration=5 },

        ["PRZWeapons.OmegaJanus7"] = { expansion=true, newpack=true, kind="janus7", iconName="Janus7", penetration=3,
            chargeHits=50, electricSeconds=8, pulseSeconds=.20, electricRange=60, electricDamage=.20, electricTargets=3,
            transformSeconds=61/30, revertSeconds=51/30, baseSprite="PRZArmoryJanus7", electricSprite="PRZArmoryJanus7Electric" },



        ["PRZWeapons.OmegaDualInfinity"] = { expansion = true, arsenal = true, kind = "dualinfinity", dual = true,
            iconName = "DualInfinity", leftVisual = "PRZWeapons.OmegaDualInfinityMechanicalHandVisual",
            reloadSeconds = 3,
            normalCyclicRate = 1.0, rapidCyclicRate = 4.5,
            normalShotSeconds = 0.20, rapidShotSeconds = 0.08 },
        ["PRZWeapons.OmegaSVDEX"] = { expansion = true, arsenal = true, kind = "svdex", iconName = "SVDEX",
            shotSeconds = 0.5, grenadeCapacity = 1, grenadeReloadSeconds = 2,
            grenadeRange = 20, grenadeSpeed = 14, blastRadius = 3, blastDamage = 2.0 },


        ["PRZWeapons.OmegaBalrog11"] = {
            kind = "flame", shotsPerUse = 5, range = 8, halfAngle = math.rad(32),
            damage = 0.35, burnSeconds = 6, burnDamage = 0.20, cooldown = 0,
            specialSound = "PRZArmory_BalrogBurst",
        },
        ["PRZWeapons.OmegaHolyFlame"] = {
            kind = "holy", passive = true, onHitStun = true,
            stunChance = 100, stunSeconds = 2, cooldown = 0,
        },
        ["PRZWeapons.OmegaBalrog7"] = {
            expansion = true, kind = "balrog7", iconName = "Balrog7",
            procChance = 20, blastRadius = 1.8, blastDamage = 0.45,
        },

        ["PRZWeapons.OmegaMG3Gold"] = {
            expansion = true, kind = "machinegun", iconName = "MG3Gold",
        },
    },
}

return PRZArmory.Config
