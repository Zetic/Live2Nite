import { ITEM_SOURCE_CATALOG } from './itemSourceCatalog'
import { randomInt } from './rng'
import type { ItemType } from './itemCatalog'
import type { RuinId } from './ruinIds'

export interface RuinSourceDrop { sourceRef:string; weight:number }

/**
 * Final unconditional ruin-drop weights from the pinned MyHordes 5.1.1 generated data.
 * Event-modified rows are intentionally excluded until their modifiers exist in Live2Nite.
 */
const RUIN_SOURCE_DROP_TEXT:Readonly<Record<RuinId,string>>={
  "citizens_home":"chest_citizen_#00:50 can_#00:95 lock_#00:2 electro_box_#00:8 chair_basic_#00:5 cdelvi_#00:1 shoe_#00:4 bike_part_#00:1",
  "scottish_smiths_superstore":"drug_hero_#00:16 meat_#00:16 food_noodles_hot_#00:16 vegetable_tasty_#00:16 electro_box_#00:4 powder_#00:3 food_bag_#00:3 door_carpet_#00:3 lights_#00:3 chest_citizen_#00:25",
  "once_inhabited_cave":"money_#00:48 flash_#00:10 coffee_#00:10 chair_basic_#00:10 table_#00:5 teddy_#00:1 machine_1_#00:10 machine_2_#00:10 machine_3_#00:10 rp_letter_#00:2 rp_sheets_#00:2 radius_mk2_part_#00:1 repair_kit_part_raw_#00:1 shoe_#00:2",
  "old_hydraulic_pump":"jerrycan_#00:60 tube_#00:4 metal_beam_#00:4 electro_#00:1 jerrygun_part_#00:2 oilcan_#00:6",
  "old_bicycle_hire_shop":"meca_parts_#00:6 tube_#00:23 courroie_#00:24 pocket_belt_#00:28 radio_off_#00:11 bike_part_#00:11",
  "deserted_freight_yard":"metal_beam_#00:3 wood_beam_#00:3 wrench_#00:3 wood2_#00:10 metal_#00:10 courroie_#00:1 coffee_#00:1 chain_#00:5",
  "old_field_hospital":"pharma_#00:20 drug_random_#00:30 vodka_#00:10 drug_water_#00:10 beta_drug_bad_#00:15 xanax_#00:5 drug_#00:10 drug_hero_#00:5 disinfect_#00:10 cyanure_#00:10 fungus_#00:5 quantum_#00:3",
  "old_aerodrome":"metal_beam_#00:28 repair_one_#00:10 electro_box_#00:15 meca_parts_#00:10 engine_part_#00:1 courroie_#00:1 tube_#00:1 rp_manual_#00:1 plate_raw_#00:1 fence_#00:1 jerrycan_#00:1 wire_#00:3 oilcan_#00:4",
  "old_police_station":"gun_#00:5 machine_gun_#00:2 taser_empty_#00:7 pilegun_empty_#00:5 drug_hero_#00:10 big_pgun_part_#00:7 watergun_empty_#00:7 knife_#00:5 bandage_#00:4 bag_#00:5 bagxl_#00:1 cutcut_#00:5 chest_xl_#00:2 repair_kit_#00:7 bed_#00:4 tagger_#00:5 watergun_opt_part_#00:5 chair_basic_#00:4 deto_#00:5 wire_#00:3",
  "nuclear_bunker":"plate_raw_#00:5 machine_gun_#00:4 jerrygun_part_#00:5 jerrycan_#00:5 can_#00:5 chainsaw_part_#00:2 mixergun_part_#00:5 pharma_#00:6 repair_kit_#00:9 drug_hero_#00:20 chest_#00:10 electro_#00:8 taser_empty_#00:8 big_pgun_part_#00:5 chest_xl_#00:1 tagger_#00:10 radius_mk2_part_#00:5",
  "macs_atomic_cafe":"coffee_#00:20 drug_#00:5 pharma_#00:5 food_chick_#00:20 rhum_#00:10 vodka_#00:10 pet_rat_#00:10 coffee_machine_part_#00:1 cdelvi_#00:1 quantum_#00:2",
  "motorway_services":"food_bar1_#00:8 food_bar2_#00:8 food_bar3_#00:8 food_biscuit_#00:8 food_chick_#00:8 food_pims_#00:8 food_tarte_#00:8 rhum_#00:7 coffee_#00:1 radio_off_#00:3 pet_rat_#00:18 table_#00:1 oilcan_#00:1 chest_citizen_#00:16",
  "wrecked_cars":"metal_#00:31 meca_parts_#00:5 repair_one_#00:5 vodka_#00:2 rhum_#00:2 jerrycan_#00:2 plate_raw_#00:10 courroie_#00:3 tube_#00:8 chest_#00:9 engine_part_#00:1 oilcan_#00:6 chest_citizen_#00:19",
  "shattered_illusions_bar":"rp_sheets_#00:5 rp_manual_#00:5 rp_scroll_#00:5 rp_book2_#00:5 rp_book_#00:5 cigs_#00:5 rhum_#00:10 pet_dog_#00:10",
  "home_depot":"meca_parts_#00:5 plate_raw_#00:15 saw_tool_part_#00:2 chest_#00:20 repair_kit_#00:40 wrench_#00:5 swiss_knife_#00:15 lock_#00:5 chest_xl_#00:1 trestle_#00:8 chest_tools_#00:20 tube_#00:3 pocket_belt_#00:1 explo_#00:5 electro_box_#00:10 concrete_#00:15 digger_#00:10 lights_#00:5 oilcan_#00:5 wire_#00:7 lens_#00:5",
  "construction_site_shelter":"concrete_#00:7 metal_beam_#00:10 repair_kit_part_raw_#00:4 jerrycan_#00:8 chain_#00:10 home_box_#00:8 rsc_pack_2_#00:8 rsc_pack_3_#00:2 home_def_#00:7 trestle_#00:10 saw_tool_part_#00:2 meca_parts_#00:8 door_#00:5 screw_#00:8 wrench_#00:8 mecanism_#00:8 oilcan_#00:2 lens_#00:5",
  "fraser_ds_kebab_ish":"meat_#00:100 vegetable_#00:80 pet_rat_#00:20 knife_#00:40 jerrycan_#00:40 vodka_#00:5 chainsaw_part_#00:2 mixergun_part_#00:4 pet_pig_#00:1 cyanure_#00:1 coffee_machine_part_#00:1 chest_food_#00:10 quantum_#00:3",
  "dukes_villa":"vibr_empty_#00:9 drug_hero_#00:17 vodka_#00:9 rhum_#00:9 sport_elec_empty_#00:7 big_pgun_part_#00:5 radius_mk2_part_#00:4 pile_#00:10 chest_xl_#00:1 bgrenade_empty_#00:8 lpoint1_#00:1 bike_part_#00:7 quantum_#00:2",
  "dark_woods":"wood_bad_#00:62 hmeat_#00:10 vegetable_#00:10 pet_rat_#00:5 saw_tool_part_#00:1 pet_chick_#00:5 grenade_empty_#00:5 plate_raw_#00:5 ryebag_#00:6 pet_snake2_#00:4 chest_citizen_#00:38",
  "collapsed_mineshaft":"powder_#00:30 concrete_wall_#00:2 deto_#00:5 explo_#00:5 mecanism_#00:5 hmeat_#00:1",
  "collapsed_quarry":"concrete_#00:35 metal_beam_#00:10 plate_raw_#00:10 chest_tools_#00:15 chest_#00:5 hmeat_#00:2 lock_#00:4 chest_xl_#00:1",
  "strange_circular_device":"metal_bad_#00:40 plate_raw_#00:10 iphone_#00:5 chest_xl_#00:1 bagxl_#00:1",
  "pi_keya_furniture":"wood_plate_part_#00:20 deco_box_#00:40 trestle_#00:10 saw_tool_part_#00:1 table_#00:10 chair_basic_#00:10 meca_parts_#00:5 door_#00:5 cutter_#00:10 screw_#00:10 bed_#00:10 wood2_#00:5",
  "family_tomb":"hmeat_#00:40 pet_rat_#00:5 machine_gun_#00:10 gun_#00:25 digger_#00:3",
  "fast_food_restaurant":"can_#00:10 vegetable_#00:10 food_bag_#00:10 hmeat_#00:10 pharma_#00:10 meat_#00:40 coffee_#00:70 coffee_machine_part_#00:1 digger_#00:4 chest_food_#00:5",
  "plane_crash_site":"electro_box_#00:10 meca_parts_#00:10 metal_beam_#00:22 metal_#00:6 plate_raw_#00:26 screw_#00:10 tube_#00:20 courroie_#00:10 vibr_empty_#00:4 tagger_#00:8 radius_mk2_part_#00:3 repair_one_#00:10 repair_kit_part_raw_#00:4 chest_tools_#00:20 chest_#00:15 engine_part_#00:2 pet_snake_#00:2 wire_#00:5 chudol_#00:2 catbox_#00:1 soccer_#00:10 shoe_#00:6",
  "garden_shed":"digger_#00:16 lawn_part_#00:5 staff2_#00:1 lights_#00:3 jerrygun_part_#00:2 chainsaw_part_#00:1 chest_tools_#00:10 vegetable_tasty_#00:10 concrete_#00:3 wood_log_#00:4 electro_box_#00:8 jerrycan_#00:10 rsc_pack_3_#00:3 ryebag_#00:4 angryc_#00:2 soccer_#00:4 chest_citizen_#00:14",
  "looted_supermarket":"rustine_#00:10 electro_box_#00:5 saw_tool_part_#00:1 meca_parts_#00:6 meat_#00:20 drug_hero_#00:5 grenade_empty_#00:20 cart_part_#00:20 water_#00:5 pile_#00:8 jerrycan_#00:5 repair_kit_#00:8 vodka_#00:4 rhum_#00:4 jerrygun_part_#00:4 bed_#00:2 can_opener_#00:5 drug_random_#00:2 chainsaw_part_#00:2 mixergun_part_#00:3 digger_#00:4 money_#00:7 chama_#00:5 quantum_#00:3",
  "cave":"hmeat_#00:20 chest_citizen_#00:15 chest_tools_#00:15 chest_#00:15 pet_rat_#00:5 pet_snake_#00:5 tagger_#00:5",
  "indian_burial_ground":"bone_#00:100 hmeat_#00:10 bone_meat_#00:10 bag_#00:4 chest_xl_#00:2 pet_rat_#00:5",
  "fairground_stall":"grenade_empty_#00:32 watergun_empty_#00:11 pile_#00:8 chama_#00:8 vibr_empty_#00:5 pilegun_empty_#00:5 big_pgun_part_#00:5 music_part_#00:5 game_box_#00:5 watergun_opt_part_#00:5 food_candies_#00:5 soccer_#00:5 chudol_#00:2",
  "small_house":"food_bag_#00:10 chair_basic_#00:5 electro_box_#00:3 pet_rat_#00:6 jerrycan_#00:6 pharma_#00:12 rustine_#00:8 lamp_#00:2 water_#00:10 chair_#00:2 door_carpet_#00:1 carpet_#00:5 table_#00:8 vegetable_#00:4 bed_#00:3 shoe_#00:1 bike_part_#00:1",
  "water_processing_plant":"jerrycan_#00:85 water_#00:5 plate_raw_#00:4 jerrygun_part_#00:4 drug_water_#00:1",
  "cosmetics_lab":"pharma_#00:40 drug_hero_#00:5 drug_random_#00:4 disinfect_#00:5 meat_#00:19 sport_elec_empty_#00:8 pet_dog_#00:3 pet_chick_#00:3 pet_snake_#00:5 pet_rat_#00:19 pet_pig_#00:10 pet_cat_#00:4 xanax_#00:8 angryc_#00:3 lens_#00:16",
  "ambulance":"drug_random_#00:50 bandage_#00:7 pharma_#00:30 saw_tool_part_#00:1 cutcut_#00:1 radius_mk2_part_#00:4 lilboo_#00:5",
  "warehouse":"chest_tools_#00:15 chest_food_#00:15 rsc_pack_1_#00:15 wood_plate_part_#00:5 home_box_#00:5 rsc_pack_2_#00:5 rsc_pack_3_#00:2 book_gen_box_#00:2 fence_#00:1",
  "disused_car_park":"metal_beam_#00:40 meca_parts_#00:5 repair_one_#00:12 jerrycan_#00:2 plate_raw_#00:8 courroie_#00:5 tube_#00:10 chest_tools_#00:6 chest_#00:10 engine_part_#00:2 trestle_#00:8 concrete_#00:7",
  "broken_down_tank":"gun_#00:5 machine_gun_#00:1 powder_#00:9 mecanism_#00:10 electro_box_#00:10 chain_#00:10 coffee_machine_part_#00:1 home_def_#00:9 home_box_xl_#00:1 repair_kit_part_raw_#00:1 deto_#00:1 explo_#00:3 tagger_#00:5 pilegun_upkit_#00:1",
  "motel_666_dusk":"chest_food_#00:10 mecanism_#00:10 bed_#00:10 door_carpet_#00:10 carpet_#00:10 pet_snake_#00:10 lawn_part_#00:3 chest_#00:7 coffee_#00:10 table_#00:2 lilboo_#00:2",
  "army_outpost":"gun_#00:8 machine_gun_#00:8 chest_food_#00:8 fence_#00:10 coffee_#00:8 rsc_pack_3_#00:2 wire_#00:4 shoe_#00:5",
  "post_office":"book_gen_letter_#00:20 book_gen_box_#00:20 rp_letter_#00:20 postal_box_xl_#00:6 postal_box_#00:20 money_#00:3 cards_#00:1 chair_basic_#00:3 table_#00:3",
  "smugglers_cache":"chest_#00:10 chest_tools_#00:40 chest_citizen_#00:60 chest_hero_#00:2 money_#00:5 chest_xl_#00:2 catbox_#00:1",
  "equipped_trench":"concrete_#00:29 bgrenade_empty_#00:10 gun_#00:5 machine_gun_#00:3 chest_citizen_#00:11",
  "town_library":"rp_sheets_#00:10 rp_manual_#00:10 rp_scroll_#00:10 rp_book2_#00:10 rp_book_#00:10 pet_rat_#00:2 cigs_#00:2 lamp_#00:1 chair_basic_#00:10 deco_box_#00:100 lens_#00:2",
  "mini_market":"can_#00:8 lights_#00:8 cigs_#00:8 door_carpet_#00:3 drug_#00:8 jerrycan_#00:8 food_bar1_#00:8 food_noodles_#00:8 spices_#00:5 money_#00:8 poison_part_#00:1 food_candies_#00:2 chama_#00:2 diode_#00:5 chest_citizen_#00:16",
  "mayor_mobile":"book_gen_letter_#00:10 rp_manual_#00:10 rp_scroll_#00:10 rp_sheets_#00:10 rp_letter_#00:10 mecanism_#00:10",
  "wrecked_transporter":"chest_food_#00:35 chest_tools_#00:20 wrench_#00:5 game_box_#00:7 courroie_#00:1 rhum_#00:4 plate_raw_#00:5 radio_off_#00:2 jerrycan_#00:5 radius_mk2_part_#00:5 mecanism_#00:1 wire_#00:3 chest_citizen_#00:25",
  "burnt_school":"hmeat_#00:65 bandage_#00:5 pile_#00:12 pet_rat_#00:5 watergun_empty_#00:20 watergun_opt_part_#00:2 game_box_#00:10 cyanure_#00:5 lens_#00:4 chest_citizen_#00:23",
  "dilapidated_building":"door_#00:8 chair_basic_#00:15 electro_box_#00:15 mecanism_#00:15 rp_manual_#00:1 rp_sheets_#00:1 cigs_#00:1 food_armag_#00:1 safe_#00:1 machine_1_#00:2 machine_2_#00:2 machine_3_#00:2 money_#00:10 iphone_#00:2 water_can_empty_#00:1 table_#00:1",
  "derelict_villa":"can_#00:40 lock_#00:7 bed_#00:5 table_#00:8 pile_#00:20 pharma_#00:12 screw_#00:9 chest_citizen_#00:20 lamp_#00:7 repair_kit_#00:9 carpet_#00:4 door_carpet_#00:7 chair_#00:5 chair_basic_#00:9 can_opener_#00:7 pet_dog_#00:2 vodka_#00:2 rhum_#00:2 mixergun_part_#00:1 sport_elec_empty_#00:4 bquies_#00:1 cdelvi_#00:1 quantum_#00:1",
  "abandoned_construction_site":"meca_parts_#00:2 saw_tool_part_#00:1 electro_box_#00:5 trestle_#00:15 metal_beam_#00:100 plate_raw_#00:40 chest_#00:20 repair_kit_#00:40 wrench_#00:10 screw_#00:12 lock_#00:5 chest_xl_#00:1 pocket_belt_#00:3 radio_off_#00:10 concrete_#00:40 fence_#00:8",
  "abandoned_well":"jerrycan_#00:2 water_#00:30 water_cup_part_#00:10",
  "disused_silos":"jerrycan_#00:20 meca_parts_#00:1",
  "blocked_road":"concrete_wall_#00:40 meca_parts_#00:5 repair_one_#00:5 plate_raw_#00:10 courroie_#00:3 tube_#00:8 chest_#00:9 trestle_#00:5 engine_part_#00:1",
  "abandoned_park":"vegetable_#00:35 pet_snake_#00:10 pet_pig_#00:5 chair_basic_#00:5 wood2_#00:10 game_box_#00:5 cutcut_#00:5 lawn_part_#00:10 watergun_opt_part_#00:2 watergun_empty_#00:20 jerrygun_part_#00:2 digger_#00:10 ryebag_#00:4",
  "guns_n_zombies_armoury":"gun_#00:30 machine_gun_#00:10 knife_#00:20 chainsaw_part_#00:2 big_pgun_part_#00:5 pilegun_empty_#00:20 cutcut_#00:20 watergun_empty_#00:20 watergun_opt_part_#00:5 deto_#00:5",
  "disused_warehouse":"chest_tools_#00:40 chest_citizen_#00:60 chest_food_#00:60",
  "citizens_tent":"chest_citizen_#00:3 chest_hero_#00:30 vodka_#00:7 rhum_#00:7 lamp_#00:9 lights_#00:7 bandage_#00:3 chest_#00:5 coffee_#00:5 chama_tasty_#00:2 rp_letter_#00:5 home_box_#00:5 xanax_#00:3 watergun_opt_part_#00:1 chest_food_#00:15 door_carpet_#00:1 banned_note_#00:10 bagxl_#00:1 lsd_#00:1 shoe_#00:6",
  "destroyed_pharmacy":"pharma_#00:91 drug_#00:10 cyanure_#00:10 drug_hero_#00:4 disinfect_#00:6 xanax_#00:10 drug_random_#00:3 digger_#00:5 bquies_#00:2 lsd_#00:1 lens_#00:9",
  "shady_bar":"vodka_#00:12 rhum_#00:15 meat_#00:8 drug_#00:4 pet_rat_#00:5 jerrycan_#00:3 chair_basic_#00:4 food_bag_#00:5 can_opener_#00:4 quantum_#00:1",
  "abandoned_bunker":"bbplan_u_#00:800 bbplan_r_#00:400 bbplan_e_#00:200 wood2_#00:429 metal_#00:429 meca_parts_#00:429 concrete_wall_#00:429 wood_bad_#00:429 water_#00:429 water_cup_part_#00:429 wood_beam_#00:188 metal_beam_#00:188 gun_#00:188 metal_bad_#00:188 wood_log_#00:188 wood_plate_#00:188 money_#00:188 pile_#00:188 big_pgun_empty_#00:36 big_pgun_#00:36 big_pgun_part_#00:36 tagger_#00:36 flare_#00:36 machine_gun_#00:36 deto_#00:36 electro_box_#00:36 repair_kit_part_raw_#00:36 rsc_pack_3_#00:36 rsc_pack_2_#00:36 rsc_pack_1_#00:36 rlaunc_#00:36 kalach_#01:36 magneticKey_#00:167 bumpKey_#00:167 classicKey_#00:167",
  "abandoned_hotel":"hbplan_u_#00:800 hbplan_r_#00:400 hbplan_e_#00:200 water_#00:554 chair_basic_#00:429 chest_food_#00:429 food_bag_#00:429 food_bar1_#00:429 food_bar2_#00:429 food_bar3_#00:429 bed_#00:125 spices_#00:125 food_noodles_#00:125 food_sandw_#00:125 food_pims_#00:125 food_chick_#00:125 food_biscuit_#00:125 dish_#00:125 can_#00:125 lamp_#00:125 table_#00:125 food_noodles_hot_#00:42 game_box_#00:42 deco_box_#00:42 teddy_#00:42 teddy_#01:42 dish_tasty_#00:42 bag_#00:42 lights_#00:42 carpet_#00:42 bureau_#00:42 distri_#00:42 rlaunc_#00:42 magneticKey_#00:167 bumpKey_#00:167 classicKey_#00:167",
  "abandoned_hospital":"mbplan_u_#00:800 mbplan_r_#00:400 mbplan_e_#00:200 water_#00:964 drug_random_#00:750 xanax_#00:750 out_def_#00:750 pharma_#00:214 drug_water_#00:214 cyanure_#00:214 disinfect_#00:214 pc_#00:214 water_can_empty_#00:214 chainsaw_empty_#00:63 drug_#00:63 water_can_1_#00:63 water_can_2_#00:63 water_can_3_#00:63 rlaunc_#00:63 bureau_#00:63 distri_#00:63 magneticKey_#00:167 bumpKey_#00:167 classicKey_#00:167 vagoul_#00:63",
  "crows_fit_gym":"shoe_#00:9 bike_part_#00:2 pocket_belt_#00:2 drug_#00:22 drug_hero_#00:2 pharma_#00:10 water_#00:15 xanax_#00:2 metal_bad_#00:5 sport_elec_#00:2 food_bag_#00:8 metal_beam_#00:5 taser_#00:5 coffee_#00:5 quantum_#00:5",
  "strange_barn":"vagoul_#00:5 chest_xl_#00:15 chainsaw_part_#00:15 lpoint_#00:25 pocket_belt_#00:50 bagxl_#00:50 ryebag_#00:100 cadaver_#00:100 lawn_part_#00:150 quantum_#00:150 hmbrew_#00:160 vegetable_#00:185"
}

