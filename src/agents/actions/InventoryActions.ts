import { nextHomeDefinition, personalMaterialCount } from '../../core/home'
import { ITEMS } from '../../core/items'
import type { Citizen, GameCommand, GameState, ItemType } from '../../core/types'
import type { ExpeditionPlan } from '../planning/ExpeditionPlanner'
import { shouldUseRefill, supplyDispositionForCitizen } from '../planning/SupplyPolicy'
import { atHome, bankAction, carried, itemAction, pick } from './actionSelectors'

function desiredByPlan(type:ItemType,plan:ExpeditionPlan|null):boolean{if(!plan)return false;return(type==='water_ration'&&plan.loadout.water)||(type==='food'&&plan.loadout.food)||type===plan.loadout.weaponType}
function neededForNextHome(citizen:Citizen,type:ItemType):boolean{const target=nextHomeDefinition(citizen.home.level);const required=target?.resources[type]??0;if(required<=0)return false;return personalMaterialCount(citizen,type)<=required}
export function unloadAction(citizen:Citizen,actions:GameCommand[],plan:ExpeditionPlan|null,forceUnload=false):GameCommand|null{
  const kit=citizen.inventory.find((item)=>item.type==='construction_kit');if(kit){const open=itemAction(actions,'OPEN_CONTAINER',kit.id);if(open)return open}
  const disposition=supplyDispositionForCitizen(citizen.id)
  for(const item of citizen.inventory){if(item.type==='construction_kit')continue;if(!forceUnload&&desiredByPlan(item.type,plan))continue;if(!forceUnload&&!plan&&neededForNextHome(citizen,item.type)){const store=itemAction(actions,'MOVE_ITEM_TO_HOME',item.id);if(store)return store;continue}const definition=ITEMS[item.type];if(['construction','raw','misc','defense','broken_weapon','container'].includes(definition.category)){const deposit=itemAction(actions,'DEPOSIT_ITEM',item.id);if(deposit)return deposit}if(definition.category==='weapon'||definition.category==='consumable'){if(disposition!=='community'&&citizen.home.storage.length<citizen.home.storageCapacity){const store=itemAction(actions,'MOVE_ITEM_TO_HOME',item.id);if(store)return store}if(disposition!=='hoarder'){const deposit=itemAction(actions,'DEPOSIT_ITEM',item.id);if(deposit)return deposit}}}
  if(kit){const deposit=itemAction(actions,'DEPOSIT_ITEM',kit.id);if(deposit)return deposit}return null
}
export function packageSharingAction(citizen:Citizen,actions:GameCommand[],plan:ExpeditionPlan|null,hour:number):GameCommand|null{
  const disposition=supplyDispositionForCitizen(citizen.id);const doggy=atHome(citizen,'doggy_bag');if(doggy&&(plan?.loadout.food||(!plan&&disposition==='community'&&hour<=4))){const open=itemAction(actions,'OPEN_CONTAINER',doggy.id);if(open)return open}
  const welcome=atHome(citizen,'citizen_welcome_pack');if(welcome&&disposition==='community'&&hour<=4){const open=itemAction(actions,'OPEN_CONTAINER',welcome.id);if(open)return open}
  if(disposition==='community'){const share=citizen.home.storage.find((item)=>['battery','box_of_matches','pharmaceutical_products'].includes(item.type)||(item.type==='food'&&!plan?.loadout.food));if(share){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',share.id);if(move)return move}}
  return null
}
export function prepareLoadout(state:GameState,citizen:Citizen,actions:GameCommand[],plan:ExpeditionPlan):GameCommand|null{
  if(plan.loadout.weaponType&&!carried(citizen,plan.loadout.weaponType)){const home=atHome(citizen,plan.loadout.weaponType);if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bank=bankAction(state,actions,plan.loadout.weaponType);if(bank)return bank}
  if(plan.loadout.water&&!carried(citizen,'water_ration')){const home=atHome(citizen,'water_ration');if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bank=bankAction(state,actions,'water_ration');if(bank)return bank;if(plan.loadout.wellWaterAllowed){const take=pick(actions,'TAKE_WATER');if(take)return take}}
  if(plan.loadout.food&&!carried(citizen,'food')){const home=atHome(citizen,'food');if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bag=atHome(citizen,'doggy_bag');if(bag){const open=itemAction(actions,'OPEN_CONTAINER',bag.id);if(open)return open}const bank=bankAction(state,actions,'food');if(bank)return bank}
  return null
}
export function refillAction(citizen:Citizen,actions:GameCommand[],remaining:number):GameCommand|null{const water=carried(citizen,'water_ration');const food=carried(citizen,'food');if(citizen.status.hydration!=='normal'&&water&&shouldUseRefill(citizen,remaining,'water')){const drink=itemAction(actions,'DRINK_ITEM',water.id);if(drink)return drink}if(food&&shouldUseRefill(citizen,remaining,'food')){const eat=itemAction(actions,'EAT_ITEM',food.id);if(eat)return eat}if(water&&shouldUseRefill(citizen,remaining,'water')){const drink=itemAction(actions,'DRINK_ITEM',water.id);if(drink)return drink}return null}
