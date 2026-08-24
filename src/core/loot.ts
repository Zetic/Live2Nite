import { randomInt } from './rng'
import type { ItemState, ItemType } from './types'

export type LootSource = 'MYHORDES_CURRENT' | 'LIVE2NITE_ADAPTATION'

export interface LootItemSpec {
  type: ItemType
  state?: ItemState
}

export interface WeightedLootEntry {
  /** One roll may yield one or more items. */
  items: readonly LootItemSpec[]
  weight: number
}

export interface WeightedLootTable {
  id: string
  source: LootSource
  entries: readonly WeightedLootEntry[]
}

export interface LootRollResult {
  items: readonly LootItemSpec[]
  rngStateAfter: number
}

export function lootEntry(type: ItemType, weight: number, state?: ItemState): WeightedLootEntry {
  return { items: [{ type, state }], weight }
}

export function totalLootWeight(table: WeightedLootTable): number {
  return table.entries.reduce((total, entry) => total + Math.max(0, Math.trunc(entry.weight)), 0)
}

export function rollWeightedLoot(rngState: number, table: WeightedLootTable): LootRollResult {
  const total = totalLootWeight(table)
  if (total <= 0) throw new Error(`Loot table ${table.id} has no positive-weight entries`)
  const roll = randomInt(rngState, 1, total)
  let cursor = roll.value
  for (const entry of table.entries) {
    const weight = Math.max(0, Math.trunc(entry.weight))
    if (weight <= 0) continue
    cursor -= weight
    if (cursor <= 0) return { items: entry.items, rngStateAfter: roll.state }
  }
  throw new Error(`Loot table ${table.id} could not resolve roll ${roll.value}/${total}`)
}

export function rollWeightedLootMany(rngState: number, table: WeightedLootTable, count: number): { items: LootItemSpec[]; rngStateAfter: number } {
  const items: LootItemSpec[] = []
  let next = rngState
  for (let index = 0; index < count; index += 1) {
    const roll = rollWeightedLoot(next, table)
    next = roll.rngStateAfter
    items.push(...roll.items)
  }
  return { items, rngStateAfter: next }
}
