-- Rebase a saved weapon without deleting Exile affixes or compounding mastery.
-- Use Exile's public clear/reconcile APIs; never edit its private baselines.
PRZOmegaBalanceCompat = {}
local C=PRZOmegaBalanceCompat
function C.begin(item)
    local pe=ProjectExile
    local state=pe and pe.ItemState and pe.ItemState.get(item)
    if state and state.blessed then
        if not pe.EffectEngine or not pe.EffectEngine.clearItem or not pe.EffectEngine.reconcileItem then return false end
        local ok=pe.EffectEngine.clearItem(item)
        if not ok then return false end
        return true,pe.EffectEngine
    end
    return true,nil
end
function C.finish(item,engine)
    item:getModData().PRZTraitBaseSaved=nil
    if engine then engine.reconcileItem(item) end
end
return C
