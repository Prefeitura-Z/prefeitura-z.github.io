require "ISUI/ISPanel"
require "ISUI/ISButton"
require "ISUI/ISScrollingListBox"
require "ISUI/ISTextEntryBox"
XsLootBoxes=XsLootBoxes or {}
local X=XsLootBoxes
X.UI=X.UI or {}
local U=X.UI
U.bg={r=0.065,g=0.072,b=0.083,a=0.98}
U.card={r=0.095,g=0.105,b=0.120,a=1}
U.line={r=0.22,g=0.24,b=0.27,a=1}
U.text={r=0.94,g=0.94,b=0.92,a=1}
U.muted={r=0.62,g=0.66,b=0.70,a=1}
U.gold={r=0.86,g=0.72,b=0.45,a=1}
U._items={}

function U.textKey(key,...)
    return getText("IGUI_XsLootBoxes_"..key,...)
end

function U.countText(key,count)
    return U.textKey(key..(tonumber(count)==1 and "One" or "Many"),tostring(count))
end

function U.size(width,height)
    local core=getCore()
    return math.min(width,core:getScreenWidth()-36),math.min(height,core:getScreenHeight()-48)
end

function U.color(color)
    return X.COLOR_RGB[color] or {U.gold.r,U.gold.g,U.gold.b}
end

function U.panel(panel)
    panel.backgroundColor=U.bg
    panel.borderColor=U.line
    panel.moveWithMouse=true
end

function U.fit(text,width,font)
    text=tostring(text or "")
    font=font or UIFont.Small
    if width<=0 then return "" end
    local tm=getTextManager()
    if tm:MeasureStringX(font,text)<=width then return text end
    while #text>0 and tm:MeasureStringX(font,text.."...")>width do text=string.sub(text,1,#text-1) end
    return text.."..."
end

