import { weaponDefinition } from './combat'
import { ITEM_TYPE_IDS, type ItemDisplayCategory, type ItemType } from './itemCatalog'
import { ITEMS } from './items'
import { openableDefinition } from './openables'

export type CodexItemCategory = 'all' | ItemDisplayCategory

export const CODEX_ITEM_CATEGORIES: readonly { id: CodexItemCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'resources', label: 'Resources' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'armoury', label: 'Armoury' },
  { id: 'containers', label: 'Containers' },
  { id: 'defences', label: 'Defences' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'food', label: 'Food' },
  { id: 'miscellaneous', label: 'Miscellaneous' },
]

const sourceLabels = {
  DIE2NITE_ARCHIVE: 'Die2Nite archive',
  HORDES_V4_4: 'Hordes v4.4',
  MYHORDES_CURRENT: 'MyHordes',
  LIVE2NITE_ADAPTATION: 'Live2Nite adaptation',
} as const

export interface CodexFact { label: string; value: string }
export interface CodexItemEntry {
  type: ItemType
  name: string
  purpose: string
  category: ItemDisplayCategory
  categoryLabel: string
  sourceLabel: string
  capabilities: string[]
  facts: CodexFact[]
}

function titleCase(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
function categoryLabel(category: ItemDisplayCategory): string {
  return CODEX_ITEM_CATEGORIES.find((entry)=>entry.id===category)?.label ?? titleCase(category)
}
function killRange(min: number, max: number): string { return min === max ? `${min}` : `${min}–${max}` }
function itemNames(types: readonly ItemType[]): string { return types.map((type) => ITEMS[type].name).join(', ') }

export function codexItemEntry(type: ItemType): CodexItemEntry {
  const definition = ITEMS[type]
  const facts: CodexFact[] = []
  const state = definition.state
  if (state?.charges) facts.push({ label: 'Charges', value: `${state.charges.min}–${state.charges.max} · starts at ${state.charges.initial}` })
  if (state?.contents) facts.push({ label: 'Contents', value: `${state.contents.min}–${state.contents.max} · starts at ${state.contents.initial}` })
  if (state?.condition) facts.push({ label: 'Condition', value: titleCase(state.condition.initial) })
  if (state?.contamination) facts.push({ label: 'Contamination', value: titleCase(state.contamination.initial) })
  if (state?.powered) facts.push({ label: 'Power', value: state.powered.initial ? 'Starts powered' : 'Starts unpowered' })
  if (state?.assembly) facts.push({ label: 'Assembly', value: titleCase(state.assembly.initial) })
  if (definition.consumableKind) facts.push({ label: 'Consumable', value: titleCase(definition.consumableKind) })
  if (definition.bankDefense) facts.push({ label: 'Bank defense', value: `+${definition.bankDefense}` })
  if (definition.homeDefense) facts.push({ label: 'Home defense', value: `+${definition.homeDefense}` })

  const weapon = weaponDefinition(type)
  if (weapon) {
    facts.push({ label: 'Combat', value: `${killRange(weapon.minKills, weapon.maxKills)} zombie${weapon.maxKills === 1 ? '' : 's'} · ${weapon.killChancePercent}% kill roll` })
    facts.push({ label: 'Action cost', value: `${weapon.apCost} AP${weapon.requiresPositiveAp ? ' · requires positive AP' : ''}` })
    if (weapon.consumesOnUse) facts.push({ label: 'Use', value: 'Consumed after use' })
    if (weapon.usesCharges) facts.push({ label: 'Use', value: 'Consumes one charge per attack' })
    if (weapon.breakChancePercent && weapon.brokenType) facts.push({ label: 'Break risk', value: `${weapon.breakChancePercent}% → ${ITEMS[weapon.brokenType].name}` })
    if (weapon.confidence === 'approximate') facts.push({ label: 'Source fidelity', value: 'Approximate behavior pending a fully unambiguous source rule' })
  }

  const openable = openableDefinition(type)
  if (openable) {
    const behavior = openable.morphTo ? `Morphs into ${ITEMS[openable.morphTo].name}` : openable.mode === 'remaining_contents' ? 'Retained until its contents are exhausted' : openable.mode === 'attempt' ? `${openable.successPercent ?? 100}% successful opening attempt` : 'Consumed when opened'
    facts.push({ label: 'Opening', value: behavior })
    facts.push({ label: 'Open cost', value: `${openable.apCost ?? 0} AP` })
    if (openable.openableBy?.length) facts.push({ label: 'Open with', value: itemNames(openable.openableBy) })
    if (!openable.morphTo) {
      const outcomes = openable.outputTable.entries.map((entry) => `${entry.items.map((item) => ITEMS[item.type].name).join(' + ')} (${entry.weight})`).join(', ')
      facts.push({ label: 'Possible contents', value: outcomes })
    }
  } else if (definition.containerPool?.length) {
    facts.push({ label: 'Possible contents', value: itemNames(definition.containerPool) })
    facts.push({ label: 'Opening', value: 'Legacy container path' })
  }

  return {
    type,
    name: definition.name,
    purpose: definition.purpose,
    category: definition.displayCategory,
    categoryLabel: categoryLabel(definition.displayCategory),
    sourceLabel: sourceLabels[definition.source],
    capabilities: definition.capabilities.map(titleCase),
    facts,
  }
}

export const CODEX_ITEM_ENTRIES: readonly CodexItemEntry[] = ITEM_TYPE_IDS.map(codexItemEntry).sort((a, b) => a.name.localeCompare(b.name))

export function filterCodexItems(category: CodexItemCategory, query: string, entries: readonly CodexItemEntry[] = CODEX_ITEM_ENTRIES): CodexItemEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  return entries.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false
    if (!needle) return true
    return [entry.name, entry.purpose, entry.categoryLabel, entry.sourceLabel, ...entry.capabilities].some((value) => value.toLocaleLowerCase().includes(needle))
  })
}

export function codexCategoryCount(category: CodexItemCategory): number {
  return category === 'all' ? CODEX_ITEM_ENTRIES.length : CODEX_ITEM_ENTRIES.filter((entry) => entry.category === category).length
}
