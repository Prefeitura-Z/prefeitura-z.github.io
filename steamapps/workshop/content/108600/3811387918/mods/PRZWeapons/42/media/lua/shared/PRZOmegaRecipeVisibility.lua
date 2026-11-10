-- Native B42 craftRecipe OnAddToMenu callback, scoped by the recipe scripts.
-- Explicit known recipes avoid admin/build-cheat and "show all" bypasses.
function PRZOmegaRecipeVisible(params)
    if not params or not params.player or not params.recipe then return false end
    local known=params.player:getKnownRecipes()
    return known~=nil and known:contains(params.recipe:getName())
end
