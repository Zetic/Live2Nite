import { explorableBlueprintDisplayName } from './explorableBlueprints'
import { itemName, itemPurpose } from './items'
import type { ItemInstance } from './types'

export function itemInstanceName(item:Pick<ItemInstance,'type'|'state'>):string{
  const family=item.state?.blueprintFamily
  const tier=item.state?.blueprintTier
  return family&&tier?explorableBlueprintDisplayName(family,tier):itemName(item.type)
}

export function itemInstancePurpose(item:Pick<ItemInstance,'type'|'state'>):string{
  const family=item.state?.blueprintFamily
  const tier=item.state?.blueprintTier
  if(family&&tier)return`Specialized ${family} ruin plan. Reading it in town reveals one eligible construction from the dedicated ${family} ${tier} pool.`
  return itemPurpose(item.type)
}
