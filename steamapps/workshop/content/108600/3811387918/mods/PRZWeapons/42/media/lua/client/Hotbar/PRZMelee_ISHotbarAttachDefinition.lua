require "Hotbar/ISHotbarAttachDefinition"

if not ISHotbarAttachDefinition then
    return
end

-- Dedicated sheath slots.
local PRZMeleeStarThunderSheath = {
    type = "PRZMeleeStarThunderSheath",
    name = "StarThunderSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeStarThunder = "PRZMeleeStarThunderSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeStarThunderSheath)

local PRZMeleeElucidatorSheath = {
    type = "PRZMeleeElucidatorSheath",
    name = "ElucidatorSheath",
    animset = "back",
    attachments = {
        PRZMeleeElucidator = "PRZMeleeElucidatorSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeElucidatorSheath)

-- Custom belt slots.
local PRZMeleeSmallWeaponBeltL = {
    type = "PRZMeleeSmallWeaponBeltL",
    name = "SmallWeaponBeltL",
    animset = "belt left",
    attachments = {
        Sword = "PRZMeleeSmallWeaponBeltL",
        Knife = "Belt Left Upside",
        NotKnife = "Belt Left Upside",
        Hammer = "Belt Left",
        HammerRotated = "Belt Rotated Left",
        Nightstick = "Nightstick Left",
        Screwdriver = "Belt Left Screwdriver",
        Wrench = "Wrench Left",
        MeatCleaver = "MeatCleaver Belt Left",
        Walkie = "Walkie Belt Left",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeSmallWeaponBeltL)

local PRZMeleeSmallWeaponBeltR = {
    type = "PRZMeleeSmallWeaponBeltR",
    name = "SmallWeaponBeltR",
    animset = "belt right",
    attachments = {
        Sword = "PRZMeleeSmallWeaponBeltR",
        Knife = "Belt Right Upside",
        NotKnife = "Belt Right Upside",
        Hammer = "Belt Right",
        HammerRotated = "Belt Rotated Right",
        Nightstick = "Nightstick Right",
        Screwdriver = "Belt Right Screwdriver",
        Wrench = "Wrench Right",
        MeatCleaver = "MeatCleaver Belt Right",
        Walkie = "Walkie Belt Right",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeSmallWeaponBeltR)

local PRZMeleeBigWeaponBelt = {
    type = "PRZMeleeBigWeaponBelt",
    name = "PRZMeleeBigWeaponBelt",
    animset = "back",
    attachments = {
        Sword = "PRZMeleeBigWeaponBelt",
        PRZMeleeStarThunder = "PRZMeleeBigWeaponBelt",
        PRZMeleeElucidator = "PRZMeleeBigWeaponBelt",
        PRZMeleeDarkRepulsor = "PRZMeleeBigWeaponBelt",
        PRZMeleeBlueRoseSword = "PRZMeleeBigWeaponBelt",
        PRZMeleeNightSkySword = "PRZMeleeBigWeaponBelt",
        PRZMeleeAndurilSword = "PRZMeleeBigWeaponBelt",
        PRZMeleeJeannedArcSword = "PRZMeleeBigWeaponBelt",
        PRZMeleeExcalibur = "PRZMeleeBigWeaponBelt",
        PRZMeleeCaliburn = "PRZMeleeBigWeaponBelt",
        PRZMeleeRanLing = "PRZMeleeBigWeaponBelt",
        PRZMeleeNocturnalEdge = "PRZMeleeBigWeaponBelt",
        PRZMeleeGlintofClouds = "PRZMeleeBigWeaponBelt",
        Shovel = "PRZMeleeBigWeaponBelt",
        BigBlade = "PRZMeleeBigWeaponBelt",
        BigWeapon = "PRZMeleeBigWeaponBelt",
        Rifle = "Rifle On Back",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeBigWeaponBelt)

local PRZMeleeBigWeaponHipBelt = {
    type = "PRZMeleeBigWeaponHipBelt",
    name = "PRZMeleeBigWeaponHipBelt",
    animset = "belt left",
    attachments = {
        Sword = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeStarThunder = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeElucidator = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeDarkRepulsor = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeBlueRoseSword = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeNightSkySword = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeAndurilSword = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeJeannedArcSword = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeExcalibur = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeCaliburn = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeRanLing = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeNocturnalEdge = "PRZMeleeBigWeaponHipBelt",
        PRZMeleeGlintofClouds = "PRZMeleeBigWeaponHipBelt",
        Shovel = "PRZMeleeBigWeaponHipBelt",
        BigBlade = "PRZMeleeBigWeaponHipBelt",
        BigWeapon = "PRZMeleeBigWeaponHipBelt",
        Rifle = "Rifle On Back with Bag",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeBigWeaponHipBelt)

-- Sword sheath slots.
local PRZMeleeDarkRepulsorSheath = {
    type = "PRZMeleeDarkRepulsorSheath",
    name = "DarkRepulsorSheath",
    animset = "back",
    attachments = {
        PRZMeleeDarkRepulsor = "PRZMeleeDarkRepulsorSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeDarkRepulsorSheath)

local PRZMeleeBlueRoseSwordSheath = {
    type = "PRZMeleeBlueRoseSwordSheath",
    name = "BlueRoseSwordSheath",
    animset = "back",
    attachments = {
        PRZMeleeBlueRoseSword = "PRZMeleeBlueRoseSwordSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeBlueRoseSwordSheath)

local PRZMeleeNightSkySwordSheath = {
    type = "PRZMeleeNightSkySwordSheath",
    name = "NightSkySwordSheath",
    animset = "back",
    attachments = {
        PRZMeleeNightSkySword = "PRZMeleeNightSkySwordSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeNightSkySwordSheath)

local PRZMeleeAndurilSwordSheath = {
    type = "PRZMeleeAndurilSwordSheath",
    name = "AndurilSwordSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeAndurilSword = "PRZMeleeAndurilSwordSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeAndurilSwordSheath)

local PRZMeleeJeannedArcSwordSheath = {
    type = "PRZMeleeJeannedArcSwordSheath",
    name = "JeannedArcSwordSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeJeannedArcSword = "PRZMeleeJeannedArcSwordSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeJeannedArcSwordSheath)

local PRZMeleeExcaliburSheath = {
    type = "PRZMeleeExcaliburSheath",
    name = "ExcaliburSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeExcalibur = "PRZMeleeExcaliburSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeExcaliburSheath)

local PRZMeleeCaliburnSheath = {
    type = "PRZMeleeCaliburnSheath",
    name = "CaliburnSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeCaliburn = "PRZMeleeCaliburnSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeCaliburnSheath)

local PRZMeleeRanLingSheath = {
    type = "PRZMeleeRanLingSheath",
    name = "RanLingSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeRanLing = "PRZMeleeRanLingSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeRanLingSheath)

local PRZMeleeNocturnalEdgeSheath = {
    type = "PRZMeleeNocturnalEdgeSheath",
    name = "NocturnalEdgeSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeNocturnalEdge = "PRZMeleeNocturnalEdgeSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeNocturnalEdgeSheath)

local PRZMeleeGlintofCloudsSheath = {
    type = "PRZMeleeGlintofCloudsSheath",
    name = "GlintofCloudsSheath",
    animset = "belt left",
    attachments = {
        PRZMeleeGlintofClouds = "PRZMeleeGlintofCloudsSheath",
    },
}
table.insert(ISHotbarAttachDefinition, PRZMeleeGlintofCloudsSheath)

