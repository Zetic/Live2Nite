import type { ConstructionId } from './constructionIds'
import type { ExplorableRuinFamily } from './ruinIds'

export type ExplorableBlueprintTier='uncommon'|'rare'|'exceptional'
export type ExplorableBlueprintKey=`${ExplorableRuinFamily}_${ExplorableBlueprintTier}`

/**
 * Live2Nite semantic construction IDs corresponding to the explicit MyHordes
 * Hotel/Bunker/Hospital unlock lists. Upstream building IDs are intentionally
 * not used as runtime identities.
 */
export const EXPLORABLE_BLUEPRINT_POOLS:Readonly<Record<ExplorableBlueprintKey,readonly ConstructionId[]>>={
  hotel_uncommon:['la_bamba','small_trebuchet','animal_dump','wood_dump','metal_dump','food_dump','people_s_court','uberwall'],
  hotel_rare:['automatic_sprinklers','fertilizer','defensive_supports','fortified_homes','false_town','all_or_nothing','lighthouse','circular_quarters','faucet'],
  hotel_exceptional:['cinema','no_holes_barred','dump_upgrade','giant_sandcastle','spring_coffins'],

  bunker_uncommon:['mines','grapeboom','weapons_dump','defence_dump','mist_spray','shooting_gallery','miniature_armory'],
  bunker_rare:['upgradeable_wall','water_turrets','labyrinth','eden_project','air_strike','divining_rocket','organized_dump','faucet','water_filter'],
  bunker_exceptional:['water_detector','reactor','ministry_of_slavery','dump_upgrade','buzzard_s_wonder_wheel'],

  hospital_uncommon:['swedish_workshop','cremato_cue','shooting_gallery','guard_tower'],
  hospital_rare:['fertilizer','water_filter','defensive_supports','outer_world_apple_tree','henhouse','infirmary','organized_dump','lighthouse','divining_rocket'],
  hospital_exceptional:['builder_s_merchant','hot_air_balloon','crow_statue','no_holes_barred','giant_brd'],
}

export const EXPLORABLE_BLUEPRINT_SOURCE_WEIGHTS:Readonly<Record<ExplorableBlueprintTier,number>>={
  uncommon:800,
  rare:400,
  exceptional:200,
}

export function explorableBlueprintKey(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):ExplorableBlueprintKey{return`${family}_${tier}`}
export function explorableBlueprintPool(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):readonly ConstructionId[]{return EXPLORABLE_BLUEPRINT_POOLS[explorableBlueprintKey(family,tier)]}
export function explorableBlueprintDisplayName(family:ExplorableRuinFamily,tier:ExplorableBlueprintTier):string{
  const familyName=family[0]!.toUpperCase()+family.slice(1)
  const tierName=tier==='exceptional'?'Exceptional':tier[0]!.toUpperCase()+tier.slice(1)
  return`${familyName} ${tierName} Blueprint`
}
