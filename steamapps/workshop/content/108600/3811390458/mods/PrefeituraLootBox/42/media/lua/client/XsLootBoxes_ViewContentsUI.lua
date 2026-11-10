require "XsLootBoxes_UI"
local X=XsLootBoxes
local U=X.UI
X.ViewContentsUI=ISPanel:derive("XsLootBoxesViewContentsUI")
local V=X.ViewContentsUI

function V:initialise()
    ISPanel.initialise(self)
    self:instantiate()
end

function V:new(color)
    local w,h=U.size(930,620)
    local o=ISPanel:new((getCore():getScreenWidth()-w)/2,(getCore():getScreenHeight()-h)/2,w,h)
    setmetatable(o,self); self.__index=self
    o.color=color; o.side=w>=800 and 210 or 0; o.resultCount=0; o.totalCount=0
    U.panel(o)
    return o
end

function V:createChildren()
    self.contentX=22+self.side
    local width=self.width-self.contentX-22
    self.search=U.entry(self,"",self.contentX,190,width-128)
    self.search:setTooltip(U.textKey("SearchHint"))
    self.refresh=U.button(self,self.width-140,189,118,U.textKey("BtnRefresh"),V.requestRefresh,false,self.color)
    self.list=U.list(self,self.contentX,248,width,self.height-324,54)
    self.list.doDrawItem=function(list,y,row,alt) return U.drawItem(list,y,row,alt,self.color,"chance") end
    self.close=U.button(self,self.width-138,self.height-51,116,U.textKey("BtnClose"),V.closeWindow,true,self.color)
    self:reload()
end

function V:requestRefresh()
    X.requestConfigSync()
    self:reload()
end

function V:reload()
    if not self.list then return end
    self.list:clear()
    local cfg=X._clientConfigCache
    if not cfg and X.Store and not (isClient and isClient()) then cfg=X.Store.getConfig() end
    local box=cfg and cfg.boxes and cfg.boxes[self.color]
    self.totalCount=0; self.resultCount=0
    self.rolls=box and X.clampRolls(box.rolls) or {min=1,max=1}
    self.ready=X._clientConfigConfirmed or (X.Store and not (isClient and isClient()))
    if not self.ready or not box or type(box.entries)~="table" then
        self.list:addItem("",{message=U.textKey("Loading")})
        return
    end
    local total=0
    for _,e in ipairs(box.entries) do total=total+(tonumber(e.weight) or 0) end
    self.list.totalWeight=total
    self.totalCount=#box.entries
    local query=string.lower(self.search:getText() or "")
    for _,e in ipairs(box.entries) do
        local data=U.item(e.item)
        local haystack=string.lower(data.name.." "..data.category.." "..e.item)
        if query=="" or string.find(haystack,query,1,true) then
            self.list:addItem(data.name,e)
            self.resultCount=self.resultCount+1
        end
    end
    if self.totalCount==0 then self.list:addItem("",{message=U.textKey("ContentsEmpty")})
    elseif self.resultCount==0 then self.list:addItem("",{message=U.textKey("NoSearchResults")}) end
end

function V:update()
    ISPanel.update(self)
    local query=self.search and self.search:getText() or ""
    if query~=self._lastQuery then self._lastQuery=query; self:reload() end
end

function V:prerender()
    ISPanel.prerender(self)
    U.header(self,X.tierDisplayLabel(self.color),U.textKey("ContentsSubtitle"),self.color)
    if self.side>0 then U.boxCard(self,self.color,22,110,188,self.height-186) end
    local width=self.width-self.contentX-22
    local a=U.color(self.color)
    self:drawRect(self.contentX,110,width,58,1,U.card.r,U.card.g,U.card.b)
    self:drawText(U.textKey("AvailableItems"),self.contentX+14,118,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    self:drawText(tostring(self.totalCount),self.contentX+14,139,a[1],a[2],a[3],1,UIFont.Medium)
    local rx=self.contentX+math.floor(width*0.52)
    self:drawText(U.textKey("ItemsPerOpening"),rx,118,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    local rolls=self.rolls or {min=1,max=1}
    self:drawText(rolls.min==rolls.max and tostring(rolls.min) or (rolls.min.." - "..rolls.max),rx,139,U.text.r,U.text.g,U.text.b,1,UIFont.Medium)
    self:drawText(U.textKey("Search"),self.contentX,172,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    self:drawText(U.textKey("PossibleRewards"),self.contentX,226,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    self:drawTextRight(U.textKey("Chance"),self.width-40,226,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    local footer=X._syncPending and U.textKey("Loading") or U.textKey("ChanceHint")
    U.footer(self,footer)
end

function V:closeWindow()
    self:setVisible(false); self:removeFromUIManager()
    if V.instance==self then V.instance=nil end
end

function V.refreshVisibleWindow()
    if V.instance then V.instance:reload() end
end

function V.open(color)
    if not X.isKnownColor(color) then return end
    if V.instance then V.instance:closeWindow() end
    local ui=V:new(color); ui:initialise(); ui:addToUIManager(); V.instance=ui
    -- Ask even when a cached table exists: an old empty table is not authoritative.
    X.requestConfigSync()
    return ui
end
