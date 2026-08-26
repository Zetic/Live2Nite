import { homeDefenseBonus } from './construction'
import { createItemInstance, homeDefenseFor } from './items'
import { guardianPersonalHomeDefenseBonus } from './professions'
import type { Citizen, CitizenDailyState, CitizenHome, GameEvent, GameState, HomeImprovementId, HomeLevel, ItemType } from './types'

export const BASE_HOME_STORAGE = 5
export const BASE_PERSONAL_HOME_DEFENSE = 2

export interface HomeLevelDefinition {
  level: HomeLevel
  name: string
  defense: number
  apCost: number
  resources: Partial<Record<ItemType, number>>
  /** Source requirements whose runtime item does not yet exist in Live2Nite. */
  unmodeledResources: readonly string[]
}

/**
 * MyHordes/Hordes mature home progression. Runtime item substitutions are intentionally
 * forbidden: when a source material is still absent from Live2Nite, the tier remains
 * visible but fails closed until that item is implemented.
 */
export const HOME_LEVELS: Record<HomeLevel, HomeLevelDefinition> = {
  camp_bed: { level:'camp_bed', name:'Camp Bed', defense:0, apCost:0, resources:{}, unmodeledResources:[] },
  tent: { level:'tent', name:'Tent', defense:1, apCost:2, resources:{}, unmodeledResources:[] },
  hovel: { level:'hovel', name:'Hovel', defense:4, apCost:4, resources:{ rotten_log:1 }, unmodeledResources:[] },
  shack: { level:'shack', name:'Shack', defense:9, apCost:5, resources:{ twisted_plank:1 }, unmodeledResources:[] },
  house: { level:'house', name:'House', defense:16, apCost:6, resources:{ scrap_metal:1 }, unmodeledResources:[] },
  fenced_house: {
    level:'fenced_house',name:'Fenced House',defense:25,apCost:6,
    resources:{twisted_plank:2,scrap_metal:2,patchwork_beam:1},
    unmodeledResources:['Padlock and Chain × 1'],
  },
  fortified_shelter: {
    level:'fortified_shelter',name:'Fortified Shelter',defense:36,apCost:7,
    resources:{unshaped_concrete_block:1,twisted_plank:2,scrap_metal:3,sheet_metal_bits:1},
    unmodeledResources:['Cardboard × 1'],
  },
  bunker: {
    level:'bunker',name:'Bunker',defense:49,apCost:7,
    resources:{nuts_and_bolts:1,unshaped_concrete_block:2,sheet_metal_bits:1,scrap_metal:6,old_door:1},
    unmodeledResources:['Metal Structure × 1','Powered Mini Hi-Fi × 1'],
  },
  castle: {
    level:'castle',name:'Castle',defense:64,apCost:8,
    resources:{nuts_and_bolts:2,unshaped_concrete_block:2,sheet_metal_bits:3,twisted_plank:5,scrap_metal:8,patchwork_beam:3},
    unmodeledResources:['Metal Structure × 2','Car Door × 1'],
  },
}

export const HOME_LEVEL_ORDER: readonly HomeLevel[] = ['camp_bed','tent','hovel','shack','house','fenced_house','fortified_shelter','bunker','castle']

export type HomeImprovementStatus='implemented'|'partial'|'wip'
export interface HomeImprovementDefinition {
  id: HomeImprovementId
  name: string
  maxLevel: number
  description: string
  defensePerLevel: number
  storagePerLevel: number
  apCost: (nextLevel:number) => number
  resources: (nextLevel:number) => Partial<Record<ItemType,number>>
  unmodeledResources: (nextLevel:number) => readonly string[]
  status: HomeImprovementStatus
  /** If false, the work is catalogued but cannot be constructed until its effect exists. */
  effectReady: boolean
}

function storageAp(nextLevel:number):number {
  if(nextLevel<=3)return 2
  if(nextLevel===4)return 3
  if(nextLevel===5)return 4
  return 6
}
function reinforcementAp(nextLevel:number):number{return nextLevel<=4?3:6}
function reinforcementResources(nextLevel:number):Partial<Record<ItemType,number>>{if(nextLevel===1)return{};return nextLevel>=7?{wire_mesh:1,scrap_metal:1}:{wire_mesh:1}}
function reinforcementMissing():readonly string[]{return[]}
function siestaResources(nextLevel:number):Partial<Record<ItemType,number>>{return nextLevel===2?{twisted_plank:1}:{}}
function siestaMissing(nextLevel:number):readonly string[]{return nextLevel===3?['Mattress × 1']:[]}
function kitchenResources(nextLevel:number):Partial<Record<ItemType,number>>{if(nextLevel===2)return{pathetic_penknife:1};if(nextLevel===3)return{carcinogenic_oven:1};if(nextLevel===4)return{student_refrigerator:1};return{}}
function kitchenMissing():readonly string[]{return[]}
function laboratoryResources(nextLevel:number):Partial<Record<ItemType,number>>{if(nextLevel===1)return{old_washing_machine:1};if(nextLevel===2)return{electronic_component:1};if(nextLevel===3)return{copper_pipe:1};if(nextLevel===4)return{engine:1};return{}}
function laboratoryMissing():readonly string[]{return[]}

