export type MyHordesSeasonalEvent='Easter'|'Christmas'|'StPatrick'|'Halloween'

export interface MyHordesSourceLootEntry {
  sourceId:string
  weight:number
  /** Raw source event id retained for audit; 1-5 and 201 are not seasonal gates in the generator. */
  sourceEventId?:number
  event?:MyHordesSeasonalEvent
}

const entry=(sourceId:string,weight:number,sourceEventId?:number,event?:MyHordesSeasonalEvent):MyHordesSourceLootEntry=>({sourceId,weight,...(sourceEventId===undefined?{}:{sourceEventId}),...(event?{event}:{})})

/**
 * Raw MyHordes 5.1.1 base_dig table from the pinned generated source snapshot.
 *
 * This is deliberately source-id data rather than ItemType data. It is the dependency manifest
 * for Part 2: ordinary entries are mapped/implemented before the active normal-zone resolver is
 * switched over. Seasonal entries remain explicitly gated by their source event.
 */
export const MYHORDES_511_NORMAL_SOURCE_LOOT:readonly MyHordesSourceLootEntry[]=[
  entry('wood2_#00',170),entry('metal_#00',105),entry('wood_beam_#00',12),entry('metal_beam_#00',6),
  entry('pile_#00',50),entry('pharma_#00',40),entry('meca_parts_#00',10),entry('rustine_#00',27),entry('jerrycan_#00',15),entry('explo_#00',9),entry('tube_#00',12),entry('electro_#00',5),entry('engine_part_#00',2),entry('courroie_#00',2),entry('deto_#00',9),entry('fence_#00',3),
  entry('rsc_pack_2_#00',3),entry('rsc_pack_3_#00',1),entry('grenade_empty_#00',70),entry('staff_#00',10),entry('watergun_empty_#00',10),entry('cutter_#00',5),entry('can_opener_#00',5),entry('pilegun_empty_#00',8),entry('knife_#00',2),entry('screw_#00',3),entry('small_knife_#00',5),entry('gun_#00',1),entry('big_pgun_part_#00',1),entry('chain_#00',5),entry('iphone_#00',1),
  entry('food_bag_#00',50),entry('food_noodles_#00',8),entry('spices_#00',5),entry('can_#00',25),entry('meat_#00',5),entry('drug_hero_#00',6),entry('drug_random_#00',8),entry('disinfect_#00',3),entry('drug_#00',10),entry('vodka_#00',7),entry('pet_rat_#00',7),entry('rhum_#00',3),entry('hmeat_#00',2),entry('bandage_#00',3),entry('xanax_#00',4),entry('pet_chick_#00',5),entry('pet_pig_#00',5),entry('pet_snake_#00',8),entry('pet_cat_#00',4),entry('water_cleaner_#00',8),entry('poison_part_#00',1),entry('chama_#00',1),entry('beta_drug_bad_#00',1),entry('water_can_empty_#00',1),
  entry('cadaver_#00',1,3),entry('chest_#00',8),entry('chest_tools_#00',15),entry('chest_citizen_#00',3),entry('chest_xl_#00',1),entry('chest_food_#00',4),entry('electro_box_#00',9),entry('deco_box_#00',13),entry('mecanism_#00',10),entry('food_armag_#00',1),entry('safe_#00',1),
  entry('wood_plate_part_#00',16),entry('plate_raw_#00',10),entry('plate_#00',3),entry('door_#00',9),entry('lock_#00',4),entry('concrete_#00',17),entry('trestle_#00',8),entry('home_def_#00',3),entry('car_door_part_#00',1),entry('bag_#00',8),entry('cart_part_#00',3),entry('repair_kit_part_raw_#00',3),entry('repair_one_#00',9),entry('chair_basic_#00',4),entry('bed_#00',5),entry('lamp_#00',3),entry('music_part_#00',2),entry('vibr_empty_#00',2),entry('cyanure_#00',2),entry('coffee_machine_part_#00',1),entry('sport_elec_empty_#00',4),entry('tagger_#00',8),entry('digger_#00',12),entry('game_box_#00',2),entry('saw_tool_part_#00',1),entry('chair_#00',3),entry('powder_#00',12),entry('machine_1_#00',8),entry('machine_2_#00',8),entry('machine_3_#00',8),entry('pc_#00',2),entry('home_box_#00',3),entry('home_box_xl_#00',1),entry('lights_#00',4),entry('cigs_#00',2),entry('pilegun_upkit_#00',1),entry('money_#00',1),entry('wood_log_#00',2),
  entry('sheet_#00',1,1),entry('out_def_#00',2,1),entry('smelly_meat_#00',1,1),entry('maglite_off_#00',1,2),entry('smoke_bomb_#00',9),entry('bplan_drop_#00',15),entry('rp_book_#00',1),entry('book_gen_letter_#00',3),entry('book_gen_box_#00',2),entry('postal_box_#00',1),entry('rp_twin_#00',1),entry('badge_#00',3,4),
  entry('wire_#00',8,5),entry('oilcan_#00',12,5),entry('lens_#00',4,5),entry('diode_#00',5,5),entry('angryc_#00',4,5),entry('chudol_#00',4,5),entry('lilboo_#00',5,5),entry('ryebag_#00',6,5),entry('bquies_#00',3,5),entry('cdelvi_#00',1,5),entry('cdbrit_#00',1,5),entry('cdphil_#00',1,5),entry('catbox_#00',2,5),entry('pet_snake2_#00',4,5),entry('cinema_#00',1,5),entry('fest_#00',4,201),entry('bretz_#00',8,201),entry('tekel_#00',4,201),
  entry('christmas_suit_1_#00',8,102,'Christmas'),entry('christmas_suit_2_#00',7,102,'Christmas'),entry('christmas_suit_3_#00',6,102,'Christmas'),entry('sand_ball_#00',10,102,'Christmas'),entry('renne_#00',10,102,'Christmas'),entry('food_xmas_#00',5,102,'Christmas'),
  entry('paques_#00',25,101,'Easter'),entry('hurling_stick_#00',25,103,'StPatrick'),entry('leprechaun_suit_#00',7,103,'StPatrick'),entry('guiness_#00',20,103,'StPatrick'),entry('pumpkin_raw_#00',5,104,'Halloween'),entry('scary_mask_#00',7,104,'Halloween'),
]

export const MYHORDES_511_DEPLETED_SOURCE_LOOT:readonly MyHordesSourceLootEntry[]=[
  entry('wood_bad_#00',20),entry('metal_bad_#00',12),
]

export function ordinaryNormalSourceLoot():readonly MyHordesSourceLootEntry[]{return MYHORDES_511_NORMAL_SOURCE_LOOT.filter((loot)=>!loot.event)}
