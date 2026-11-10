-- Asynchronous native-texture guard shared by UI and short animation sequences.
-- Only a ready native Texture leaves this module; transparent frames are valid.
PRZArmory=PRZArmory or {}
PRZArmory.TextureCache=PRZArmory.TextureCache or {}
local T=PRZArmory.TextureCache
local entries={}
local retryMs=250

function T.isReady(texture)
    if not texture then return false end
    local ok,ready=pcall(function()
        if texture.isDestroyed and texture:isDestroyed() then return false end
        if texture.isValid and not texture:isValid() then return false end
        return texture:isReady()
    end)
    return ok and ready==true
end
function T.request(path)
    if type(path)~="string" or path=="" then return nil end
    local entry=entries[path]
    if not entry then entry={};entries[path]=entry end
    if entry.texture then
        return T.isReady(entry.texture) and entry.texture or nil
    end
    local now=getTimestampMs()
    if not entry.attemptedAt or now<entry.attemptedAt or now-entry.attemptedAt>=retryMs then
        entry.attemptedAt=now
        local ok,texture=pcall(getTexture,path)
        if ok and texture then entry.texture=texture end
    end
    return T.isReady(entry.texture) and entry.texture or nil
end
-- get() also starts a deferred request when the texture has not been requested.
function T.get(path) return T.request(path) end
function T.preloadSequence(prefix,count,first,digits)
    local sequence={paths={}}
    if type(prefix)~="string" or prefix=="" then return sequence end
    count=math.max(0,math.floor(tonumber(count) or 0))
    first=math.floor(tonumber(first) or 0)
    digits=math.max(1,math.min(9,math.floor(tonumber(digits) or 2)))
    local format="%0"..digits.."d"
    for i=1,count do
        local path=prefix..string.format(format,first+i-1)..".png"
        sequence.paths[i]=path
        T.request(path)
    end
    return sequence
end
function T.frame(sequence,index)
    if type(sequence)~="table" or type(sequence.paths)~="table" or #sequence.paths==0 then return nil end
    index=math.max(1,math.min(#sequence.paths,math.floor(tonumber(index) or 1)))
    local texture=T.get(sequence.paths[index])
    if texture then
        sequence.lastReady=texture;sequence.lastReadyIndex=index
        return texture,index
    end
    if T.isReady(sequence.lastReady) then return sequence.lastReady,sequence.lastReadyIndex end
    -- A newly shown animation can already be part-way through its timeline.
    -- Find a ready earlier frame, never jump forward to a future effect frame.
    for i=index-1,1,-1 do
        texture=T.get(sequence.paths[i])
        if texture then
            sequence.lastReady=texture;sequence.lastReadyIndex=i
            return texture,i
        end
    end
    return nil
end
function T.clear() entries={} end
if Events and Events.OnMainMenuEnter then Events.OnMainMenuEnter.Add(T.clear) end
return T
