require "PRZMeleeGlowConfig"
require "PRZMeleeSlashVFXConfig"
require "PRZWeaponVFXConfig"

-- Reuse Xixi's pooled renderer and emissive shaders, replacing stale inherited
-- palettes, dimensions and flips instead of changing only a profile name.
local Config = PRZWeaponVFX.Config
local function copy(value)
    if type(value) ~= "table" then return value end
    local result = {}
    for k,v in pairs(value) do result[k] = copy(v) end
    return result
end
local function color(r,g,b,a) return {r=r,g=g,b=b,a=a or 1} end
local rows = {
    {id="TyrfingRubra", day="Base.PRZM_NocturnalEdge", base="longblade_duelist",
        color=color(.42,.68,1), palette={color(.28,.42,1),color(.58,.78,1),color(.88,.96,1)},
        width=1.42,height=.88,forward=.68,hand=.38,sequence="0023",burst="cool",size=.62,delay=205},
    {id="PunhalCastigoDivino", day="Base.PRZM_DivinepunishmentKnife", base="shortblade_stab",
        color=color(.72,.92,1), palette={color(.45,.74,1),color(.92,1,1)},
        width=.72,height=.28,forward=.53,hand=.84,sequence="0479",burst="cool",size=.36,delay=145},
    -- The permanent Taco ID uses the IridescentGalaxy greatsword mesh.
    {id="TacoSupremoZ", day="Base.PRZM_IridescentGalaxy", base="longblade_heavy",
        color=color(.8,.52,1), palette={color(.66,.36,1),color(.4,.78,1),color(1,.6,.88),color(1,.88,.5)},
        width=1.82,height=1.14,forward=.74,hand=.46,sequence="0143",burst="arcane",size=.88,delay=255},
    {id="MarteloDoTrovao", day="Base.PRZ_Mjolnir", base="hammer_shock",
        color=color(.4,.78,1), palette={color(.28,.62,1),color(.72,.94,1),color(1,1,1)},
        width=.58,height=.36,forward=.52,hand=.91,sequence="0141",burst="cool",size=.92,delay=215},
    {id="MachadoLeviata", day="Base.PRZArmoryTyphoonAxe", base="axe_colossal_polish",
        color=color(1,.38,.12), palette={color(1,.24,.08),color(1,.52,.12),color(1,.84,.4)},
        width=1.30,height=.96,forward=.64,hand=.68,sequence="0146",burst="warm",size=.72,delay=240},
    {id="TridentePoseidon", day="Base.PRZM_AngryThunderLance", base="polearm_thrust_polish",
        color=color(.3,.88,1), palette={color(.2,.58,1),color(.42,.94,1),color(.9,1,1)},
        width=1.76,height=.34,forward=.91,hand=1.44,sequence="0479",burst="cool",size=.46,delay=210},
}
for _,r in ipairs(rows) do
    local id="PRZWeapons."..r.id
    local name="omega_"..r.id
    local profile=copy(assert(Config.Profiles[r.base],r.base))
    profile.mainSequence,profile.burstSequence=r.sequence,r.burst
    profile.mainWidthTiles,profile.mainHeightTiles=r.width,r.height
    profile.pivotForwardTiles,profile.handForwardTiles=r.forward,r.hand
    profile.mainGlow,profile.mainCore=color(r.color.r,r.color.g,r.color.b,.42),color(1,1,1,.94)
    profile.burst=color(r.color.r,r.color.g,r.color.b,.9)
    profile.mainGlowPalette,profile.burstPalette=r.palette,r.palette
    profile.burstSizeTiles,profile.vfxDelayMs=r.size,r.delay
    -- Keep the endgame trail readable through the middle of the native swing.
    -- The inherited quadratic fade erased short thrusts almost immediately.
    profile.duration=math.max(profile.duration or .28,.28)
    profile.fadePower=1
    profile.burstLifePortion=math.max(profile.burstLifePortion or .5,.65)
    profile.mainFlipX,profile.burstFlipX=false,false
    Config.Profiles[name]=profile
    Config.WeaponBindings[id]={profile=name,scale=1,debounceMs=130}
    Config.GlowBindings[id]={r=r.color.r,g=r.color.g,b=r.color.b,radius=2,life=.14,count=1,spacing=.12,startHour=20,endHour=8}
    PRZMeleeGlowConfig.Weapons[id]={daySprite=r.day,nightSprite="Base.PRZOmegaS2_Glow_"..r.id}
    -- The slash renderer emits the impact light; no duplicate Hook.Attack flash.
    PRZMeleeSlashVFX.Config.Weapons[id]=nil
end
