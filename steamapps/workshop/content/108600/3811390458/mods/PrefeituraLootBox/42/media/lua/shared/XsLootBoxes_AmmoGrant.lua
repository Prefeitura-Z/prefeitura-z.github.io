XsLootBoxes = XsLootBoxes or {}
XsLootBoxes.AmmoGrant = {}
local A = XsLootBoxes.AmmoGrant
A.LOOSE_ROUNDS_PER_DRAW = 20

local SPECIAL = {
    ["556Box"]="556Bullets", ["556Carton"]="556Bullets",
    ["308Box"]="308Bullets", ["308Carton"]="308Bullets",
    ["223Box"]="223Bullets", ["223Carton"]="223Bullets",
    ["ShotgunShellsBox"]="ShotgunShells", ["ShotgunShellsCarton"]="ShotgunShells",
    ["Bullets9mmBox"]="Bullets9mm", ["Bullets9mmCarton"]="Bullets9mm",
    ["Bullets38Box"]="Bullets38", ["Bullets38Carton"]="Bullets38",
    ["Bullets44Box"]="Bullets44", ["Bullets44Carton"]="Bullets44",
    ["Bullets45Box"]="Bullets45", ["Bullets45Carton"]="Bullets45",
    ["Bullets357Box"]="Bullets357", ["Bullets357Carton"]="Bullets357",
    ["762Box"]="762Bullets", ["762Pack"]="762Bullets", ["762Case"]="762Bullets", ["762Crate"]="762Bullets", ["762Carton"]="762Bullets",
    ["545Box"]="545Bullets", ["545Pack"]="545Bullets", ["545Case"]="545Bullets", ["545Crate"]="545Bullets", ["545Carton"]="545Bullets",
    ["939Box"]="939Bullets", ["939Pack"]="939Bullets", ["939Case"]="939Bullets", ["939Crate"]="939Bullets", ["939Carton"]="939Bullets",
    ["76254Case"]="76254Bullets", ["76254Box"]="76254Bullets",
    ["556BattlePack"]="556Bullets", ["22Box"]="22Bullets", ["22Pack"]="22Bullets", ["22Case"]="22Bullets",
}
local SUFFIXES = { "Carton", "Crate", "Case", "Pack", "Box" }

local function split(ft)
    local s=tostring(ft or "")
    local p=string.find(s,".",1,true)
    if not p then return "Base",s end
    return string.sub(s,1,p-1),string.sub(s,p+1)
end

local function looseId(id)
    if SPECIAL[id] then return SPECIAL[id] end
    for _, suffix in ipairs(SUFFIXES) do
        if #id > #suffix and string.sub(id,-#suffix)==suffix then
            local root=string.sub(id,1,#id-#suffix)
            if string.find(root,"Bullets",1,true) or string.find(root,"Shells",1,true) then return root end
            return root.."Bullets"
        end
    end
    return nil
end

function A.isAmmoLootFullType(ft)
    local _, id=split(ft)
    if id=="" or string.find(id,"Clip",1,true) or string.find(id,"AmmoStrap",1,true) then return false end
    return looseId(id)~=nil or string.find(id,"Bullets",1,true)~=nil or string.find(id,"Shells",1,true)~=nil
end

function A.resolveGrantFullType(ft)
    local mod,id=split(ft)
    local loose=looseId(id)
    if loose then return mod.."."..loose end
    return tostring(ft or "")
end

function A.roundsPerDraw(color)
    if color=="White" then return 1 end
    return A.LOOSE_ROUNDS_PER_DRAW
end

local function ground(player,item)
    if not player or not item then return false end
    local sq=player:getSquare()
    if not sq or not sq.AddWorldInventoryItem then return false end
    local ok=pcall(function() sq:AddWorldInventoryItem(item,0.5,0.5,0) end)
    return ok
end

function A.grantLooseRounds(inv, player, ft, rounds, dropFn)
    if not inv or not ft or ft=="" then return false end
    local count=math.max(1,math.floor(tonumber(rounds) or 1))
    if inv.AddItems then
        local ok,items=pcall(function() return inv:AddItems(ft,count) end)
        if ok and items then
            if sendAddItemsToContainer then pcall(sendAddItemsToContainer,inv,items) end
            return true
        end
    end
    if not instanceItem then return false end
    local ok,item=pcall(instanceItem,ft)
    if not ok or not item then return false end
    pcall(function() if item.setCount then item:setCount(count) end end)
    return (dropFn or ground)(player,item)==true
end

function A.grantLooseAmmo(inv, player, ft, color, dropFn, multiplier)
    if not A.isAmmoLootFullType(ft) then return false end
    local count=A.roundsPerDraw(color)*math.max(1,math.floor(tonumber(multiplier) or 1))
    return A.grantLooseRounds(inv,player,A.resolveGrantFullType(ft),count,dropFn)
end