export const HOME_IMPROVEMENTS: Record<HomeImprovementId,HomeImprovementDefinition> = {
  reinforcements:{
    id:'reinforcements',name:'Reinforcements',maxLevel:10,
    description:'Permanent reinforcement. Each installed level adds 1 personal and contributable home defense.',
    defensePerLevel:1,storagePerLevel:0,apCost:reinforcementAp,resources:reinforcementResources,unmodeledResources:reinforcementMissing,
    status:'implemented',effectReady:true,
  },
  fence:{
    id:'fence',name:'Fence',maxLevel:1,
    description:'Permanent defensive fencing. Adds 3 personal and contributable home defense.',
    defensePerLevel:3,storagePerLevel:0,apCost:()=>3,resources:()=>({chain:1}),unmodeledResources:()=>['Metal Structure × 1'],
    status:'partial',effectReady:true,
  },
  storage:{
    id:'storage',name:'More Storage',maxLevel:13,
    description:'Adds one permanent Home Chest slot per level.',
    defensePerLevel:0,storagePerLevel:1,apCost:storageAp,resources:()=>({}),unmodeledResources:()=>[],
    status:'implemented',effectReady:true,
  },
  alarm:{
    id:'alarm',name:'Rudimentary Alarm',maxLevel:1,
    description:'Identifies intrusion attempts and guarantees identification of theft from this home.',
    defensePerLevel:0,storagePerLevel:0,apCost:()=>4,resources:()=>({scrap_metal:1}),unmodeledResources:()=>[],
    status:'implemented',effectReady:true,
  },
  curtain:{
    id:'curtain',name:'Large Curtain',maxLevel:1,
    description:'Hides the Home Chest contents from visitors until they successfully intrude.',
    defensePerLevel:0,storagePerLevel:0,apCost:()=>4,resources:()=>({}),unmodeledResources:()=>[],
    status:'implemented',effectReady:true,
  },
  lock:{
    id:'lock',name:'Lock',maxLevel:1,
    description:'Prevents ordinary citizens from depositing into, intruding into or stealing from this home.',
    defensePerLevel:0,storagePerLevel:0,apCost:()=>6,resources:()=>({chain:1}),unmodeledResources:()=>['Padlock and Chain × 1'],
    status:'partial',effectReady:true,
  },
  siesta:{
    id:'siesta',name:'Siesta',maxLevel:3,
    description:'Provides one daily attempt below full AP to recover 2 AP. Success improves from 33% to 66% to 99%.',
    defensePerLevel:0,storagePerLevel:0,
    apCost:(nextLevel)=>nextLevel===1?6:nextLevel===2?3:4,
    resources:siestaResources,unmodeledResources:siestaMissing,
    status:'partial',effectReady:true,
  },
  kitchen:{
    id:'kitchen',name:'Kitchen',maxLevel:4,
    description:'Prepares ordinary cookable personal food into a Good or Dubious Home-made Meal. Success is 33/66/99/99%; levels 1–4 allow 1/1/2/3 attempts each day before Central Cafeteria.',
    defensePerLevel:0,storagePerLevel:0,
    apCost:(nextLevel)=>nextLevel===1?6:nextLevel===2?3:4,
    resources:kitchenResources,unmodeledResources:kitchenMissing,
    status:'implemented',effectReady:true,
  },
  laboratory:{
    id:'laboratory',name:'Home Laboratory',maxLevel:4,
    description:'Consumes 2 Pharmaceutical Products per experiment. Levels 1–4 have a 25/50/75/100% chance to produce Twinoid 500mg; other results are lesser pharmaceutical products.',
    defensePerLevel:0,storagePerLevel:0,
    apCost:(nextLevel)=>nextLevel===1?6:nextLevel===2||nextLevel===3?4:6,
    resources:laboratoryResources,unmodeledResources:laboratoryMissing,
    status:'implemented',effectReady:true,
  },
}

export function createDailyState(): CitizenDailyState {return{ate:false,drank:false,waterTaken:false}}

export function createStarterHome(citizenId: string): CitizenHome {
  return {
    level:'camp_bed',defense:HOME_LEVELS.camp_bed.defense,storageCapacity:BASE_HOME_STORAGE,
    storage:[createItemInstance(`starter-${citizenId}-doggy`,'doggy_bag'),createItemInstance(`starter-${citizenId}-welcome`,'citizen_welcome_pack')],
    upgradedDay:null,
    improvements:{reinforcements:0,fence:0,storage:0,alarm:0,curtain:0,lock:0,siesta:0,kitchen:0,laboratory:0},
    holdsBody:false,corpseAttacked:false,
  }
}

