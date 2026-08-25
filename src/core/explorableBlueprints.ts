import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import type { ConstructionId } from './constructionIds'
import type { ItemState, ItemType } from './itemCatalog'
import type { ExplorableRuinFamily } from './ruinIds'
import type { GameState } from './types'

export type ExplorableBlueprintTier='uncommon'|'rare'|'exceptional'
export type ExplorableBlueprintKey=`${ExplorableRuinFamily}_${ExplorableBlueprintTier}`

/**
 * Live2Nite semantic construction IDs corresponding to the current MyHordes
 * default explorable_ruin_params.plan_limits.lists configuration. Upstream
 * building IDs remain source-audit references only and are never runtime IDs.
 */
export const EXPLORABLE_BLUEPRINT_POOLS:Readonly<Record<ExplorableBlueprintKey,readonly ConstructionId[]>>={
  hotel_uncommon:['ravaged_pumpkins','urban_plan','defensive_supports','perforator','concrete_wall','eden_project'],
  hotel_rare:['faucet','outer_world_apple_tree','scarecrow_fields','swedish_workshop','grand_relocation','labyrinth','tamer_s_trap_system','third_layer','scavenger_s_gallery','spring_coffins'],
  hotel_exceptional:['water_detector','blue_gold_thermal_baths','buzzard_s_wonder_wheel','cinema','pool'],

  bunker_uncommon:['divining_rocket','mist_spray','grapeboom','small_trebuchet','cremato_cue','fortified_homes'],
  bunker_rare:['water_turrets','grenade_launcher','pigsty','guard_tower','manual_grinder','underground_city','air_strike','technicians_workbench','upgradeable_wall','spring_coffins'],
  bunker_exceptional:['pool','giant_sandcastle','reactor','ministry_of_slavery','giant_brd'],

  hospital_uncommon:['second_layer','eden_project','henhouse','defensive_supports','hammam','screaming_saws'],
  hospital_rare:['fertilizer','vita_mines','scouts_lair','gutters','false_town','organized_dump','infirmary','nature_area_of_the_survivalists','automatic_sprinklers','spring_coffins'],
  hospital_exceptional:['no_holes_barred','crow_statue','giant_brd','dump_upgrade','hot_air_balloon'],
}

export const EXPLORABLE_BLUEPRINT_SOURCE_WEIGHTS:Readonly<Record<ExplorableBlueprintTier,number>>={
  uncommon:800,
  rare:400,
  exceptional:200,
}

const SOURCE_PLAN:Readonly<Record<string,{family:ExplorableRuinFamily;tier:ExplorableBlueprintTier}>>={
  'hbplan_u_#00':{family:'hotel',tier:'uncommon'},'hbplan_r_#00':{family:'hotel',tier:'rare'},'hbplan_e_#00':{family:'hotel',tier:'exceptional'},
  'bbplan_u_#00':{family:'bunker',tier:'uncommon'},'bbplan_r_#00':{family:'bunker',tier:'rare'},'bbplan_e_#00':{family:'bunker',tier:'exceptional'},
  'mbplan_u_#00':{family:'hospital',tier:'uncommon'},'mbplan_r_#00':{family:'hospital',tier:'rare'},'mbplan_e_#00':{family:'hospital',tier:'exceptional'},
}

export function explorableBlueprintKey(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):ExplorableBlueprintKey{return`${family}_${tier}`}
export function explorableBlueprintPool(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):readonly ConstructionId[]{return EXPLORABLE_BLUEPRINT_POOLS[explorableBlueprintKey(family,tier)]}
export function explorableBlueprintEligibleProjects(state:GameState,family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):ConstructionId[]{
  return explorableBlueprintPool(family,tier).filter((id)=>{
    if(state.town.construction[id]?.discovered)return false
    const parentId=CONSTRUCTION_CATALOG[id].parentId
    return !parentId||state.town.construction[parentId]?.discovered===true
  })
}
export function explorableBlueprintSpecFromSourceRef(sourceRef:string):{type:ItemType;state:ItemState}|null{
  const plan=SOURCE_PLAN[sourceRef];if(!plan)return null
  const type:ItemType=plan.tier==='uncommon'?'uncommon_blueprint':plan.tier==='rare'?'rare_blueprint':'very_rare_blueprint'
  return{type,state:{blueprintFamily:plan.family,blueprintTier:plan.tier}}
}
export function explorableBlueprintTierFromType(type:ItemType):ExplorableBlueprintTier|null{
  return type==='uncommon_blueprint'?'uncommon':type==='rare_blueprint'?'rare':type==='very_rare_blueprint'?'exceptional':null
}
export function explorableBlueprintDisplayName(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):string{
  const familyName=family[0]!.toUpperCase()+family.slice(1)
  const tierName=tier==='exceptional'?'Exceptional':tier[0]!.toUpperCase()+tier.slice(1)
  return`${familyName} ${tierName} Blueprint`
}
