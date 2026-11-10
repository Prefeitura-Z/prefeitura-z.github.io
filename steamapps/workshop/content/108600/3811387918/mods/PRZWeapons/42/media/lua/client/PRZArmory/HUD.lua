-- Season 2 uses native ammunition information, with no overlay or HUD hotkeys.
PRZArmory=PRZArmory or {}
local HUD={}
PRZArmory.HUD=HUD
function HUD.isEditing() return false end
function HUD.isHidden() return true end
function HUD.getLayout() return {hidden=true,editing=false,scale=1} end
function HUD.clear() end
function HUD.finishEdit() end
return HUD
