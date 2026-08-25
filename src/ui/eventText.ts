import { COMBINATION_RECIPES } from '../core/combinations'
import { CONSTRUCTIONS } from '../core/construction'
import { HOME_IMPROVEMENTS, homeName } from '../core/home'
import { itemUseActionDefinition } from '../core/itemEffects'
import { itemName } from '../core/items'
import type { ReplenishmentEvent } from '../core/scavenging'
import { CITIZEN_STATUS_DEFINITIONS } from '../core/status'
import { specialSiteName } from '../core/specialSites'
import type { GameEvent, GameState } from '../core/types'

export function citizenName(game:GameState,citizenId:string):string{return game.citizens.find((citizen)=>citizen.id===citizenId)?.name??citizenId}

export function describeEvent(event:GameEvent,game:GameState):string{
  switch(event.type){
    case 'AP_SPENT':return`${citizenName(game,event.citizenId)} spent ${event.amount} AP.`
    case 'GATE_SET':return event.citizenId==='system'?`The Automatic Piston Lock ${event.open?'opened':'closed'} the gate.`:`${citizenName(game,event.citizenId)} ${event.open?'opened':'closed'} the gate.`
    case 'CITIZEN_LOCATION_CHANGED':return event.location.type==='town'?`${citizenName(game,event.citizenId)} returned to town.`:`${citizenName(game,event.citizenId)} moved to [${event.location.x},${event.location.y}].`
    case 'CITIZEN_STATUS_CHANGED':{const name=citizenName(game,event.citizenId);if(event.reason==='drank_water')return event.status.hydration==='normal'?`${name} drank water and is no longer thirsty.`:`${name} drank water; dehydration eased to Thirsty, but the water did not restore AP.`;if(event.status.infected&&event.status.wound)return`${name} is Wounded and Infected.`;if(event.status.infected)return`${name} is Infected.`;if(event.status.hangover)return`${name} has a Hangover.`;if(event.status.hydration==='dehydrated')return`${name} became ${CITIZEN_STATUS_DEFINITIONS.dehydrated.label}.`;if(event.status.hydration==='thirsty')return`${name} became ${CITIZEN_STATUS_DEFINITIONS.thirsty.label}.`;return`${name}'s conditions changed.`}
    case 'CAMP_IMPROVED':return`${citizenName(game,event.citizenId)} spent ${event.amount} AP improving a campsite at [${event.zoneKey}].`
    case 'CAMP_IMPROVEMENTS_DECAYED':return`The campsite at [${event.zoneKey}] deteriorated overnight.`
    case 'CITIZEN_HIDING_SET':return event.hidden?`${citizenName(game,event.citizenId)} hid for the night and locked in their camping outlook.`:`${citizenName(game,event.citizenId)} left their hiding place.`
    case 'CAMPING_RESOLVED':return event.survived?`${citizenName(game,event.citizenId)} survived the night while camping outside.`:`${citizenName(game,event.citizenId)} failed to survive the night while camping.`
    case 'CAMPING_BLUEPRINT_DROPPED':return`${citizenName(game,event.citizenId)}'s successful camp uncovered ${itemName(event.item.type)} at [${event.zoneKey}] (${event.distanceKm} km from town).`
    case 'ZONE_DISCOVERED':{const zone=game.world.zones[event.zoneKey];return zone?.specialSite?`Zone [${event.zoneKey}] revealed ${specialSiteName(zone.specialSite.type)}.`:`Zone [${event.zoneKey}] was discovered.`}
    case 'ZONE_OBSERVED':return event.citizenId?`${citizenName(game,event.citizenId)} surveyed [${event.zoneKey}]: ${event.zombies} zombie${event.zombies===1?'':'s'} observed.`:`Zone [${event.zoneKey}] was surveyed: ${event.zombies} zombie${event.zombies===1?'':'s'} observed.`
    case 'WORLD_ZOMBIES_EVOLVED':return`The World Beyond shifted overnight across ${event.changes.length} zone${event.changes.length===1?'':'s'}; yesterday's zombie reports may now be stale.`
    case 'ZONE_CONTROL_LOST':return`${citizenName(game,event.causedByCitizenId)} left [${event.zoneKey}], causing human control to fail. ${event.remainingCitizenIds.length} citizen${event.remainingCitizenIds.length===1?' received':'s received'} a temporary extraction window.`
    case 'TEMPORARY_CONTROL_GRANTED':return`${citizenName(game,event.citizenId)} has temporary control at [${event.zoneKey}] and can still escape this hour.`
    case 'TEMPORARY_CONTROL_EXPIRED':return`${citizenName(game,event.citizenId)}'s temporary control at [${event.zoneKey}] expired.`
    case 'ZONE_CONTROL_RESTORED':return`Human control at [${event.zoneKey}] was restored by ${event.reason==='combat'?'reducing the zombie threat':'additional citizen control'}.`
    case 'ZONE_SEARCHED':{const label=event.automatic?'automatically searched':event.mode==='depleted'?'combed depleted ground':'searched';return event.item?`${citizenName(game,event.citizenId)} ${label} at [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.`:`${citizenName(game,event.citizenId)} ${label} at [${event.zoneKey}] and found nothing.`}
    case 'ZONE_REPLENISHED':{const replenishment=event as ReplenishmentEvent;if(replenishment.source==='scavenger_spade'&&replenishment.citizenId)return`${citizenName(game,replenishment.citizenId)} used the Small Shovel to replenish scavenging potential at [${event.zoneKey}].`;if(replenishment.source==='other')return`Scavenging potential was replenished at [${event.zoneKey}].`;return`The Search Tower identified renewed scavenging potential at [${event.zoneKey}].`}
    case 'SPECIAL_SITE_EXCAVATED':return`${citizenName(game,event.citizenId)} cleared ${event.amount} AP of debris at the ruin in [${event.zoneKey}].`
    case 'SPECIAL_SITE_SEARCHED':return event.item?`${citizenName(game,event.citizenId)} searched the ruin at [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.`:`${citizenName(game,event.citizenId)} searched the ruin at [${event.zoneKey}] but found nothing.`
    case 'ITEM_PICKED_UP':return`${citizenName(game,event.citizenId)} picked up ${itemName(event.item.type)}.`
    case 'ITEM_DROPPED':return`${citizenName(game,event.citizenId)} left ${itemName(event.item.type)} on the ground at [${event.zoneKey}].`
    case 'COMBAT_RESOLVED':{const method=event.method==='fists'?'bare hands':itemName(event.method);const broken=event.brokenInto?` The weapon broke into ${itemName(event.brokenInto)}.`:'';const charges=event.chargesAfter!==undefined?` ${event.chargesAfter} charge${event.chargesAfter===1?'':'s'} remain.`:'';return`${citizenName(game,event.citizenId)} attacked with ${method} at [${event.zoneKey}] and killed ${event.kills} zombie${event.kills===1?'':'s'}.${broken}${charges}`}
    case 'ITEM_DEPOSITED':return`${citizenName(game,event.citizenId)} deposited ${itemName(event.item.type)} in the town bank.`
    case 'ITEM_WITHDRAWN':return`${citizenName(game,event.citizenId)} took ${itemName(event.item.type)} from the town bank.`
    case 'ITEM_MOVED_TO_HOME':return`${citizenName(game,event.citizenId)} stored ${itemName(event.item.type)} at home.`
    case 'ITEM_MOVED_TO_RUCKSACK':return`${citizenName(game,event.citizenId)} packed ${itemName(event.item.type)} into their rucksack.`
    case 'HOME_ITEM_DEPOSITED':return event.spotted?`${citizenName(game,event.citizenId)} was spotted depositing ${itemName(event.item.type)} in ${citizenName(game,event.targetCitizenId)}'s home.`:`${itemName(event.item.type)} was discreetly deposited in ${citizenName(game,event.targetCitizenId)}'s home.`
    case 'HOME_INTRUSION_ATTEMPTED':return event.alarmed?`${citizenName(game,event.citizenId)} triggered ${citizenName(game,event.targetCitizenId)}'s Rudimentary Alarm during ${event.success?'an intrusion':'a blocked intrusion attempt'}.`:`${citizenName(game,event.targetCitizenId)}'s home was ${event.success?'intruded into':'protected from an intrusion attempt'}.`
    case 'HOME_ITEM_STOLEN':return event.spotted?`${citizenName(game,event.citizenId)} was spotted stealing ${itemName(event.item.type)} from ${citizenName(game,event.targetCitizenId)}'s home.`:`${itemName(event.item.type)} was stolen from ${citizenName(game,event.targetCitizenId)}'s home.`
    case 'HOME_ITEM_PILLAGED':return`${citizenName(game,event.citizenId)} pillaged ${itemName(event.item.type)} from ${citizenName(game,event.targetCitizenId)}'s abandoned home.`
    case 'OPENABLE_RESOLVED':{const name=citizenName(game,event.citizenId);if(!event.success)return`${name} tried to open ${itemName(event.container.type)} but failed.`;const found=event.outputs.length?event.outputs.map((item)=>itemName(item.type)).join(' + '):'nothing';return`${name} opened ${itemName(event.container.type)} and found ${found}.`}
    case 'CONTAINER_OPENED':return`${citizenName(game,event.citizenId)} opened ${itemName(event.containerType)} and found ${itemName(event.output.type)}.`
    case 'WATER_TAKEN':return`${citizenName(game,event.citizenId)} took a Water Ration from the well.`
    case 'ITEM_CONSUMED':{const remaining=event.chargesAfter!==undefined?` ${event.chargesAfter} ration${event.chargesAfter===1?'':'s'} remain in the container.`:'';return`${citizenName(game,event.citizenId)} ${event.kind==='food'?'ate':'drank'} ${itemName(event.item.type)}${event.restoresAp?' and refreshed their AP':''}.${remaining}`}
    case 'ITEM_ACTION_RESOLVED':{const definition=itemUseActionDefinition(event.item.type,event.actionId);return`${citizenName(game,event.citizenId)} ${definition?.label.toLocaleLowerCase()??'used an item action'} with ${itemName(event.item.type)}.`}
    case 'FLEE_ZOMBIES_RESOLVED':return`${citizenName(game,event.citizenId)} fled from zombie control at [${event.zoneKey}], suffered a ${event.statusAfter.wound??'body-part'} wound, and gained relative control to escape.`
    case 'WOUNDED_MOVEMENT_RESOLVED':return event.failed?`${citizenName(game,event.citizenId)} spent 1 AP trying to move, but their leg wound stopped them.`:`${citizenName(game,event.citizenId)} pushed through their leg wound and moved.`
    case 'HOME_UPGRADED':return`${citizenName(game,event.citizenId)} upgraded their home to ${homeName(event.to)}.`
    case 'HOME_IMPROVEMENT_BUILT':return`${citizenName(game,event.citizenId)} improved their home: ${HOME_IMPROVEMENTS[event.improvementId].name} level ${event.level}.`
    case 'HOME_SIESTA_USED':return`${citizenName(game,event.citizenId)} tried Siesta (${event.chance}%): ${event.success?'recovered 2 AP':'no AP recovered'}.`
    case 'CORPSE_DISPOSED':return event.method==='watered'?`${citizenName(game,event.citizenId)} destroyed ${citizenName(game,event.targetCitizenId)}'s corpse with a Water Ration.`:`${citizenName(game,event.citizenId)} dragged ${citizenName(game,event.targetCitizenId)}'s corpse outside town for 2 AP.`
    case 'CORPSE_REANIMATED':return event.outcome==='well'?`${citizenName(game,event.corpseCitizenId)}'s corpse reanimated and spoiled ${event.waterLost} Well water.`:event.outcome==='citizen'&&event.victimCitizenId?`${citizenName(game,event.corpseCitizenId)}'s corpse reanimated and killed ${citizenName(game,event.victimCitizenId)} inside town.`:`${citizenName(game,event.corpseCitizenId)}'s corpse reanimated but found no target.`
    case 'BLUEPRINT_READ':return event.projectId?`${citizenName(game,event.citizenId)} studied ${itemName(event.item.type)} and identified ${CONSTRUCTIONS[event.projectId].name}.`:`${citizenName(game,event.citizenId)} studied ${itemName(event.item.type)}, but no eligible new construction could be identified.`
    case 'CONSTRUCTION_DISCOVERED':return`A new construction plan is now known: ${CONSTRUCTIONS[event.projectId].name}.`
    case 'CONSTRUCTION_AP_CONTRIBUTED':return`${citizenName(game,event.citizenId)} contributed ${event.amount} AP to ${CONSTRUCTIONS[event.projectId].name}.`
    case 'CONSTRUCTION_COMPLETED':return`${CONSTRUCTIONS[event.projectId].name} was completed by ${citizenName(game,event.citizenId)}.`
    case 'CONSTRUCTION_EXPIRED':return`${CONSTRUCTIONS[event.projectId].name} was consumed during the attack and can be rebuilt.`
    case 'CONSTRUCTION_GENERATED_ITEM':return`${CONSTRUCTIONS[event.projectId].name} produced ${event.amount} ${itemName(event.itemType)}${event.amount===1?'':'s'} for the Bank.`
    case 'WORKSHOP_CONVERTED':return`${citizenName(game,event.citizenId)} used the Workshop: ${event.inputCount} ${itemName(event.input)} → ${event.outputCount} ${itemName(event.output)}.`
    case 'ITEMS_COMBINED':return`${citizenName(game,event.citizenId)} used a portable item action: ${COMBINATION_RECIPES[event.recipeId].name}.`
    case 'COORDINATION_COMMITMENT_POSTED':return`${citizenName(game,event.commitment.citizenId)} posted to town coordination: ${event.commitment.label}`
    case 'COORDINATION_COMMITMENT_CLEARED':return`A town coordination commitment ended (${event.reason.replace('_',' ')}).`
    case 'BOT_MISSION_ASSIGNED':return`${citizenName(game,event.citizenId)} volunteered for ${event.mission.role} duty toward ${event.mission.targetLabel}${event.mission.allowsCamping?' with an overnight option':''}.`
    case 'BOT_MISSION_PHASE_SET':return`${citizenName(game,event.citizenId)} mission phase changed to ${event.phase}.`
    case 'BOT_MISSION_CLEARED':return`${citizenName(game,event.citizenId)} ${event.outcome==='completed'?'completed':'aborted'} their field mission.`
    case 'CITIZEN_DIED':return event.reason==='outside_at_night'?`${citizenName(game,event.citizenId)} died outside without a prepared hiding place.`:event.reason==='camping_failure'?`${citizenName(game,event.citizenId)} died while camping outside.`:event.reason==='corpse_attack'?`${citizenName(game,event.citizenId)} was killed by a reanimated corpse inside town.`:event.reason==='dehydration'?`${citizenName(game,event.citizenId)} died of dehydration.`:event.reason==='infection'?`${citizenName(game,event.citizenId)} died from Infection.`:event.reason==='drug_withdrawal'?`${citizenName(game,event.citizenId)} died from drug withdrawal.`:`${citizenName(game,event.citizenId)} was killed when zombies broke into their home.`
    case 'NIGHT_RESOLVED':{const inside=event.report.zombiesInside??Math.max(0,event.report.attackStrength-event.report.effectiveDefense);const dehydration=event.report.dehydrationDeaths??0;const infection=event.report.infectionDeaths??0;const withdrawal=event.report.withdrawalDeaths??0;const campSurvivors=event.report.campingSurvivors??0;const campDeaths=event.report.campingDeaths??0;const corpseReanimations=event.report.corpseReanimations??0;const corpseDeaths=event.report.corpseAttackDeaths??0;const corpseWater=event.report.corpseWaterLost??0;return`Night ${event.day}: attack ${event.report.attackStrength} vs defense ${event.report.effectiveDefense}${inside>0?` — ${inside} zombie(s) breached, ${event.report.homeDeaths??0} home death(s)`:' — the town held'}${event.report.outsideDeaths?`; ${event.report.outsideDeaths} stranded outside death(s)`:''}${campSurvivors?`; ${campSurvivors} camper(s) survived`:''}${campDeaths?`; ${campDeaths} camping death(s)`:''}${dehydration?`; ${dehydration} dehydration death(s)`:''}${infection?`; ${infection} infection death(s)`:''}${withdrawal?`; ${withdrawal} withdrawal death(s)`:''}${corpseReanimations?`; ${corpseReanimations} corpse reanimation(s), ${corpseDeaths} internal death(s), ${corpseWater} Well water lost`:''}.`}
    case 'DAY_STARTED':return`Day ${event.day} began.`
    case 'TIME_ADVANCED':return`Time advanced from ${String(event.fromHour).padStart(2,'0')}:00 to ${String(event.toHour).padStart(2,'0')}:00.`
  }
}