export function homeName(level:HomeLevel):string{return HOME_LEVELS[level].name}
export function nextHomeLevel(level:HomeLevel):HomeLevel|null{const index=HOME_LEVEL_ORDER.indexOf(level);return index>=0&&index<HOME_LEVEL_ORDER.length-1?HOME_LEVEL_ORDER[index+1]:null}
export function nextHomeDefinition(level:HomeLevel):HomeLevelDefinition|null{const next=nextHomeLevel(level);return next?HOME_LEVELS[next]:null}
export function homeLevelSourceReady(definition:HomeLevelDefinition):boolean{return definition.unmodeledResources.length===0}

export function personalMaterialCount(citizen:Citizen,type:ItemType):number{return citizen.inventory.filter((item)=>item.type===type).length+citizen.home.storage.filter((item)=>item.type===type).length}
export function hasPersonalMaterials(citizen:Citizen,resources:Partial<Record<ItemType,number>>):boolean{return Object.entries(resources).every(([type,amount])=>personalMaterialCount(citizen,type as ItemType)>=(amount??0))}

export function homeImprovementLevel(citizen:Citizen,id:HomeImprovementId):number{return citizen.home.improvements?.[id]??0}
export function hasHomeImprovement(citizen:Citizen,id:HomeImprovementId):boolean{return homeImprovementLevel(citizen,id)>0}
export function homeImprovementDefense(citizen:Citizen):number{return homeImprovementLevel(citizen,'reinforcements')*HOME_IMPROVEMENTS.reinforcements.defensePerLevel+homeImprovementLevel(citizen,'fence')*HOME_IMPROVEMENTS.fence.defensePerLevel}
export function contributableHomeDefense(citizen:Citizen,state?:GameState):number{return citizen.home.defense+homeImprovementDefense(citizen)+(state?homeDefenseBonus(state):0)}
export function personalDefense(citizen:Citizen,state?:GameState):number{return BASE_PERSONAL_HOME_DEFENSE+guardianPersonalHomeDefenseBonus(citizen)+contributableHomeDefense(citizen,state)+citizen.home.storage.reduce((sum,item)=>sum+homeDefenseFor(item.type),0)}

export function improvementNextLevel(citizen:Citizen,id:HomeImprovementId):number|null{const current=homeImprovementLevel(citizen,id);return current<HOME_IMPROVEMENTS[id].maxLevel?current+1:null}
export function improvementStorageCapacity(citizen:Citizen):number{return BASE_HOME_STORAGE+homeImprovementLevel(citizen,'storage')*HOME_IMPROVEMENTS.storage.storagePerLevel}
export function improvementSourceReady(definition:HomeImprovementDefinition,nextLevel:number):boolean{return definition.unmodeledResources(nextLevel).length===0}
export function canBuildImprovementSource(definition:HomeImprovementDefinition,nextLevel:number):boolean{return definition.effectReady&&improvementSourceReady(definition,nextLevel)}

export function homePreventsTheft(citizen:Citizen):boolean{return HOME_LEVEL_ORDER.indexOf(citizen.home.level)>=HOME_LEVEL_ORDER.indexOf('fenced_house')||hasHomeImprovement(citizen,'lock')}
export function homeHasCurtain(citizen:Citizen):boolean{return hasHomeImprovement(citizen,'curtain')}
export function homeHasAlarm(citizen:Citizen):boolean{return hasHomeImprovement(citizen,'alarm')}

function eventThisDay(state:GameState,citizenId:string,predicate:(event:GameEvent)=>boolean):boolean{return state.events.some((event)=>event.day===state.day&&'citizenId'in event&&event.citizenId===citizenId&&predicate(event))}
export function homeTransferUsedToday(state:GameState,citizenId:string):boolean{return eventThisDay(state,citizenId,(event)=>event.type==='HOME_ITEM_DEPOSITED'||event.type==='HOME_ITEM_STOLEN'||event.type==='HOME_ITEM_PILLAGED')}
export function theftUsedToday(state:GameState,citizenId:string):boolean{return homeTransferUsedToday(state,citizenId)}
export function pillageUsedToday(state:GameState,citizenId:string):boolean{return homeTransferUsedToday(state,citizenId)}
export function siestaUsedToday(state:GameState,citizenId:string):boolean{return eventThisDay(state,citizenId,(event)=>event.type==='HOME_SIESTA_USED')}
export function intrudedHomeToday(state:GameState,citizenId:string,targetCitizenId:string):boolean{return state.events.some((event)=>event.day===state.day&&event.type==='HOME_INTRUSION_ATTEMPTED'&&event.citizenId===citizenId&&event.targetCitizenId===targetCitizenId&&event.success)}
export function foreignHomeStorageVisible(state:GameState,citizenId:string,target:Citizen):boolean{return !target.alive||!homeHasCurtain(target)||intrudedHomeToday(state,citizenId,target.id)}

export function siestaChancePercent(citizen:Citizen):number{const level=homeImprovementLevel(citizen,'siesta');return level<=0?0:level===1?33:level===2?66:99}
