-- Registry-only validation. Creates temporary instances, never player items.
require "PRZOmegaWeaponsConfig"
require "PRZOmegaCraftDiagnostics"
require "PRZOmegaCatalog"
local W=PRZOmegaWeapons
function W.Diagnostics.firearms()
    local manager=getScriptManager()
    local r={firearms=0,manuals=0,problems={}}
    local function problem(s)r.problems[#r.problems+1]=s;print("[PRZWeapons registry] "..s)end
    local openCrates={}
    for _,box in ipairs(W.SupplyCrates or {}) do openCrates[box.recipe]=true end
    local function recipe(name)
        local c=manager:getCraftRecipe("PRZWeapons."..name) or manager:getCraftRecipe(name)
        if not c then problem("Receita ausente: "..name);return end
        local expectedLearning=openCrates[name]~=true
        if c:needToBeLearn()~=expectedLearning then problem("Aprendizado incorreto: "..name) end
    end
    for _,entry in ipairs(W.Firearms) do
        local gun=instanceItem(entry.id)
        if gun then
            r.firearms=r.firearms+1
            local sprite=gun:getWeaponSprite()
            if not manager:getModelScript(sprite) then problem("Modelo ausente: "..entry.id.." / "..tostring(sprite)) end
            local mag=gun:getMagazineType()
            if mag then
                local item=instanceItem(mag)
                if not item or item:getAmmoType()~=gun:getAmmoType() or item:getMaxAmmo()~=gun:getMaxAmmo() then
                    problem("Carregador incoerente: "..entry.id)
                end
            end
        else problem("Arma ausente: "..entry.id) end
        local manual=instanceItem(entry.manual)
        if manual and manual:getLearnedRecipes() and manual:getLearnedRecipes():contains(entry.recipe) then
            r.manuals=r.manuals+1
            local taught=manual:getLearnedRecipes()
            local weaponRecipes=0
            for i=0,taught:size()-1 do
                local name=taught:get(i)
                if string.sub(name,1,18)=="PRZOmega_Fabricar_" then weaponRecipes=weaponRecipes+1 end
                recipe(name)
            end
            if weaponRecipes~=1 then problem("Revista deve ensinar uma arma: "..entry.manual) end
        else problem("Revista/aprendizado ausente: "..entry.manual) end
    end
    print("[PRZWeapons registry] firearms="..r.firearms.."/"..#W.Firearms.." manuals="..r.manuals.."/"..#W.Firearms.." problems="..#r.problems)
    return r
end
Events.OnGameStart.Add(W.Diagnostics.firearms)
Events.OnServerStarted.Add(W.Diagnostics.firearms)
