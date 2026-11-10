require "XsLootBoxes_UI"
require "ISUI/ISLabel"
pcall(require,"ISUI/ISTickBox")
local X=XsLootBoxes
local U=X.UI
X.ConfigUI=ISPanel:derive("XsLootBoxesConfigUI")
local C=X.ConfigUI

function C:initialise() ISPanel.initialise(self); self:instantiate() end
function C:new()
    local w,h=U.size(1040,690)
    local o=ISPanel:new((getCore():getScreenWidth()-w)/2,(getCore():getScreenHeight()-h)/2,w,h)
    setmetatable(o,self); self.__index=self
    o.entries={}; o.color="White"; o.dirty=false
    U.panel(o)
    return o
end

function C:createChildren()
    self.left=math.min(196,math.floor(self.width*0.21))
    self.contentX=self.left+40
    self.colors=U.list(self,22,112,self.left,self.height-218,44)
    for _,color in ipairs(X.COLORS) do self.colors:addItem(getText("IGUI_XsLootBoxes_Color_"..color),color) end
    self.colors.selected=1
    self.colors.doDrawItem=function(list,y,row,alt)
        local a=U.color(row.item)
        if list.selected==row.index then list:drawRect(0,y,list.width,43,0.18,a[1],a[2],a[3]) end
        list:drawRect(0,y+7,3,30,1,a[1],a[2],a[3])
        local text=X.repairTierDisplayName(row.item,row.text)
        list:drawText(U.fit(text,list.width-24),14,y+13,U.text.r,U.text.g,U.text.b,1,UIFont.Small)
        return y+44
    end
    self.minRoll=U.entry(self,"1",self.contentX,140,52); self.minRoll:setOnlyNumbers(true)
    self.maxRoll=U.entry(self,"1",self.contentX+64,140,52); self.maxRoll:setOnlyNumbers(true)
    local wx=self.width-272
    self.weightEntry=U.entry(self,"1",wx,140,68); self.weightEntry:setOnlyNumbers(true)
    self.weightBtn=U.button(self,wx+78,139,172,U.textKey("ApplyWeight"),C.applyWeight,false)
    if ISTickBox then
        self.rareTick=ISTickBox:new(self.contentX,184,self.width-self.contentX-22,24,"",self,nil)
        self.rareTick:initialise(); self.rareTick:instantiate()
        self.rareTick:addOption(U.textKey("ChatRarePctToggle"),nil,nil); self:addChild(self.rareTick)
    end
    self.entriesList=U.list(self,self.contentX,222,self.width-self.contentX-22,self.height-330,54)
    self.entriesList.doDrawItem=function(list,y,row,alt) return U.drawItem(list,y,row,alt,self:selectedColor(),"weight") end
    local y=self.height-94
    self.namesBtn=U.button(self,22,y,self.left,U.textKey("TierNamesShort"),C.openNames,false)
    local gap=8
    local width=(self.width-self.contentX-22-3*gap)/4
    self.addBtn=U.button(self,self.contentX,y,width,U.textKey("BtnAddItems"),C.openPicker,false)
    self.removeBtn=U.button(self,self.contentX+width+gap,y,width,U.textKey("BtnRemoveShort"),C.removeSelected,false)
    self.resetBtn=U.button(self,self.contentX+2*(width+gap),y,width,U.textKey("BtnResetColor"),C.reset,false)
    self.saveBtn=U.button(self,self.contentX+3*(width+gap),y,width,U.textKey("BtnSave"),C.save,true)
    self.refreshBtn=U.button(self,self.width-264,self.height-51,118,U.textKey("BtnRefresh"),C.refreshRequest,false)
    self.closeBtn=U.button(self,self.width-138,self.height-51,116,U.textKey("BtnClose"),C.closeWindow,false)
    self:refreshFromServer()
end

function C:selectedColor()
    local row=self.colors.items[self.colors.selected]
    return row and row.item or "White"
end

