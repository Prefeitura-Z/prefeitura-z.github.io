-- Request JANUS variant meshes before earned charge can expose them. Native
-- loadZomboidModel uses the same mesh/texture/static/shader key as held models.
require "PRZArmory/TextureCache"
PRZArmory = PRZArmory or {}
local M = {entries={}}
PRZArmory.ModelCache = M
function M.request(name)
    if isServer() or type(name)~="string" then return false end
    local e=M.entries[name]
    if not e then
        e={};M.entries[name]=e
        local script=getScriptManager():getModelScript(name:find("%.") and name or "Base."..name)
        if script then
            e.texture="media/textures/"..script:getTextureName()..".png"
            e.asset=loadZomboidModel(name,script:getMeshName(),script:getTextureName(),script:getShaderName(),true)
            PRZArmory.TextureCache.request(e.texture)
        end
    end
    -- B42.21 returns an opaque Model: even indexing a method on it raises a
    -- Lua error. Keep the handle opaque. This interface can observe request
    -- success and texture readiness, not completion of the native mesh load.
    if not e.asset then return false end
    return PRZArmory.TextureCache.get(e.texture)~=nil
end
function M.ready(name) return M.request(name) end
function M.preloadJanus()
    if isServer() then return end
    local function both(name) M.request(name);M.request(name.."NoMag") end
    for _,name in ipairs({"PRZArmoryJanus7","PRZArmoryJanus7Ready","PRZArmoryJanus7Electric"}) do both(name) end
    for i=1,31 do
        both("PRZArmoryJanus7Change"..string.format("%02d",i))
    end
    for i=1,26 do
        both("PRZArmoryJanus7Return"..string.format("%02d",i))
    end
end
Events.OnGameStart.Add(M.preloadJanus)
Events.OnMainMenuEnter.Add(function() M.entries={} end)
return M
