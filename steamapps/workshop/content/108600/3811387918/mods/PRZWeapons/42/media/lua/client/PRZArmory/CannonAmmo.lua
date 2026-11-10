require "PRZArmory/Network"
require "PRZArmory/CannonAmmoCompatibility"
require "TimedActions/ISReloadWeaponAction"

local Ammo = {}
PRZArmory = PRZArmory or {}
PRZArmory.CannonAmmo = Ammo
local Reload = ISReloadWeaponAction
local nativeCanShoot, nativeOnShoot = Reload.canShoot, Reload.onShoot

local function scoped(player, weapon)
    return PRZArmory.Network.isLocal(player) and weapon
        and weapon:getFullType() == "PRZWeapons.OmegaBlackDragonCannon"
end
local function enabled() return not PRZArmory.Config or PRZArmory.Config.effectsEnabled~=false end
local function clearShot() Ammo.ticket=nil end
local function clearPrepare()
    Ammo.prepared=nil;Ammo.awaitEmpty=nil;Ammo.acceptedPrepare=nil
end
function Ammo.getPrepareID(player,weapon)
    local s=Ammo.acceptedPrepare
    if s and s.player==player and s.weapon==weapon and s.untilMs>=getTimestampMs() then return s.requestID end
end
function Ammo.prepare(player,weapon)
    if not isClient() or not scoped(player,weapon) then return false end
    local t=getTimestampMs()
    if not enabled() or player:isDead() or player:getPrimaryHandItem()~=weapon
        or weapon:getCondition()<=0 or weapon:isJammed() or weapon:getCurrentAmmoCount()<1 then
        if Ammo.awaitEmpty==weapon and weapon:getCurrentAmmoCount()<1 then Ammo.awaitEmpty=nil end
        Ammo.prepared=nil;return false
    end
    if Ammo.awaitEmpty==weapon then return false end
    local s=Ammo.prepared
    if s and (s.player~=player or s.weapon~=weapon) then clearPrepare();s=nil end
    if not s then
        Ammo.prepareSequence=(Ammo.prepareSequence or 0)+1
        s={player=player,weapon=weapon,nonce=Ammo.prepareSequence,retryAt=0,ready=false}
        Ammo.prepared=s
    end
    local ready=s.ready and s.untilMs>=t
    if s.retryAt<=t then
        -- Retries use new network requestIDs but one logical nonce. A slow
        -- round trip must not make every acknowledgement obsolete forever.
        local args={weaponID=weapon:getID(),prepareNonce=s.nonce}
        if PRZArmory.Network.request(player,"CannonPrepare",args) then
            s.requestID=args.requestID;s.retryAt=t+(ready and 2000 or 500)
        end
    end
    return ready==true
end
function Ammo.acceptPrepared(player,args)
    local s=Ammo.prepared;local weapon=player and player:getPrimaryHandItem()
    if not isClient() or not enabled() or not s or not scoped(player,weapon) or player:isDead()
        or s.player~=player or s.weapon~=weapon or tostring(args.weaponID)~=tostring(weapon:getID())
        or args.prepareNonce~=s.nonce then return false end
    if args.ready~=true or weapon:getCurrentAmmoCount()<1 or weapon:isJammed() or weapon:getCondition()<=0 then return false end
    if type(args.prepareID)~="number" or args.prepareID<1 or args.prepareID~=math.floor(args.prepareID) then return false end
    if s.prepareID and s.prepareID~=args.prepareID then return false end
    s.ready=true;s.prepareID=args.prepareID;s.untilMs=getTimestampMs()+5000
    return true
end
function Ammo.onNetworkState(player,weapon,args)
    if isClient() and scoped(player,weapon) and tostring(args.weaponID)==tostring(weapon:getID())
        and args.ammo==0 and Ammo.awaitEmpty==weapon then Ammo.awaitEmpty=nil end
end

local function nonWeaponAction(player)
    return player:isDoShove() or player:isPerformingShoveAnimation()
        or player:isPerformingStompAnimation() or player:isDoGrapple()
        or player:isPerformingGrappleGrabAnimation() or player:isPerformingGrappleAnimation()
end

