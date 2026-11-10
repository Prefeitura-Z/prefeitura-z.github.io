-- Retained internal API for legacy callers; the water emitter was retired.
-- No item registration, inventory callbacks or global tooltip wrapper remains.
PRZArmory=PRZArmory or {}
PRZArmory.WaterCompatibility={normalize=function()return false end}
return PRZArmory.WaterCompatibility
