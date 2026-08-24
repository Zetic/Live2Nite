import { createItemInstance, normalizeItemState } from './items'
import type { Citizen, CombinationEventOutput, CombinationRecipeId, GameCommand, GameState, ItemInstance, ItemState, ItemType, PersonalItemStorage } from './types'

export type CombinationCategory='assemble'|'reload'|'repair'
export interface CombinationInputRule {
  type:ItemType
  count?:number
  condition?:ItemState['condition']
  chargesBelow?:number
}
export interface CombinationRecipe {
  id:CombinationRecipeId
  name:string
  category:CombinationCategory
  apCost:number
  inputs:CombinationInputRule[]
  outputType:ItemType
  summary:string
  source:'MYHORDES_CURRENT'
}

type PersonalRef={item:ItemInstance;storage:PersonalItemStorage}

const recipe=(value:CombinationRecipe):CombinationRecipe=>value
const repairRecipe=(id:CombinationRecipeId,name:string,broken:ItemType,repaired:ItemType,tool:'repair_kit'|'kwik_fix'):CombinationRecipe=>recipe({
  id,name,category:'repair',apCost:1,
  inputs:[{type:broken},{type:tool,...(tool==='repair_kit'?{condition:'intact' as const}:{})}],
  outputType:repaired,
  summary:`${broken} + ${tool} → ${repaired}`,
  source:'MYHORDES_CURRENT',
})

