-- The same guarded native action implementation is shared by every host.
if not isServer() then return end
require "PRZArmory/Sandbox"
require "PRZArmory/CannonReloadTiming"
