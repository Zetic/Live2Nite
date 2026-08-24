import { removeBankItemById, removeBankItems } from './bank'
import { completionWaterBonus, constructionDiscoveryCascade, revealsAllTerrain } from './construction'
import { foodApTarget } from './food'
import { effectiveMaxAp } from './status'
import { createItemInstance, normalizeItemState } from './items'
import { zoneKey } from './world'
import type { Citizen, CombinationEventOutput, GameEvent, GameState, ItemInstance, ItemStorage, ItemType, PersonalItemStorage } from './types'

function replaceCitizen(state:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):Citizen[]{return state.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}
function removeStoredItem(citizen:Citizen,itemId:string,source:ItemStorage):Citizen{if(source==='inventory')return{...citizen,inventory:citizen.inventory.filter((item)=>item.id!==itemId)};if(source==='home')return{...citizen,home:{...citizen.home,storage:citizen.home.storage.filter((item)=>item.id!==itemId)}};return citizen}
function replaceStoredItem(citizen:Citizen,item:ItemInstance,source:PersonalItemStorage):Citizen{if(source==='inventory')return{...citizen,inventory:citizen.inventory.map((existing)=>existing.id===item.id?item:existing)};return{...citizen,home:{...citizen.home,storage:citizen.home.storage.map((existing)=>existing.id===item.id?item:existing)}}}
function consumeFromItems(items:ItemInstance[],type:ItemType,count:number):{items:ItemInstance[];remaining:number}{let remaining=count;const kept:ItemInstance[]=[];for(const item of items){if(item.type===type&&remaining>0){remaining-=1;continue}kept.push(item)}return{items:kept,remaining}}
function consumePersonalResources(citizen:Citizen,resources:Partial<Record<ItemType,number>>):Citizen{let inventory=[...citizen.inventory];let storage=[...citizen.home.storage];for(const[type,amount]of Object.entries(resources)){const itemType=type as ItemType;let remaining=amount??0;const fromInventory=consumeFromItems(inventory,itemType,remaining);inventory=fromInventory.items;remaining=fromInventory.remaining;const fromStorage=consumeFromItems(storage,itemType,remaining);storage=fromStorage.items}return{...citizen,inventory,home:{...citizen.home,storage}}}
function withoutMission(state:GameState,citizenId:string):GameState['botMissions']{const next={...state.botMissions};delete next[citizenId];return next}
function missionsForNewDay(state:GameState):GameState['botMissions']{const next:GameState['botMissions']={};for(const[citizenId,mission]of Object.entries(state.botMissions)){const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen?.alive||citizen.location.type!=='world')continue;const phase=mission.phase==='camp'?(citizen.location.x===mission.target.x&&citizen.location.y===mission.target.y?'operate':'outbound'):mission.phase;next[citizenId]={...mission,phase}}return next}
function replaceGround(state:GameState,key:string,update:(items:ItemInstance[])=>ItemInstance[]):GameState['world']{const zone=state.world.zones[key];if(!zone)return state.world;return{...state.world,zones:{...state.world.zones,[key]:{...zone,groundItems:update(zone.groundItems)}}}}
function generatedItems(state:GameState,type:ItemType,count:number):ItemInstance[]{return Array.from({length:count},(_,offset)=>createItemInstance(`i${String(state.nextItemId+offset).padStart(6,'0')}`,type))}
function removePersonalIds(citizen:Citizen,ids:Set<string>):Citizen{return{...citizen,inventory:citizen.inventory.filter((item)=>!ids.has(item.id)),home:{...citizen.home,storage:citizen.home.storage.filter((item)=>!ids.has(item.id))}}}
function addCombinationOutputs(citizen:Citizen,outputs:CombinationEventOutput[]):Citizen{let inventory=[...citizen.inventory];let storage=[...citizen.home.storage];for(const output of outputs){if(output.storage==='inventory')inventory.push(output.item);else storage.push(output.item)}return{...citizen,inventory,home:{...citizen.home,storage}}}
function withCharges(item:ItemInstance,charges:number):ItemInstance{return createItemInstance(item.id,item.type,{...normalizeItemState(item.type,item.state),charges})}
function restoredAp(citizen:Citizen,item:ItemInstance,kind:'food'|'water',restoresAp:boolean):number{
  if(!restoresAp)return citizen.ap
  const target=kind==='food'?foodApTarget(item.type,citizen.maxAp):citizen.maxAp
  return Math.max(citizen.ap,target)
}
function resolveOpenedItems(items:ItemInstance[],event:Extract<GameEvent,{type:'OPENABLE_RESOLVED'}>):ItemInstance[]{
  const without=items.filter((item)=>item.id!==event.container.id)
  const base=event.containerAfter?[...without,event.containerAfter]:without
  return[...base,...event.outputs]
}

