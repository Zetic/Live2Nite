import { ITEM_SOURCE_CATALOG } from './itemSourceCatalog'
import type { ItemType } from './types'
import { EXPLORABLE_RUIN_IDS, RUIN_IDS, type ExplorableRuinFamily, type RuinId } from './ruinIds'

export type RuinAvailability='ordinary'|'explorable'|'conditional'
export type RuinLootProfile='mixed'|'salvage'|'construction'|'medical'|'food'|'weapons'|'water'|'domestic'|'wilderness'|'literature'
export interface RuinDefinition{
  id:RuinId
  name:string
  icon:string
  campingBase:number
  campingSpots:number
  spawnChance:number
  emptyChance:number
  sourceKm:{min:number;max:number}
  explorable:boolean
  family?:ExplorableRuinFamily
  availability:RuinAvailability
  lootProfile:RuinLootProfile
}

const r=(id:RuinId,name:string,icon:string,campingBase:number,campingSpots:number,spawnChance:number,emptyChance:number,min:number,max:number,lootProfile:RuinLootProfile,availability:RuinAvailability='ordinary',family?:ExplorableRuinFamily):RuinDefinition=>({id,name,icon,campingBase,campingSpots,spawnChance,emptyChance,sourceKm:{min,max},explorable:availability==='explorable',availability,lootProfile,...(family?{family}:{})})

/**
 * Complete gameplay ruin catalogue from the pinned Zenoo/zen-hordes generated 5.1.1 registry.
 * Live2Nite keeps semantic string identities; upstream numeric RuinId values are deliberately not stored.
 * The source's separate BURIED_BUILDING placeholder is not a gameplay ruin and is therefore excluded.
 */
