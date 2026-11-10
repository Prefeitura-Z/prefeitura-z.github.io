require "PRZOmegaWeaponsConfig"
PRZOmegaWeapons.ShopConfig={
    enabled=true,
    modDataKey="PRZ_WEAPONS_OMEGA_SHOP_V1",
    journal="PRZWeaponsOmegaShop.log",
    currency="PRZWeapons.OmegaToken",
    -- Shared quantities per Bashar occurrence, never per player or connection.
    stock={
        {key="9mm",crate="PRZWeapons.OmegaSupply9mmBox",price=20,limit=12},
        {key="556",crate="PRZWeapons.OmegaSupply556Box",price=30,limit=10},
        {key="308",crate="PRZWeapons.OmegaSupply308Box",price=35,limit=8},
        {key="Shells",crate="PRZWeapons.OmegaSupplyShellsBox",price=25,limit=10},
        {key="50",crate="PRZWeapons.OmegaBullets50Box",price=45,limit=5},
        {key="Dragon",crate="PRZWeapons.OmegaSupplyDragonBox",price=60,limit=4},
        {key="SVDGrenade",crate="PRZWeapons.OmegaSupplySVDGrenadeBox",price=35,limit=4},
    },
    -- Atlas laboratory basements only; inclusive native tile levels.
    currencyMinZ=-8,
    currencyMaxZ=-2,
    drops={normal={chance=35,min=1,max=1},occult={chance=100,min=1,max=3},
           mutant={chance=100,min=4,max=7},boss={chance=100,min=10,max=15}},
}