function reduceSingleEvent(state:GameState,event:GameEvent):GameState{
  switch(event.type){
    case 'AP_SPENT':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,ap:Math.max(0,citizen.ap-event.amount)}))}
    case 'GATE_SET':return{...state,town:{...state.town,gateOpen:event.open}}
    case 'CITIZEN_LOCATION_CHANGED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,location:event.location,temporaryControl:null,relativeControl:null,camping:{...citizen.camping,hidden:false,survivalChance:null,hiddenDay:null},status:event.desertStep?{...citizen.status,desertStepsToday:citizen.status.desertStepsToday+1}:citizen.status}))}
    case 'CITIZEN_STATUS_CHANGED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,status:event.status}))}
    case 'WOUNDED_MOVEMENT_RESOLVED':return{...state,rngState:event.rngStateAfter}
    case 'FLEE_ZOMBIES_RESOLVED':return{...state,rngState:event.rngStateAfter,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,status:event.statusAfter,relativeControl:{zoneKey:event.zoneKey}}))}
    case 'CAMP_IMPROVED':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,campImprovements:Math.min(10,(zone.campImprovements??0)+event.amount)}}}}}
    case 'CAMP_IMPROVEMENTS_DECAYED':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,campImprovements:Math.max(0,(zone.campImprovements??0)-event.amount)}}}}}
    case 'CITIZEN_HIDING_SET':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,camping:{...citizen.camping,hidden:event.hidden,survivalChance:event.hidden?event.survivalChance:null,hiddenDay:event.hidden?event.day:null}}))}
    case 'CAMPING_RESOLVED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,camping:{...citizen.camping,hidden:false,survivalChance:null,hiddenDay:null,nightsSurvived:citizen.camping.nightsSurvived+(event.survived?1:0),lastSurvivedDay:event.survived?event.day:citizen.camping.lastSurvivedDay}}))}
    case 'CAMPING_BLUEPRINT_DROPPED':{const zone=state.world.zones[event.zoneKey];if(!zone?.specialSite)return state;return{...state,nextItemId:state.nextItemId+1,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,groundItems:[...zone.groundItems,event.item],specialSite:{...zone.specialSite,blueprintFound:true}}}}}}
    case 'ZONE_DISCOVERED':{const zone=state.world.zones[event.zoneKey];if(!zone||zone.discovered)return state;return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,discovered:true}}}}}
    case 'ZONE_OBSERVED':{if(!state.world.zones[event.zoneKey])return state;return{...state,world:{...state.world,intel:{...state.world.intel,[event.zoneKey]:{observedZombies:event.zombies,lastObservedDay:event.day,lastObservedHour:event.hour??state.clock.hour}}}}}
    case 'WORLD_ZOMBIES_EVOLVED':{if(!event.changes.length)return state;const zones={...state.world.zones};for(const change of event.changes){const zone=zones[change.zoneKey];if(zone)zones[change.zoneKey]={...zone,zombies:change.after}}return{...state,world:{...state.world,zones}}}
    case 'ZONE_CONTROL_LOST':return state
    case 'TEMPORARY_CONTROL_GRANTED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,temporaryControl:{zoneKey:event.zoneKey,grantedDay:event.day,grantedHour:event.hour??state.clock.hour}}))}
    case 'TEMPORARY_CONTROL_EXPIRED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>citizen.temporaryControl?.zoneKey===event.zoneKey?{...citizen,temporaryControl:null}:citizen)}
    case 'ZONE_CONTROL_RESTORED':return{...state,citizens:state.citizens.map((citizen)=>citizen.temporaryControl?.zoneKey===event.zoneKey||citizen.relativeControl?.zoneKey===event.zoneKey?{...citizen,temporaryControl:citizen.temporaryControl?.zoneKey===event.zoneKey?null:citizen.temporaryControl,relativeControl:citizen.relativeControl?.zoneKey===event.zoneKey?null:citizen.relativeControl}:citizen)}
    case 'ZONE_SEARCHED':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;const depleted=event.mode==='depleted';const searchedBy=zone.searchedBy.includes(event.citizenId)?zone.searchedBy:[...zone.searchedBy,event.citizenId];const depletedBy=(zone.depletedSearchedBy??[]).includes(event.citizenId)?(zone.depletedSearchedBy??[]):[...(zone.depletedSearchedBy??[]),event.citizenId];const updatedZone=depleted?{...zone,depletedSearchedBy:depletedBy,groundItems:event.item?[...zone.groundItems,event.item]:zone.groundItems}:{...zone,searchesRemaining:Math.max(0,zone.searchesRemaining-1),searchedBy,hiddenLoot:zone.hiddenLoot.slice(1),groundItems:event.item?[...zone.groundItems,event.item]:zone.groundItems};return{...state,rngState:event.rngStateAfter??state.rngState,nextItemId:event.item?state.nextItemId+1:state.nextItemId,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:updatedZone}}}}
    case 'ZONE_REPLENISHED':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,searchesRemaining:1,searchedBy:[],hiddenLoot:[event.loot]}}}}}
    case 'SPECIAL_SITE_EXCAVATED':{const zone=state.world.zones[event.zoneKey];const site=zone?.specialSite;if(!zone||!site)return state;const progress=Math.min(site.excavationRequired,site.excavationProgress+event.amount);return{...state,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,specialSite:{...site,excavationProgress:progress,status:progress>=site.excavationRequired?'accessible':'buried'}}}}}}
    case 'SPECIAL_SITE_SEARCHED':{const zone=state.world.zones[event.zoneKey];const site=zone?.specialSite;if(!zone||!site)return state;const hiddenLoot=site.hiddenLoot.slice(1);const searchedBy=site.searchedBy.includes(event.citizenId)?site.searchedBy:[...site.searchedBy,event.citizenId];return{...state,nextItemId:event.item?state.nextItemId+1:state.nextItemId,world:{...state.world,zones:{...state.world.zones,[event.zoneKey]:{...zone,groundItems:event.item?[...zone.groundItems,event.item]:zone.groundItems,specialSite:{...site,hiddenLoot,searchedBy,status:hiddenLoot.length===0?'depleted':'accessible'}}}}}}
    case 'ITEM_PICKED_UP':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,event.item]})),world:replaceGround(state,event.zoneKey,(items)=>items.filter((item)=>item.id!==event.item.id))}}
    case 'ITEM_DROPPED':{const zone=state.world.zones[event.zoneKey];if(!zone)return state;return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((item)=>item.id!==event.item.id)})),world:replaceGround(state,event.zoneKey,(items)=>[...items,event.item])}}
    case 'COMBAT_RESOLVED':{
      const zone=state.world.zones[event.zoneKey];if(!zone)return state
      let citizens=state.citizens;let world=state.world
      const changed=(item:ItemInstance)=>event.brokenInto?createItemInstance(item.id,event.brokenInto):event.chargesAfter!==undefined?withCharges(item,event.chargesAfter):item
      if(event.item&&event.source==='ground')world=replaceGround(state,event.zoneKey,(items)=>event.consumed?items.filter((item)=>item.id!==event.item?.id):(event.brokenInto||event.chargesAfter!==undefined)?items.map((item)=>item.id===event.item?.id?changed(item):item):items)
      else if(event.item&&event.consumed)citizens=replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((item)=>item.id!==event.item?.id)}))
      else if(event.item&&(event.brokenInto||event.chargesAfter!==undefined))citizens=replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.map((item)=>item.id===event.item?.id?changed(item):item)}))
      const updatedZone=world.zones[event.zoneKey]??zone
      return{...state,rngState:event.rngStateAfter,citizens,world:{...world,zones:{...world.zones,[event.zoneKey]:{...updatedZone,zombies:Math.max(0,updatedZone.zombies-event.kills)}}}}
    }
    case 'ITEM_DEPOSITED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((item)=>item.id!==event.item.id)})),town:{...state.town,bank:[...state.town.bank,event.item]}}
    case 'ITEM_WITHDRAWN':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,event.item]})),town:{...state.town,bank:removeBankItemById(state.town.bank,event.item.id)}}
    case 'ITEM_MOVED_TO_HOME':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:citizen.inventory.filter((item)=>item.id!==event.item.id),home:{...citizen.home,storage:[...citizen.home.storage,event.item]}}))}
    case 'ITEM_MOVED_TO_RUCKSACK':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,event.item],home:{...citizen.home,storage:citizen.home.storage.filter((item)=>item.id!==event.item.id)}}))}
    case 'OPENABLE_RESOLVED':{
      if(event.source==='ground'&&event.zoneKey)return{...state,rngState:event.rngStateAfter,nextItemId:state.nextItemId+event.outputs.length,world:replaceGround(state,event.zoneKey,(items)=>resolveOpenedItems(items,event))}
      return{...state,rngState:event.rngStateAfter,nextItemId:state.nextItemId+event.outputs.length,citizens:replaceCitizen(state,event.citizenId,(citizen)=>event.source==='inventory'?{...citizen,inventory:resolveOpenedItems(citizen.inventory,event)}:{...citizen,home:{...citizen.home,storage:resolveOpenedItems(citizen.home.storage,event)}})}
    }
    case 'CONTAINER_OPENED':{if(event.source==='ground'&&event.zoneKey)return{...state,rngState:event.rngStateAfter,nextItemId:state.nextItemId+1,world:replaceGround(state,event.zoneKey,(items)=>[...items.filter((item)=>item.id!==event.containerId),event.output])};return{...state,rngState:event.rngStateAfter,nextItemId:state.nextItemId+1,citizens:replaceCitizen(state,event.citizenId,(citizen)=>event.source==='inventory'?{...citizen,inventory:[...citizen.inventory.filter((item)=>item.id!==event.containerId),event.output]}:{...citizen,home:{...citizen.home,storage:[...citizen.home.storage.filter((item)=>item.id!==event.containerId),event.output]}})}}
    case 'WATER_TAKEN':return{...state,nextItemId:state.nextItemId+1,town:{...state.town,well:{water:Math.max(0,state.town.well.water-1)}},citizens:replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,inventory:[...citizen.inventory,event.item],daily:citizen.daily.waterTaken?{...citizen.daily,bonusWaterTaken:true}:{...citizen.daily,waterTaken:true}}))}
    case 'ITEM_CONSUMED':{
      let citizens=state.citizens;let world=state.world
      if(event.chargesAfter!==undefined){
        const charged=withCharges(event.item,event.chargesAfter)
        if(event.source==='ground'&&event.zoneKey)world=replaceGround(state,event.zoneKey,(items)=>items.map((item)=>item.id===event.item.id?charged:item))
        else citizens=replaceCitizen(state,event.citizenId,(citizen)=>replaceStoredItem(citizen,charged,event.source as PersonalItemStorage))
      }else{
        if(event.source==='ground'&&event.zoneKey)world=replaceGround(state,event.zoneKey,(items)=>items.filter((item)=>item.id!==event.item.id))
        else citizens=replaceCitizen(state,event.citizenId,(citizen)=>removeStoredItem(citizen,event.item.id,event.source))
      }
      citizens=citizens.map((citizen)=>{
        if(citizen.id!==event.citizenId)return citizen
        const legacyDaily=event.kind==='food'?{...citizen.daily,ate:true}:event.restoresAp?{...citizen.daily,drank:true}:citizen.daily
        return{...citizen,ap:event.apAfter??restoredAp(citizen,event.item,event.kind,event.restoresAp),status:event.statusAfter??citizen.status,daily:event.dailyAfter??legacyDaily}
      })
      return{...state,rngState:event.rngStateAfter??state.rngState,citizens,world}
    }
    case 'ITEM_ACTION_RESOLVED':{
      let citizens=state.citizens;let world=state.world
      const replacement=event.morphTo?createItemInstance(event.item.id,event.morphTo):null
      if(event.source==='ground'&&event.zoneKey){
        world=replaceGround(state,event.zoneKey,(items)=>items.flatMap((item)=>item.id!==event.item.id?[item]:replacement?[replacement]:event.consumed?[]:[item]))
        citizens=replaceCitizen(state,event.citizenId,(citizen)=>({...citizen,ap:event.apAfter,status:event.statusAfter,daily:event.dailyAfter}))
      }else{
        citizens=replaceCitizen(state,event.citizenId,(citizen)=>{
          let next=citizen
          if(replacement)next=replaceStoredItem(next,replacement,event.source as PersonalItemStorage)
          else if(event.consumed)next=removeStoredItem(next,event.item.id,event.source)
          return{...next,ap:event.apAfter,status:event.statusAfter,daily:event.dailyAfter}
        })
      }
      return{...state,rngState:event.rngStateAfter,citizens,world}
    }
    case 'HOME_UPGRADED':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>{const paid=consumePersonalResources(citizen,event.consumed);return{...paid,home:{...paid.home,level:event.to,defense:event.defenseAfter,upgradedDay:event.day}}})}
    case 'CORPSE_DISPOSED':{
      const waterIds=event.waterItemId?new Set([event.waterItemId]):new Set<string>()
      const citizens=state.citizens.map((citizen)=>{
        if(citizen.id===event.citizenId&&waterIds.size)return removePersonalIds(citizen,waterIds)
        if(citizen.id===event.targetCitizenId)return{...citizen,corpseDisposition:event.method,home:{...citizen.home,holdsBody:false}}
        return citizen
      })
      return{...state,citizens}
    }
    case 'CORPSE_REANIMATED':return{...state,town:{...state.town,well:{water:Math.max(0,state.town.well.water-event.waterLost)}},citizens:replaceCitizen(state,event.corpseCitizenId,(citizen)=>({...citizen,home:{...citizen.home,corpseAttacked:true}}))}
    case 'HOME_IMPROVEMENT_BUILT':return{...state,citizens:replaceCitizen(state,event.citizenId,(citizen)=>{const paid=consumePersonalResources(citizen,event.consumed);return{...paid,home:{...paid.home,storageCapacity:event.storageCapacityAfter,improvements:{...paid.home.improvements,[event.improvementId]:event.level}}}})}
    case 'BLUEPRINT_READ':return{...state,rngState:event.rngStateAfter,citizens:replaceCitizen(state,event.citizenId,(citizen)=>removeStoredItem(citizen,event.item.id,event.source))}
    case 'CONSTRUCTION_DISCOVERED':{const ids=constructionDiscoveryCascade(event.projectId);let construction=state.town.construction;for(const id of ids){const project=construction[id];if(project&&!project.discovered)construction={...construction,[id]:{...project,discovered:true}}}return construction===state.town.construction?state:{...state,town:{...state.town,construction}}}
    case 'CONSTRUCTION_AP_CONTRIBUTED':{const project=state.town.construction[event.projectId];if(!project)return state;return{...state,town:{...state.town,construction:{...state.town.construction,[event.projectId]:{...project,apContributed:project.apContributed+event.amount}}}}}
    case 'CONSTRUCTION_COMPLETED':{let bank=state.town.bank;for(const[type,amount]of Object.entries(event.consumed))bank=removeBankItems(bank,type as ItemType,amount??0);const waterBonus=completionWaterBonus(event.projectId);const zones=revealsAllTerrain(event.projectId)?Object.fromEntries(Object.entries(state.world.zones).map(([key,zone])=>[key,{...zone,discovered:true}])):state.world.zones;return{...state,coordination:{commitments:state.coordination.commitments.filter((commitment)=>commitment.projectId!==event.projectId)},town:{...state.town,well:{water:state.town.well.water+waterBonus},bank,construction:{...state.town.construction,[event.projectId]:{...state.town.construction[event.projectId],discovered:true,completed:true}}},world:zones===state.world.zones?state.world:{...state.world,zones}}}
    case 'CONSTRUCTION_EXPIRED':{const project=state.town.construction[event.projectId];if(!project)return state;return{...state,town:{...state.town,construction:{...state.town.construction,[event.projectId]:{...project,apContributed:0,completed:false}}}}}
    case 'CONSTRUCTION_GENERATED_ITEM':{const items=generatedItems(state,event.itemType,event.amount);return{...state,nextItemId:state.nextItemId+items.length,town:{...state.town,bank:[...state.town.bank,...items]}}}
    case 'WORKSHOP_CONVERTED':{
      let bank=state.town.bank.filter((item)=>!event.inputItemIds.includes(item.id))
      let createdCount=event.outputCount
      if(event.preserveInputId&&event.inputItemIds[0]){const output=createItemInstance(event.inputItemIds[0],event.output,event.outputState);bank=[...bank,output];createdCount=0}
      else{const outputs=Array.from({length:event.outputCount},(_,offset)=>createItemInstance(`i${String(state.nextItemId+offset).padStart(6,'0')}`,event.output,event.outputState));bank=[...bank,...outputs]}
      return{...state,rngState:event.rngStateAfter??state.rngState,nextItemId:state.nextItemId+createdCount,town:{...state.town,bank}}
    }
    case 'ITEMS_COMBINED':{
      const consumed=new Set(event.consumedItemIds)
      const citizens=replaceCitizen(state,event.citizenId,(citizen)=>addCombinationOutputs(removePersonalIds(citizen,consumed),event.outputs))
      return{...state,nextItemId:state.nextItemId+event.createdCount,citizens}
    }
    case 'COORDINATION_COMMITMENT_POSTED':return{...state,coordination:{commitments:[...state.coordination.commitments.filter((commitment)=>commitment.id!==event.commitment.id&&commitment.citizenId!==event.commitment.citizenId),event.commitment]}}
    case 'COORDINATION_COMMITMENT_CLEARED':return{...state,coordination:{commitments:state.coordination.commitments.filter((commitment)=>commitment.id!==event.commitmentId)}}
    case 'BOT_MISSION_ASSIGNED':return{...state,botMissions:{...state.botMissions,[event.citizenId]:event.mission}}
    case 'BOT_MISSION_PHASE_SET':{const mission=state.botMissions[event.citizenId];if(!mission||mission.missionId!==event.missionId)return state;return{...state,botMissions:{...state.botMissions,[event.citizenId]:{...mission,phase:event.phase}}}}
    case 'BOT_MISSION_CLEARED':return{...state,botMissions:withoutMission(state,event.citizenId)}
    case 'CITIZEN_DIED':return{...state,coordination:{commitments:state.coordination.commitments.filter((commitment)=>commitment.citizenId!==event.citizenId)},botMissions:withoutMission(state,event.citizenId),citizens:replaceCitizen(state,event.citizenId,(citizen)=>{const diedInTown=citizen.location.type==='town';return{...citizen,alive:false,ap:0,inventory:diedInTown?[]:citizen.inventory,corpseDisposition:null,home:{...citizen.home,storage:diedInTown?[...citizen.home.storage,...citizen.inventory]:citizen.home.storage,holdsBody:diedInTown,corpseAttacked:false},temporaryControl:null,relativeControl:null,camping:{...citizen.camping,hidden:false,survivalChance:null,hiddenDay:null}}})}
    case 'NIGHT_RESOLVED':return{...state,lastNight:event.report}
    case 'TIME_ADVANCED':return{...state,clock:{hour:event.toHour,phase:event.phase}}
    case 'DAY_STARTED':return{...state,day:event.day,clock:{hour:event.hour??1,phase:'day'},botMissions:missionsForNewDay(state),coordination:{commitments:[]},citizens:state.citizens.map((citizen)=>({...citizen,ap:citizen.alive?effectiveMaxAp(citizen):0,temporaryControl:null,daily:{ate:false,drank:false,waterTaken:false},camping:{...citizen.camping,hidden:false,survivalChance:null,hiddenDay:null}}))}
  }
}
export function applyEvents(state:GameState,events:GameEvent[]):GameState{const nextState=events.reduce(reduceSingleEvent,state);return{...nextState,events:[...state.events,...events]}}
export function currentZoneKey(state:GameState,citizenId:string):string|null{const citizen=state.citizens.find((candidate)=>candidate.id===citizenId);if(!citizen||citizen.location.type!=='world')return null;return zoneKey(citizen.location.x,citizen.location.y)}