export function isHighlightEvent(event:GameEvent):boolean{
  if(event.type==='HOME_ITEM_DEPOSITED')return event.spotted
  return !['AP_SPENT','CITIZEN_LOCATION_CHANGED','CONSTRUCTION_AP_CONTRIBUTED','ITEM_MOVED_TO_HOME','ITEM_MOVED_TO_RUCKSACK','ITEM_DROPPED','TIME_ADVANCED','BOT_MISSION_PHASE_SET','CAMP_IMPROVEMENTS_DECAYED','ZONE_OBSERVED','TEMPORARY_CONTROL_GRANTED','TEMPORARY_CONTROL_EXPIRED','COORDINATION_COMMITMENT_POSTED','COORDINATION_COMMITMENT_CLEARED','WOUNDED_MOVEMENT_RESOLVED'].includes(event.type)
}

export function eventTone(event:GameEvent):'town'|'world'|'night'|'danger'|'system'|'home'{
  switch(event.type){
    case 'CITIZEN_DIED':case 'CORPSE_REANIMATED':case 'ZONE_CONTROL_LOST':case 'FLEE_ZOMBIES_RESOLVED':case 'HOME_ITEM_STOLEN':case 'HOME_ITEM_PILLAGED':return'danger'
    case 'CITIZEN_STATUS_CHANGED':return event.status.hydration==='dehydrated'||event.status.infected||event.status.terrorized||event.status.addicted?'danger':event.status.hydration==='thirsty'||Boolean(event.status.wound)||event.status.drunk||event.status.hangover?'home':'system'
    case 'CAMPING_RESOLVED':return event.survived?'world':'danger'
    case 'CAMPING_BLUEPRINT_DROPPED':return'world'
    case 'NIGHT_RESOLVED':return event.report.breached||(event.report.corpseReanimations??0)>0?'danger':'night'
    case 'DAY_STARTED':case 'WORLD_ZOMBIES_EVOLVED':return'night'
    case 'WOUNDED_MOVEMENT_RESOLVED':case 'ZONE_DISCOVERED':case 'ZONE_OBSERVED':case 'ZONE_CONTROL_RESTORED':case 'TEMPORARY_CONTROL_GRANTED':case 'TEMPORARY_CONTROL_EXPIRED':case 'ZONE_SEARCHED':case 'ZONE_REPLENISHED':case 'SPECIAL_SITE_EXCAVATED':case 'SPECIAL_SITE_SEARCHED':case 'ITEM_PICKED_UP':case 'ITEM_DROPPED':case 'COMBAT_RESOLVED':case 'CITIZEN_LOCATION_CHANGED':case 'BOT_MISSION_ASSIGNED':case 'BOT_MISSION_PHASE_SET':case 'BOT_MISSION_CLEARED':case 'CAMP_IMPROVED':case 'CAMP_IMPROVEMENTS_DECAYED':case 'CITIZEN_HIDING_SET':return'world'
    case 'ITEM_MOVED_TO_HOME':case 'ITEM_MOVED_TO_RUCKSACK':case 'HOME_ITEM_DEPOSITED':case 'HOME_INTRUSION_ATTEMPTED':case 'OPENABLE_RESOLVED':case 'CONTAINER_OPENED':case 'ITEM_CONSUMED':case 'ITEM_ACTION_RESOLVED':case 'ITEMS_COMBINED':case 'HOME_UPGRADED':case 'HOME_IMPROVEMENT_BUILT':case 'HOME_SIESTA_USED':case 'CORPSE_DISPOSED':return'home'
    case 'WATER_TAKEN':case 'ITEM_DEPOSITED':case 'ITEM_WITHDRAWN':case 'BLUEPRINT_READ':case 'CONSTRUCTION_DISCOVERED':case 'CONSTRUCTION_AP_CONTRIBUTED':case 'CONSTRUCTION_COMPLETED':case 'CONSTRUCTION_EXPIRED':case 'CONSTRUCTION_GENERATED_ITEM':case 'WORKSHOP_CONVERTED':case 'GATE_SET':case 'COORDINATION_COMMITMENT_POSTED':return'town'
    default:return'system'
  }
}