function Reload.canShoot(player, weapon)
    if scoped(player, weapon) then
        if PRZArmory.CannonAmmoCompatibility then PRZArmory.CannonAmmoCompatibility.apply(player,weapon) end
        -- Vanilla's unlimited-ammo branch precedes its empty/jammed checks.
        -- This cannon always needs one real loaded round, including debug mode.
        if not enabled() or player:isDead() or weapon:getCondition() <= 0 or weapon:isJammed()
            or weapon:getCurrentAmmoCount() < 1 then return false end
        weapon:setAmmoPerShoot(1)
        if isClient() and not Ammo.prepare(player,weapon) then return false end
    end
    local allowed=nativeCanShoot(player, weapon)
    if allowed and isClient() and scoped(player,weapon) and Ammo.prepared then
        -- The native firing animation can reach its hit event after the local
        -- ready lease ends. Keep that accepted shot valid through its windup.
        Ammo.prepared.inflightUntil=getTimestampMs()+2000
    end
    return allowed
end

function Ammo.onShoot(player, weapon)
    if not scoped(player, weapon) then return nativeOnShoot(player, weapon) end
    Ammo.ticket = nil
    if not enabled() or player:isDead() or isGamePaused() or nonWeaponAction(player)
        or player:getPrimaryHandItem() ~= weapon or weapon:getCondition() <= 0
        or weapon:isJammed() or player:isRangedWeaponEmpty() then return end
    if isClient() then
        -- B42 debits real native shots on the server. Do not use the SP
        -- unlimited-ammo fallback when the client count has not changed yet.
        local s=Ammo.prepared
        if not s or s.player~=player or s.weapon~=weapon or not s.ready
            or math.max(s.untilMs or 0,s.inflightUntil or 0)<getTimestampMs() then return end
        Ammo.acceptedPrepare={player=player,weapon=weapon,requestID=s.prepareID,untilMs=getTimestampMs()+2000}
        Ammo.prepared=nil;Ammo.awaitEmpty=weapon
        nativeOnShoot(player,weapon)
        Ammo.ticket={player=player,weapon=weapon}
        return
    end
    local before = weapon:getCurrentAmmoCount()
    if before < 1 then return end
    weapon:setAmmoPerShoot(1)
    nativeOnShoot(player, weapon)
    local after = weapon:getCurrentAmmoCount()
    if after == before then
        -- Debug unlimited ammo can bypass vanilla removal. Supply only the
        -- missing deduction, rather than deducting twice after a normal shot.
        weapon:setCurrentAmmoCount(before - 1)
        syncHandWeaponFields(player, weapon)
        after = before - 1
    end
    if after == before - 1 then
        -- Controller consumes this proof during the same native hit event.
        -- Remaining ammo may now be zero, especially with a one-round cannon.
        Ammo.ticket = {player = player, weapon = weapon}
    end
end

function Ammo.consumeShot(player, weapon)
    local ticket = Ammo.ticket
    Ammo.ticket = nil
    return ticket ~= nil and ticket.player == player and ticket.weapon == weapon
end

function Ammo.reset()
    clearShot();clearPrepare()
end
function Ammo.update()
    clearShot()
    if not isClient() then return end
    local player=getSpecificPlayer(0);local weapon=player and player:getPrimaryHandItem()
    if not scoped(player,weapon) or not enabled() or player:isDead() then clearPrepare();return end
    if Ammo.awaitEmpty==weapon then
        if weapon:getCurrentAmmoCount()<1 then Ammo.awaitEmpty=nil end
        return
    end
    Ammo.prepare(player,weapon)
end

-- The event stores the original function, so replacing its table field alone
-- would leave vanilla's callback active. Replace that registered function too.
Events.OnWeaponSwingHitPoint.Remove(nativeOnShoot)
Reload.onShoot = Ammo.onShoot
Events.OnWeaponSwingHitPoint.Add(Ammo.onShoot)
Events.OnWeaponSwing.Add(clearShot)
Events.OnTick.Add(Ammo.update)
Events.OnEquipPrimary.Add(function(player)if PRZArmory.Network.isLocal(player) then clearShot();clearPrepare() end end)
Events.OnGameStart.Add(Ammo.reset)
Events.OnMainMenuEnter.Add(Ammo.reset)

return Ammo
