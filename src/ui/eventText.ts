import { CONSTRUCTIONS } from '../core/construction'
import { itemName } from '../core/items'
import type { GameEvent, GameState } from '../core/types'
import { WORKSHOP_RECIPES } from '../core/workshop'

export function citizenName(game: GameState, citizenId: string): string { return game.citizens.find((citizen) => citizen.id === citizenId)?.name ?? citizenId }

export function describeEvent(event: GameEvent, game: GameState): string {
  switch (event.type) {
    case 'AP_SPENT': return `${citizenName(game,event.citizenId)} spent ${event.amount} AP.`
    case 'GATE_SET': return `${citizenName(game,event.citizenId)} ${event.open?'opened':'closed'} the gate.`
    case 'CITIZEN_LOCATION_CHANGED': return event.location.type==='town' ? `${citizenName(game,event.citizenId)} returned to town.` : `${citizenName(game,event.citizenId)} moved to [${event.location.x},${event.location.y}].`
    case 'ZONE_DISCOVERED': return `Zone [${event.zoneKey}] was discovered.`
    case 'ZONE_SEARCHED': return event.item ? `${citizenName(game,event.citizenId)} searched [${event.zoneKey}] and uncovered ${itemName(event.item.type)}.` : `${citizenName(game,event.citizenId)} searched [${event.zoneKey}] and found nothing.`
    case 'ITEM_PICKED_UP': return `${citizenName(game,event.citizenId)} picked up ${itemName(event.item.type)}.`
    case 'ITEM_DEPOSITED': return `${citizenName(game,event.citizenId)} deposited ${itemName(event.item.type)} in the town bank.`
    case 'ITEM_WITHDRAWN': return `${citizenName(game,event.citizenId)} took ${itemName(event.item.type)} from the town bank.`
    case 'ITEM_MOVED_TO_HOME': return `${citizenName(game,event.citizenId)} stored ${itemName(event.item.type)} at home.`
    case 'ITEM_MOVED_TO_RUCKSACK': return `${citizenName(game,event.citizenId)} packed ${itemName(event.item.type)} into their rucksack.`
    case 'CONTAINER_OPENED': return `${citizenName(game,event.citizenId)} opened ${itemName(event.containerType)} and found ${itemName(event.output.type)}.`
    case 'WATER_TAKEN': return `${citizenName(game,event.citizenId)} took a Water Ration from the well.`
    case 'ITEM_CONSUMED': return `${citizenName(game,event.citizenId)} ${event.kind==='food'?'ate':'drank'} ${itemName(event.item.type)} and refreshed their AP.`
    case 'CONSTRUCTION_AP_CONTRIBUTED': return `${citizenName(game,event.citizenId)} contributed ${event.amount} AP to ${CONSTRUCTIONS[event.projectId].name}.`
    case 'CONSTRUCTION_COMPLETED': return `${CONSTRUCTIONS[event.projectId].name} was completed by ${citizenName(game,event.citizenId)}.`
    case 'WORKSHOP_CONVERTED': { const recipe=WORKSHOP_RECIPES[event.recipeId]; return `${citizenName(game,event.citizenId)} used the Workshop: ${event.inputCount} ${itemName(recipe.input)} → ${event.outputCount} ${itemName(recipe.output)}.` }
    case 'CITIZEN_DIED': return `${citizenName(game,event.citizenId)} died outside during the nightly attack.`
    case 'NIGHT_RESOLVED': return `Night ${event.day}: attack ${event.report.attackStrength} vs defense ${event.report.effectiveDefense}${event.report.breached?' — the town was breached':' — the town held'}.`
    case 'DAY_STARTED': return `Day ${event.day} began.`
  }
}

export function isHighlightEvent(event: GameEvent): boolean {
  return !['AP_SPENT','CITIZEN_LOCATION_CHANGED','ZONE_DISCOVERED','CONSTRUCTION_AP_CONTRIBUTED','ITEM_MOVED_TO_HOME','ITEM_MOVED_TO_RUCKSACK'].includes(event.type)
}

export function eventTone(event: GameEvent): 'town'|'world'|'night'|'danger'|'system'|'home' {
  switch(event.type){
    case 'CITIZEN_DIED': return 'danger'
    case 'NIGHT_RESOLVED': return event.report.breached?'danger':'night'
    case 'DAY_STARTED': return 'night'
    case 'ZONE_DISCOVERED': case 'ZONE_SEARCHED': case 'ITEM_PICKED_UP': case 'CITIZEN_LOCATION_CHANGED': return 'world'
    case 'ITEM_MOVED_TO_HOME': case 'ITEM_MOVED_TO_RUCKSACK': case 'CONTAINER_OPENED': case 'ITEM_CONSUMED': return 'home'
    case 'WATER_TAKEN': case 'ITEM_DEPOSITED': case 'ITEM_WITHDRAWN': case 'CONSTRUCTION_AP_CONTRIBUTED': case 'CONSTRUCTION_COMPLETED': case 'WORKSHOP_CONVERTED': case 'GATE_SET': return 'town'
    default: return 'system'
  }
}
