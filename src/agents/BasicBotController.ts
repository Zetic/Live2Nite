import { getLegalActions } from '../core/actions'
import { weaponDefinition } from '../core/combat'
import { ITEMS } from '../core/items'
import type { Citizen, GameCommand, GameState, ItemInstance, ItemType } from '../core/types'
import { zoneControl } from '../core/world'
import type { AgentController } from './AgentController'
import { planExpedition } from './planning/ExpeditionPlanner'
import { missionSafety } from './planning/MissionLifecycle'
import { nextDirectionToward } from './planning/RoutePlanner'
import { shouldUseRefill, supplyDispositionForCitizen } from './planning/SupplyPolicy'
import { chooseTownWork } from './townWork'

function pick<T extends GameCommand['type']>(actions:GameCommand[],type:T):Extract<GameCommand,{type:T}>|null{return(actions.find((action)=>action.type===type) as Extract<GameCommand,{type:T}>|undefined)??null}
function itemAction(actions:GameCommand[],type:GameCommand['type'],itemId:string):GameCommand|null{return actions.find((action)=>action.type===type&&'itemId'in action&&action.itemId===itemId)??null}
function bankAction(actions:GameCommand[],type:ItemType):GameCommand|null{return actions.find((action)=>action.type==='WITHDRAW_BANK_ITEM'&&action.itemType===type)??null}
function carried(citizen:Citizen,type:ItemType):ItemInstance|undefined{return citizen.inventory.find((item)=>item.type===type)}
function atHome(citizen:Citizen,type:ItemType):ItemInstance|undefined{return citizen.home.storage.find((item)=>item.type===type)}
function desiredByPlan(type:ItemType,plan:ReturnType<typeof planExpedition>):boolean{if(!plan)return false;return(type==='water_ration'&&plan.loadout.water)||(type==='food'&&plan.loadout.food)||type===plan.loadout.weaponType}
function stepTowardTown(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{if(citizen.location.type!=='world')return null;if(citizen.location.x===0&&citizen.location.y===0)return pick(actions,'ENTER_TOWN');const direction=nextDirectionToward(state,{x:citizen.location.x,y:citizen.location.y},{x:0,y:0});return direction?actions.find((action)=>action.type==='MOVE'&&action.direction===direction)??null:null}

function unloadAction(citizen:Citizen,actions:GameCommand[],plan:ReturnType<typeof planExpedition>,forceUnload=false):GameCommand|null{
  const kit=citizen.inventory.find((item)=>item.type==='construction_kit')
  if(kit){const open=itemAction(actions,'OPEN_CONTAINER',kit.id);if(open)return open}
  const disposition=supplyDispositionForCitizen(citizen.id)
  for(const item of citizen.inventory){
    if(item.type==='construction_kit')continue
    if(!forceUnload&&desiredByPlan(item.type,plan))continue
    const definition=ITEMS[item.type]
    if(['construction','raw','misc','defense','broken_weapon','container'].includes(definition.category)){const deposit=itemAction(actions,'DEPOSIT_ITEM',item.id);if(deposit)return deposit}
    if(definition.category==='weapon'||definition.category==='consumable'){
      if(disposition!=='community'&&citizen.home.storage.length<citizen.home.storageCapacity){const store=itemAction(actions,'MOVE_ITEM_TO_HOME',item.id);if(store)return store}
      if(disposition!=='hoarder'){const deposit=itemAction(actions,'DEPOSIT_ITEM',item.id);if(deposit)return deposit}
    }
  }
  // If a kit is the only item left and cannot be opened because storage is somehow
  // still constrained, preserve progress by banking it rather than deadlocking unload.
  if(kit){const deposit=itemAction(actions,'DEPOSIT_ITEM',kit.id);if(deposit)return deposit}
  return null
}

function packageSharingAction(citizen:Citizen,actions:GameCommand[],plan:ReturnType<typeof planExpedition>,hour:number):GameCommand|null{const disposition=supplyDispositionForCitizen(citizen.id);const doggy=atHome(citizen,'doggy_bag');if(doggy&&(plan?.loadout.food||(!plan&&disposition==='community'&&hour<=4))){const open=itemAction(actions,'OPEN_CONTAINER',doggy.id);if(open)return open}const welcome=atHome(citizen,'citizen_welcome_pack');if(welcome&&disposition==='community'&&hour<=4){const open=itemAction(actions,'OPEN_CONTAINER',welcome.id);if(open)return open}if(disposition==='community'){const share=citizen.home.storage.find((item)=>['battery','box_of_matches','pharmaceutical_products'].includes(item.type)||(item.type==='food'&&!plan?.loadout.food));if(share){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',share.id);if(move)return move}}return null}
function prepareLoadout(citizen:Citizen,actions:GameCommand[],plan:NonNullable<ReturnType<typeof planExpedition>>):GameCommand|null{if(plan.loadout.weaponType&&!carried(citizen,plan.loadout.weaponType)){const home=atHome(citizen,plan.loadout.weaponType);if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bank=bankAction(actions,plan.loadout.weaponType);if(bank)return bank}if(plan.loadout.water&&!carried(citizen,'water_ration')){const home=atHome(citizen,'water_ration');if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bank=bankAction(actions,'water_ration');if(bank)return bank;if(plan.loadout.wellWaterAllowed){const take=pick(actions,'TAKE_WATER');if(take)return take}}if(plan.loadout.food&&!carried(citizen,'food')){const home=atHome(citizen,'food');if(home){const move=itemAction(actions,'MOVE_ITEM_TO_RUCKSACK',home.id);if(move)return move}const bag=atHome(citizen,'doggy_bag');if(bag){const open=itemAction(actions,'OPEN_CONTAINER',bag.id);if(open)return open}const bank=bankAction(actions,'food');if(bank)return bank}return null}
function refillAction(citizen:Citizen,actions:GameCommand[],remaining:number):GameCommand|null{const water=carried(citizen,'water_ration');if(water&&shouldUseRefill(citizen,remaining,'water')){const drink=itemAction(actions,'DRINK_ITEM',water.id);if(drink)return drink}const food=carried(citizen,'food');if(food&&shouldUseRefill(citizen,remaining,'food')){const eat=itemAction(actions,'EAT_ITEM',food.id);if(eat)return eat}return null}
function bestWeaponAction(citizen:Citizen,actions:GameCommand[]):GameCommand|null{const options=citizen.inventory.map((item)=>({item,definition:weaponDefinition(item.type)})).filter((candidate)=>candidate.definition).sort((a,b)=>((b.definition!.killChancePercent*b.definition!.maxKills)-(a.definition!.killChancePercent*a.definition!.maxKills)));for(const option of options){const action=itemAction(actions,'USE_WEAPON',option.item.id);if(action)return action}return null}

export class BasicBotController implements AgentController{
  readonly kind='basic-bot'
  decide(state:Readonly<GameState>,citizenId:string):GameCommand|null{
    const game=state as GameState
    const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
    if(!citizen||!citizen.alive||game.clock.phase!=='day')return null
    const actions=getLegalActions(game,citizenId)
    if(!actions.length)return null
    const mission=game.botMissions[citizenId]??null
    const plan=planExpedition(game,citizenId)
    if(citizen.location.type==='town'){
      const unload=unloadAction(citizen,actions,plan,mission?.phase==='unload');if(unload)return unload
      if(mission?.phase==='unload')return null
      const townWork=chooseTownWork(game,citizen,actions);if(townWork&&!mission)return townWork
      if(!mission){const packages=packageSharingAction(citizen,actions,null,game.clock.hour);if(packages)return packages;return null}
      if(mission.phase!=='prepare')return null
      if(plan){const prep=prepareLoadout(citizen,actions,plan);if(prep)return prep;if(!plan.feasible)return null}
      const open=pick(actions,'OPEN_GATE');if(open)return open
      return pick(actions,'EXIT_TOWN')
    }
    const control=zoneControl(game,citizen.location.x,citizen.location.y)
    if(control.trapped){const weapon=bestWeaponAction(citizen,actions);if(weapon)return weapon;if(game.clock.hour>=22){const fists=pick(actions,'ATTACK_BAREHANDED');if(fists)return fists}return null}
    if(!mission)return stepTowardTown(game,citizen,actions)
    if(mission.phase==='return'){const safety=missionSafety(game,citizenId);const refill=refillAction(citizen,actions,safety.returnAp);if(refill)return refill;return stepTowardTown(game,citizen,actions)}
    if(!plan)return stepTowardTown(game,citizen,actions)
    const refill=refillAction(citizen,actions,plan.route.length+plan.returnAp+plan.expectedTaskAp+mission.safetyReserve);if(refill)return refill
    if(mission.phase==='operate'){
      if(mission.role==='rescue')return null
      const pickup=pick(actions,'PICK_UP_ITEM');if(pickup)return pickup
      if(mission.role==='excavator'){const excavate=pick(actions,'EXCAVATE_SPECIAL_SITE');if(excavate)return excavate}
      const siteSearch=pick(actions,'SEARCH_SPECIAL_SITE');if(siteSearch)return siteSearch
      const search=pick(actions,'SEARCH_ZONE');if(search)return search
      return null
    }
    if(citizen.ap<=0)return null
    const direction=nextDirectionToward(game,{x:citizen.location.x,y:citizen.location.y},mission.target)
    if(direction){const move=actions.find((action):action is Extract<GameCommand,{type:'MOVE'}>=>action.type==='MOVE'&&action.direction===direction);if(move)return move}
    return stepTowardTown(game,citizen,actions)
  }
}
