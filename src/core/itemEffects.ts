import { foodApTarget } from './food'
import { randomInt } from './rng'
import { WOUND_LOCATIONS, hasCitizenStatus, waterConsumptionOutcome, woundAdjustedApTarget } from './status'
import type { Citizen, CitizenDailyState, CitizenStatusId, CitizenStatusState, ItemInstance, ItemType, ItemUseActionId, WoundLocation } from './types'

type MutableBooleanStatus='infected'|'terrorized'|'drugged'|'addicted'|'drunk'|'hangover'|'immune'
type DailyFlag='ate'|'drank'|'woundTreated'
export type ItemActionRequirement =
  | {type:'status';status:CitizenStatusId;present:boolean}
  | {type:'daily';flag:DailyFlag;value:boolean}
export type ItemActionEffect =
  | {type:'restore_ap_to';target:number}
  | {type:'apply_status';status:MutableBooleanStatus}
  | {type:'remove_status';status:MutableBooleanStatus}
  | {type:'drug_cycle'}
  | {type:'heal_wound'}
  | {type:'inflict_wound';location?:WoundLocation}
  | {type:'set_daily';flag:DailyFlag;value:boolean}
  | {type:'drink_water'}
  | {type:'chance';outcomes:readonly {weight:number;effects:readonly ItemActionEffect[]}[]}

export interface ItemUseActionDefinition {
  id:ItemUseActionId
  itemType:ItemType
  label:string
  sourceActionIds:readonly string[]
  requirements:readonly ItemActionRequirement[]
  effects:readonly ItemActionEffect[]
  consume:boolean
  morphTo?:ItemType
  allowWhenTerrorized?:boolean
}
export interface CitizenEffectResolution { ap:number;status:CitizenStatusState;daily:CitizenDailyState;rng:number;restoresAp:boolean }
export interface ItemEffectResolution {
  apAfter:number
  statusAfter:CitizenStatusState
  dailyAfter:CitizenDailyState
  rngStateAfter:number
  restoresAp:boolean
  consumed:boolean
  morphTo?:ItemType
}

const action=(value:ItemUseActionDefinition):ItemUseActionDefinition=>value
export const ITEM_USE_ACTIONS:Partial<Record<ItemType,readonly ItemUseActionDefinition[]>>={
  bandage:[action({id:'bandage',itemType:'bandage',label:'Dress wound',sourceActionIds:['bandage'],requirements:[{type:'status',status:'wounded',present:true},{type:'daily',flag:'woundTreated',value:false}],effects:[{type:'heal_wound'},{type:'set_daily',flag:'woundTreated',value:true}],consume:true})],
  paracetoid:[action({id:'paracetoid',itemType:'paracetoid',label:'Take Paracetoid',sourceActionIds:['drug_par_1','drug_par_2','drug_par_3','drug_par_4'],requirements:[],effects:[{type:'drug_cycle'},{type:'remove_status',status:'infected'},{type:'apply_status',status:'immune'}],consume:true,allowWhenTerrorized:true})],
  anabolic_steroids:[action({id:'anabolic_steroids',itemType:'anabolic_steroids',label:'Take Anabolic Steroids',sourceActionIds:['drug_6ap_1','drug_6ap_2'],requirements:[],effects:[{type:'drug_cycle'},{type:'restore_ap_to',target:6}],consume:true,allowWhenTerrorized:true})],
  valium_shot:[action({id:'valium_shot',itemType:'valium_shot',label:'Use Valium Shot',sourceActionIds:['drug_xana1','drug_xana2','drug_xana3','drug_xana4'],requirements:[],effects:[{type:'drug_cycle'},{type:'remove_status',status:'terrorized'}],consume:true,allowWhenTerrorized:true})],
  vodka_marinostov:[action({id:'drink_alcohol',itemType:'vodka_marinostov',label:'Drink Vodka Marinostov',sourceActionIds:['alcohol'],requirements:[{type:'status',status:'drunk',present:false},{type:'status',status:'hangover',present:false}],effects:[{type:'restore_ap_to',target:6},{type:'apply_status',status:'drunk'}],consume:true})],
  wake_the_dead:[action({id:'drink_alcohol',itemType:'wake_the_dead',label:'Drink “Wake The Dead”',sourceActionIds:['alcohol'],requirements:[{type:'status',status:'drunk',present:false},{type:'status',status:'hangover',present:false}],effects:[{type:'restore_ap_to',target:6},{type:'apply_status',status:'drunk'}],consume:true})],
}

