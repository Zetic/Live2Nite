import { CONSTRUCTIONS } from '../core/construction'
import { homeName } from '../core/home'
import { itemName } from '../core/items'
import { specialSiteName } from '../core/specialSites'
import type { GameEvent, GameState } from '../core/types'
import { WORKSHOP_RECIPES } from '../core/workshop'

export function citizenName(game: GameState, citizenId: string): string {
  return game.citizens.find((citizen) => citizen.id === citizenId)?.name ?? citizenId
}

export function describeEvent(event: GameEvent, game: GameState): string {
  switch (event.type) {
    case 'AP_SPENT': return `${citizenName(game,event.citizenId)} spent ${event.amount} AP.`
    case 'GATE_SET': return `${citizenName(game,event.citizenId)} ${event.open?'opened':'closed'} the gate.`
    case 'CITIZEN_LOCATION_CHANGED': return event.location.type==='town' ? `${citizenName(game,event.citizenId)} returned to town.` : `${citizenName(game,event.citizenId)} moved to [${event.location.x},${event.location.y}].`
    case 'ZONE_DISCOVERED': {
      const zone=game.world.zones[event.zoneKey]
      return zone?.specialSite ? `Zone [${event.zoneKey}] revealed ${specialSiteName(zone.specialSite.type)}.` : `Zone [${event.zoneKey}] was discovered.`
    }
    case 'ZONE_SEARCHED': {
      const label = event.automatic ? 'automatically searched' : event.mode==='depleted' ? 'combed depleted ground' : 'searched'
      return event.item ? `${citizenName(game,event.citizenId)} ${label} at [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.` : `${citizenName(game,event.citizenId)} ${label} at [${event.zoneKey}] and found nothing.`
    }
    case 'ZONE_REPLENISHED': return `The Search Tower identified renewed scavenging potential at [${event.zoneKey}].`
    case 'SPECIAL_SITE_EXCAVATED': return `${citizenName(game,event.citizenId)} cleared ${event.amount} AP of debris at the ruin in [${event.zoneKey}].`
    case 'SPECIAL_SITE_SEARCHED': return event.item ? `${citizenName(game,event.citizenId)} searched the ruin at [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.` : `${citizenName(game,event.citizenId)} searched the ruin at [${event.zoneKey}] but found nothing.`
    case 'ITEM_PICKED_UP': return `${citizenName(game,event.citizenId)} picked up ${itemName(event.item.type)}.`
    case 'COMBAT_RESOLVED': {
      const method = event.method==='fists' ? 'bare hands' : itemName(event.method)
      const broken = event.brokenInto ? ` The weapon broke into ${itemName(event.brokenInto)}.` : ''
      return `${citizenName(game,event.citizenId)} attacked with ${method} at [${event.zoneKey}] and killed ${event.kills} zombie${event.kills===1?'':'s'}.${broken}`
    }
    case 'ITEM_DEPOSITED': return `${citizenName(game,event.citizenId)} deposited ${itemName(event.item.type)} in the town bank.`
    case 'ITEM_WITHDRAWN': return `${citizenName(game,event.citizenId)} took ${itemName(event.item.type)} from the town bank.`
    case 'ITEM_MOVED_TO_HOME': return `${citizenName(game,event.citizenId)} stored ${itemName(event.item.type)} at home.`
    case 'ITEM_MOVED_TO_RUCKSACK': return `${citizenName(game,event.citizenId)} packed ${itemName(event.item.type)} into their rucksack.`
    case 'CONTAINER_OPENED': return `${citizenName(game,event.citizenId)} opened ${itemName(event.containerType)} and found ${itemName(event.output.type)}.`
    case 'CONSTRUCTION_KIT_OPENED': return `${citizenName(game,event.citizenId)} opened a Construction Kit and recovered ${event.outputs.map((item)=>itemName(item.type)).join(' + ')}.`
    case 'WATER_TAKEN': return `${citizenName(game,event.citizenId)} took a Water Ration from the well.`
    case 'ITEM_CONSUMED': return `${citizenName(game,event.citizenId)} ${event.kind==='food'?'ate':'drank'} ${itemName(event.item.type)} and refreshed their AP.`
    case 'HOME_UPGRADED': return `${citizenName(game,event.citizenId)} upgraded their home to ${homeName(event.to)}.`
    case 'CONSTRUCTION_AP_CONTRIBUTED': return `${citizenName(game,event.citizenId)} contributed ${event.amount} AP to ${CONSTRUCTIONS[event.projectId].name}.`
    case 'CONSTRUCTION_COMPLETED': return `${CONSTRUCTIONS[event.projectId].name} was completed by ${citizenName(game,event.citizenId)}.`
    case 'WORKSHOP_CONVERTED': {
      const recipe=WORKSHOP_RECIPES[event.recipeId]
      return `${citizenName(game,event.citizenId)} used the Workshop: ${event.inputCount} ${itemName(recipe.input)} → ${event.outputCount} ${itemName(recipe.output)}.`
    }
    case 'BOT_MISSION_ASSIGNED': return `${citizenName(game,event.citizenId)} was assigned ${event.mission.role} duty toward ${event.mission.targetLabel}.`
    case 'BOT_MISSION_PHASE_SET': return `${citizenName(game,event.citizenId)} mission phase changed to ${event.phase}.`
    case 'BOT_MISSION_CLEARED': return `${citizenName(game,event.citizenId)} ${event.outcome==='completed'?'completed':'aborted'} their field mission.`
    case 'CITIZEN_DIED': return event.reason==='outside_at_night' ? `${citizenName(game,event.citizenId)} died outside during the nightly attack.` : `${citizenName(game,event.citizenId)} was killed when zombies broke into their home.`
    case 'NIGHT_RESOLVED': {
      const inside=event.report.zombiesInside??Math.max(0,event.report.attackStrength-event.report.effectiveDefense)
      return `Night ${event.day}: attack ${event.report.attackStrength} vs defense ${event.report.effectiveDefense}${inside>0?` — ${inside} zombie(s) breached, ${event.report.homeDeaths??0} home death(s)`:' — the town held'}.`
    }
    case 'DAY_STARTED': return `Day ${event.day} began.`
    case 'TIME_ADVANCED': return `Time advanced from ${String(event.fromHour).padStart(2,'0')}:00 to ${String(event.toHour).padStart(2,'0')}:00.`
  }
}