export const COMBINATION_RECIPES:Record<CombinationRecipeId,CombinationRecipe>={
  assemble_telescope:recipe({id:'assemble_telescope',name:'Assemble Telescope',category:'assemble',apCost:0,inputs:[{type:'copper_pipe'},{type:'convex_lens'}],outputType:'telescope',summary:'Copper Pipe + Convex Lens → Telescope',source:'MYHORDES_CURRENT'}),
  assemble_guitar:recipe({id:'assemble_guitar',name:'Assemble Makeshift Guitar',category:'assemble',apCost:0,inputs:[{type:'wire_reel'},{type:'empty_oil_can'},{type:'broken_staff'}],outputType:'guitar',summary:'Wire Reel + Empty Oil Can + Broken Staff → Guitar',source:'MYHORDES_CURRENT'}),
  assemble_repair_kit:recipe({id:'assemble_repair_kit',name:'Assemble Repair Kit',category:'assemble',apCost:0,inputs:[{type:'tool_bag'},{type:'duct_tape'},{type:'nuts_and_bolts'},{type:'twisted_plank'}],outputType:'repair_kit',summary:'Tool Bag + Duct Tape + Nuts & Bolts + Twisted Plank → Repair Kit',source:'MYHORDES_CURRENT'}),
  assemble_engine:recipe({id:'assemble_engine',name:'Assemble Engine',category:'assemble',apCost:0,inputs:[{type:'engine_incomplete'},{type:'duct_tape'},{type:'nuts_and_bolts'},{type:'wrought_iron'},{type:'compact_detonator'},{type:'human_bone'}],outputType:'engine',summary:'Incomplete Engine + Duct Tape + Nuts & Bolts + Wrought Iron + Compact Detonator + Human Bone → Engine',source:'MYHORDES_CURRENT'}),
  assemble_claymore:recipe({id:'assemble_claymore',name:'Assemble Claymore Mine',category:'assemble',apCost:0,inputs:[{type:'wire_reel'},{type:'semtex'},{type:'nuts_and_bolts'},{type:'duct_tape'}],outputType:'claymore',summary:'Wire Reel + Semtex + Nuts & Bolts + Duct Tape → Claymore Mine',source:'MYHORDES_CURRENT'}),
  assemble_torch:recipe({id:'assemble_torch',name:'Make Torch',category:'assemble',apCost:0,inputs:[{type:'box_of_matches'},{type:'rotten_log'}],outputType:'torch',summary:'Box of Matches + Rotting Log → Torch',source:'MYHORDES_CURRENT'}),
  assemble_hacksaw:recipe({id:'assemble_hacksaw',name:'Repair Hacksaw',category:'assemble',apCost:0,inputs:[{type:'saw_tool_part'},{type:'kwik_fix'},{type:'nuts_and_bolts'}],outputType:'saw_tool',summary:'Damaged Hacksaw + Kwik-Fix + Nuts & Bolts → Hacksaw',source:'MYHORDES_CURRENT'}),
  prepare_spicy_noodles:recipe({id:'prepare_spicy_noodles',name:'Prepare Spicy Chinese Noodles',category:'assemble',apCost:0,inputs:[{type:'chinese_noodles'},{type:'strong_spices'},{type:'water_ration'}],outputType:'spicy_chinese_noodles',summary:'Chinese Noodles + Strong Spices + Water Ration → Spicy Chinese Noodles',source:'MYHORDES_CURRENT'}),
  mix_concrete:recipe({id:'mix_concrete',name:'Mix Concrete Block',category:'assemble',apCost:0,inputs:[{type:'bag_of_cement'},{type:'water_ration'}],outputType:'unshaped_concrete_block',summary:'Bag of Cement + Water Ration → Unshaped Concrete Block',source:'MYHORDES_CURRENT'}),
  fill_water_bomb:recipe({id:'fill_water_bomb',name:'Fill Water Bomb',category:'assemble',apCost:0,inputs:[{type:'plastic_bag'},{type:'water_ration'}],outputType:'water_bomb',summary:'Plastic Bag + Water Ration → Water Bomb',source:'MYHORDES_CURRENT'}),

  reload_water_pistol:recipe({id:'reload_water_pistol',name:'Reload Water Pistol',category:'reload',apCost:0,inputs:[{type:'water_pistol',chargesBelow:3},{type:'water_ration'}],outputType:'water_pistol',summary:'Water Pistol + Water Ration → 3 shots',source:'MYHORDES_CURRENT'}),
  refill_water_cooler:recipe({id:'refill_water_cooler',name:'Refill Water Cooler Bottle',category:'reload',apCost:0,inputs:[{type:'water_cooler_bottle',chargesBelow:3},{type:'water_ration'}],outputType:'water_cooler_bottle',summary:'Water Cooler Bottle + Water Ration → +1 ration',source:'MYHORDES_CURRENT'}),
  reload_battery_launcher:recipe({id:'reload_battery_launcher',name:'Reload Battery Launcher',category:'reload',apCost:0,inputs:[{type:'battery_launcher',chargesBelow:1},{type:'battery'}],outputType:'battery_launcher',summary:'Battery Launcher + Battery → loaded',source:'MYHORDES_CURRENT'}),
  load_radio_battery:recipe({id:'load_radio_battery',name:'Load Radio Battery',category:'reload',apCost:0,inputs:[{type:'radio_cassette_player_off'},{type:'battery'}],outputType:'working_radio',summary:'Radio Cassette Player (no battery) + Battery → Working Radio',source:'MYHORDES_CURRENT'}),
  load_ems_battery:recipe({id:'load_ems_battery',name:'Charge EMS System',category:'reload',apCost:0,inputs:[{type:'ems_system_empty'},{type:'battery'}],outputType:'ems_system_charged',summary:'EMS System (discharged) + Battery → EMS System (charged)',source:'MYHORDES_CURRENT'}),

  repair_human_bone:repairRecipe('repair_human_bone','Repair Human Bone','broken_human_bone','human_bone','repair_kit'),
  repair_penknife:repairRecipe('repair_penknife','Repair Pathetic Penknife','broken_pathetic_penknife','pathetic_penknife','repair_kit'),
  repair_staff:repairRecipe('repair_staff','Repair Staff','broken_staff','staff','repair_kit'),
  repair_serrated_knife:repairRecipe('repair_serrated_knife','Repair Serrated Knife','broken_serrated_knife','serrated_knife','repair_kit'),
  repair_machete:repairRecipe('repair_machete','Repair Machete','broken_machete','machete','repair_kit'),
  repair_adjustable_spanner:repairRecipe('repair_adjustable_spanner','Repair Adjustable Spanner','broken_adjustable_spanner','adjustable_spanner','repair_kit'),
  repair_screwdriver:repairRecipe('repair_screwdriver','Repair Screwdriver','broken_screwdriver','screwdriver','repair_kit'),
  repair_swiss_army_knife:repairRecipe('repair_swiss_army_knife','Repair Swiss Army Knife','broken_swiss_army_knife','swiss_army_knife','repair_kit'),
  repair_box_cutter:repairRecipe('repair_box_cutter','Repair Box Cutter','broken_box_cutter','box_cutter','repair_kit'),
  repair_chain:repairRecipe('repair_chain','Repair Chain','broken_chain','chain','repair_kit'),
  repair_can_opener:repairRecipe('repair_can_opener','Repair Can Opener','broken_can_opener','can_opener','repair_kit'),
  repair_ektorp_gluten_chair:repairRecipe('repair_ektorp_gluten_chair','Repair Ektorp-Gluten Chair','broken_ektorp_gluten_chair','ektorp_gluten_chair','repair_kit'),
  repair_pc_base_unit:repairRecipe('repair_pc_base_unit','Repair PC Base Unit','broken_pc_base_unit','pc_base_unit','repair_kit'),

  kwik_fix_human_bone:repairRecipe('kwik_fix_human_bone','Kwik-Fix Human Bone','broken_human_bone','human_bone','kwik_fix'),
  kwik_fix_penknife:repairRecipe('kwik_fix_penknife','Kwik-Fix Pathetic Penknife','broken_pathetic_penknife','pathetic_penknife','kwik_fix'),
  kwik_fix_staff:repairRecipe('kwik_fix_staff','Kwik-Fix Staff','broken_staff','staff','kwik_fix'),
  kwik_fix_serrated_knife:repairRecipe('kwik_fix_serrated_knife','Kwik-Fix Serrated Knife','broken_serrated_knife','serrated_knife','kwik_fix'),
  kwik_fix_machete:repairRecipe('kwik_fix_machete','Kwik-Fix Machete','broken_machete','machete','kwik_fix'),
  kwik_fix_adjustable_spanner:repairRecipe('kwik_fix_adjustable_spanner','Kwik-Fix Adjustable Spanner','broken_adjustable_spanner','adjustable_spanner','kwik_fix'),
  kwik_fix_screwdriver:repairRecipe('kwik_fix_screwdriver','Kwik-Fix Screwdriver','broken_screwdriver','screwdriver','kwik_fix'),
  kwik_fix_swiss_army_knife:repairRecipe('kwik_fix_swiss_army_knife','Kwik-Fix Swiss Army Knife','broken_swiss_army_knife','swiss_army_knife','kwik_fix'),
  kwik_fix_box_cutter:repairRecipe('kwik_fix_box_cutter','Kwik-Fix Box Cutter','broken_box_cutter','box_cutter','kwik_fix'),
  kwik_fix_chain:repairRecipe('kwik_fix_chain','Kwik-Fix Chain','broken_chain','chain','kwik_fix'),
  kwik_fix_can_opener:repairRecipe('kwik_fix_can_opener','Kwik-Fix Can Opener','broken_can_opener','can_opener','kwik_fix'),
  kwik_fix_ektorp_gluten_chair:repairRecipe('kwik_fix_ektorp_gluten_chair','Kwik-Fix Ektorp-Gluten Chair','broken_ektorp_gluten_chair','ektorp_gluten_chair','kwik_fix'),
  kwik_fix_pc_base_unit:repairRecipe('kwik_fix_pc_base_unit','Kwik-Fix PC Base Unit','broken_pc_base_unit','pc_base_unit','kwik_fix'),
}

