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
  /** Deterministic source morph: preserve the exact item ID and do not advance RNG. */
  morphTo?: ItemType
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

const doggyBagTable:WeightedLootTable={
  id:'myhordes.doggy_bag',
  source:'MYHORDES_CURRENT',
  // MyHordes spawn_doggy. food_sandw_#00 maps to the existing Live2Nite `food` item.
  entries:[
    lootEntry('mouldy_twinkies',222),
    lootEntry('half_eaten_chicken_wings',194),
    lootEntry('rancid_shortbread_pack',188),
    lootEntry('out_of_date_jaffa_cakes',186),
    lootEntry('dried_chewing_gum',181),
    lootEntry('stale_tart',174),
    lootEntry('soft_crisps',168),
    lootEntry('food',162),
  ],
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

const canMorphTable:WeightedLootTable={
  id:'myhordes.can_open',
  source:'MYHORDES_CURRENT',
  // The source action is morph_open_can, not a random spawn. This table documents the target;
  // resolveOpenable handles morphTo before any weighted roll.
  entries:[lootEntry('open_can',1)],
}

export const OPENABLES:Partial<Record<ItemType,OpenableDefinition>>={
  resource_pack:{type:'resource_pack',source:'MYHORDES_CURRENT',mode:'remaining_contents',outputTable:resourcePackTable},
  doggy_bag:{type:'doggy_bag',source:'MYHORDES_CURRENT',mode:'consume',outputTable:doggyBagTable},
  // MyHordes can_#00 uses the "main" opener family. Saw Tool is not implemented yet;
  // the three already-live ordinary equivalents are wired now and the opener is not consumed.
  can:{type:'can',source:'MYHORDES_CURRENT',mode:'consume',morphTo:'open_can',openableBy:['can_opener','screwdriver','swiss_army_knife'],outputTable:canMorphTable},
  // MyHordes CHEST_TOOLS.openableBy includes CHAIR_BASIC, PC, WRENCH, CUTTER, BONE,
  // CUTCUT, SMALL_KNIFE, CHAIN, KNIFE, STAFF, CAN_OPENER, SCREW, SWISS_KNIFE and
  // HURLING_STICK. All ordinary source tools currently implemented in Live2Nite are wired
  // below. CHAIR_BASIC and PC land with their own ordinary-item mechanics; HURLING_STICK
  // remains event-gated and is intentionally not made normally available.
  toolbox:{
    type:'toolbox',source:'MYHORDES_CURRENT',mode:'consume',
    openableBy:['adjustable_spanner','box_cutter','human_bone','machete','pathetic_penknife','chain','serrated_knife','staff','can_opener','screwdriver','swiss_army_knife'],
    outputTable:toolboxTable,
  },
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
  if(definition.morphTo){
    return{success:true,outputs:[],containerAfter:createItemInstance(container.id,definition.morphTo),rngStateAfter:state.rngState}
  }
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