export const RUIN_CATALOG:Readonly<Record<RuinId,RuinDefinition>>={
  citizens_home:r('citizens_home',"Citizen's Home",'home',10,2,686,.25,1,4,'domestic'),
  scottish_smiths_superstore:r('scottish_smiths_superstore',"Scottish Smith's Superstore",'albi',10,3,686,.05,6,9,'food'),
  once_inhabited_cave:r('once_inhabited_cave','Once-inhabited Cave','cave',10,2,184,.1,16,19,'mixed'),
  old_hydraulic_pump:r('old_hydraulic_pump','Old Hydraulic Pump','pump',10,1,401,.1,3,6,'water'),
  old_bicycle_hire_shop:r('old_bicycle_hire_shop','Old Bicycle Hire Shop','bike',10,2,159,.25,4,7,'salvage'),
  deserted_freight_yard:r('deserted_freight_yard','Deserted Freight Yard','freight',10,3,464,.1,10,13,'salvage'),
  old_field_hospital:r('old_field_hospital','Old Field Hospital','hospital',10,4,205,.1,16,19,'medical'),
  old_aerodrome:r('old_aerodrome','Old Aerodrome','aerodrome',10,5,129,.1,12,15,'salvage'),
  old_police_station:r('old_police_station','Old Police Station','police',30,4,640,.1,6,9,'weapons'),
  nuclear_bunker:r('nuclear_bunker','Nuclear Bunker','bunker',50,5,499,.1,10,13,'mixed'),
  macs_atomic_cafe:r('macs_atomic_cafe',"Mac's Atomic Cafe",'cafe',10,3,320,.1,6,9,'food'),
  motorway_services:r('motorway_services','Motorway Services','autobahn',10,2,460,.33,8,11,'food'),
  wrecked_cars:r('wrecked_cars','Wrecked Cars','cars',10,2,304,.1,3,6,'salvage'),
  shattered_illusions_bar:r('shattered_illusions_bar',"The 'Shattered Illusions' Bar",'bar2',20,3,41,.1,21,28,'literature'),
  home_depot:r('home_depot','Home Depot','obi',10,2,409,.1,5,8,'construction'),
  construction_site_shelter:r('construction_site_shelter','Construction Site Shelter','container',10,1,475,.05,6,9,'construction'),
  fraser_ds_kebab_ish:r('fraser_ds_kebab_ish',"Fraser D's Kebab-ish",'doner',10,2,181,.1,3,6,'food'),
  dukes_villa:r('dukes_villa',"Duke's Villa",'duke',10,3,148,.1,12,15,'mixed'),
  dark_woods:r('dark_woods','Dark Woods','woods',10,2,70,0,2,5,'wilderness'),
  collapsed_mineshaft:r('collapsed_mineshaft','Collapsed Mineshaft','mine',10,2,341,.1,12,15,'construction'),
  collapsed_quarry:r('collapsed_quarry','Collapsed Quarry','quarry',10,2,71,.3,3,6,'construction'),
  strange_circular_device:r('strange_circular_device','Strange Circular Device','ufo',10,1,15,.1,21,28,'salvage'),
  pi_keya_furniture:r('pi_keya_furniture','PI-KEYA Furniture','ekea',10,3,242,.1,4,7,'domestic'),
  family_tomb:r('family_tomb','Family Tomb','tomb',-15,1,68,.1,3,6,'weapons'),
  fast_food_restaurant:r('fast_food_restaurant','Fast Food Restaurant','mczombie',10,2,710,.1,6,9,'food'),
  plane_crash_site:r('plane_crash_site','Plane Crash Site','plane',10,2,155,.1,4,7,'salvage'),
  garden_shed:r('garden_shed','Garden Shed','shed',10,1,624,.05,6,9,'construction'),
  looted_supermarket:r('looted_supermarket','Looted Supermarket','supermarket',0,4,466,.1,4,7,'mixed'),
  cave:r('cave','Cave','cave2',10,1,73,.1,3,6,'mixed'),
  indian_burial_ground:r('indian_burial_ground','Indian Burial Ground','cemetary',-50,-1,181,.2,3,6,'wilderness'),
  fairground_stall:r('fairground_stall','Fairground Stall','fair',10,2,215,.1,5,8,'mixed'),
  small_house:r('small_house','Small House','house',10,1,381,.1,2,5,'domestic'),
  water_processing_plant:r('water_processing_plant','Water Processing Plant','water',10,2,472,.1,5,8,'water'),
  cosmetics_lab:r('cosmetics_lab','Cosmetics Lab','lab',10,2,180,.1,2,5,'medical'),
  ambulance:r('ambulance','Ambulance','ambulance',10,1,183,.1,2,5,'medical'),
  warehouse:r('warehouse','Warehouse','warehouse',10,5,219,.1,15,18,'mixed'),
  disused_car_park:r('disused_car_park','Disused Car Park','carpark',10,3,335,.1,3,6,'salvage'),
  broken_down_tank:r('broken_down_tank','Broken-down Tank','tank',20,1,83,.1,21,28,'weapons'),
  motel_666_dusk:r('motel_666_dusk','Motel 666 Dusk','motel',10,5,292,.1,12,15,'domestic'),
  army_outpost:r('army_outpost','Army Outpost','army',20,5,212,.1,16,19,'weapons'),
  post_office:r('post_office','Post Office','post',10,2,177,.15,8,11,'literature'),
  smugglers_cache:r('smugglers_cache',"Smugglers' Cache",'cave3',15,2,196,.25,2,5,'mixed'),
  equipped_trench:r('equipped_trench','Equipped Trench','trench',20,2,216,.1,5,8,'weapons'),
  town_library:r('town_library','Town Library','dll',10,2,204,.05,6,9,'literature'),
  mini_market:r('mini_market','Mini-market','emma',10,1,913,.05,8,11,'food'),
  mayor_mobile:r('mayor_mobile',"The 'Mayor-Mobile'",'mayor',10,1,81,.1,16,19,'literature'),
  wrecked_transporter:r('wrecked_transporter','Wrecked Transporter','lkw',10,1,177,0,2,5,'mixed'),
  burnt_school:r('burnt_school','Burnt School','school',10,3,165,.1,3,6,'mixed'),
  dilapidated_building:r('dilapidated_building','Dilapidated Building','office',10,4,519,.1,10,13,'domestic'),
  derelict_villa:r('derelict_villa','Derelict Villa','villa',10,3,338,.1,3,6,'domestic'),
  abandoned_construction_site:r('abandoned_construction_site','Abandoned Construction Site','construction',10,3,481,.1,4,7,'construction'),
  abandoned_well:r('abandoned_well','Abandoned Well','well',-20,1,221,.33,17,20,'water'),
  disused_silos:r('disused_silos','Disused Silos','silo',10,3,482,.08,8,11,'water'),
  blocked_road:r('blocked_road','Blocked Road','street',10,1,42,.2,4,7,'salvage'),
  abandoned_park:r('abandoned_park','Abandoned Park','park',10,3,102,.2,4,7,'wilderness'),
  guns_n_zombies_armoury:r('guns_n_zombies_armoury',"Guns 'n' Zombies Armoury",'guns',10,3,121,.25,5,8,'weapons'),
  disused_warehouse:r('disused_warehouse','Disused Warehouse','warehouse2',10,4,181,.2,2,5,'mixed'),
  citizens_tent:r('citizens_tent',"Citizen's Tent",'tent',30,1,202,.05,12,15,'mixed'),
  destroyed_pharmacy:r('destroyed_pharmacy','Destroyed Pharmacy','pharma',10,2,458,.1,4,7,'medical'),
  shady_bar:r('shady_bar','Shady Bar','bar',10,2,432,.2,5,8,'food'),
  abandoned_bunker:r('abandoned_bunker','Abandoned Bunker','deserted_bunker',10,4,0,1,5,100,'mixed','explorable','bunker'),
  abandoned_hotel:r('abandoned_hotel','Abandoned Hotel','deserted_hotel',10,4,0,1,5,100,'domestic','explorable','hotel'),
  abandoned_hospital:r('abandoned_hospital','Abandoned Hospital','deserted_hospital',10,4,0,1,5,100,'medical','explorable','hospital'),
  crows_fit_gym:r('crows_fit_gym',"Crows'fit Gym",'sports_crow',10,2,666,.2,8,13,'medical'),
  strange_barn:r('strange_barn','Strange Barn','crop_circles',15,3,0,.2,21,27,'mixed','conditional'),
}

