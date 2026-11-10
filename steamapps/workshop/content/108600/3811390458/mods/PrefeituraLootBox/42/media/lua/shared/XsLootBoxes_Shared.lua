XsLootBoxes = XsLootBoxes or {}
local X = XsLootBoxes

X.MOD_ID = "XsLootBoxes"
X.MODULE = "XsLootBoxes"
X.MD_CONFIG = "XsLootBoxes_Config"
X.CONFIG_SCHEMA_VERSION = 2
X.ROLL_HARD_CAP = 10
X.OPEN_ALL_BOX_CAP = 20
X.CHAT_RARE_PCT_THRESHOLD = 2
X.MAX_TIER_NAME_LEN = 40
X.DEFAULT_DOUBLE_BOX_CHANCE = 5
X.DEFAULT_TRIPLE_BOX_CHANCE = 1

X.COLORS = { "White", "Green", "Blue", "Purple", "Orange", "Red", "Cyan" }
X.COLOR_RARITY = { White=1, Green=2, Blue=3, Purple=4, Orange=5, Red=6, Cyan=7 }
X.COLOR_TIER_LABEL = {
    White="Common", Green="Uncommon", Blue="Rare", Purple="Epic",
    Orange="Legendary", Red="Mythic", Cyan="Limited",
}
X.DEFAULT_DISPLAY_NAMES = {
    White="Lootbox Comum", Green="Lootbox Incomum", Blue="Lootbox Rara",
    Purple="Lootbox "..string.char(201).."pica", Orange="Lootbox Prest"..string.char(237).."gio", Red="Lootbox M"..string.char(237).."tica",
    Cyan="Lootbox Limitada",
}
X.COLOR_RGB = {
    White={0.95,0.95,0.95}, Green={0.45,0.85,0.45}, Blue={0.45,0.65,0.95},
    Purple={0.75,0.45,0.95}, Orange={1.00,0.65,0.30}, Red={0.95,0.40,0.40},
    Cyan={0.40,0.95,0.95},
}
X.BOX_FULLTYPE = {
    White="XsLootBoxes.LootBox_White", Green="XsLootBoxes.LootBox_Green",
    Blue="XsLootBoxes.LootBox_Blue", Purple="XsLootBoxes.LootBox_Purple",
    Orange="XsLootBoxes.LootBox_Orange", Red="XsLootBoxes.LootBox_Red",
    Cyan="XsLootBoxes.LootBox_Cyan",
}
X.FULLTYPE_TO_COLOR = {}
for _, color in ipairs(X.COLORS) do X.FULLTYPE_TO_COLOR[X.BOX_FULLTYPE[color]] = color end

X.CMD_TABLE_SET = "CMD_TABLE_SET"
X.CMD_TABLE_RESET = "CMD_TABLE_RESET"
X.CMD_NAMES_SET = "CMD_NAMES_SET"
X.CMD_OPEN_BOX = "CMD_OPEN_BOX"
X.CMD_OPEN_BOX_ALL = "CMD_OPEN_BOX_ALL"
X.CMD_REQUEST_SYNC = "CMD_REQUEST_SYNC"
X.SRV_OPEN_RESULT = "SRV_OPEN_RESULT"
X.SRV_OPEN_FAILED = "SRV_OPEN_FAILED"
X.SRV_SAVED = "SRV_SAVED"
X.SRV_CONFIG_SYNC = "SRV_CONFIG_SYNC"
X.SRV_CHAT_BROADCAST = "SRV_CHAT_BROADCAST"
X.SOUND_OPEN_SHAKE = "XsLootBox_OpenShake"
X.SOUND_OPEN_WHOOSH = "XsLootBox_OpenWhoosh"
X.SOUND_OPEN_REVEAL = "XsLootBox_OpenReveal"
X._runtimeDisplayNames = X._runtimeDisplayNames or {}

local function boundedInt(value, lo, hi, fallback)
    local n = tonumber(value)
    if not n then return fallback end
    n = math.floor(n)
    if n < lo then n = lo end
    if n > hi then n = hi end
    return n
end

function X.randInt(minV, maxV)
    local lo = tonumber(minV) or 0
    if maxV ~= nil then
        local hi = tonumber(maxV) or lo
        if hi <= lo then return lo end
        if ZombRand then return ZombRand(lo, hi) end
        if math and math.random then return math.random(lo, hi - 1) end
        return lo
    end
    if lo <= 0 then return 0 end
    if ZombRand then return ZombRand(lo) end
    if math and math.random then return math.random(0, lo - 1) end
    return 0
end

function X.isKnownColor(color)
    return type(color) == "string" and X.COLOR_RARITY[color] ~= nil
end

function X.colorFromFullType(fullType)
    if fullType == nil then return nil end
    return X.FULLTYPE_TO_COLOR[tostring(fullType)]
end

function X.isUpgradeBoxFullType(fullType)
    return X.colorFromFullType(fullType) ~= nil
end
X.isNestedLootBoxFullType = X.isUpgradeBoxFullType
X.nestedLootBoxColor = X.colorFromFullType

function X.clampRolls(rolls)
    rolls = type(rolls) == "table" and rolls or {}
    local minV = boundedInt(rolls.min, 1, X.ROLL_HARD_CAP, 1)
    local maxV = boundedInt(rolls.max, 1, X.ROLL_HARD_CAP, minV)
    if maxV < minV then maxV = minV end
    return { min=minV, max=maxV }
