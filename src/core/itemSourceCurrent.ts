import type { ItemType } from './itemCatalog'
import { ITEM_SOURCE_CATALOG, type ItemImplementationStatus, type ItemSourceCatalogEntry } from './itemSourceCatalog'

interface CurrentItemSourceOverride {
  runtimeType:ItemType
  implementation:Exclude<ItemImplementationStatus,'wip'>
}

/**
 * Focused current-runtime overlays for pinned source-registry rows.
 *
 * The 383-entry item source catalogue remains a historical/audit snapshot. Runtime activations
 * belong here so source metadata is not rewritten merely because a Live2Nite dependency lands.
 */
export const CURRENT_ITEM_SOURCE_OVERRIDES:Readonly<Partial<Record<string,CurrentItemSourceOverride>>>={
  'trestle_#00':{runtimeType:'trestle',implementation:'implemented'},
  'undef_#00':{runtimeType:'unspecified_meat',implementation:'implemented'},
  // The ordinary source pet family is now represented by real inventory items. They remain
  // Partial while Tamer's Trap System and animal-production dependencies are still unresolved.
  'pet_chick_#00':{runtimeType:'chicken',implementation:'partial'},
  'pet_pig_#00':{runtimeType:'stinking_pig',implementation:'partial'},
  'pet_rat_#00':{runtimeType:'giant_rat',implementation:'partial'},
  'pet_dog_#00':{runtimeType:'guard_dog',implementation:'partial'},
  'pet_cat_#00':{runtimeType:'fat_cat',implementation:'partial'},
  'pet_snake_#00':{runtimeType:'huge_snake',implementation:'partial'},
}

function currentEntry(entry:ItemSourceCatalogEntry):ItemSourceCatalogEntry{
  const override=CURRENT_ITEM_SOURCE_OVERRIDES[entry.sourceRef]
  return override?{...entry,...override}:entry
}

export const CURRENT_ITEM_SOURCE_CATALOG:readonly ItemSourceCatalogEntry[]=ITEM_SOURCE_CATALOG.map(currentEntry)
export const CURRENT_ITEM_SOURCE_CATALOG_BY_ID:ReadonlyMap<string,ItemSourceCatalogEntry>=new Map(CURRENT_ITEM_SOURCE_CATALOG.map((entry)=>[entry.id,entry]))
export const CURRENT_ITEM_SOURCE_CATALOG_BY_REF:ReadonlyMap<string,ItemSourceCatalogEntry>=new Map(CURRENT_ITEM_SOURCE_CATALOG.map((entry)=>[entry.sourceRef,entry]))
export const CURRENT_ITEM_SOURCE_CATALOG_BY_RUNTIME_TYPE:ReadonlyMap<ItemType,ItemSourceCatalogEntry>=new Map(
  CURRENT_ITEM_SOURCE_CATALOG.flatMap((entry)=>entry.runtimeType?[[entry.runtimeType,entry] as const]:[]),
)

export function currentItemSourceCatalogStatusCounts():Record<ItemImplementationStatus,number>{
  const counts:Record<ItemImplementationStatus,number>={implemented:0,partial:0,wip:0}
  for(const entry of CURRENT_ITEM_SOURCE_CATALOG)counts[entry.implementation]+=1
  return counts
}
