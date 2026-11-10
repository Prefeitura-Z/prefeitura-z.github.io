PRZMeleeSandbox = PRZMeleeSandbox or {}

function PRZMeleeSandbox.isEnabled()
    -- Older saves without this option retain the default enabled behavior.
    return type(SandboxVars) ~= "table" or SandboxVars.PRZMeleeEffectsEnabled ~= false
end
