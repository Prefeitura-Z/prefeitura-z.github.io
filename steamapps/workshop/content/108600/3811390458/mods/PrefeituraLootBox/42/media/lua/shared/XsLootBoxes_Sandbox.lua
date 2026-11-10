XsLootBoxes = XsLootBoxes or {}

function XsLootBoxes.sandboxDoubleChance()
    local n = XsLootBoxes.getSandboxNumber("DoubleBoxChance", XsLootBoxes.DEFAULT_DOUBLE_BOX_CHANCE)
    return math.max(0, math.min(100, math.floor(tonumber(n) or 0)))
end

function XsLootBoxes.sandboxTripleChance()
    local n = XsLootBoxes.getSandboxNumber("TripleBoxChance", XsLootBoxes.DEFAULT_TRIPLE_BOX_CHANCE)
    return math.max(0, math.min(100, math.floor(tonumber(n) or 0)))
end
