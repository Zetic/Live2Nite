import { homeDefenseBonus } from './construction'
import { createItemInstance, homeDefenseFor } from './items'
import type { Citizen, CitizenDailyState, CitizenHome, GameState, HomeImprovementId, HomeLevel, ItemType } from './types'

export const BASE_HOME_STORAGE = 4

export interface HomeLevelDefinition {
  level: HomeLevel
  name: string
  defense: number
  apCost: number
  resources: Partial<Record<ItemType, number>>
  historicalMaterials: boolean
}

/**
 * Season-16 Hordes home defense/AP progression. The first four material costs map directly
 * to items already represented by Live2Nite. Higher tiers preserve the historical path,
 * AP, and defense values but use documented Live2Nite substitutions until the broader
 * resource catalog (beams, chains, sheet fragments, nuts/bolts, metal structures, etc.) exists.
 */
export const HOME_LEVELS: Record<HomeLevel, HomeLevelDefinition> = {
  camp_bed: { level:'camp_bed', name:'Camp Bed', defense:0, apCost:0, resources:{}, historicalMaterials:true },
  tent: { level:'tent', name:'Tent', defense:1, apCost:2, resources:{}, historicalMaterials:true },
  hovel: { level:'hovel', name:'Hovel', defense:4, apCost:4, resources:{ rotten_log:1 }, historicalMaterials:true },
  shack: { level:'shack', name:'Shack', defense:9, apCost:5, resources:{ twisted_plank:1 }, historicalMaterials:true },
  house: { level:'house', name:'House', defense:16, apCost:6, resources:{ scrap_metal:1 }, historicalMaterials:true },
  fenced_house: { level:'fenced_house', name:'Fenced House', defense:25, apCost:6, resources:{ twisted_plank:2, wrought_iron:2 }, historicalMaterials:false },
  fortified_shelter: { level:'fortified_shelter', name:'Fortified Shelter', defense:36, apCost:7, resources:{ unshaped_concrete_block:1, twisted_plank:2, wrought_iron:3 }, historicalMaterials:false },
  bunker: { level:'bunker', name:'Bunker', defense:49, apCost:7, resources:{ unshaped_concrete_block:2, twisted_plank:2, wrought_iron:6, old_door:1 }, historicalMaterials:false },
  castle: { level:'castle', name:'Castle', defense:64, apCost:8, resources:{ unshaped_concrete_block:2, twisted_plank:5, wrought_iron:8, old_door:1, battery:1 }, historicalMaterials:false },
}

export const HOME_LEVEL_ORDER: readonly HomeLevel[] = ['camp_bed','tent','hovel','shack','house','fenced_house','fortified_shelter','bunker','castle']

export interface HomeImprovementDefinition {
  id: HomeImprovementId
  name: string
  maxLevel: number
  description: string
  defensePerLevel: number
  storagePerLevel: number
  apCost: (nextLevel:number) => number
  resources: (nextLevel:number) => Partial<Record<ItemType,number>>
  historicalEffect: boolean
  historicalCost: boolean
}

function storageAp(nextLevel:number):number {
  if(nextLevel<=3)return 2
  if(nextLevel===4)return 3
  if(nextLevel===5)return 4
  return 6
}
function reinforcementAp(nextLevel:number):number {return nextLevel<=4?3:6}
function reinforcementResources(nextLevel:number):Partial<Record<ItemType,number>> {
  if(nextLevel===1)return{}
  if(nextLevel>=7)return{wrought_iron:1,scrap_metal:1}
  return{wrought_iron:1}
}

export const HOME_IMPROVEMENTS: Record<HomeImprovementId,HomeImprovementDefinition> = {
  reinforcements:{
    id:'reinforcements',name:'Reinforcements',maxLevel:10,
    description:'Permanent structural reinforcement. Each level adds 1 personal defense and is eligible for town contribution.',
    defensePerLevel:1,storagePerLevel:0,apCost:reinforcementAp,resources:reinforcementResources,
    historicalEffect:true,historicalCost:false,
  },
  fence:{
    id:'fence',name:'Fence',maxLevel:1,
    description:'A permanent defensive fence around the home. It adds 3 personal defense and contributes to town defense.',
    defensePerLevel:3,storagePerLevel:0,apCost:()=>3,resources:()=>({twisted_plank:1,wrought_iron:1}),
    historicalEffect:true,historicalCost:false,
  },
  storage:{
    id:'storage',name:'More Storage',maxLevel:13,
    description:'Adds one permanent Home Chest slot per level.',
    defensePerLevel:0,storagePerLevel:1,apCost:storageAp,resources:()=>({}),
    historicalEffect:true,historicalCost:true,
  },
}

export function createDailyState(): CitizenDailyState {
  return { ate: false, drank: false, waterTaken: false }
}

export function createStarterHome(citizenId: string): CitizenHome {
  return {
    level: 'camp_bed',
    defense: HOME_LEVELS.camp_bed.defense,
    storageCapacity: BASE_HOME_STORAGE,
    storage: [
      createItemInstance(`starter-${citizenId}-doggy`, 'doggy_bag'),
      createItemInstance(`starter-${citizenId}-welcome`, 'citizen_welcome_pack'),
    ],
    upgradedDay:null,
    improvements:{reinforcements:0,fence:0,storage:0},
  }
}

export function homeName(level: HomeLevel): string { return HOME_LEVELS[level].name }

export function nextHomeLevel(level: HomeLevel): HomeLevel | null {
  const index=HOME_LEVEL_ORDER.indexOf(level)
  return index>=0&&index<HOME_LEVEL_ORDER.length-1?HOME_LEVEL_ORDER[index+1]:null
}

export function nextHomeDefinition(level:HomeLevel):HomeLevelDefinition|null {
  const next=nextHomeLevel(level)
  return next?HOME_LEVELS[next]:null
}

export function personalMaterialCount(citizen:Citizen,type:ItemType):number {
  return citizen.inventory.filter((item)=>item.type===type).length+citizen.home.storage.filter((item)=>item.type===type).length
}

export function hasPersonalMaterials(citizen:Citizen,resources:Partial<Record<ItemType,number>>):boolean {
  return Object.entries(resources).every(([type,amount])=>personalMaterialCount(citizen,type as ItemType)>=(amount??0))
}

export function homeImprovementDefense(citizen:Citizen):number {
  return (citizen.home.improvements?.reinforcements??0)*HOME_IMPROVEMENTS.reinforcements.defensePerLevel
    +(citizen.home.improvements?.fence??0)*HOME_IMPROVEMENTS.fence.defensePerLevel
}

/** Structural/improvement defense eligible for the historical 40%/80% town contribution. */
export function contributableHomeDefense(citizen:Citizen,state?:GameState):number {
  return citizen.home.defense+homeImprovementDefense(citizen)+(state?homeDefenseBonus(state):0)
}

export function personalDefense(citizen: Citizen, state?: GameState): number {
  return contributableHomeDefense(citizen,state)
    + citizen.home.storage.reduce((sum, item) => sum + homeDefenseFor(item.type), 0)
}

export function improvementNextLevel(citizen:Citizen,id:HomeImprovementId):number|null {
  const current=citizen.home.improvements?.[id]??0
  return current<HOME_IMPROVEMENTS[id].maxLevel?current+1:null
}

export function improvementStorageCapacity(citizen:Citizen):number {
  return BASE_HOME_STORAGE+(citizen.home.improvements?.storage??0)*HOME_IMPROVEMENTS.storage.storagePerLevel
}