export function isHighlightEvent(event: GameEvent): boolean {
  return !['AP_SPENT','CITIZEN_LOCATION_CHANGED','CONSTRUCTION_AP_CONTRIBUTED','ITEM_MOVED_TO_HOME','ITEM_MOVED_TO_RUCKSACK','TIME_ADVANCED','BOT_MISSION_PHASE_SET'].includes(event.type)
}

export function eventTone(event: GameEvent): 'town'|'world'|'night'|'danger'|'system'|'home' {
  switch(event.type){
    case 'CITIZEN_DIED': return 'danger'
    case 'NIGHT_RESOLVED': return event.report.breached?'danger':'night'
    case 'DAY_STARTED': return 'night'
    case 'ZONE_DISCOVERED': case 'ZONE_SEARCHED': case 'ZONE_REPLENISHED': case 'SPECIAL_SITE_EXCAVATED': case 'SPECIAL_SITE_SEARCHED': case 'ITEM_PICKED_UP': case 'COMBAT_RESOLVED': case 'CITIZEN_LOCATION_CHANGED': case 'BOT_MISSION_ASSIGNED': case 'BOT_MISSION_PHASE_SET': case 'BOT_MISSION_CLEARED': return 'world'
    case 'ITEM_MOVED_TO_HOME': case 'ITEM_MOVED_TO_RUCKSACK': case 'CONTAINER_OPENED': case 'CONSTRUCTION_KIT_OPENED': case 'ITEM_CONSUMED': case 'HOME_UPGRADED': return 'home'
    case 'WATER_TAKEN': case 'ITEM_DEPOSITED': case 'ITEM_WITHDRAWN': case 'CONSTRUCTION_AP_CONTRIBUTED': case 'CONSTRUCTION_COMPLETED': case 'WORKSHOP_CONVERTED': case 'GATE_SET': return 'town'
    default: return 'system'
  }
}
