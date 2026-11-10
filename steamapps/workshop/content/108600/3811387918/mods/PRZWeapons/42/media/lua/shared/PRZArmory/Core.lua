PRZArmory = PRZArmory or {}
local Core = {}
PRZArmory.Core = Core

function Core.clamp(value, low, high)
    return math.max(low, math.min(high, value))
end

function Core.energy(value, delta, maximum)
    value = tonumber(value) or 0
    if value ~= value then value = 0 end
    return Core.clamp(value + delta, 0, maximum)
end

function Core.charge(elapsed, duration)
    return Core.clamp(elapsed / math.max(duration, 0.01), 0, 1)
end

function Core.count(value)
    value = tonumber(value) or 0
    if value ~= value or value == math.huge or value == -math.huge then return 0 end
    return math.floor(Core.clamp(value, 0, 2147483647))
end

-- Pure geometry; visibility/collision and loaded-square checks happen in Combat.
function Core.inShape(sx, sy, sz, tx, ty, tz, dx, dy, radius, halfAngle)
    if math.floor(sz) ~= math.floor(tz) then return false end
    local x, y = tx - sx, ty - sy
    local distance2 = x*x + y*y
    if distance2 > radius*radius then return false end
    if halfAngle == nil or halfAngle >= math.pi or distance2 < 0.0001 then return true end
    local length = math.sqrt(dx*dx + dy*dy)
    if length < 0.0001 then return false end
    return (x*dx + y*dy) / (math.sqrt(distance2)*length) >= math.cos(halfAngle)
end

return Core