export const COMBINATION_RECIPE_ORDER:CombinationRecipeId[]=[
  'assemble_telescope','assemble_guitar','assemble_repair_kit','assemble_engine','assemble_claymore','assemble_torch','assemble_hacksaw','prepare_spicy_noodles','mix_concrete','fill_water_bomb',
  'reload_water_pistol','refill_water_cooler','reload_battery_launcher','load_radio_battery','load_ems_battery',
  'repair_human_bone','repair_penknife','repair_staff','repair_serrated_knife','repair_machete','repair_adjustable_spanner','repair_screwdriver','repair_swiss_army_knife','repair_box_cutter','repair_chain','repair_can_opener','repair_ektorp_gluten_chair','repair_pc_base_unit',
  'kwik_fix_human_bone','kwik_fix_penknife','kwik_fix_staff','kwik_fix_serrated_knife','kwik_fix_machete','kwik_fix_adjustable_spanner','kwik_fix_screwdriver','kwik_fix_swiss_army_knife','kwik_fix_box_cutter','kwik_fix_chain','kwik_fix_can_opener','kwik_fix_ektorp_gluten_chair','kwik_fix_pc_base_unit',
]

function personalRefs(citizen:Citizen):PersonalRef[]{
  const inventory=citizen.inventory.map((item)=>({item,storage:'inventory' as const}))
  if(citizen.location.type==='world')return inventory
  return [...inventory,...citizen.home.storage.map((item)=>({item,storage:'home' as const}))]
}
function stateMatches(item:ItemInstance,rule:CombinationInputRule):boolean{
  const state=normalizeItemState(item.type,item.state)
  if(rule.condition!==undefined&&state.condition!==rule.condition)return false
  if(rule.chargesBelow!==undefined&&(state.charges===undefined||state.charges>=rule.chargesBelow))return false
  return true
}
function selectInputs(citizen:Citizen,recipeId:CombinationRecipeId):PersonalRef[]|null{
  const available=personalRefs(citizen)
  const selected:PersonalRef[]=[]
  const used=new Set<string>()
  for(const rule of COMBINATION_RECIPES[recipeId].inputs){
    const count=rule.count??1
    for(let index=0;index<count;index+=1){
      const match=available.find((entry)=>!used.has(entry.item.id)&&entry.item.type===rule.type&&stateMatches(entry.item,rule))
      if(!match)return null
      selected.push(match);used.add(match.item.id)
    }
  }
  return selected
}
export function combinationCommandsForCitizen(state:GameState,citizen:Citizen):Array<Extract<GameCommand,{type:'COMBINE_ITEMS'}>>{
  if(!citizen.alive||state.clock.phase!=='day')return[]
  const actions:Array<Extract<GameCommand,{type:'COMBINE_ITEMS'}>>=[]
  for(const recipeId of COMBINATION_RECIPE_ORDER){
    const recipe=COMBINATION_RECIPES[recipeId]
    if(citizen.ap<recipe.apCost)continue
    const selected=selectInputs(citizen,recipeId)
    if(selected)actions.push({type:'COMBINE_ITEMS',citizenId:citizen.id,recipeId,itemIds:selected.map((entry)=>entry.item.id)})
  }
  return actions
}