export const ORDINARY_RUIN_IDS:readonly RuinId[]=RUIN_IDS.filter((id)=>RUIN_CATALOG[id].availability==='ordinary')
export const CONDITIONAL_RUIN_IDS:readonly RuinId[]=RUIN_IDS.filter((id)=>RUIN_CATALOG[id].availability==='conditional')

const SOURCE_PROFILE_REFS:Readonly<Record<RuinLootProfile,readonly string[]>>={
  mixed:['chest_citizen_#00','chest_#00','chest_tools_#00','food_bag_#00','meca_parts_#00','repair_kit_#00','plate_raw_#00','pile_#00'],
  salvage:['metal_#00','meca_parts_#00','plate_raw_#00','tube_#00','courroie_#00','electro_box_#00','repair_one_#00','oilcan_#00','metal_beam_#00'],
  construction:['wood2_#00','metal_#00','wood_beam_#00','metal_beam_#00','plate_raw_#00','concrete_#00','repair_kit_part_raw_#00','meca_parts_#00','screw_#00','wire_#00','fence_#00'],
  medical:['pharma_#00','drug_#00','xanax_#00','bandage_#00','water_can_empty_#00','pc_#00','repair_one_#00'],
  food:['meat_#00','food_bag_#00','food_noodles_#00','can_#00','water_#00','spices_#00','chest_food_#00'],
  weapons:['knife_#00','cutcut_#00','watergun_empty_#00','pilegun_empty_#00','deto_#00','repair_kit_#00','pile_#00','wire_#00'],
  water:['water_#00','water_can_empty_#00','water_can_1_#00','water_can_2_#00','water_can_3_#00','tube_#00','oilcan_#00'],
  domestic:['can_#00','chair_basic_#00','electro_box_#00','food_bag_#00','lights_#00','table_#00','repair_kit_#00','pile_#00'],
  wilderness:['wood2_#00','hmeat_#00','pet_chick_#00','ryebag_#00','plate_raw_#00','food_bag_#00'],
  literature:['deco_box_#00','lens_#00','chair_basic_#00','table_#00','lights_#00'],
}
const ITEM_BY_SOURCE_REF=new Map(ITEM_SOURCE_CATALOG.filter((entry)=>entry.runtimeType&&entry.implementation!=='wip').map((entry)=>[entry.sourceRef,entry.runtimeType!] as const))
export function playableRuinLootPool(id:RuinId):ItemType[]{
  const refs=SOURCE_PROFILE_REFS[RUIN_CATALOG[id].lootProfile]
  return refs.flatMap((sourceRef)=>{const type=ITEM_BY_SOURCE_REF.get(sourceRef);return type?[type]:[]})
}
export function ruinName(id:RuinId):string{return RUIN_CATALOG[id].name}
export function ruinCode(id:RuinId):string{
  const words=RUIN_CATALOG[id].name.replaceAll("'",'').split(/[^A-Za-z0-9]+/).filter(Boolean)
  return words.length>1?`${words[0][0]}${words[1][0]}`.toUpperCase():words[0].slice(0,2).toUpperCase()
}
export function isExplorableRuin(id:RuinId):boolean{return EXPLORABLE_RUIN_IDS.includes(id)}
