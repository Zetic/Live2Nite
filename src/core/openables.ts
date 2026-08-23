import { createItemInstance, normalizeItemState } from './items'
import { lootEntry, rollWeightedLoot, type WeightedLootTable } from './loot'
import type { GameState, ItemInstance, ItemState, ItemType } from './types'

export type OpenableMode = 'consume' | 'remaining_contents' | 'attempt'

export interface OpenableDefinition {
  type: ItemType
  source: 'MYHORDES_CURRENT' | 'LIVE2NITE_ADAPTATION'
  mode: OpenableMode
  outputTable: WeightedLootTable
  apCost?: number
  successPercent?: number
  /**
   * Source-faithful item types that can open this container. The tool is not consumed unless
   * the source action explicitly says so. Empty means the container can be opened directly.
   */
  openableBy?: readonly ItemType[]
}

export interface OpenableResolution {
  success: boolean
  outputs: ItemInstance[]
  containerAfter?: ItemInstance
  rngStateAfter: number
}

const resourcePackTable:WeightedLootTable={
  id:'myhordes.resource_pack',
  source:'MYHORDES_CURRENT',
  // MyHordes spawn_matbox selects between WOOD2 and METAL.
  entries:[lootEntry('twisted_plank',1),lootEntry('wrought_iron',1)],
}

const toolboxTable:WeightedLootTable={
  id:'myhordes.toolbox',
  source:'MYHORDES_CURRENT',
  // MyHordes 5.1.1 spawn_toolbox: pharma 25, explo 19, meca_parts 17,
  // rustine 13, tube 13, pile 12. Live2Nite names map directly to those roles.
  entries:[
    lootEntry('pharmaceutical_products',25),
    lootEntry('semtex',19),
    lootEntry('nuts_and_bolts',17),
    lootEntry('kwik_fix',13),
    lootEntry('copper_pipe',13),
    lootEntry('battery',12),
  ],
}

export const OPENABLES:Partial<Record<ItemType,OpenableDefinition>>={
  resource_pack:{type:'resource_pack',source:'MYHORDES_CURRENT',mode:'remaining_contents',outputTable:resourcePackTable},
  // MyHordes CHEST_TOOLS.openableBy includes CHAIR_BASIC, PC, WRENCH, CUTTER, BONE,
  // CUTCUT, SMALL_KNIFE, CHAIN, KNIFE, STAFF, CAN_OPENER, SCREW, SWISS_KNIFE and
  // HURLING_STICK. Existing Live2Nite equivalents are BONE -> Human Bone,
  // CUTCUT -> Machete, SMALL_KNIFE -> Pathetic Penknife, KNIFE -> Serrated Knife,
  // and STAFF -> Staff. Remaining ordinary source tools land with the normal-loot graph.
  toolbox:{type:'toolbox',source:'MYHORDES_CURRENT',mode:'consume',openableBy:['human_bone','machete','pathetic_penknife','serrated_knife','staff'],outputTable:toolboxTable},
}

export function openableDefinition(type:ItemType):OpenableDefinition|null{return OPENABLES[type]??null}
export function openableRequiresTool(definition:OpenableDefinition):boolean{return Boolean(definition.openableBy?.length)}
export function canToolOpen(definition:OpenableDefinition,type:ItemType):boolean{return !definition.openableBy?.length||definition.openableBy.includes(type)}

function generatedItem(state:GameState,type:ItemType,offset:number,itemState?:ItemState):ItemInstance{
  return createItemInstance(`i${String(state.nextItemId+offset).padStart(6,'0')}`,type,itemState)
}

export function resolveOpenable(state:GameState,container:ItemInstance):OpenableResolution{
  const definition=openableDefinition(container.type)
  if(!definition)throw new Error(`${container.type} has no source-backed openable definition`)
  let rngState=state.rngState
  if(definition.mode==='attempt'){
    const chance=Math.max(0,Math.min(100,definition.successPercent??100))
    const attempt=rollWeightedLoot(rngState,{id:`${definition.outputTable.id}.attempt`,source:definition.source,entries:[
      {items:[],weight:100-chance},
      {items:[{type:container.type}],weight:chance},
    ]})
    rngState=attempt.rngStateAfter
    if(attempt.items.length===0)return{success:false,outputs:[],containerAfter:container,rngStateAfter:rngState}
  }
  const rolled=rollWeightedLoot(rngState,definition.outputTable)
  rngState=rolled.rngStateAfter
  const outputs=rolled.items.map((spec,index)=>generatedItem(state,spec.type,index,spec.state))
  if(definition.mode==='remaining_contents'){
    const current=normalizeItemState(container.type,container.state).contents??1
    if(current>1){
      const containerAfter=createItemInstance(container.id,container.type,{...normalizeItemState(container.type,container.state),contents:current-1})
      return{success:true,outputs,containerAfter,rngStateAfter:rngState}
    }
  }
  return{success:true,outputs,rngStateAfter:rngState}
}