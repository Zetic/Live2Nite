import type { Citizen, GameState, SpecialSiteState, WorldZone } from './types'
import type { RuinExplorerState, RuinInteriorCell, RuinInteriorState } from './ruinExploration'

export const SOURCE_RUIN_INITIAL_ZOMBIES=10
export const SOURCE_RUIN_DAILY_ZOMBIES=5
const ZOMBIE_PROFILE_VERSION=1
const MAX_RUIN_CELL_ZOMBIES=6

type RuinInteriorLifecycle=RuinInteriorState&{
  zombieProfileVersion?:number
  lastZombieGrowthDay?:number
}
type SiteWithInterior=SpecialSiteState&{interior?:RuinInteriorLifecycle}
type CitizenWithRuin=Citizen&{ruinExplorer?:RuinExplorerState}

function stableSeed(seed:number,x:number,y:number,label:string):number{
  let value=(seed^Math.imul(x+101,0x9e3779b1)^Math.imul(y+211,0x85ebca6b))>>>0
  for(let i=0;i<label.length;i+=1)value=Math.imul(value^label.charCodeAt(i),16777619)>>>0
  return value||0x6d2b79f5
}
function next(state:number):{state:number;value:number}{let x=state|0;x^=x<<13;x^=x>>>17;x^=x<<5;const nextState=x>>>0||0x6d2b79f5;return{state:nextState,value:nextState/0x100000000}}
function cellDepth(cell:RuinInteriorCell):number{return Math.abs(cell.x)+Math.abs(cell.y)+(cell.floor===0?0:4)}
function candidateCells(interior:RuinInteriorState):RuinInteriorCell[]{return interior.cells.filter((cell)=>cell.kind!=='entrance')}

function addZombies(interior:RuinInteriorState,count:number,seed:number,label:string):RuinInteriorState{
  let cells=interior.cells.map((cell)=>({...cell}))
  let rng=stableSeed(seed,0,0,`${interior.family}:${label}`)
  for(let placed=0;placed<count;placed+=1){
    const candidates=cells.filter((cell)=>cell.kind!=='entrance'&&cell.zombies<MAX_RUIN_CELL_ZOMBIES)
    if(!candidates.length)break
    const weights=candidates.map((cell)=>1+cellDepth(cell)*2+Math.min(3,cell.zombies)*5)
    const total=weights.reduce((sum,value)=>sum+value,0)
    const roll=next(rng);rng=roll.state;let cursor=roll.value*total;let selected=candidates[candidates.length-1]!
    for(let index=0;index<candidates.length;index+=1){cursor-=weights[index]!;if(cursor<=0){selected=candidates[index]!;break}}
    cells=cells.map((cell)=>cell.id===selected.id?{...cell,zombies:cell.zombies+1}:cell)
  }
  return{...interior,cells}
}

function totalZombies(interior:RuinInteriorState):number{return interior.cells.reduce((sum,cell)=>sum+cell.zombies,0)}

/**
 * The source count remains exactly ten. Live2Nite clusters that count into deeper
 * corridor pockets instead of scattering mostly single zombies across ~40 cells,
 * which makes the same source-sized threat visible and meaningful on our topology.
 */
export function normalizeInitialRuinZombieProfile(seed:number,x:number,y:number,interior:RuinInteriorState):RuinInteriorState{
  const lifecycle=interior as RuinInteriorLifecycle
  if(lifecycle.zombieProfileVersion===ZOMBIE_PROFILE_VERSION)return interior
  const currentTotal=totalZombies(interior)
  let normalized:RuinInteriorState=interior
  if(currentTotal===SOURCE_RUIN_INITIAL_ZOMBIES){
    normalized={...interior,cells:interior.cells.map((cell)=>({...cell,zombies:0}))}
    normalized=addZombies(normalized,SOURCE_RUIN_INITIAL_ZOMBIES,stableSeed(seed,x,y,'initial'),'initial')
  }
  return{...normalized,zombieProfileVersion:ZOMBIE_PROFILE_VERSION,lastZombieGrowthDay:lifecycle.lastZombieGrowthDay??1} as RuinInteriorLifecycle
}

export function advanceRuinInteriorToDay(seed:number,x:number,y:number,interior:RuinInteriorState,targetDay:number):RuinInteriorState{
  const original=interior as RuinInteriorLifecycle
  let current=normalizeInitialRuinZombieProfile(seed,x,y,interior) as RuinInteriorLifecycle
  // Legacy interiors did not record a growth day. Give them one normal +5 increment
  // at the next rollover instead of retroactively dumping several days at once.
  let last=original.lastZombieGrowthDay??Math.max(1,targetDay-1)
  while(last<targetDay){
    const nextDay=last+1
    current=addZombies(current,SOURCE_RUIN_DAILY_ZOMBIES,stableSeed(seed,x,y,`day:${nextDay}`),`day:${nextDay}`) as RuinInteriorLifecycle
    last=nextDay
  }
  return{...current,lastZombieGrowthDay:Math.max(last,targetDay)} as RuinInteriorLifecycle
}

/** Apply the +5 source rule to every already-instantiated explorable interior once per new day. */
export function advanceExplorableRuinLifecycleForNewDay(state:GameState,targetDay:number):GameState{
  let changed=false
  const zones:Record<string,WorldZone>={...state.world.zones}
  for(const[key,zone]of Object.entries(state.world.zones)){
    const site=zone.specialSite as SiteWithInterior|undefined
    if(!site?.interior)continue
    const nextInterior=advanceRuinInteriorToDay(state.seed,zone.x,zone.y,site.interior,targetDay) as RuinInteriorLifecycle
    const normalized={...nextInterior,activeExplorerCitizenId:null} as RuinInteriorLifecycle
    if(normalized!==site.interior||site.interior.activeExplorerCitizenId!==null){zones[key]={...zone,specialSite:{...site,interior:normalized} as SiteWithInterior};changed=true}
  }
  const citizens=state.citizens.map((citizen)=>{
    const current=citizen as CitizenWithRuin
    if(!current.ruinExplorer?.active)return citizen
    changed=true
    return{...current,ruinExplorer:{...current.ruinExplorer,active:false,escaping:false,graceUntilMs:null}} as Citizen
  })
  return changed?{...state,citizens,world:{...state.world,zones}}:state
}

export function ruinInteriorZombieTotal(interior:RuinInteriorState):number{return totalZombies(interior)}
export function ruinOccupiedZombieCells(interior:RuinInteriorState):number{return candidateCells(interior).filter((cell)=>cell.zombies>0).length}