const ITEM_BY_SOURCE_REF=new Map(ITEM_SOURCE_CATALOG.map((entry)=>[entry.sourceRef,entry] as const))

function parseDropText(text:string):readonly RuinSourceDrop[]{
  return text.split(' ').filter(Boolean).map((token)=>{
    const split=token.lastIndexOf(':')
    return{sourceRef:token.slice(0,split),weight:Number(token.slice(split+1))}
  })
}

export const RUIN_SOURCE_DROPS:Readonly<Record<RuinId,readonly RuinSourceDrop[]>>=Object.fromEntries(
  Object.entries(RUIN_SOURCE_DROP_TEXT).map(([id,text])=>[id,parseDropText(text)])
) as Readonly<Record<RuinId,readonly RuinSourceDrop[]>>

export function ruinSourceDrops(id:RuinId):readonly RuinSourceDrop[]{return RUIN_SOURCE_DROPS[id]}

export function playableRuinSourceDrops(id:RuinId):readonly (RuinSourceDrop&{runtimeType:ItemType})[]{
  return RUIN_SOURCE_DROPS[id].flatMap((drop)=>{
    const item=ITEM_BY_SOURCE_REF.get(drop.sourceRef)
    return item?.runtimeType&&item.implementation!=='wip'?[{...drop,runtimeType:item.runtimeType}]:[]
  })
}

/**
 * Roll against the complete source table before resolving a Live2Nite runtime item.
 * Unsupported/WIP source outcomes resolve to null rather than having their probability
 * redistributed onto implemented items.
 */
export function rollRuinSourceLoot(rngState:number,id:RuinId):{item:ItemType|null;sourceRef:string;rngStateAfter:number}{
  const drops=RUIN_SOURCE_DROPS[id]
  const total=drops.reduce((sum,drop)=>sum+drop.weight,0)
  if(total<=0)throw new Error(`Ruin ${id} has no positive source loot weight`)
  const roll=randomInt(rngState,1,total)
  let remaining=roll.value
  let selected=drops[drops.length-1]!
  for(const drop of drops){remaining-=drop.weight;if(remaining<=0){selected=drop;break}}
  const item=ITEM_BY_SOURCE_REF.get(selected.sourceRef)
  const runtimeType=item?.runtimeType&&item.implementation!=='wip'?item.runtimeType:null
  return{item:runtimeType,sourceRef:selected.sourceRef,rngStateAfter:roll.state}
}
