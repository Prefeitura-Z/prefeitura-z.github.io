require "XsLootBoxes_UI"
local X=XsLootBoxes
local U=X.UI
X.ItemPicker=ISPanel:derive("XsLootBoxesItemPicker")
local P=X.ItemPicker
function P:initialise() ISPanel.initialise(self); self:instantiate() end
function P:new(parent,color)
    local w,h=U.size(850,630)
    local o=ISPanel:new((getCore():getScreenWidth()-w)/2,(getCore():getScreenHeight()-h)/2,w,h)
    setmetatable(o,self); self.__index=self
    o.parentUI=parent; o.color=color; o.allItems={}; o.added=0; U.panel(o); return o
end
function P:createChildren()
    self.search=U.entry(self,"",22,110,self.width-44)
    self.search:setTooltip(U.textKey("SearchHint"))
    self.list=U.list(self,22,156,self.width-44,self.height-232,54)
    self.list.doDrawItem=function(list,y,row,alt) return U.drawItem(list,y,row,alt,self.color,"picker") end
    self.list:setOnMouseDoubleClick(self,P.addSelected)
    self.add=U.button(self,22,self.height-51,218,U.textKey("PickerBtnAddSelected"),P.addSelected,true,self.color)
    self.cancel=U.button(self,self.width-138,self.height-51,116,U.textKey("BtnClose"),P.closeWindow,false,self.color)
    self:loadItems(); self:filter()
end
function P:loadItems()
    self.allItems={}
    if not getAllItems then return end
    local items=getAllItems()
    if not items then return end
    local seen={}
    for i=0,items:size()-1 do
        local item=items:get(i)
        if item and (not item.getObsolete or not item:getObsolete()) and (not item.isHidden or not item:isHidden()) then
            local ok,ft=pcall(function() return item:getFullName() end)
            if ok and ft and not seen[tostring(ft)] then
                seen[tostring(ft)]=true
                self.allItems[#self.allItems+1]={fullType=tostring(ft),name=X.resolveItemDisplayName(ft)}
            end
        end
    end
    table.sort(self.allItems,function(a,b) return string.lower(a.name)<string.lower(b.name) end)
end
function P:filter()
    self.list:clear()
    local q=string.lower(self.search:getText() or "")
    for _,e in ipairs(self.allItems) do
        if q=="" or string.find(string.lower(e.name.." "..e.fullType),q,1,true) then self.list:addItem(e.name,e) end
    end
    if #self.list.items==0 then self.list:addItem("",{message=U.textKey("NoSearchResults")}) end
end
function P:update()
    ISPanel.update(self)
    local q=self.search:getText()
    if q~=self._lastQuery then self._lastQuery=q; self:filter() end
end
function P:prerender()
    ISPanel.prerender(self)
    U.header(self,U.textKey("PickerTitle",X.tierDisplayLabel(self.color)),U.textKey("PickerHint"),self.color)
    U.footer(self,"")
    self:drawText(U.countText("AddedCount",self.added),254,self.height-42,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
end
function P:addSelected()
    local row=self.list.items[self.list.selected]
    if row and row.item and row.item.fullType and self.parentUI and self.parentUI.addEntry then
        if self.parentUI:addEntry(row.item.fullType,1) then self.added=self.added+1 end
    end
end
function P:closeWindow() self:setVisible(false); self:removeFromUIManager() end
function P.open(parent,color)
    local ui=P:new(parent,color); ui:initialise(); ui:addToUIManager(); return ui
end
