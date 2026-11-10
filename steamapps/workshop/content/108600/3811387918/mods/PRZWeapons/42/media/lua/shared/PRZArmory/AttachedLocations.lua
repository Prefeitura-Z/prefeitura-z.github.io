-- Attached-item locations are packet schema, not client-only presentation.
-- Load the identical Human location on a dedicated server before any player
-- attachment packet, as well as on clients and in single-player.
PRZArmory = PRZArmory or {}
local group = AttachedLocations.getGroup("Human")
group:getOrCreateLocation("PRZArmoryLeftHandVisual"):setAttachmentName("PRZWeapons_LeftHand")
group:getOrCreateLocation("PRZArmoryDualFlashR"):setAttachmentName("PRZWeapons_DualFlashR")
group:getOrCreateLocation("PRZArmoryDualFlashL"):setAttachmentName("PRZWeapons_DualFlashL")
-- Attached models resolve an attachment on the BODY model; unlike equipped
-- models, ModelManager does not supply a fallback parentBoneName here. A bone
-- name alone therefore leaves the visual at the character root. Extend the
-- loaded body scripts with one zero-offset socket instead of replacing them.
local function registerLeftHandSocket()
    if not ScriptManager or not ModelAttachment then return end
    for _,name in ipairs({"MaleBody","FemaleBody"}) do
        local script=ScriptManager.instance:getModelScript(name)
        if script and not script:getAttachmentById("PRZWeapons_LeftHand") then
            local attachment=ModelAttachment.new("PRZWeapons_LeftHand")
            attachment:setBone("Bip01_L_Hand")
            script:addAttachment(attachment)
        end
        for side,bone in pairs({R="Bip01_Prop1",L="Bip01_L_Hand"}) do
            local id="PRZWeapons_DualFlash"..side
            if script and not script:getAttachmentById(id) then
                local attachment=ModelAttachment.new(id);attachment:setBone(bone);script:addAttachment(attachment)
            end
        end
    end
end
registerLeftHandSocket()
if Events and Events.OnGameBoot then Events.OnGameBoot.Add(registerLeftHandSocket) end
if Events and Events.OnGameStart then Events.OnGameStart.Add(registerLeftHandSocket) end
PRZArmory.attachedLocationsRegistered = true
return group
