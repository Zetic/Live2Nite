import type { GameEvent } from '../core/types'
import { isHighlightEvent } from './eventText'

export const CHRONICLE_CATEGORIES = [
  { id: 'bank', label: 'Bank' },
  { id: 'combat', label: 'Combat' },
  { id: 'scavenging', label: 'Scavenging' },
  { id: 'travel', label: 'Travel' },
  { id: 'missions', label: 'Missions' },
  { id: 'construction', label: 'Construction' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'camping', label: 'Camping' },
  { id: 'survival', label: 'Survival' },
  { id: 'night', label: 'Night' },
  { id: 'town', label: 'Town' },
  { id: 'home', label: 'Home' },
  { id: 'system', label: 'System' },
] as const

export type ChronicleCategory=(typeof CHRONICLE_CATEGORIES)[number]['id']
export type ChronicleMode='highlights'|'all'
export interface ChronicleFilters{mode:ChronicleMode;day:number|null;citizenId:string|null;categories:readonly ChronicleCategory[]}

export function chronicleCategory(event:GameEvent):ChronicleCategory{
  switch(event.type){
    case 'ITEM_DEPOSITED':case 'ITEM_WITHDRAWN':return'bank'
    case 'COMBAT_RESOLVED':return'combat'
    case 'ZONE_DISCOVERED':case 'ZONE_SEARCHED':case 'ZONE_REPLENISHED':case 'SPECIAL_SITE_EXCAVATED':case 'SPECIAL_SITE_SEARCHED':case 'ITEM_PICKED_UP':case 'ITEM_DROPPED':return'scavenging'
    case 'ZONE_OBSERVED':case 'CITIZEN_LOCATION_CHANGED':return'travel'
    case 'BOT_MISSION_ASSIGNED':case 'BOT_MISSION_PHASE_SET':case 'BOT_MISSION_CLEARED':return'missions'
    case 'BLUEPRINT_READ':case 'CONSTRUCTION_DISCOVERED':case 'CONSTRUCTION_AP_CONTRIBUTED':case 'CONSTRUCTION_COMPLETED':case 'CONSTRUCTION_EXPIRED':case 'CONSTRUCTION_GENERATED_ITEM':case 'WORKSHOP_CONVERTED':return'construction'
    case 'OPENABLE_RESOLVED':case 'CONTAINER_OPENED':case 'WATER_TAKEN':case 'ITEM_CONSUMED':case 'ITEM_ACTION_RESOLVED':case 'ITEMS_COMBINED':return'supplies'
    case 'CAMP_IMPROVED':case 'CAMP_IMPROVEMENTS_DECAYED':case 'CITIZEN_HIDING_SET':case 'CAMPING_RESOLVED':case 'CAMPING_BLUEPRINT_DROPPED':return'camping'
    case 'FLEE_ZOMBIES_RESOLVED':case 'WOUNDED_MOVEMENT_RESOLVED':case 'ZONE_CONTROL_LOST':case 'TEMPORARY_CONTROL_GRANTED':case 'TEMPORARY_CONTROL_EXPIRED':case 'ZONE_CONTROL_RESTORED':case 'CITIZEN_STATUS_CHANGED':case 'CITIZEN_DIED':case 'CORPSE_REANIMATED':return'survival'
    case 'WORLD_ZOMBIES_EVOLVED':case 'NIGHT_RESOLVED':case 'DAY_STARTED':return'night'
    case 'GATE_SET':case 'COORDINATION_COMMITMENT_POSTED':case 'COORDINATION_COMMITMENT_CLEARED':return'town'
    case 'ITEM_MOVED_TO_HOME':case 'ITEM_MOVED_TO_RUCKSACK':case 'HOME_ITEM_DEPOSITED':case 'HOME_INTRUSION_ATTEMPTED':case 'HOME_ITEM_STOLEN':case 'HOME_ITEM_PILLAGED':case 'HOME_UPGRADED':case 'HOME_IMPROVEMENT_BUILT':case 'HOME_SIESTA_USED':case 'CORPSE_DISPOSED':return'home'
    case 'AP_SPENT':case 'TIME_ADVANCED':return'system'
  }
}

export function eventCitizenId(event:GameEvent):string|null{if(event.type==='COORDINATION_COMMITMENT_POSTED')return event.commitment.citizenId;return'citizenId'in event&&typeof event.citizenId==='string'&&event.citizenId!=='system'?event.citizenId:null}
export function filterChronicleEvents(events:readonly GameEvent[],filters:ChronicleFilters):GameEvent[]{const selectedCategories=new Set(filters.categories);return events.filter((event)=>{if(filters.mode==='highlights'&&!isHighlightEvent(event))return false;if(filters.day!==null&&event.day!==filters.day)return false;if(filters.citizenId!==null&&eventCitizenId(event)!==filters.citizenId)return false;if(selectedCategories.size>0&&!selectedCategories.has(chronicleCategory(event)))return false;return true})}
export function availableChronicleDays(events:readonly GameEvent[]):number[]{return[...new Set(events.map((event)=>event.day))].sort((a,b)=>b-a)}
