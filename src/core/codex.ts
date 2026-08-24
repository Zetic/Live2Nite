import { weaponDefinition } from './combat'
import { COMBINATION_RECIPES, COMBINATION_RECIPE_ORDER } from './combinations'
import { CONSTRUCTIONS } from './construction'
import { ITEM_TYPE_IDS, type ItemDisplayCategory, type ItemType } from './itemCatalog'
import { itemUseActionSummary, itemUseActionsForType } from './itemEffects'
import { ITEMS, NORMAL_SCAVENGE_LOOT_POOL } from './items'
import { totalLootWeight, type WeightedLootTable } from './loot'
import { OPENABLES, openableDefinition } from './openables'
import { MYHORDES_DEPLETED_ZONE_LOOT } from './scavengeLoot'
import { SPECIAL_SITES, SPECIAL_SITE_ORDER } from './specialSites'
import { WORKSHOP_RECIPES, WORKSHOP_RECIPE_ORDER } from './workshop'

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
export interface CodexRelationship { label: string; detail: string; badge?: string }
export interface CodexRelationshipGroup { id: string; label: string; entries: CodexRelationship[] }
export interface CodexItemEntry {
  type: ItemType
  name: string
  purpose: string
  category: ItemDisplayCategory
  categoryLabel: string
  sourceLabel: string
  capabilities: string[]
  facts: CodexFact[]
  usedIn: CodexRelationshipGroup[]
  obtainedFrom: CodexRelationshipGroup[]
}