end

function X.formatWeightSharePct(weight, total)
    local w, t = tonumber(weight) or 0, tonumber(total) or 0
    if t <= 0 or w <= 0 then return 0 end
    return (w / t) * 100
end

function X.formatRgbTag(color, text)
    local rgb = X.COLOR_RGB[color]
    if not rgb then return tostring(text or "") end
    return string.format(" <PUSHRGB:%.2f,%.2f,%.2f> %s <POPRGB>", rgb[1], rgb[2], rgb[3], tostring(text or ""))
end

function X.tierDisplayLabel(color)
    if not X.isKnownColor(color) then return tostring(color or "") end
    local runtime = X._runtimeDisplayNames[color]
    if type(runtime) == "string" and runtime ~= "" then return X.repairTierDisplayName(color,runtime) end
    return X.DEFAULT_DISPLAY_NAMES[color] or X.COLOR_TIER_LABEL[color] or color
end

function X.hasCustomTierName(color)
    local runtime = X._runtimeDisplayNames[color]
    return type(runtime) == "string" and runtime ~= "" and runtime ~= X.DEFAULT_DISPLAY_NAMES[color]
end

function X.tierLootBoxDisplayName(color)
    return X.tierDisplayLabel(color)
end

function X.resolveLootBoxItemName(fullType)
    local color = X.colorFromFullType(fullType)
    if color then return X.tierDisplayLabel(color) end
    return tostring(fullType or "")
end

function X.resolveItemDisplayName(fullType)
    local ft = tostring(fullType or "")
    if ft == "" then return ft end
    if X.colorFromFullType(ft) then return X.resolveLootBoxItemName(ft) end
    if getItemNameFromFullType then
        local ok, name = pcall(getItemNameFromFullType, ft)
        if ok and name and tostring(name) ~= "" then return tostring(name) end
    end
    if ScriptManager and ScriptManager.instance then
        local ok, item = pcall(function() return ScriptManager.instance:getItem(ft) end)
        if ok and item and item.getDisplayName then
            local ok2, name = pcall(function() return item:getDisplayName() end)
            if ok2 and name and tostring(name) ~= "" then return tostring(name) end
        end
    end
    return ft
end

function X.repairTierDisplayName(color,value)
    local text=tostring(value or "")
    local lower=string.lower(text)
    local broken=string.find(text,"?",1,true) or string.find(text,string.char(65533),1,true)
    -- Repair known default labels only; custom names retain their spelling.
    if broken then
        if color=="Purple" and (string.find(lower,"pica",1,true) or lower=="?pica") then
            if #text<=6 then return string.char(201).."pica" end
            if string.sub(lower,1,8)=="lootbox " then return "Lootbox "..string.char(201).."pica" end
        elseif color=="Orange" and string.sub(lower,1,13)=="lootbox prest" then
            return "Lootbox Prest"..string.char(237).."gio"
        elseif color=="Red" and string.sub(lower,1,9)=="lootbox m" then
            return "Lootbox M"..string.char(237).."tica"
        end
    end
    return text
end

function X.applySyncedDisplayNames(config)
    X._runtimeDisplayNames = {}
    local names = type(config) == "table" and config.displayNames or nil
    for _, color in ipairs(X.COLORS) do
        local value = type(names) == "table" and names[color] or nil
        if type(value) == "string" and value ~= "" then X._runtimeDisplayNames[color] = X.repairTierDisplayName(color,value) end
    end
end

function X.requestConfigSync()
    if isClient and isClient() then
        X._syncPending=true
        if ModData and ModData.request then pcall(ModData.request,X.MD_CONFIG) end
        if sendClientCommand then sendClientCommand(X.MODULE, X.CMD_REQUEST_SYNC, {}) end
    elseif X.Store and X.Store.getConfig and X.applyClientConfig then
        X.applyClientConfig(X.Store.getConfig(),true)
    end
end

function X.formatDropPctSuffix(pct)
    local p = tonumber(pct)
    if not p then return "" end
    return string.format(" (%.1f%%)", p)
end

function X.getSandboxNumber(key, fallback)
    local vars = SandboxVars and SandboxVars.XsLootBoxes
    local n = vars and tonumber(vars[key]) or nil
    return n or fallback
end

function X.getQuantityMultiplier()
    local triple = boundedInt(X.getSandboxNumber("TripleBoxChance", X.DEFAULT_TRIPLE_BOX_CHANCE), 0, 100, X.DEFAULT_TRIPLE_BOX_CHANCE)
    local double = boundedInt(X.getSandboxNumber("DoubleBoxChance", X.DEFAULT_DOUBLE_BOX_CHANCE), 0, 100, X.DEFAULT_DOUBLE_BOX_CHANCE)
    local roll = X.randInt(0, 100)
    if roll < triple then return 3 end
    if roll < triple + double then return 2 end
    return 1
end

function X.isGunAmmoGrantEnabled()
    local vars = SandboxVars and SandboxVars.XsLootBoxes
    if vars == nil or vars.GrantGunAmmo == nil then return true end
    return vars.GrantGunAmmo == true
end
