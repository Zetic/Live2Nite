import type { ItemType, SpecialSiteType } from './types'

export interface SpecialSiteDefinition {
  type: SpecialSiteType
  name: string
  code: string
  purpose: string
  lootPool: ItemType[]
}

export const SPECIAL_SITE_ORDER: SpecialSiteType[] = ['construction_site','wrecked_cars','pharmacy','supermarket','dark_woods','police_station']

export const SPECIAL_SITES: Record<SpecialSiteType, SpecialSiteDefinition> = {
  construction_site: {
    type: 'construction_site', name: 'Abandoned Construction Site', code: 'C',
    purpose: 'A concentrated source of construction-ready material.',
    lootPool: ['twisted_plank','twisted_plank','wrought_iron','unshaped_concrete_block','old_door'],
  },
  wrecked_cars: {
    type: 'wrecked_cars', name: 'Wrecked Cars', code: 'W',
    purpose: 'Vehicle wreckage with metal and electrical components.',
    lootPool: ['scrap_metal','scrap_metal','wrought_iron','battery','old_door'],
  },
  pharmacy: {
    type: 'pharmacy', name: 'Destroyed Pharmacy', code: 'Rx',
    purpose: 'Medical and pharmaceutical supplies. Advanced medicine remains deferred.',
    lootPool: ['pharmaceutical_products','pharmaceutical_products','water_ration','box_of_matches'],
  },
  supermarket: {
    type: 'supermarket', name: 'Abandoned Supermarket', code: 'S',
    purpose: 'A food-oriented destination for towns running short on supplies.',
    lootPool: ['food','food','food','water_ration','box_of_matches'],
  },
  dark_woods: {
    type: 'dark_woods', name: 'Dark Woods', code: 'F',
    purpose: 'Wood-rich terrain with raw and construction-ready timber.',
    lootPool: ['rotten_log','rotten_log','twisted_plank','twisted_plank'],
  },
  police_station: {
    type: 'police_station', name: 'Old Police Station', code: 'P',
    purpose: 'A dangerous but valuable source of weapons and defensive objects.',
    lootPool: ['water_bomb','water_bomb','old_door','battery','box_of_matches'],
  },
}

export function specialSiteName(type: SpecialSiteType): string { return SPECIAL_SITES[type].name }
export function specialSiteCode(type: SpecialSiteType): string { return SPECIAL_SITES[type].code }
export function specialSitePurpose(type: SpecialSiteType): string { return SPECIAL_SITES[type].purpose }
