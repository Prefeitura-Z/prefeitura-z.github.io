require "PRZOmegaCatalog"
PRZOmegaWeapons.SupplyConfig={
    enabled=true,
    schema=1,
    modDataKey="PRZ_WEAPONS_OMEGA_SUPPLY_V1",
    journal="PRZWeaponsOmegaSupplyReceipts.log",
    deadlineHours=72, -- World hours, as used by the real Pager.
    cooldownHours=6, -- Per account; starts only after a committed reward.
    preferDifferentWeapon=true,
}
