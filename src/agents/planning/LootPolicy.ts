import { isWeapon } from '../../core/combat'
import { ITEMS } from '../../core/items'
import type { BotMissionAssignment, Citizen, GameCommand, GameState, ItemInstance, ItemType } from '../../core/types'
import { distanceToTown, zoneKey } from '../../core/world'
import { evaluateTownNeeds, type TownNeeds } from './TownNeeds'

const BASE_LOOT_VALUE:Record<ItemType,number>={
  resource_pack:105,toolbox:104,metal_chest:96,xl_chest:120,food_box:88,decoration_box:64,safe:118,
  twisted_plank:72,wrought_iron:72,patchwork_beam:82,metal_support:86,sheet_metal:80,unshaped_concrete_block:76,rotten_log:38,scrap_metal:38,quality_log:66,sheet_metal_bits:74,
  nuts_and_bolts:92,copper_pipe:86,wire_reel:82,duct_tape:78,compact_detonator:96,semtex:100,electronic_component:90,laser_diode:96,telescope:94,convex_lens:72,battery:70,empty_oil_can:64,
  mechanism:78,broken_electronic_device:82,belt:68,bag_of_damp_grass:46,bag_of_cement:72,earplugs:34,meaty_bone:62,human_flesh:60,poison_gland:82,working_radio:80,radio_cassette_player_off:68,guitar:66,table:70,chicken:62,wire_mesh:72,grain_sack:58,
  tool_bag:78,kwik_fix:82,plastic_bag:36,engine_incomplete:86,engine:90,claymore:94,torch:48,battery_launcher:74,strong_spices:44,
  water_ration:62,food:52,mouldy_twinkies:52,half_eaten_chicken_wings:52,rancid_shortbread_pack:52,out_of_date_jaffa_cakes:52,dried_chewing_gum:52,stale_tart:52,soft_crisps:52,can:58,open_can:52,vegetable:52,tasty_looking_steak:64,chinese_noodles:52,spicy_chinese_noodles:64,
  old_door:58,water_bomb:70,machete:72,serrated_knife:66,staff:50,pathetic_penknife:40,human_bone:58,doggy_bag:58,citizen_welcome_pack:42,pharmaceutical_products:72,box_of_matches:22,
  adjustable_spanner:62,screwdriver:54,swiss_army_knife:52,box_cutter:60,chain:60,can_opener:58,ektorp_gluten_chair:60,pc_base_unit:68,saw_tool_part:72,saw_tool:92,
  broken_machete:20,broken_serrated_knife:18,broken_staff:26,broken_pathetic_penknife:14,broken_human_bone:12,
  broken_adjustable_spanner:18,broken_screwdriver:16,broken_swiss_army_knife:16,broken_box_cutter:16,broken_chain:18,broken_can_opener:14,broken_ektorp_gluten_chair:18,broken_pc_base_unit:20,
  water_pistol:68,water_cooler_bottle:66,repair_kit:84,bandage:92,paracetoid:96,anabolic_steroids:78,valium_shot:90,vodka_marinostov:50,wake_the_dead:54,
}