function U.header(panel,title,subtitle,color)
    local a=U.color(color)
    panel:drawRect(0,0,panel.width,88,1,0.085,0.094,0.108)
    panel:drawRect(0,0,panel.width,3,1,a[1],a[2],a[3])
    panel:drawRect(0,87,panel.width,1,1,U.line.r,U.line.g,U.line.b)
    panel:drawText("PREFEITURA Z  /  "..U.textKey("Rewards"),22,15,U.gold.r,U.gold.g,U.gold.b,1,UIFont.Small)
    panel:drawText(U.fit(title,panel.width-44,UIFont.Medium),22,37,U.text.r,U.text.g,U.text.b,1,UIFont.Medium)
    panel:drawText(U.fit(subtitle,panel.width-44),22,65,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
end

function U.button(parent,x,y,width,label,fn,primary,color)
    local b=ISButton:new(x,y,width,32,label,parent,fn)
    b:initialise(); b:instantiate()
    local a=U.color(color)
    b.backgroundColor=primary and {r=a[1]*0.29,g=a[2]*0.29,b=a[3]*0.29,a=1} or U.card
    b.backgroundColorMouseOver={r=0.24,g=0.27,b=0.31,a=1}
    b.borderColor=primary and {r=a[1]*0.7,g=a[2]*0.7,b=a[3]*0.7,a=1} or U.line
    b.textColor=U.text
    parent:addChild(b)
    return b
end

function U.entry(parent,text,x,y,width)
    local e=ISTextEntryBox:new(text,x,y,width,30)
    e:initialise(); e:instantiate()
    e.backgroundColor=U.card; e.borderColor=U.line; e.textColor=U.text
    parent:addChild(e)
    return e
end

function U.list(parent,x,y,width,height,rowHeight)
    local l=ISScrollingListBox:new(x,y,width,height)
    l:initialise(); l:instantiate(); l.itemheight=rowHeight or 54
    l.backgroundColor={r=0.055,g=0.062,b=0.073,a=1}
    l.borderColor=U.line; l.textColor=U.text; l.drawBorder=true
    l.font=UIFont.Small
    parent:addChild(l)
    return l
end

function U.item(fullType)
    fullType=tostring(fullType or "")
    if U._items[fullType] then return U._items[fullType] end
    local d={name=X.resolveItemDisplayName(fullType),category=U.textKey("OtherItems"),texture=nil}
    local script
    pcall(function() script=ScriptManager.instance:getItem(fullType) end)
    if script then
        pcall(function()
            local icon=tostring(script:getIcon() or "")
            d.texture=getTexture("Item_"..icon) or getTexture("media/textures/Item_"..icon..".png")
        end)
        pcall(function()
            local categories=script:getWeaponCategories()
            local keys={longblade="LongBlade",smallblade="SmallBlade",blunt="Blunt",smallblunt="SmallBlunt",axe="Axes",spear="Spears"}
            local iterator=categories:iterator()
            while iterator:hasNext() do
                local name=string.gsub(string.lower(tostring(iterator:next())),"^base:","")
                if keys[name] then d.category=U.textKey(keys[name]); return end
            end
            local cat=tostring(script:getDisplayCategory() or "")
            if cat~="" then
                local value=getText("IGUI_ItemCat_"..cat)
                d.category=value~="IGUI_ItemCat_"..cat and value or cat
            end
        end)
    end
    U._items[fullType]=d
    return d
end

function U.drawItem(list,y,row,alt,color,mode)
    local e=row.item or {}
    local h=row.height or list.itemheight
    if y+list:getYScroll()+h<0 or y+list:getYScroll()>=list.height then return y+h end
    local a=U.color(color)
    local selected=list.selected==row.index
    if selected then list:drawRect(0,y,list.width,h-1,0.15,a[1],a[2],a[3])
    elseif alt then list:drawRect(0,y,list.width,h-1,1,0.075,0.083,0.096) end
    list:drawRect(0,y+h-1,list.width,1,1,0.14,0.16,0.19)
    if e.message then
        list:drawText(U.fit(e.message,list.width-30),15,y+17,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
        return y+h
    end
    local data=U.item(e.item or e.fullType)
    list:drawRect(10,y+8,36,36,1,0.14,0.15,0.17)
    if data.texture then list:drawTextureScaledAspect(data.texture,13,y+11,30,30,1,1,1,1) end
    local endSpace=mode=="picker" and 20 or 122
    list:drawText(U.fit(data.name,list.width-62-endSpace),58,y+8,U.text.r,U.text.g,U.text.b,1,UIFont.Small)
    local secondary=mode=="picker" and (e.fullType or e.item) or data.category
    list:drawText(U.fit(secondary,list.width-62-endSpace),58,y+29,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    if mode=="chance" or mode=="weight" then
        local total=list.totalWeight or 0
        local pct=X.formatWeightSharePct(e.weight,total)
        list:drawTextRight(string.format("%.2f%%",pct),list.width-19,y+8,a[1],a[2],a[3],1,UIFont.Small)
        if mode=="weight" then
            list:drawTextRight(U.textKey("WeightValue",tostring(e.weight or 0)),list.width-19,y+29,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
        else
            list:drawRect(list.width-83,y+34,64,3,1,0.19,0.21,0.24)
            list:drawRect(list.width-83,y+34,math.max(2,64*pct/100),3,1,a[1],a[2],a[3])
        end
    elseif mode=="reward" then
        list:drawTextRight("x"..tostring(e.count or 1),list.width-20,y+17,a[1],a[2],a[3],1,UIFont.Medium)
    end
    return y+h
end

function U.boxCard(panel,color,x,y,width,height)
    local a=U.color(color)
    panel:drawRect(x,y,width,height,1,U.card.r,U.card.g,U.card.b)
    panel:drawRect(x,y,width,2,1,a[1],a[2],a[3])
    local texture=getTexture("media/textures/UI_LootBox_"..color..".png")
    local size=math.min(width-24,142,height-110)
    if size>30 and texture then panel:drawTextureScaledAspect(texture,x+(width-size)/2,y+24,size,size,1,1,1,1) end
    local label=getText("IGUI_XsLootBoxes_Color_"..color)
    if X.repairTierDisplayName then label=X.repairTierDisplayName(color,label) end
    local ty=y+math.max(40,size)+44
    panel:drawTextCentre(label,x+width/2,ty,a[1],a[2],a[3],1,UIFont.Medium)
    panel:drawTextCentre(U.textKey("LootBox"),x+width/2,ty+29,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
end

function U.footer(panel,text)
    panel:drawRect(22,panel.height-66,panel.width-44,1,1,U.line.r,U.line.g,U.line.b)
    panel:drawText(U.fit(text,panel.width-190),22,panel.height-42,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
end
