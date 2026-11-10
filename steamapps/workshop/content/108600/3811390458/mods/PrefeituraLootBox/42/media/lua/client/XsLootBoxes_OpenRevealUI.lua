require "XsLootBoxes_UI"
local X=XsLootBoxes
local U=X.UI
X.RevealUI=ISPanel:derive("XsLootBoxesRevealUI")
local R=X.RevealUI

function R:initialise()
    ISPanel.initialise(self)
    self:instantiate()
end

local function play(name)
    local p=getPlayer()
    if p and p.getEmitter then pcall(function() p:getEmitter():playSound(name) end) end
end

function R:new(payload)
    local w,h=U.size(870,570)
    local o=ISPanel:new((getCore():getScreenWidth()-w)/2,(getCore():getScreenHeight()-h)/2,w,h)
    setmetatable(o,self); self.__index=self
    o.payload=payload or {}; o.color=o.payload.color or "White"; o.side=w>=780 and 210 or 0
    U.panel(o)
    return o
end

function R:createChildren()
    self.contentX=22+self.side
    local width=self.width-self.contentX-22
    self.list=U.list(self,self.contentX,166,width,self.height-242,54)
    self.list.doDrawItem=function(list,y,row,alt) return U.drawItem(list,y,row,alt,self.color,"reward") end
    local seen,order={},{}
    for _,ft in ipairs(self.payload.granted or {}) do
        if not seen[ft] then seen[ft]=0; order[#order+1]=ft end
        seen[ft]=seen[ft]+1
    end
    for _,ft in ipairs(order) do self.list:addItem(X.resolveItemDisplayName(ft),{item=ft,count=seen[ft]}) end
    self.rewardCount=#(self.payload.granted or {})
    if #order==0 then self.list:addItem("",{message=U.textKey("NoRewards")}) end
    self.close=U.button(self,self.width-138,self.height-51,116,U.textKey("BtnClose"),R.closeWindow,true,self.color)
    if #(self.payload.nestedBoxes or {})>0 then
        self.openNested=U.button(self,22,self.height-51,208,U.textKey("RevealNestedOpen"),R.openFirstNested,true,self.color)
    end
end

function R:prerender()
    ISPanel.prerender(self)
    U.header(self,U.textKey("RewardsReceived"),X.tierDisplayLabel(self.color),self.color)
    if self.side>0 then U.boxCard(self,self.color,22,110,188,self.height-186) end
    local a=U.color(self.color)
    local width=self.width-self.contentX-22
    self:drawRect(self.contentX,110,width,42,1,U.card.r,U.card.g,U.card.b)
    local mult=tonumber(self.payload.quantityMultiplier) or 1
    local label=mult>1 and (mult==3 and U.textKey("JackpotTriple") or U.textKey("JackpotDouble")) or U.textKey("OpeningComplete")
    self:drawText(U.fit(label,width-100),self.contentX+14,122,a[1],a[2],a[3],1,UIFont.Small)
    self:drawTextRight("x"..tostring(self.rewardCount),self.width-38,120,U.text.r,U.text.g,U.text.b,1,UIFont.Medium)
    U.footer(self,self.openNested and "" or U.countText("RewardCount",self.rewardCount))
end

function R:openFirstNested()
    local n=self.payload.nestedBoxes and self.payload.nestedBoxes[1]
    if not n then return end
    sendClientCommand(getPlayer(),X.MODULE,X.CMD_OPEN_BOX,{boxFullType=n.fullType,itemId=n.itemId,chainReveal=true})
    self:closeWindow()
end

function R:closeWindow()
    self:setVisible(false); self:removeFromUIManager()
    if R.instance==self then R.instance=nil end
end

function R.show(payload)
    if R.instance then R.instance:closeWindow() end
    play(X.SOUND_OPEN_WHOOSH); play(X.SOUND_OPEN_REVEAL)
    local ui=R:new(payload); ui:initialise(); ui:addToUIManager(); R.instance=ui
    return ui
end

local function onServer(module,command,args)
    if module~=X.MODULE then return end
    if command==X.SRV_OPEN_RESULT then R.show(args or {})
    elseif command==X.SRV_OPEN_FAILED then
        local msg=U.textKey("OpenFailed_"..tostring(args and args.reason or "unknown"))
        if HaloTextHelper and getPlayer() then HaloTextHelper.addText(getPlayer(),msg) end
    end
end
if X._revealServerHandler then Events.OnServerCommand.Remove(X._revealServerHandler) end
X._revealServerHandler=onServer
Events.OnServerCommand.Add(onServer)