function titleCase(value: string): string {
  return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
function categoryLabel(category: ItemDisplayCategory): string {
  return CODEX_ITEM_CATEGORIES.find((entry)=>entry.id===category)?.label ?? titleCase(category)
}
function killRange(min: number, max: number): string { return min === max ? `${min}` : `${min}–${max}` }
function itemNames(types: readonly ItemType[]): string { return types.map((type) => ITEMS[type].name).join(', ') }
function formatPercent(percent:number):string{
  const text=(percent>=1?percent.toFixed(1):percent.toFixed(2)).replace(/\.0+$/,'')
  return `${text}%`
}
function rarityLabel(percent:number):string{
  if(percent>=30)return'Very common'
  if(percent>=15)return'Common'
  if(percent>=7.5)return'Uncommon'
  if(percent>=2)return'Rare'
  return'Very rare'
}
function rarityDetail(percent:number,context:string):string{return`${rarityLabel(percent)} · ${formatPercent(percent)} ${context}`}
function uniformPercent(pool:readonly ItemType[],type:ItemType):number{
  if(!pool.length)return 0
  return pool.filter((candidate)=>candidate===type).length/pool.length*100
}
function weightedPercent(table:WeightedLootTable,type:ItemType):number{
  const total=totalLootWeight(table)
  if(total<=0)return 0
  const matching=table.entries.reduce((sum,entry)=>entry.items.some((item)=>item.type===type)?sum+Math.max(0,Math.trunc(entry.weight)):sum,0)
  return matching/total*100
}
function group(id:string,label:string,entries:CodexRelationship[]):CodexRelationshipGroup|null{return entries.length?{id,label,entries}:null}
function compactGroups(groups:Array<CodexRelationshipGroup|null>):CodexRelationshipGroup[]{return groups.filter((entry):entry is CodexRelationshipGroup=>Boolean(entry))}

function usedInGroups(type:ItemType):CodexRelationshipGroup[]{
  const constructions=Object.values(CONSTRUCTIONS).flatMap((definition)=>{
    const amount=definition.resources[type]??0
    return amount>0?[{label:definition.name,detail:`${amount} required · ${definition.apCost} AP construction`}]:[]
  })
  const combinations=COMBINATION_RECIPE_ORDER.flatMap((recipeId)=>{
    const recipe=COMBINATION_RECIPES[recipeId]
    const amount=recipe.inputs.filter((input)=>input.type===type).reduce((sum,input)=>sum+(input.count??1),0)
    return amount>0?[{label:recipe.name,detail:`${titleCase(recipe.category)} · ${amount} used · ${recipe.apCost} AP`}]:[]
  })
  const workshop=WORKSHOP_RECIPE_ORDER.flatMap((recipeId)=>{
    const recipe=WORKSHOP_RECIPES[recipeId]
    return recipe.input===type?[{label:recipe.name,detail:`${titleCase(recipe.category)} · ${recipe.inputCount} used · ${recipe.apCost} base AP`}]:[]
  })
  const opening:CodexRelationship[]=[]
  for(const definition of Object.values(OPENABLES)){
    if(!definition?.openableBy?.includes(type))continue
    opening.push({label:`Open ${ITEMS[definition.type].name}`,detail:`Valid opener · ${definition.apCost??0} AP`})
  }
  return compactGroups([
    group('constructions','Constructions',constructions),
    group('combinations','Portable combinations',combinations),
    group('workshop','Workshop',workshop),
    group('opening','Container opening',opening),
  ])
}

function obtainedFromGroups(type:ItemType):CodexRelationshipGroup[]{
  const scavenging:CodexRelationship[]=[]
  const normalChance=uniformPercent(NORMAL_SCAVENGE_LOOT_POOL,type)
  if(normalChance>0)scavenging.push({label:'Normal zones',detail:rarityDetail(normalChance,'per loot roll')})
  const depletedChance=weightedPercent(MYHORDES_DEPLETED_ZONE_LOOT,type)
  if(depletedChance>0)scavenging.push({label:'Depleted zones',detail:rarityDetail(depletedChance,'per depleted search')})

  const specialMatches=SPECIAL_SITE_ORDER.flatMap((siteType)=>{
    const definition=SPECIAL_SITES[siteType]
    const chance=uniformPercent(definition.lootPool,type)
    return chance>0?[{definition,chance}]:[]
  })
  const specialLocations:CodexRelationship[]=specialMatches.map(({definition,chance})=>({
    label:definition.name,
    detail:rarityDetail(chance,'per site loot draw'),
    ...(specialMatches.length===1?{badge:'Unique location'}:{}),
  }))

  const containers:CodexRelationship[]=[]
  for(const definition of Object.values(OPENABLES)){
    if(!definition)continue
    if(definition.morphTo===type){containers.push({label:ITEMS[definition.type].name,detail:'Guaranteed morph on opening'});continue}
    const chance=weightedPercent(definition.outputTable,type)
    if(chance>0)containers.push({label:ITEMS[definition.type].name,detail:rarityDetail(chance,'per opening')})
  }
  for(const definition of Object.values(ITEMS)){
    if(!definition.containerPool?.length||OPENABLES[definition.type])continue
    const chance=uniformPercent(definition.containerPool,type)
    if(chance>0)containers.push({label:definition.name,detail:rarityDetail(chance,'per opening')})
  }

  const workshop:CodexRelationship[]=[]
  for(const recipeId of WORKSHOP_RECIPE_ORDER){
    const recipe=WORKSHOP_RECIPES[recipeId]
    if(recipe.outcomes?.length){
      const total=recipe.outcomes.reduce((sum,outcome)=>sum+Math.max(0,outcome.weight),0)
      const matching=recipe.outcomes.filter((outcome)=>outcome.output===type).reduce((sum,outcome)=>sum+Math.max(0,outcome.weight),0)
      if(matching>0&&total>0)workshop.push({label:recipe.name,detail:rarityDetail(matching/total*100,'per Workshop result')})
    }else if(recipe.output===type){
      workshop.push({label:recipe.name,detail:`Guaranteed output · ${recipe.outputCount} produced`})
    }
  }

  const combinations=COMBINATION_RECIPE_ORDER.flatMap((recipeId)=>{
    const recipe=COMBINATION_RECIPES[recipeId]
    return recipe.outputType===type?[{label:recipe.name,detail:`${titleCase(recipe.category)} result · ${recipe.apCost} AP`}]:[]
  })

  const constructions:CodexRelationship[]=[]
  for(const definition of Object.values(CONSTRUCTIONS)){
    for(const effect of definition.effects){
      if(effect.type!=='daily_bank_item'||effect.itemType!==type)continue
      const amount=effect.min===effect.max?`${effect.min}`:`${effect.min}–${effect.max}`
      constructions.push({label:definition.name,detail:`Produces ${amount} per day`})
    }
  }

  return compactGroups([
    group('scavenging','Scavenging',scavenging),
    group('special-locations','Special locations',specialLocations),
    group('containers','Containers',containers),
    group('workshop','Workshop',workshop),
    group('combinations','Portable combinations',combinations),
    group('constructions','Constructions',constructions),
  ])
}

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
  for(const action of itemUseActionsForType(type))facts.push({label:`Action · ${action.label}`,value:itemUseActionSummary(action)})

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
    usedIn:usedInGroups(type),
    obtainedFrom:obtainedFromGroups(type),
  }
}

export const CODEX_ITEM_ENTRIES: readonly CodexItemEntry[] = ITEM_TYPE_IDS.map(codexItemEntry).sort((a, b) => a.name.localeCompare(b.name))

export function filterCodexItems(category: CodexItemCategory, query: string, entries: readonly CodexItemEntry[] = CODEX_ITEM_ENTRIES): CodexItemEntry[] {
  const needle = query.trim().toLocaleLowerCase()
  return entries.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false
    if (!needle) return true
    const relationships=[...entry.usedIn,...entry.obtainedFrom].flatMap((group)=>[group.label,...group.entries.flatMap((relation)=>[relation.label,relation.detail,relation.badge??''])])
    const facts=entry.facts.flatMap((fact)=>[fact.label,fact.value])
    return [entry.name, entry.purpose, entry.categoryLabel, entry.sourceLabel, ...entry.capabilities, ...facts, ...relationships].some((value) => value.toLocaleLowerCase().includes(needle))
  })
}

export function codexCategoryCount(category: CodexItemCategory): number {
  return category === 'all' ? CODEX_ITEM_ENTRIES.length : CODEX_ITEM_ENTRIES.filter((entry) => entry.category === category).length
}
