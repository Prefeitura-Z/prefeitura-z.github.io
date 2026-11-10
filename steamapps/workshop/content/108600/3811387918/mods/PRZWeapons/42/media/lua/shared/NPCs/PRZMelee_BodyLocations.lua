if BodyLocations and BodyLocations.getGroup and PRZMelee then
    local group = BodyLocations.getGroup("Human")
    if group then
        local locations = {
            PRZMelee.PRZMeleeStarThunderSheath,
            PRZMelee.PRZMeleeElucidatorSheath,
            PRZMelee.PRZMeleeSmallWeaponBeltL,
            PRZMelee.PRZMeleeBigWeaponBelt,
            PRZMelee.PRZMeleeBigWeaponHipBelt,
            PRZMelee.PRZMeleeDarkRepulsorSheath,
            PRZMelee.PRZMeleeBlueRoseSwordSheath,
            PRZMelee.PRZMeleeNightSkySwordSheath,
            PRZMelee.PRZMeleeAndurilSwordSheath,
            PRZMelee.PRZMeleeJeannedArcSwordSheath,
            PRZMelee.PRZMeleeExcaliburSheath,
            PRZMelee.PRZMeleeCaliburnSheath,
            PRZMelee.PRZMeleeRanLingSheath,
            PRZMelee.PRZMeleeNocturnalEdgeSheath,
            PRZMelee.PRZMeleeGlintofCloudsSheath,
        }

        for _, location in ipairs(locations) do
            if location then
                group:getOrCreateLocation(location)
            end
        end
    end
end