function C:refreshFromServer()
    local cfg=X._clientConfigCache
    if not cfg and X.Store and not (isClient and isClient()) then cfg=X.Store.getConfig() end
    local color=self:selectedColor()
    self.color=color; self._loadedColor=color; self.entries={}; self.dirty=false; self._saving=false
    local box=cfg and cfg.boxes and cfg.boxes[color]
    local rolls=X.clampRolls(box and box.rolls)
    self.minRoll:setText(tostring(rolls.min)); self.maxRoll:setText(tostring(rolls.max))
    self._rollText=tostring(rolls.min)..":"..tostring(rolls.max)
    if box then for _,e in ipairs(box.entries or {}) do self.entries[#self.entries+1]={item=e.item,weight=e.weight} end end
    if self.rareTick then
        local enabled=not cfg or not cfg.chatRarePctEnabled or cfg.chatRarePctEnabled[color]~=false
        self.rareTick:setSelected(1,enabled); self._rareState=enabled
    end
    self:rebuildRows()
end

function C:rebuildRows()
    if not self.entriesList then return end
    self.entriesList:clear()
    local total=0
    for _,e in ipairs(self.entries) do total=total+(tonumber(e.weight) or 0) end
    self.entriesList.totalWeight=total
    for _,e in ipairs(self.entries) do self.entriesList:addItem(X.resolveItemDisplayName(e.item),e) end
end

function C:addEntry(ft,weight)
    if not ft or ft=="" then return false end
    for i,e in ipairs(self.entries) do
        if e.item==ft then self.entriesList.selected=i; return false end
    end
    self.entries[#self.entries+1]={item=ft,weight=tonumber(weight) or 1}
    self.dirty=true; self:rebuildRows(); self.entriesList.selected=#self.entries
    return true
end
function C:openPicker() if X.ItemPicker then X.ItemPicker.open(self,self:selectedColor()) end end
function C:removeSelected()
    local idx=self.entriesList.selected
    if idx and self.entries[idx] then table.remove(self.entries,idx); self.dirty=true; self:rebuildRows() end
end
function C:applyWeight()
    local idx=self.entriesList.selected
    if not idx or not self.entries[idx] then return end
    self.entries[idx].weight=math.max(1,math.min(1000000,tonumber(self.weightEntry:getText()) or 1))
    self.dirty=true; self:rebuildRows(); self.entriesList.selected=idx
end
function C:save()
    if #self.entries<1 then return end
    local rare=true
    if self.rareTick then rare=self.rareTick:isSelected(1) end
    self._saving=true
    sendClientCommand(getPlayer(),X.MODULE,X.CMD_TABLE_SET,{box=self:selectedColor(),entries=self.entries,
        rolls={min=tonumber(self.minRoll:getText()) or 1,max=tonumber(self.maxRoll:getText()) or 1},chatRarePctEnabled=rare})
end
function C:reset() self.dirty=false; self._saving=true; sendClientCommand(getPlayer(),X.MODULE,X.CMD_TABLE_RESET,{box=self:selectedColor()}) end
function C:refreshRequest() self.dirty=false; X.requestConfigSync() end
function C:openNames() if X.TierNamesUI then X.TierNamesUI.open() end end
function C:update()
    ISPanel.update(self)
    if self:selectedColor()~=self._loadedColor then self:refreshFromServer() end
    local idx=self.entriesList.selected
    if idx~=self._lastSelection then
        self._lastSelection=idx
        local e=self.entries[idx]
        if e then self.weightEntry:setText(tostring(e.weight)) end
    end
    local rollText=self.minRoll:getText()..":"..self.maxRoll:getText()
    if self._rollText and rollText~=self._rollText then self.dirty=true end
    if self.rareTick and self._rareState~=self.rareTick:isSelected(1) then self.dirty=true end
end
function C:prerender()
    ISPanel.prerender(self)
    U.header(self,U.textKey("WindowTitle"),X.tierDisplayLabel(self:selectedColor()),self:selectedColor())
    self:drawText(U.textKey("ItemsPerOpening"),self.contentX,115,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    self:drawText(U.textKey("SelectedWeight"),self.width-272,115,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    self:drawText("/",self.contentX+56,147,U.muted.r,U.muted.g,U.muted.b,1,UIFont.Small)
    local status=self.dirty and U.textKey("UnsavedChanges") or (X._syncPending and U.textKey("Loading") or U.countText("ConfiguredCount",#self.entries))
    U.footer(self,status)
end
function C:closeWindow() self:setVisible(false); self:removeFromUIManager(); if C.instance==self then C.instance=nil end end
function C.open()
    if C.instance then C.instance:closeWindow() end
    local ui=C:new(); ui:initialise(); ui:addToUIManager(); C.instance=ui
    X.requestConfigSync(); return ui
end

X.TierNamesUI=ISPanel:derive("XsLootBoxesTierNamesUI")
local N=X.TierNamesUI
function N:initialise() ISPanel.initialise(self); self:instantiate() end
function N:new()
    local w,h=U.size(610,458)
    local o=ISPanel:new((getCore():getScreenWidth()-w)/2,(getCore():getScreenHeight()-h)/2,w,h)
    setmetatable(o,self); self.__index=self; o.fields={}; U.panel(o); return o
end
function N:createChildren()
    local cfg=X._clientConfigCache
    local y=107
    local step=math.min(40,math.floor((self.height-183)/7))
    for _,color in ipairs(X.COLORS) do
        local field=U.entry(self,cfg and cfg.displayNames and cfg.displayNames[color] or X.DEFAULT_DISPLAY_NAMES[color],170,y,self.width-192)
        field:setHeight(math.min(30,step-4)); self.fields[color]=field
        y=y+step
    end
    self.saveBtn=U.button(self,22,self.height-51,190,U.textKey("BtnSaveTierNames"),N.save,true)
    self.closeBtn=U.button(self,self.width-138,self.height-51,116,U.textKey("BtnClose"),N.closeWindow,false)
end
function N:prerender()
    ISPanel.prerender(self)
    U.header(self,U.textKey("TierNamesShort"),U.textKey("TierNamesLabel"),nil)
    local y=112
    local step=math.min(40,math.floor((self.height-183)/7))
    for _,color in ipairs(X.COLORS) do
        local a=U.color(color)
        self:drawText(X.repairTierDisplayName(color,getText("IGUI_XsLootBoxes_Color_"..color)),22,y,a[1],a[2],a[3],1,UIFont.Small)
        y=y+step
    end
end
function N:save()
    local names={}
    for _,color in ipairs(X.COLORS) do names[color]=self.fields[color]:getText() end
    sendClientCommand(getPlayer(),X.MODULE,X.CMD_NAMES_SET,{displayNames=names}); self:closeWindow()
end
function N:closeWindow() self:setVisible(false); self:removeFromUIManager(); if N.instance==self then N.instance=nil end end
function N.open()
    if N.instance then N.instance:closeWindow() end
    local ui=N:new(); ui:initialise(); ui:addToUIManager(); N.instance=ui; return ui
end