function isFood(type:ItemType):boolean{return ITEMS[type].consumableKind==='food'}
function missionBonus(mission:BotMissionAssignment|null,type:ItemType):number{if(!mission)return 0;if(mission.purpose==='gather_construction'&&['raw','construction','misc','container'].includes(ITEMS[type].category))return 24;if(mission.purpose==='gather_food'&&(isFood(type)||['grain_sack','chicken','food_box','doggy_bag','can'].includes(type)))return 35;if(mission.purpose==='gather_medical'&&['pharmaceutical_products','bandage','paracetoid','valium_shot','duct_tape','kwik_fix','repair_kit','toolbox'].includes(type))return 35;if((mission.purpose==='gather_weapons'||mission.purpose==='rescue')&&isWeapon(type))return 28;return 0}
function scoreWithNeeds(needs:TownNeeds,citizen:Citizen,type:ItemType,mission:BotMissionAssignment|null):number{
  let score=BASE_LOOT_VALUE[type]+missionBonus(mission,type);const directlyMissing=needs.missingConstruction[type]??0
  if(directlyMissing>0)score+=70+Math.min(28,directlyMissing*4)
  if((type==='rotten_log'||type==='quality_log')&&((needs.missingConstruction.twisted_plank??0)>0||(needs.missingConstruction.patchwork_beam??0)>0))score+=36
  if(type==='scrap_metal'&&((needs.missingConstruction.wrought_iron??0)>0||(needs.missingConstruction.metal_support??0)>0))score+=36
  if(type==='sheet_metal_bits'&&(needs.missingConstruction.sheet_metal??0)>0)score+=40
  if(type==='twisted_plank'&&(needs.missingConstruction.patchwork_beam??0)>0)score+=24
  if(type==='wrought_iron'&&(needs.missingConstruction.metal_support??0)>0)score+=24
  if(type==='bag_of_cement'&&(needs.missingConstruction.unshaped_concrete_block??0)>0)score+=40
  if(type==='broken_electronic_device'&&Object.keys(needs.missingConstruction).some((key)=>['electronic_component','nuts_and_bolts','battery','compact_detonator'].includes(key)))score+=30
  if(type==='mechanism'&&Object.keys(needs.missingConstruction).some((key)=>['wrought_iron','nuts_and_bolts','copper_pipe'].includes(key)))score+=30
  if((type==='copper_pipe'||type==='convex_lens')&&(needs.missingConstruction.telescope??0)>0)score+=34
  if(['wire_reel','empty_oil_can','broken_staff'].includes(type)&&(needs.missingConstruction.guitar??0)>0)score+=30
  if(type==='radio_cassette_player_off'&&(needs.missingConstruction.working_radio??0)>0)score+=40
  if(type==='resource_pack'&&Object.keys(needs.missingConstruction).length>0)score+=28
  if(type==='saw_tool')score+=18
  if(type==='saw_tool_part')score+=12
  if(isFood(type)&&needs.foodLow)score+=45
  if(type==='strong_spices'&&needs.foodLow)score+=18
  if((type==='food_box'||type==='doggy_bag'||type==='can')&&needs.foodLow)score+=55
  if(isWeapon(type)&&needs.weaponsLow)score+=35
  if(type==='water_ration'){if(citizen.status.hydration!=='normal')score+=90;else if(!citizen.daily.drank&&citizen.status.desertStepsToday>=6)score+=45;if(needs.waterPerCitizen<1)score+=55;else if(needs.waterPerCitizen<2)score+=24}
  if(type==='old_door'&&(needs.defense.pressure==='critical'||needs.defense.pressure==='shortfall'))score+=45
  return score
}
export function lootScore(state:GameState,citizen:Citizen,type:ItemType,mission:BotMissionAssignment|null=null):number{return scoreWithNeeds(evaluateTownNeeds(state),citizen,type,mission)}
function isProtectedCarry(state:GameState,citizen:Citizen,item:ItemInstance,mission:BotMissionAssignment|null):boolean{if(item.type==='water_ration')return citizen.status.hydration!=='normal'||(!citizen.daily.drank&&(citizen.status.desertStepsToday>=6||(citizen.location.type==='world'&&distanceToTown(citizen.location.x,citizen.location.y)>=4)));if(isFood(item.type)&&!citizen.daily.ate&&citizen.location.type==='world'&&distanceToTown(citizen.location.x,citizen.location.y)>=4)return true;if(isWeapon(item.type)){const workingWeapons=citizen.inventory.filter((candidate)=>isWeapon(candidate.type));return workingWeapons.length<=1&&(mission?.purpose==='rescue'||mission?.purpose==='gather_weapons')}return false}
function pickupAction(actions:GameCommand[],itemId:string):GameCommand|null{return actions.find((action)=>action.type==='PICK_UP_ITEM'&&action.itemId===itemId)??null}
function dropAction(actions:GameCommand[],itemId:string):GameCommand|null{return actions.find((action)=>action.type==='DROP_ITEM'&&action.itemId===itemId)??null}
export function opportunisticFieldAction(state:GameState,citizen:Citizen,actions:GameCommand[],mission:BotMissionAssignment|null):GameCommand|null{
  if(citizen.location.type!=='world')return null;let needs:TownNeeds|null=null;const score=(type:ItemType)=>scoreWithNeeds(needs??(needs=evaluateTownNeeds(state)),citizen,type,mission);const zone=state.world.zones[zoneKey(citizen.location.x,citizen.location.y)];const ground=zone?.groundItems.length?[...zone.groundItems].sort((a,b)=>score(b.type)-score(a.type))[0]??null:null
  if(ground){const groundValue=score(ground.type);if(citizen.inventory.length<citizen.inventoryCapacity){const preserveTargetSlots=mission?.phase==='outbound'&&citizen.inventory.length>=citizen.inventoryCapacity-2;if(!preserveTargetSlots||groundValue>=88||mission?.phase==='return'){const pickup=pickupAction(actions,ground.id);if(pickup)return pickup}}else{const candidates=citizen.inventory.filter((item)=>!isProtectedCarry(state,citizen,item,mission));const lowest=[...candidates].sort((a,b)=>score(a.type)-score(b.type))[0]??null;if(lowest&&groundValue>=score(lowest.type)+15){const drop=dropAction(actions,lowest.id);if(drop)return drop}}}
  const specialSearch=actions.find((action)=>action.type==='SEARCH_SPECIAL_SITE')??null;if(specialSearch)return specialSearch;const search=actions.find((action)=>action.type==='SEARCH_ZONE')??null;if(search)return search
  if(mission&&!mission.emergency&&mission.phase==='outbound'){const distance=distanceToTown(citizen.location.x,citizen.location.y);const targetDistance=distanceToTown(mission.target.x,mission.target.y);if(distance>=1&&distance<=3&&targetDistance>distance+1&&citizen.inventory.length>=citizen.inventoryCapacity-1){const cacheable=citizen.inventory.filter((item)=>{if(isProtectedCarry(state,citizen,item,mission))return false;const category=ITEMS[item.type].category;const value=score(item.type);return['raw','construction','defense','misc','broken_weapon','container'].includes(category)&&value>=18&&value<90});const cache=[...cacheable].sort((a,b)=>score(a.type)-score(b.type))[0]??null;if(cache)return dropAction(actions,cache.id)}}
  return null
}
export function shouldReturnWithHaul(state:GameState,citizen:Citizen,mission:BotMissionAssignment):boolean{if(citizen.location.type!=='world'||mission.emergency||mission.phase==='return'||mission.phase==='camp')return false;const carried=citizen.inventory.filter((item)=>!['consumable','weapon'].includes(ITEMS[item.type].category));if(!carried.length)return false;const needs=evaluateTownNeeds(state);const valuable=carried.map((item)=>scoreWithNeeds(needs,citizen,item.type,mission)).sort((a,b)=>b-a);if(valuable[0]>=130&&distanceToTown(citizen.location.x,citizen.location.y)>=2)return true;return valuable.length>=2&&valuable[0]+valuable[1]>=210}