function refsForCommand(citizen:Citizen,itemIds:string[]):PersonalRef[]{
  const available=personalRefs(citizen)
  return itemIds.map((id)=>{
    const found=available.find((entry)=>entry.item.id===id)
    if(!found)throw new Error(`Missing personal combination item ${id}`)
    return found
  })
}
function assembledDestination(citizen:Citizen,refs:PersonalRef[]):PersonalItemStorage{
  if(citizen.location.type==='world')return'inventory'
  return refs.some((entry)=>entry.storage==='inventory')?'inventory':'home'
}
function createdItem(state:GameState,type:ItemType,offset=0,stateOverride?:ItemState):ItemInstance{return createItemInstance(`i${String(state.nextItemId+offset).padStart(6,'0')}`,type,stateOverride)}
function repairedType(recipeId:CombinationRecipeId):ItemType{
  return COMBINATION_RECIPES[recipeId].outputType
}
function isRepairKitRecipe(recipeId:CombinationRecipeId):boolean{return recipeId.startsWith('repair_')}
function isKwikFixRecipe(recipeId:CombinationRecipeId):boolean{return recipeId.startsWith('kwik_fix_')}

export function resolveCombination(state:GameState,citizen:Citizen,recipeId:CombinationRecipeId,itemIds:string[]):{consumedItemIds:string[];outputs:CombinationEventOutput[];createdCount:number}{
  const recipe=COMBINATION_RECIPES[recipeId]
  const refs=refsForCommand(citizen,itemIds)
  if(recipe.category==='assemble'){
    return{consumedItemIds:itemIds,outputs:[{item:createdItem(state,recipe.outputType),storage:assembledDestination(citizen,refs)}],createdCount:1}
  }
  if(recipeId==='reload_water_pistol'){
    const target=refs[0];const stateAfter={...normalizeItemState(target.item.type,target.item.state),charges:3}
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,'water_pistol',stateAfter),storage:target.storage}],createdCount:0}
  }
  if(recipeId==='refill_water_cooler'){
    const target=refs[0];const current=normalizeItemState(target.item.type,target.item.state).charges??0;const stateAfter={...normalizeItemState(target.item.type,target.item.state),charges:Math.min(3,current+1)}
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,'water_cooler_bottle',stateAfter),storage:target.storage}],createdCount:0}
  }
  if(recipeId==='reload_battery_launcher'){
    const target=refs[0];const stateAfter={...normalizeItemState(target.item.type,target.item.state),charges:1}
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,'battery_launcher',stateAfter),storage:target.storage}],createdCount:0}
  }
  if(recipeId==='load_radio_battery'){
    const target=refs[0]
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,'working_radio'),storage:target.storage}],createdCount:0}
  }
  if(recipeId==='load_ems_battery'){
    const target=refs[0]
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,'ems_system_charged'),storage:target.storage}],createdCount:0}
  }
  if(isRepairKitRecipe(recipeId)){
    const target=refs[0];const kit=refs[1]
    return{consumedItemIds:itemIds,outputs:[
      {item:createItemInstance(target.item.id,repairedType(recipeId)),storage:target.storage},
      {item:createItemInstance(kit.item.id,'repair_kit',{condition:'damaged'}),storage:kit.storage},
    ],createdCount:0}
  }
  if(isKwikFixRecipe(recipeId)){
    const target=refs[0]
    return{consumedItemIds:itemIds,outputs:[{item:createItemInstance(target.item.id,repairedType(recipeId)),storage:target.storage}],createdCount:0}
  }
  throw new Error(`Unsupported combination recipe ${recipeId}`)
}

export function combinationRecipeForOutput(type:ItemType):CombinationRecipeId|null{
  const preferred=COMBINATION_RECIPE_ORDER.find((id)=>COMBINATION_RECIPES[id].category==='assemble'&&COMBINATION_RECIPES[id].outputType===type)
  return preferred??null
}