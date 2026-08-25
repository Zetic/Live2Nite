import { LEGACY_SPECIAL_SITE_TO_RUIN, RUIN_IDS, type RuinId } from './ruinIds'
import { ORDINARY_RUIN_IDS, RUIN_CATALOG, playableRuinLootPool, ruinCode } from './ruinCatalog'
import type { ItemType } from './types'

export interface SpecialSiteDefinition { type:RuinId; name:string; code:string; purpose:string; lootPool:ItemType[] }

/** Ordinary source-spawnable ruins. Explorable ruins are placed through their dedicated map slot. */
export const SPECIAL_SITE_ORDER:readonly RuinId[]=ORDINARY_RUIN_IDS

export const SPECIAL_SITES:Readonly<Record<RuinId,SpecialSiteDefinition>>=Object.fromEntries(
  RUIN_IDS.map((type)=>{
    const ruin=RUIN_CATALOG[type]
    return[type,{
      type,
      name:ruin.name,
      code:ruinCode(type),
      purpose:ruin.explorable
        ? `Explorable ${ruin.family} ruin. Interior exploration uses the dedicated explorable-ruin path.`
        : ruin.availability==='conditional'
          ? 'Source ruin is catalogued but requires a dedicated reveal mechanic before ordinary map placement.'
          : 'MyHordes ruin represented with source placement/camping metadata and fail-closed playable loot.',
      lootPool:playableRuinLootPool(type),
    }]
  }),
) as unknown as Record<RuinId,SpecialSiteDefinition>

export function normalizeRuinId(type:string):RuinId|null{
  if((RUIN_IDS as readonly string[]).includes(type))return type as RuinId
  return LEGACY_SPECIAL_SITE_TO_RUIN[type]??null
}
export function specialSiteName(type:string):string{const id=normalizeRuinId(type);return id?SPECIAL_SITES[id].name:type}
export function specialSiteCode(type:string):string{const id=normalizeRuinId(type);return id?SPECIAL_SITES[id].code:'?'}
export function specialSitePurpose(type:string):string{const id=normalizeRuinId(type);return id?SPECIAL_SITES[id].purpose:'Unknown legacy ruin'}
export function specialSiteLootPool(type:string):ItemType[]{const id=normalizeRuinId(type);return id?[...SPECIAL_SITES[id].lootPool]:[]}
