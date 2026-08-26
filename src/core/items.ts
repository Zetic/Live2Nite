import type { ConsumableKind, ItemInstance } from './types'
import type { ItemCapability, ItemDisplayCategory, ItemState, ItemStateSchema, ItemType } from './itemCatalog'

export type ItemCategory = 'raw' | 'construction' | 'consumable' | 'defense' | 'container' | 'weapon' | 'broken_weapon' | 'misc'
export type ItemSource = 'DIE2NITE_ARCHIVE' | 'HORDES_V4_4' | 'MYHORDES_CURRENT' | 'LIVE2NITE_ADAPTATION'

export interface ItemDefinition {
  type: ItemType
  name: string
  purpose: string
  /** Legacy mechanical grouping retained while callers migrate to capabilities. */
  category: ItemCategory
  displayCategory: ItemDisplayCategory
  capabilities: ItemCapability[]
  state?: ItemStateSchema
  source: ItemSource
  bankDefense?: number
  homeDefense?: number
  consumableKind?: ConsumableKind
  /** Legacy simple pool retained until all containers are migrated to openables.ts. */
  containerPool?: ItemType[]
}

const def=(value:ItemDefinition):ItemDefinition=>value
const resource=(type:ItemType,name:string,purpose:string,capabilities:ItemCapability[]=['component']):ItemDefinition=>def({type,name,purpose,category:'misc',displayCategory:'resources',capabilities,source:'MYHORDES_CURRENT'})
const container=(type:ItemType,name:string,purpose:string,state?:ItemStateSchema):ItemDefinition=>def({type,name,purpose,category:'container',displayCategory:'containers',capabilities:state?.contents?['container','stateful_container']:['container'],state,source:'MYHORDES_CURRENT'})
const sourceWeapon=(type:ItemType,name:string,purpose:string):ItemDefinition=>def({type,name,purpose,category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'})
const brokenSourceWeapon=(type:ItemType,name:string):ItemDefinition=>def({type,name:`Broken ${name}`,purpose:`A broken ${name}. Repair it anywhere with a Repair Kit or Kwik-Fix.`,category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'})
const sourceFood=(type:ItemType,name:string,purpose='Ordinary MyHordes food. Eating restores the normal daily food AP refresh and consumes the item.',cookable=true):ItemDefinition=>def({type,name,purpose,category:'consumable',displayCategory:'food',capabilities:cookable?['consumable','cookable']:['consumable'],state:{contamination:{initial:'clean'}},source:'MYHORDES_CURRENT',consumableKind:'food'})

export const ITEMS:Record<ItemType,ItemDefinition>={
  rotten_log:def({type:'rotten_log',name:'Rotting Log',purpose:'Low-quality resource found abundantly in depleted zones. The Workshop converts it into a Twisted Plank.',category:'raw',displayCategory:'resources',capabilities:['raw_material'],source:'MYHORDES_CURRENT'}),
  scrap_metal:def({type:'scrap_metal',name:'Scrap Metal',purpose:'Low-quality resource found abundantly in depleted zones. The Workshop converts it into Wrought Iron.',category:'raw',displayCategory:'resources',capabilities:['raw_material'],source:'MYHORDES_CURRENT'}),
  quality_log:def({type:'quality_log',name:'Quality Log',purpose:'Source wood_log_#00 furniture/raw material. The Workshop cuts it into a Twisted Plank.',category:'raw',displayCategory:'furniture',capabilities:['raw_material','decoration'],source:'MYHORDES_CURRENT'}),
  sheet_metal_bits:def({type:'sheet_metal_bits',name:'Sheet Metal (parts)',purpose:'Source plate_raw_#00 fragments. The Workshop processes them into usable Sheet Metal.',category:'raw',displayCategory:'resources',capabilities:['raw_material'],source:'MYHORDES_CURRENT'}),
  twisted_plank:def({type:'twisted_plank',name:'Twisted Plank',purpose:'Basic wooden construction material. The Workshop can process it into a Patchwork Beam.',category:'construction',displayCategory:'resources',capabilities:['construction_material'],source:'MYHORDES_CURRENT'}),
  wrought_iron:def({type:'wrought_iron',name:'Wrought Iron',purpose:'Basic metal construction material. The Workshop converts it into a Metal Support.',category:'construction',displayCategory:'resources',capabilities:['construction_material'],source:'MYHORDES_CURRENT'}),
  unshaped_concrete_block:def({type:'unshaped_concrete_block',name:'Unshaped Concrete Block',purpose:'Heavy construction material used by advanced fortifications. It can be mixed anywhere from a Bag of Cement and a Water Ration.',category:'construction',displayCategory:'resources',capabilities:['construction_material','defense'],source:'MYHORDES_CURRENT'}),
  patchwork_beam:def({type:'patchwork_beam',name:'Patchwork Beam',purpose:'Advanced wooden construction material produced from a Twisted Plank or recovered while scavenging.',category:'construction',displayCategory:'resources',capabilities:['construction_material'],source:'MYHORDES_CURRENT'}),
  metal_support:def({type:'metal_support',name:'Metal Support',purpose:'Advanced metal construction material produced from Wrought Iron or recovered while scavenging.',category:'construction',displayCategory:'resources',capabilities:['construction_material'],source:'MYHORDES_CURRENT'}),
  sheet_metal:def({type:'sheet_metal',name:'Sheet Metal',purpose:'Scarce construction supply used by defensive and mechanical projects.',category:'construction',displayCategory:'resources',capabilities:['construction_material','component','defense'],source:'MYHORDES_CURRENT'}),
  bag_of_damp_grass:resource('bag_of_damp_grass','Bag of Damp Grass','Scarce supply used by combinations and specialist projects.'),
  bag_of_cement:resource('bag_of_cement','Bag of Cement','Construction supply found while scavenging. Combine it with a Water Ration to make an Unshaped Concrete Block.',['component','raw_material']),
  battery:resource('battery','Battery','Electrical supply used by electronic construction and reloadable equipment.'),
  belt:resource('belt','Belt','Mechanical supply used by tensioned and launching mechanisms.'),
  compact_detonator:resource('compact_detonator','Compact Detonator','Scarce explosive supply used by demolition and hydraulic projects.'),
  convex_lens:resource('convex_lens','Convex Lens','Optical component used to assemble a Telescope and other precision equipment.'),
  copper_pipe:resource('copper_pipe','Copper Pipe','Hydraulic supply used throughout the Pump branch and to assemble a Telescope.'),
  duct_tape:resource('duct_tape','Duct Tape','General repair and fastening supply used by mechanical constructions and combinations.'),
  earplugs:resource('earplugs','Earplugs','Scarce utility supply retained for combinations and later status mechanics.'),
  electronic_component:resource('electronic_component','Electronic Component','Electronic supply used by scanners, detectors and advanced mechanisms.'),
  empty_oil_can:resource('empty_oil_can','Empty Oil Can','Mechanical container used by hydraulic constructions and the Makeshift Guitar combination.'),
  nuts_and_bolts:resource('nuts_and_bolts','Handful of Nuts and Bolts','High-value mechanical fasteners used by many advanced constructions and combinations.'),
  laser_diode:resource('laser_diode','Laser Diode','Rare electronic/optical component used by advanced detection and water-defense systems.'),
  semtex:resource('semtex','Semtex','Rare explosive supply used by demolition and high-end construction.',['component','construction_material']),
  telescope:resource('telescope','Telescope','Portable combination result made from a Copper Pipe and Convex Lens; required by advanced observation structures.'),
  wire_reel:resource('wire_reel','Wire Reel','Electrical/mechanical supply used by traps, defenses and portable equipment assembly.'),
  broken_electronic_device:def({type:'broken_electronic_device',name:'Broken Electronic Device',purpose:'Unprocessed salvage. The Workshop dismantles it into a useful electronic or mechanical supply.',category:'raw',displayCategory:'resources',capabilities:['raw_material'],source:'MYHORDES_CURRENT'}),
  mechanism:def({type:'mechanism',name:'Mechanism',purpose:'Unprocessed mechanical salvage. The Workshop dismantles it into metal, fasteners or pipe.',category:'raw',displayCategory:'resources',capabilities:['raw_material'],source:'MYHORDES_CURRENT'}),
  full_jerrycan:def({type:'full_jerrycan',name:'Full Jerrycan',purpose:'Non-potable desert water. A completed Water Purifier converts it directly into 1–3 Well rations, or 4–9 when the Water Filter is complete.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  meaty_bone:def({type:'meaty_bone',name:'Meaty Bone',purpose:'Organic construction supply used as bait. Kitchen cooking turns it into a standard prepared meal and removes its dangerous raw-food effect.',category:'misc',displayCategory:'food',capabilities:['component','cookable'],state:{contamination:{initial:'clean'}},source:'MYHORDES_CURRENT'}),
  human_flesh:resource('human_flesh','Human Flesh','Organic supply used by a small number of current construction projects.'),
  poison_gland:resource('poison_gland','Corrosive Liquid','Toxic component used by the neurotoxin construction.'),
  working_radio:resource('working_radio','Radio Cassette Player','MyHordes Radio Cassette Player with a battery installed; consumed by several observation and emergency projects.'),
  guitar:resource('guitar','Makeshift Guitar','Portable combination result made from a Wire Reel, Empty Oil Can and Broken Staff; used by Frat House / La Bamba.'),
  table:def({type:'table',name:'Järpen Table',purpose:'Furniture used as a structural/work surface by Factory and observation constructions.',category:'misc',displayCategory:'furniture',capabilities:['component','decoration'],source:'MYHORDES_CURRENT'}),
  chicken:resource('chicken','Chicken','Living supply required by the Henhouse construction.'),
  wire_mesh:resource('wire_mesh','Wire Mesh','Fencing supply required by livestock and filtration constructions.'),
  grain_sack:resource('grain_sack','Grain Sack','Agricultural supply used by food-production constructions.'),
  exploding_grapefruit:def({type:'exploding_grapefruit',name:'Exploding Grapefruit',purpose:'Volatile fruit cultivated by Grapeboom. Retained in the Bank for its agriculture/defense branch.',category:'misc',displayCategory:'armoury',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  tool_bag:def({type:'tool_bag',name:'Tool Bag',purpose:'Incomplete repair equipment used with Duct Tape, Nuts & Bolts and a Twisted Plank to assemble a Repair Kit.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  kwik_fix:def({type:'kwik_fix',name:'Kwik-Fix',purpose:'Single-use portable repair supply. Combine it with a broken item for 1 AP to repair that item.',category:'misc',displayCategory:'miscellaneous',capabilities:['repairable'],source:'MYHORDES_CURRENT'}),
  plastic_bag:def({type:'plastic_bag',name:'Plastic Bag',purpose:'Simple container component that can be filled with a Water Ration to make a Water Bomb.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  engine_incomplete:def({type:'engine_incomplete',name:'Engine (incomplete)',purpose:'Vehicle salvage that can be completed with fastening, metal, detonator and bone components.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],state:{assembly:{initial:'incomplete'}},source:'MYHORDES_CURRENT'}),
  engine:def({type:'engine',name:'Engine',purpose:'Completed portable combination result retained for later machinery and equipment systems.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],state:{assembly:{initial:'complete'}},source:'MYHORDES_CURRENT'}),
  claymore:def({type:'claymore',name:'Claymore Mine',purpose:'Portable explosive assembled from Wire Reel, Semtex, Nuts & Bolts and Duct Tape. It is a single-use field weapon.',category:'weapon',displayCategory:'armoury',capabilities:['weapon'],source:'MYHORDES_CURRENT'}),
  torch:def({type:'torch',name:'Torch',purpose:'Portable combination made from Box of Matches and a Rotting Log. It can toast Dried Marshmallows without being consumed.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  battery_launcher:def({type:'battery_launcher',name:'Battery Launcher 1-ITF',purpose:'Reloadable improvised weapon recovered empty from electronic salvage. Combine with a Battery to load one shot.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','charge_bearing'],state:{charges:{min:0,max:1,initial:0}},source:'MYHORDES_CURRENT'}),
  water_ration:def({type:'water_ration',name:'Water Ration',purpose:'Drinking treats hydration and can refresh AP once per day when AP is missing. It also refills several portable items.',category:'consumable',displayCategory:'food',capabilities:['consumable'],state:{contamination:{initial:'clean'}},source:'DIE2NITE_ARCHIVE',consumableKind:'water'}),
  food:sourceFood('food','Mouldy Ham Sandwich'),
  mouldy_twinkies:sourceFood('mouldy_twinkies','Mouldy Twinkies'),
  half_eaten_chicken_wings:sourceFood('half_eaten_chicken_wings','Half-eaten Chicken Wings'),
  rancid_shortbread_pack:sourceFood('rancid_shortbread_pack','Rancid Shortbread Pack'),
  out_of_date_jaffa_cakes:sourceFood('out_of_date_jaffa_cakes','Out-of-Date Jaffa Cakes'),
  dried_chewing_gum:sourceFood('dried_chewing_gum','Dried Chewing Gum'),
  stale_tart:sourceFood('stale_tart','Stale Tart'),
  soft_crisps:sourceFood('soft_crisps','Packet of Soft Crisps'),
  can:def({type:'can',name:'Can',purpose:'Closed MyHordes food can. Open it with a Hacksaw, Can Opener, Screwdriver, or Swiss Army Knife before eating.',category:'container',displayCategory:'food',capabilities:['container'],source:'MYHORDES_CURRENT'}),
  open_can:sourceFood('open_can','Open Can'),
  vegetable:sourceFood('vegetable','Suspicious-looking Vegetable','MyHordes Vegetable. Eating follows the ordinary daily food AP refresh.'),
  blue_apple:sourceFood('blue_apple','Blue Apple','Higher-quality production food. Eating restores toward the current normal AP maximum +1.',false),
  tasty_looking_steak:sourceFood('tasty_looking_steak','Tasty-looking Steak','Higher-quality MyHordes food. Eating restores toward the current normal AP maximum +1.',false),
  chinese_noodles:sourceFood('chinese_noodles','Chinese Noodles','Ordinary MyHordes food; combine with Strong Spices and a Water Ration for the spicy version.'),
  spicy_chinese_noodles:sourceFood('spicy_chinese_noodles','Spicy Chinese Noodles','Prepared from Chinese Noodles, Strong Spices and a Water Ration. Eating restores toward the current normal AP maximum +1.',false),
  dried_marshmallows:sourceFood('dried_marshmallows','Dried Marshmallows','Ordinary dried sweets. They can be cooked in a Kitchen or toasted with a Torch.'),
  burnt_marshmallows:sourceFood('burnt_marshmallows','Burnt Marshmallows','Torch-toasted marshmallows. Eating restores toward the current normal AP maximum +1.',false),
  good_home_made_meal:sourceFood('good_home_made_meal','Good Home-made Meal','Successful Kitchen preparation. Eating restores toward the current normal AP maximum +1.',false),
  dubious_home_made_meal:sourceFood('dubious_home_made_meal','Dubious Home-made Meal','Failed Kitchen preparation. It remains edible and restores the ordinary daily food AP refresh.',false),
  strong_spices:def({type:'strong_spices',name:'Strong Spices',purpose:'MyHordes cooking component. Combine with Chinese Noodles and a Water Ration to make Spicy Chinese Noodles.',category:'misc',displayCategory:'food',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  bandage:def({type:'bandage',name:'Bandage',purpose:'Source bandage_#00. Dresses one wound, removing its body-part wound state. Treatment is limited to once per day.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  paracetoid:def({type:'paracetoid',name:'Paracetoid 7g',purpose:'Source disinfect_#00. A drug that cures Infection when present and grants temporary infection immunity; a second drug use in the same day causes Addiction.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  anabolic_steroids:def({type:'anabolic_steroids',name:'Anabolic Steroids',purpose:'Source drug_#00. A drug that restores AP to the normal source target; a second drug use in the same day causes Addiction.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  valium_shot:def({type:'valium_shot',name:'Valium Shot',purpose:'Source xanax_#00. A drug that removes Terrorized when present; it still counts as a drug when used without Terror.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  twinoid_500mg:def({type:'twinoid_500mg',name:'Twinoid 500mg',purpose:'Source drug_hero_#00. The Home Laboratory success result; taking it counts as a drug and restores AP toward 8.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  hydratone_100mg:def({type:'hydratone_100mg',name:'Hydratone 100mg',purpose:'Source drug_water_#00. A hydration drug: it counts as a drug and treats Thirsty or Dehydrated using the source hydration rules.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  unlabelled_drug:def({type:'unlabelled_drug',name:'Unlabelled Drug',purpose:'Source drug_random_#00. Its effect is uncertain: AP restoration, terror, addiction, or no effect are all possible.',category:'consumable',displayCategory:'pharmacy',capabilities:['consumable','medical'],source:'MYHORDES_CURRENT'}),
  water_purifying_tablets:def({type:'water_purifying_tablets',name:'Water Purifying Tablets',purpose:'Source water_cleaner_#00. A pharmaceutical Home Laboratory by-product retained as the Micropur water-treatment item; purification mechanics are separate from drug use.',category:'misc',displayCategory:'pharmacy',capabilities:['component','medical'],source:'MYHORDES_CURRENT'}),
  vodka_marinostov:def({type:'vodka_marinostov',name:'Vodka Marinostov',purpose:'Source vodka_#00 alcohol. Restores AP to the normal source target and makes the citizen Drunk; unusable while Drunk or Hungover.',category:'consumable',displayCategory:'food',capabilities:['consumable'],source:'MYHORDES_CURRENT'}),
  wake_the_dead:def({type:'wake_the_dead',name:'“Wake The Dead”',purpose:'Source rhum_#00 cocktail. Restores AP to the normal source target and makes the citizen Drunk; unusable while Drunk or Hungover.',category:'consumable',displayCategory:'food',capabilities:['consumable'],source:'MYHORDES_CURRENT'}),
  ems_system_empty:def({type:'ems_system_empty',name:'EMS System (incomplete)',purpose:'Source sport_elec_empty_#00. Ordinary scavenged EMS unit without power. Combine it with one Battery at 0 AP to charge it.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  ems_system_charged:def({type:'ems_system_charged',name:'EMS System (charged)',purpose:'Source sport_elec_#00. Using it while unwounded restores AP toward 6, guarantees a random body-part wound, and discharges the unit.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  old_washing_machine:def({type:'old_washing_machine',name:'Old Washing Machine',purpose:'Source machine_1_#00 heavy furniture. Required to install Home Laboratory level 1 and to construct the town Central Laboratory.',category:'misc',displayCategory:'furniture',capabilities:['component','decoration'],source:'MYHORDES_CURRENT'}),
  carcinogenic_oven:def({type:'carcinogenic_oven',name:'Carcinogenic Oven',purpose:'Kitchen appliance required for Home Kitchen level 3 and Central Cafeteria.',category:'misc',displayCategory:'furniture',capabilities:['component','decoration'],source:'MYHORDES_CURRENT'}),
  student_refrigerator:def({type:'student_refrigerator',name:'Student Refrigerator',purpose:'Kitchen appliance required for Home Kitchen level 4.',category:'misc',displayCategory:'furniture',capabilities:['component','decoration'],source:'MYHORDES_CURRENT'}),
  groundsheet:def({type:'groundsheet',name:'Groundsheet',purpose:'Source sheet_#00 camping equipment. While carried outside it adds +5 camping points.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  smelly_meat:def({type:'smelly_meat',name:'Smelly Meat',purpose:'Source smelly_meat_#00 camping item. Its odor masks the carrier from zombies and adds +5 camping points while carried outside.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  old_door:def({type:'old_door',name:'Old Door',purpose:'Defensive object: +2 town defense in the Bank, or +1 personal defense when stored at Home.',category:'defense',displayCategory:'defences',capabilities:['defense'],source:'DIE2NITE_ARCHIVE',bankDefense:2,homeDefense:1}),
  water_bomb:def({type:'water_bomb',name:'Water Bomb',purpose:'Single-use MyHordes weapon. While outside and not exhausted, it kills 2–4 zombies without spending AP. It can be made from a Plastic Bag and Water Ration.',category:'weapon',displayCategory:'armoury',capabilities:['weapon'],source:'MYHORDES_CURRENT'}),
  human_bone:def({type:'human_bone',name:'Human Bone',purpose:'Breakable improvised weapon and a source-valid opener for some containers.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'}),
  broken_human_bone:def({type:'broken_human_bone',name:'Broken Human Bone',purpose:'A broken improvised weapon. Repair it anywhere with a Repair Kit or Kwik-Fix.',category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'}),
  pathetic_penknife:def({type:'pathetic_penknife',name:'Pathetic Penknife',purpose:'Fragile breakable melee weapon and source-valid box opener.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'}),
  broken_pathetic_penknife:def({type:'broken_pathetic_penknife',name:'Broken Pathetic Penknife',purpose:'A broken weapon. Repair it anywhere with a Repair Kit or Kwik-Fix.',category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'}),
  staff:def({type:'staff',name:'Staff',purpose:'Breakable melee weapon and source-valid box opener.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'}),
  broken_staff:def({type:'broken_staff',name:'Broken Staff',purpose:'A broken weapon that can be repaired anywhere or consumed in the Makeshift Guitar combination.',category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable','component'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'}),
  serrated_knife:def({type:'serrated_knife',name:'Serrated Knife',purpose:'Reliable breakable melee weapon and source-valid box opener.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'}),
  broken_serrated_knife:def({type:'broken_serrated_knife',name:'Broken Serrated Knife',purpose:'A broken weapon. Repair it anywhere with a Repair Kit or Kwik-Fix.',category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'}),
  machete:def({type:'machete',name:'Machete',purpose:'Reliable breakable weapon that kills two zombies per successful use and can open boxes.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','repairable'],source:'MYHORDES_CURRENT'}),
  broken_machete:def({type:'broken_machete',name:'Broken Machete',purpose:'A broken weapon. Repair it anywhere with a Repair Kit or Kwik-Fix.',category:'broken_weapon',displayCategory:'armoury',capabilities:['repairable'],state:{condition:{initial:'broken'}},source:'MYHORDES_CURRENT'}),
  adjustable_spanner:sourceWeapon('adjustable_spanner','Adjustable Spanner','MyHordes WRENCH. Repair/building tool, breakable field weapon, and source-valid box opener.'),
  broken_adjustable_spanner:brokenSourceWeapon('broken_adjustable_spanner','Adjustable Spanner'),
  screwdriver:sourceWeapon('screwdriver','Screwdriver','MyHordes SCREW. General repair/can-opening tool, breakable field weapon, and source-valid box opener.'),
  broken_screwdriver:brokenSourceWeapon('broken_screwdriver','Screwdriver'),
  swiss_army_knife:sourceWeapon('swiss_army_knife','Swiss Army Knife','General-purpose MyHordes tool, breakable field weapon, and source-valid box opener.'),
  broken_swiss_army_knife:brokenSourceWeapon('broken_swiss_army_knife','Swiss Army Knife'),
  box_cutter:sourceWeapon('box_cutter','Box Cutter','MyHordes CUTTER. Fragile but effective breakable weapon and source-valid box opener.'),
  broken_box_cutter:brokenSourceWeapon('broken_box_cutter','Box Cutter'),
  chain:sourceWeapon('chain','Rusty Chain','Breakable improvised weapon and source-valid box opener.'),
  broken_chain:brokenSourceWeapon('broken_chain','Rusty Chain'),
  can_opener:sourceWeapon('can_opener','Can Opener','Tool for opening cans and metal containers. It can be used as a weapon, but doing so always breaks it.'),
  broken_can_opener:brokenSourceWeapon('broken_can_opener','Can Opener'),
  ektorp_gluten_chair:sourceWeapon('ektorp_gluten_chair','Ektorp-Gluten Chair','Ordinary MyHordes furniture, source-valid melee-box opener, and improvised weapon. A use has a 50% chance to kill one zombie and a 50% chance to break the chair.'),
  broken_ektorp_gluten_chair:brokenSourceWeapon('broken_ektorp_gluten_chair','Ektorp-Gluten Chair'),
  pc_base_unit:sourceWeapon('pc_base_unit','PC Base Unit','Ordinary MyHordes furniture/equipment, source-valid melee-box opener, and improvised weapon. A use kills one zombie and has a 50% chance to break the unit.'),
  broken_pc_base_unit:brokenSourceWeapon('broken_pc_base_unit','PC Base Unit'),
  saw_tool_part:def({type:'saw_tool_part',name:'Damaged Hacksaw',purpose:'Source saw_tool_part_#00. Combine with Kwik-Fix and Nuts & Bolts to repair it into a Hacksaw.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  saw_tool:def({type:'saw_tool',name:'Hacksaw',purpose:'Source saw_tool_#00 utility tool. While carried in the rucksack it reduces any Workshop action by 1 AP and it opens main-family containers such as Cans.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  doggy_bag:container('doggy_bag','Doggy Bag','MyHordes food bag. Opening consumes the bag and yields one of eight ordinary foods.'),
  citizen_welcome_pack:def({type:'citizen_welcome_pack',name:"Citizen's Welcome Pack",purpose:'Starter package retained while its source-backed output catalogue is expanded.',category:'container',displayCategory:'containers',capabilities:['container'],source:'DIE2NITE_ARCHIVE',containerPool:['battery','box_of_matches','pharmaceutical_products']}),
  radio_cassette_player_off:def({type:'radio_cassette_player_off',name:'Radio Cassette Player (no battery)',purpose:'Batteryless MyHordes cassette player. Combine it with one Battery at 0 AP to produce a powered Working Radio while preserving the physical item.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'MYHORDES_CURRENT'}),
  box_of_matches:def({type:'box_of_matches',name:'Box of Matches',purpose:'A utility component found in the desert and Welcome Packs. Combine with a Rotting Log to make a Torch.',category:'misc',displayCategory:'miscellaneous',capabilities:['component'],source:'DIE2NITE_ARCHIVE'}),
  pharmaceutical_products:def({type:'pharmaceutical_products',name:'Pharmaceutical Products',purpose:'Medical/chemical supply. Two are consumed per Home Laboratory experiment and the item is also required by several town constructions.',category:'misc',displayCategory:'pharmacy',capabilities:['component','medical'],source:'MYHORDES_CURRENT'}),
  water_pistol:def({type:'water_pistol',name:'Water Pistol',purpose:'Three-shot water weapon. Each attack spends one charge; a Faucet refills it for free while in town.',category:'weapon',displayCategory:'armoury',capabilities:['weapon','charge_bearing'],state:{charges:{min:0,max:3,initial:3}},source:'MYHORDES_CURRENT'}),
  water_cooler_bottle:def({type:'water_cooler_bottle',name:'Water Cooler Bottle',purpose:'Multi-ration water container. Drinking spends one stored ration; a Faucet refills it for free while in town.',category:'consumable',displayCategory:'food',capabilities:['consumable','charge_bearing'],state:{charges:{min:0,max:3,initial:3},contamination:{initial:'clean'}},source:'MYHORDES_CURRENT',consumableKind:'water'}),
  repair_kit:def({type:'repair_kit',name:'Repair Kit',purpose:'Portable repair tool. Repairing a broken item costs 1 AP and damages the kit; a damaged kit is restored at the Workshop.',category:'misc',displayCategory:'miscellaneous',capabilities:['repairable'],state:{condition:{initial:'intact'}},source:'MYHORDES_CURRENT'}),
  magnetic_key:def({type:'magnetic_key',name:'Magnetic Key',purpose:'Explorable-ruin door key. A matching locked room consumes the key when opened.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  bump_key:def({type:'bump_key',name:'Bump Key',purpose:'Explorable-ruin door key. A matching locked room consumes the key when opened.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  bottle_opener:def({type:'bottle_opener',name:'Bottle Opener',purpose:'The classic explorable-ruin key family. A matching locked room consumes it when opened.',category:'misc',displayCategory:'miscellaneous',capabilities:[],source:'MYHORDES_CURRENT'}),
  common_blueprint:def({type:'common_blueprint',name:'Construction Blueprint (Common)',purpose:'Study this plan inside town to reveal one random eligible Common construction site.',category:'misc',displayCategory:'miscellaneous',capabilities:['blueprint'],source:'MYHORDES_CURRENT'}),
  uncommon_blueprint:def({type:'uncommon_blueprint',name:'Construction Blueprint (Uncommon)',purpose:'Study this plan inside town to reveal one random eligible Uncommon construction site.',category:'misc',displayCategory:'miscellaneous',capabilities:['blueprint'],source:'MYHORDES_CURRENT'}),
  rare_blueprint:def({type:'rare_blueprint',name:'Construction Blueprint (Rare)',purpose:'Study this plan inside town to reveal one random eligible Rare construction site.',category:'misc',displayCategory:'miscellaneous',capabilities:['blueprint'],source:'MYHORDES_CURRENT'}),
  very_rare_blueprint:def({type:'very_rare_blueprint',name:'Construction Blueprint (Very Rare)',purpose:'Study this plan inside town to reveal one random eligible Very Rare construction site.',category:'misc',displayCategory:'miscellaneous',capabilities:['blueprint'],source:'MYHORDES_CURRENT'}),
  worn_leather_bag:container('worn_leather_bag','Worn Leather Bag','A weathered document satchel. Opening it yields one construction blueprint, with source-backed rarity weights.'),
  resource_pack:container('resource_pack','Construction Kit','MyHordes material pack. Each opening yields one Twisted Plank or Wrought Iron and reduces the remaining contents until the pack is empty.',{contents:{min:1,max:3,initial:2}}),
  toolbox:container('toolbox','Toolbox','Source-backed container of mechanical, pharmaceutical, explosive and repair supplies.'),
  metal_chest:container('metal_chest','Metal Chest','Source-backed chest. Its full medical/drug output dependency chain is being completed in Part 2.'),
  xl_chest:container('xl_chest','Large Metal Chest','Rare source-backed container for advanced equipment parts. Part 2 follows each output into its complete equipment chain.'),
  food_box:container('food_box','Food Parcel','Source-backed food container. Part 2 follows its outputs into the proper food mechanics.'),
  decoration_box:container('decoration_box','Flatpacked Furniture','Source-backed furniture container.'),
  safe:container('safe','Safe','Rare source-backed container opened through repeated 1 AP attempts; successful opening yields high-value equipment or components.'),
}

export const ITEM_TYPES:ItemType[]=Object.keys(ITEMS) as ItemType[]

/** Legacy arrays retained temporarily for callers/tests while weighted tables replace acquisition. */
export const NORMAL_SCAVENGE_LOOT_POOL:ItemType[]=[
  'twisted_plank','twisted_plank','twisted_plank','twisted_plank','twisted_plank',
  'wrought_iron','wrought_iron','wrought_iron','wrought_iron','wrought_iron',
  'resource_pack','unshaped_concrete_block','water_ration','water_ration','food','food','old_door',
  'human_bone','human_bone','pathetic_penknife','staff','serrated_knife','water_bomb','battery','box_of_matches','pharmaceutical_products',
  'duct_tape','wire_reel','copper_pipe','nuts_and_bolts','broken_electronic_device','mechanism','empty_oil_can','belt','bag_of_damp_grass','bag_of_cement','human_flesh','plastic_bag','toolbox','ems_system_empty','groundsheet','smelly_meat','old_washing_machine','full_jerrycan',
]
export const DEPLETED_SCAVENGE_LOOT_POOL:ItemType[]=['rotten_log','rotten_log','rotten_log','scrap_metal','scrap_metal','scrap_metal']

export function defaultItemState(type:ItemType):ItemState{
  const schema=ITEMS[type].state
  if(!schema)return{}
  const state:ItemState={}
  if(schema.charges)state.charges=schema.charges.initial
  if(schema.contents)state.contents=schema.contents.initial
  if(schema.condition)state.condition=schema.condition.initial
  if(schema.contamination)state.contamination=schema.contamination.initial
  if(schema.powered)state.powered=schema.powered.initial
  if(schema.assembly)state.assembly=schema.assembly.initial
  return state
}
export function normalizeItemState(type:ItemType,input:ItemState|undefined):ItemState{
  const schema=ITEMS[type].state
  if(!schema)return{}
  const base=defaultItemState(type)
  const next:ItemState={...base,...input}
  if(schema.charges){const value=typeof next.charges==='number'?next.charges:schema.charges.initial;next.charges=Math.min(schema.charges.max,Math.max(schema.charges.min,Math.trunc(value)))}else delete next.charges
  if(schema.contents){const value=typeof next.contents==='number'?next.contents:schema.contents.initial;next.contents=Math.min(schema.contents.max,Math.max(schema.contents.min,Math.trunc(value)))}else delete next.contents
  if(!schema.condition)delete next.condition
  if(!schema.contamination)delete next.contamination
  if(!schema.powered)delete next.powered
  if(!schema.assembly)delete next.assembly
  return next
}
export function createItemInstance(id:string,type:ItemType,state?:ItemState):ItemInstance{return{id,type,state:normalizeItemState(type,state)}}
export function itemStackKey(item:ItemInstance):string{return`${item.type}:${JSON.stringify(normalizeItemState(item.type,item.state))}`}
export function itemStateLabel(item:ItemInstance):string{
  const state=normalizeItemState(item.type,item.state);const parts:string[]=[]
  if(state.charges!==undefined)parts.push(`${state.charges} ${state.charges===1?'charge':'charges'}`)
  if(state.contents!==undefined)parts.push(`${state.contents} ${state.contents===1?'item':'items'} remaining`)
  if(state.condition&&state.condition!=='intact')parts.push(state.condition)
  if(state.contamination&&state.contamination!=='clean')parts.push(state.contamination)
  if(state.assembly&&state.assembly!=='complete')parts.push(state.assembly)
  if(state.powered!==undefined)parts.push(state.powered?'on':'off')
  return parts.join(', ')
}
export function itemName(type:ItemType):string{return ITEMS[type].name}
export function itemPurpose(type:ItemType):string{return ITEMS[type].purpose}
export function itemHasCapability(type:ItemType,capability:ItemCapability):boolean{return ITEMS[type].capabilities.includes(capability)}
export function bankDefenseFor(type:ItemType):number{return ITEMS[type].bankDefense??0}
export function homeDefenseFor(type:ItemType):number{return ITEMS[type].homeDefense??0}
export function consumableKind(type:ItemType):ConsumableKind|null{return ITEMS[type].consumableKind??null}
export function containerPool(type:ItemType):ItemType[]|null{return ITEMS[type].containerPool??null}
export function isContainer(type:ItemType):boolean{return ITEMS[type].capabilities.includes('container')}