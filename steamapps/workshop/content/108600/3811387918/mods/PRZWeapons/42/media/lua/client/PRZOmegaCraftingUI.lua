-- B42 may select a recipe excluded by OnAddToMenu. Clear the logic itself so
-- title, ingredients, output and the admin force-craft control stay consistent.
require "Entity/ISUI/CraftRecipe/ISHandCraftPanel"
require "Entity/ISUI/CraftRecipe/ISCraftRecipePanel"
require "Entity/ISUI/CraftRecipe/ISWidgetRecipeCategories"
require "PRZOmegaRecipeVisibility"
local function hidden(player,recipe)
    return recipe and string.sub(recipe:getName(),1,9)=="PRZOmega_" and recipe:needToBeLearn()
        and not PRZOmegaRecipeVisible{player=player,recipe=recipe}
end
local function clearUnknown(panel)
    if hidden(panel.player,panel.logic:getRecipe()) then
        panel.logic:setRecipe(nil)
        return true
    end
end
local changed=ISHandCraftPanel.onRecipeChanged
function ISHandCraftPanel:onRecipeChanged(recipe)
    if clearUnknown(self) then return end
    return changed(self,self.logic:getRecipe())
end
for _,method in ipairs({"filterRecipeList","onCategoryChanged","sortRecipeList","setRecipeListMode"}) do
    local original=ISHandCraftPanel[method]
    ISHandCraftPanel[method]=function(self,...)
        original(self,...)
        clearUnknown(self)
    end
end
local dynamic=ISCraftRecipePanel.createDynamicChildren
function ISCraftRecipePanel:createDynamicChildren()
    clearUnknown(self)
    self.titleWidget=nil;self.inputs=nil;self.outputs=nil;self.craftControl=nil
    return dynamic(self)
end
local populate=ISWidgetRecipeCategories.populateCategoryList
local order={ArmasPrefeitura=1,PRZOmegaArsenal=2,PRZOmegaSupplies=3}
function ISWidgetRecipeCategories:populateCategoryList()
    populate(self)
    local list=self.recipeCategoryPanel
    local others,omega={},{}
    local selected=list.items[list.selected]
    for _,row in ipairs(list.items) do
        if order[row.item] then omega[order[row.item]]=row else others[#others+1]=row end
    end
    local insertAt=#others
    for i,row in ipairs(others) do
        if string.lower(tostring(row.item))=="pottery" then insertAt=i;break end
    end
    for i=3,1,-1 do if omega[i] then table.insert(others,insertAt+1,omega[i]) end end
    list.items=others
    for i,row in ipairs(others) do
        row.itemindex=i
        if row==selected then list.selected=i end
    end
end