export function itemUseActionsForType(type:ItemType):readonly ItemUseActionDefinition[]{return ITEM_USE_ACTIONS[type]??[]}
export function itemUseActionDefinition(type:ItemType,id:ItemUseActionId):ItemUseActionDefinition|null{return itemUseActionsForType(type).find((candidate)=>candidate.id===id)??null}
function dailyValue(citizen:Citizen,flag:DailyFlag):boolean{return Boolean(citizen.daily[flag])}
export function itemUseActionAvailable(citizen:Citizen,definition:ItemUseActionDefinition):boolean{
  return definition.requirements.every((requirement)=>{
    if(requirement.type==='status')return hasCitizenStatus(citizen,requirement.status)===requirement.present
    return dailyValue(citizen,requirement.flag)===requirement.value
  })
}
function cloneDaily(daily:CitizenDailyState):CitizenDailyState{return{...daily}}
function cloneStatus(status:CitizenStatusState):CitizenStatusState{return{...status}}
function setBooleanStatus(status:CitizenStatusState,key:MutableBooleanStatus,value:boolean):void{status[key]=value}
function applyEffects(citizen:Citizen,effects:readonly ItemActionEffect[],rngState:number):CitizenEffectResolution{
  let ap=citizen.ap,status=cloneStatus(citizen.status),daily=cloneDaily(citizen.daily),rng=rngState,restoresAp=false
  const apply=(effect:ItemActionEffect):void=>{
    switch(effect.type){
      case'restore_ap_to':{const target=woundAdjustedApTarget(status,effect.target);ap=Math.max(ap,target);restoresAp=true;break}
      case'apply_status':setBooleanStatus(status,effect.status,true);break
      case'remove_status':setBooleanStatus(status,effect.status,false);break
      case'drug_cycle':if(status.drugged)status.addicted=true;else status.drugged=true;break
      case'heal_wound':status.wound=null;break
      case'inflict_wound':{
        if(status.wound)break
        if(effect.location){status.wound=effect.location;break}
        const roll=randomInt(rng,0,WOUND_LOCATIONS.length-1);rng=roll.state;status.wound=WOUND_LOCATIONS[roll.value];break
      }
      case'set_daily':daily[effect.flag]=effect.value;break
      case'drink_water':{
        const snapshot:{status:CitizenStatusState;daily:CitizenDailyState;ap:number}={status,daily,ap}
        const pseudo={...citizen,status:snapshot.status,daily:snapshot.daily,ap:snapshot.ap}
        const outcome=waterConsumptionOutcome(pseudo)
        status=outcome.statusAfter
        if(outcome.restoresAp){
          const target=woundAdjustedApTarget(status,6);ap=Math.max(ap,target);restoresAp=true;daily.drank=true
        }
        break
      }
      case'chance':{
        const total=effect.outcomes.reduce((sum,outcome)=>sum+Math.max(0,Math.trunc(outcome.weight)),0)
        if(total<=0)break
        const roll=randomInt(rng,1,total);rng=roll.state;let cursor=roll.value
        for(const outcome of effect.outcomes){cursor-=Math.max(0,Math.trunc(outcome.weight));if(cursor<=0){for(const nested of outcome.effects)apply(nested);break}}
        break
      }
    }
  }
  for(const effect of effects)apply(effect)
  return{ap,status,daily,rng,restoresAp}
}
export function resolveCitizenEffects(citizen:Citizen,effects:readonly ItemActionEffect[],rngState:number):CitizenEffectResolution{return applyEffects(citizen,effects,rngState)}
export function resolveItemUseAction(citizen:Citizen,definition:ItemUseActionDefinition,rngState:number):ItemEffectResolution{
  const resolved=applyEffects(citizen,definition.effects,rngState)
  return{apAfter:resolved.ap,statusAfter:resolved.status,dailyAfter:resolved.daily,rngStateAfter:resolved.rng,restoresAp:resolved.restoresAp,consumed:definition.consume,morphTo:definition.morphTo}
}
export function resolveFoodItemAction(citizen:Citizen,item:ItemInstance,rngState:number):ItemEffectResolution{
  const target=foodApTarget(item.type,citizen.maxAp)
  const resolved=applyEffects(citizen,[{type:'restore_ap_to',target},{type:'set_daily',flag:'ate',value:true}],rngState)
  return{apAfter:resolved.ap,statusAfter:resolved.status,dailyAfter:resolved.daily,rngStateAfter:resolved.rng,restoresAp:resolved.restoresAp,consumed:true}
}
export function resolveWaterItemAction(citizen:Citizen,_item:ItemInstance,rngState:number):ItemEffectResolution{
  const resolved=applyEffects(citizen,[{type:'drink_water'}],rngState)
  return{apAfter:resolved.ap,statusAfter:resolved.status,dailyAfter:resolved.daily,rngStateAfter:resolved.rng,restoresAp:resolved.restoresAp,consumed:true}
}
function effectLabel(effect:ItemActionEffect):string{
  switch(effect.type){
    case'restore_ap_to':return`restore AP toward ${effect.target}`
    case'apply_status':return`apply ${effect.status.replaceAll('_',' ')}`
    case'remove_status':return`remove ${effect.status.replaceAll('_',' ')}`
    case'drug_cycle':return'counts as a drug; a second drug while Drugged causes Addiction'
    case'heal_wound':return'heal the current body-part wound'
    case'inflict_wound':return effect.location?`inflict a ${effect.location} wound`:'inflict a random body-part wound'
    case'set_daily':return`${effect.flag.replaceAll('_',' ')} = ${effect.value}`
    case'drink_water':return'treat hydration and refresh AP when eligible'
    case'chance':return'random weighted outcome'
  }
}
export function itemUseActionSummary(definition:ItemUseActionDefinition):string{return definition.effects.map(effectLabel).join(' · ')}
