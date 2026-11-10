-- Read the engine registry after loading. Does not create or unlock recipes.
require "PRZOmegaWeaponsConfig"
local W = PRZOmegaWeapons
W.Diagnostics = W.Diagnostics or {}
local D = W.Diagnostics

function D.report()
    local result = {recipes=0, parts=0, weapons=0, problems={}}
    local prefix = "[PRZWeapons " .. W.VERSION .. "] "
    local function problem(message)
        result.problems[#result.problems+1] = message
        print(prefix .. message)
    end
    local ok, manager = pcall(function() return getScriptManager() end)
    if not ok or not manager then
        problem("ScriptManager indisponivel; diagnostico nao executado.")
        return result
    end
    local function hasItem(id)
        local found, item = pcall(function() return manager:getItem(id) end)
        if found and item then return true end
        problem("Item nao carregado: " .. id)
        return false
    end
    for _,part in ipairs(W.Config.parts) do
        if hasItem(part.id) then result.parts=result.parts+1 end
    end
    for id in pairs(W.RestrictedWeapons) do
        if hasItem(id) then result.weapons=result.weapons+1 end
    end
    for _,id in ipairs(W.Recipes) do
        local fullType="PRZWeapons."..string.gsub(id,"^PRZOmega_","")
        local weapon=instanceItem(fullType)
        if weapon then
            local ok,err=pcall(W.migrateMelee,nil,weapon)
            if not ok then problem("Migracao melee: "..fullType.."; "..tostring(err)) end
        else problem("Arma melee ausente: "..fullType) end
        local found, recipe = pcall(function() return manager:getCraftRecipe("PRZWeapons." .. id) end)
        if not found or not recipe then
            found, recipe = pcall(function() return manager:getCraftRecipe(id) end)
        end
        if found and recipe then
            result.recipes=result.recipes+1
            local metaOK, category, learned = pcall(function()
                return recipe:getCategory(), recipe:needToBeLearn()
            end)
            if not metaOK then
                problem("Metadados indisponiveis: " .. id)
            elseif category ~= "ArmasPrefeitura" or learned ~= true then
                problem("Metadados inesperados: " .. id .. "; categoria=" .. tostring(category) .. "; revista=" .. tostring(learned))
            end
            local blueprint="PRZWeapons.ProjetoOmega"..string.gsub(id,"^PRZOmega_","")
            local item=instanceItem(blueprint)
            if not item or not item:getLearnedRecipes():contains(id) then problem("Projeto individual ausente: "..blueprint) end
            if item then
                local known=item:getLearnedRecipes()
                local reader={getKnownRecipes=function()return known end}
                if not PRZOmegaRecipeVisible{player=reader,recipe=recipe} then problem("Projeto nao revela receita: "..id) end
            end
            if recipe:getOnAddToMenu()~="PRZOmegaRecipeVisible" then problem("Filtro de menu ausente: "..id) end
        else
            problem("Receita nao carregada: PRZWeapons." .. id)
        end
    end
    print(prefix .. "receitas melee " .. result.recipes .. "/" .. #W.Recipes .. "; componentes " .. result.parts .. "/" .. #W.Config.parts .. "; armas e variantes restritas " .. result.weapons .. "; problemas " .. #result.problems)
    return result
end

Events.OnGameStart.Add(D.report)
Events.OnServerStarted.Add(D.report)
