require "PRZArmory/Config"
-- Combat balance is centralized in Config.lua. No decoder or shared sandbox mutation.
PRZArmory.Sandbox={refresh=function()return false end}
return PRZArmory.Sandbox
