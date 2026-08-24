import { weaponDefinition } from './combat'
import { COMBINATION_RECIPES, COMBINATION_RECIPE_ORDER } from './combinations'
import { CONSTRUCTIONS } from './construction'
import { ITEM_TYPE_IDS, type ItemDisplayCategory, type ItemType } from './itemCatalog'
import { ITEM_CODEX_CATEGORIES, ITEM_CODEX_FAMILIES, ITEM_CODEX_SOURCE_STATE_COUNT, ITEM_CODEX_SUPPLEMENTAL_RUNTIME_STATE_COUNT, type ItemCodexCategory, type ItemCodexFamilyState } from './itemCodexFamilies'
import { itemUseActionSummary, itemUseActionsForType } from './itemEffects'
import { ITEMS, NORMAL_SCAVENGE_LOOT_POOL } from './items'
import type { ItemImplementationStatus } from './itemSourceCatalog'
import { totalLootWeight, type WeightedLootTable } from './loot'
import { OPENABLES, openableDefinition } from './openables'
import { MYHORDES_DEPLETED_ZONE_LOOT } from './scavengeLoot'
import { SPECIAL_SITES, SPECIAL_SITE_ORDER } from './specialSites'
import { WORKSHOP_RECIPES, WORKSHOP_RECIPE_ORDER } from './workshop'

export type CodexItemCategory='all'|ItemCodexCategory
export const CODEX_ITEM_CATEGORIES:readonly {id:CodexItemCategory;label:string}[]=[{id:'all',label:'All'},...ITEM_CODEX_CATEGORIES]

const sourceLabels={
  DIE2NITE_ARCHIVE:'Die2Nite archive',
  HORDES_V4_4:'Hordes v4.4',
  MYHORDES_CURRENT:'MyHordes',
  LIVE2NITE_ADAPTATION:'Live2Nite adaptation',
} as const
const sourceCategoryLabels:Record<ItemDisplayCategory,string>={
  resources:'Resources',furniture:'Furniture',armoury:'Armoury',containers:'Containers and boxes',defences:'Defences',pharmacy:'Pharmacy',food:'Food',miscellaneous:'Miscellaneous',
}

export interface CodexFact{label:string;value:string}
export interface CodexRelationship{label:string;detail:string;badge?:string}
export interface CodexRelationshipGroup{id:string;label:string;entries:CodexRelationship[]}
export interface CodexItemStateEntry{
  id:string
  name:string
  sourceCatalog:boolean
  sourceRefs:readonly string[]
  sourceCategoryLabels:readonly string[]
  runtimeType:ItemType|null
  implementation:ItemImplementationStatus
  facts:CodexFact[]
}
export interface CodexItemEntry{
  id:string
  type:ItemType|null
  runtimeTypes:readonly ItemType[]
  sourceCatalog:boolean
  sourceRef:string|null
  implementation:ItemImplementationStatus
  name:string
  purpose:string
  category:ItemCodexCategory
  categoryLabel:string
  sourceLabel:string
  capabilities:string[]
  facts:CodexFact[]
  states:readonly CodexItemStateEntry[]
  usedIn:CodexRelationshipGroup[]
  obtainedFrom:CodexRelationshipGroup[]
}

function titleCase(value:string):string{return value.split('_').map((part)=>part.charAt(0).toUpperCase()+part.slice(1)).join(' ')}
function categoryLabel(category:ItemCodexCategory):string{return ITEM_CODEX_CATEGORIES.find((entry)=>entry.id===category)?.label??titleCase(category)}
function killRange(min:number,max:number):string{return min===max?`${min}`:`${min}–${max}`}
function itemNames(types:readonly ItemType[]):string{return types.map((type)=>ITEMS[type].name).join(', ')}
function formatPercent(percent:number):string{const text=(percent>=1?percent.toFixed(1):percent.toFixed(2)).replace(/\.0+$/,'');return`${text}%`}
function rarityLabel(percent:number):string{if(percent>=30)return'Very common';if(percent>=15)return'Common';if(percent>=7.5)return'Uncommon';if(percent>=2)return'Rare';return'Very rare'}
function rarityDetail(percent:number,context:string):string{return`${rarityLabel(percent)} · ${formatPercent(percent)} ${context}`}
function uniformPercent(pool:readonly ItemType[],type:ItemType):number{return pool.length?pool.filter((candidate)=>candidate===type).length/pool.length*100:0}
function weightedPercent(table:WeightedLootTable,type:ItemType):number{const total=totalLootWeight(table);if(total<=0)return 0;const matching=table.entries.reduce((sum,entry)=>entry.items.some((item)=>item.type===type)?sum+Math.max(0,Math.trunc(entry.weight)):sum,0);return matching/total*100}
function group(id:string,label:string,entries:CodexRelationship[]):CodexRelationshipGroup|null{return entries.length?{id,label,entries}:null}
function compactGroups(groups:Array<CodexRelationshipGroup|null>):CodexRelationshipGroup[]{return groups.filter((entry):entry is CodexRelationshipGroup=>Boolean(entry))}
function dedupeRelationships(entries:CodexRelationship[]):CodexRelationship[]{const seen=new Set<string>();return entries.filter((entry)=>{const key=`${entry.label}|${entry.detail}|${entry.badge??''}`;if(seen.has(key))return false;seen.add(key);return true})}
function mergeGroups(groups:CodexRelationshipGroup[][]):CodexRelationshipGroup[]{
  const merged=new Map<string,CodexRelationshipGroup>()
  for(const collection of groups)for(const groupEntry of collection){const existing=merged.get(groupEntry.id);if(existing)existing.entries=dedupeRelationships([...existing.entries,...groupEntry.entries]);else merged.set(groupEntry.id,{...groupEntry,entries:[...groupEntry.entries]})}
  return[...merged.values()]
}
function mergeFacts(facts:CodexFact[][]):CodexFact[]{const seen=new Set<string>();return facts.flat().filter((fact)=>{const key=`${fact.label}|${fact.value}`;if(seen.has(key))return false;seen.add(key);return true})}

function constructionCost(definition:(typeof CONSTRUCTIONS)[keyof typeof CONSTRUCTIONS]):string{
  const materials=ITEM_TYPE_IDS.flatMap((type)=>{const amount=definition.resources[type]??0;return amount>0?[`${amount} ${ITEMS[type].name}`]:[]})
  return`${materials.length?materials.join(' + '):'No materials'} · ${definition.apCost} AP`
}
function combinationRecipeDetail(recipe:(typeof COMBINATION_RECIPES)[keyof typeof COMBINATION_RECIPES]):string{
  const inputs=recipe.inputs.map((input)=>`${input.count??1} ${ITEMS[input.type].name}`).join(' + ')
  return`${inputs} → ${ITEMS[recipe.outputType].name} · ${recipe.apCost} AP`
}
function workshopRecipeDetail(recipe:(typeof WORKSHOP_RECIPES)[keyof typeof WORKSHOP_RECIPES]):string{
  const outputs=recipe.outcomes?.length?[...new Set(recipe.outcomes.map((outcome)=>`${outcome.outputCount} ${ITEMS[outcome.output].name}`))].join(' / '):`${recipe.outputCount} ${ITEMS[recipe.output].name}`
  return`${recipe.inputCount} ${ITEMS[recipe.input].name} → ${outputs} · ${recipe.apCost} base AP`
}

function usedInGroups(type:ItemType):CodexRelationshipGroup[]{
  const constructions=Object.values(CONSTRUCTIONS).flatMap((definition)=>((definition.resources[type]??0)>0?[{label:definition.name,detail:constructionCost(definition)}]:[]))
  const combinations=COMBINATION_RECIPE_ORDER.flatMap((recipeId)=>{const recipe=COMBINATION_RECIPES[recipeId];return recipe.inputs.some((input)=>input.type===type)?[{label:recipe.name,detail:combinationRecipeDetail(recipe)}]:[]})
  const workshop=WORKSHOP_RECIPE_ORDER.flatMap((recipeId)=>{const recipe=WORKSHOP_RECIPES[recipeId];return recipe.input===type?[{label:recipe.name,detail:workshopRecipeDetail(recipe)}]:[]})
  const opening:CodexRelationship[]=[]
  for(const definition of Object.values(OPENABLES)){if(definition?.openableBy?.includes(type))opening.push({label:`Open ${ITEMS[definition.type].name}`,detail:`Valid opener · ${definition.apCost??0} AP`})}
  return compactGroups([group('constructions','Constructions',constructions),group('combinations','Portable combinations',combinations),group('workshop','Workshop',workshop),group('opening','Container opening',opening)])
}

function obtainedFromGroups(type:ItemType):CodexRelationshipGroup[]{
  const scavenging:CodexRelationship[]=[]
  const normalChance=uniformPercent(NORMAL_SCAVENGE_LOOT_POOL,type);if(normalChance>0)scavenging.push({label:'Normal zones',detail:rarityDetail(normalChance,'per loot roll')})
  const depletedChance=weightedPercent(MYHORDES_DEPLETED_ZONE_LOOT,type);if(depletedChance>0)scavenging.push({label:'Depleted zones',detail:rarityDetail(depletedChance,'per depleted search')})
  const specialMatches=SPECIAL_SITE_ORDER.flatMap((siteType)=>{const definition=SPECIAL_SITES[siteType];const chance=uniformPercent(definition.lootPool,type);return chance>0?[{definition,chance}]:[]})
  const specialLocations:CodexRelationship[]=specialMatches.map(({definition,chance})=>({label:definition.name,detail:rarityDetail(chance,'per site loot draw'),...(specialMatches.length===1?{badge:'Unique location'}:{})}))
  const containers:CodexRelationship[]=[]
  for(const definition of Object.values(OPENABLES)){if(!definition)continue;if(definition.morphTo===type){containers.push({label:ITEMS[definition.type].name,detail:'Guaranteed morph on opening'});continue}const chance=weightedPercent(definition.outputTable,type);if(chance>0)containers.push({label:ITEMS[definition.type].name,detail:rarityDetail(chance,'per opening')})}
  for(const definition of Object.values(ITEMS)){if(!definition.containerPool?.length||OPENABLES[definition.type])continue;const chance=uniformPercent(definition.containerPool,type);if(chance>0)containers.push({label:definition.name,detail:rarityDetail(chance,'per opening')})}
  const workshop:CodexRelationship[]=[]
  for(const recipeId of WORKSHOP_RECIPE_ORDER){const recipe=WORKSHOP_RECIPES[recipeId];if(recipe.outcomes?.some((outcome)=>outcome.output===type)||(!recipe.outcomes?.length&&recipe.output===type))workshop.push({label:recipe.name,detail:workshopRecipeDetail(recipe)})}
  const combinations=COMBINATION_RECIPE_ORDER.flatMap((recipeId)=>{const recipe=COMBINATION_RECIPES[recipeId];return recipe.outputType===type?[{label:recipe.name,detail:combinationRecipeDetail(recipe)}]:[]})
  const constructions:CodexRelationship[]=[]
  for(const definition of Object.values(CONSTRUCTIONS))for(const effect of definition.effects){if(effect.type!=='daily_bank_item'||effect.itemType!==type)continue;const amount=effect.min===effect.max?`${effect.min}`:`${effect.min}–${effect.max}`;constructions.push({label:definition.name,detail:`Produces ${amount} ${ITEMS[type].name} per day`})}
  return compactGroups([group('scavenging','Scavenging',scavenging),group('special-locations','Special locations',specialLocations),group('containers','Containers',containers),group('workshop','Workshop',workshop),group('combinations','Portable combinations',combinations),group('constructions','Constructions',constructions)])
}

function runtimeFacts(type:ItemType):CodexFact[]{
  const definition=ITEMS[type]
  const facts:CodexFact[]=[]
  const state=definition.state
  if(state?.charges)facts.push({label:'Charges',value:`${state.charges.min}–${state.charges.max} · starts at ${state.charges.initial}`})
  if(state?.contents)facts.push({label:'Contents',value:`${state.contents.min}–${state.contents.max} · starts at ${state.contents.initial}`})
  if(state?.condition)facts.push({label:'Condition',value:titleCase(state.condition.initial)})
  if(state?.contamination)facts.push({label:'Contamination',value:titleCase(state.contamination.initial)})
  if(state?.powered)facts.push({label:'Power',value:state.powered.initial?'Starts powered':'Starts unpowered'})
  if(state?.assembly)facts.push({label:'Assembly',value:titleCase(state.assembly.initial)})
  if(definition.consumableKind)facts.push({label:'Consumable',value:titleCase(definition.consumableKind)})
  if(definition.bankDefense)facts.push({label:'Bank defense',value:`+${definition.bankDefense}`})
  if(definition.homeDefense)facts.push({label:'Home defense',value:`+${definition.homeDefense}`})
  for(const action of itemUseActionsForType(type))facts.push({label:`Action · ${action.label}`,value:itemUseActionSummary(action)})
  const weapon=weaponDefinition(type)
  if(weapon){facts.push({label:'Combat',value:`${killRange(weapon.minKills,weapon.maxKills)} zombie${weapon.maxKills===1?'':'s'} · ${weapon.killChancePercent}% kill roll`});facts.push({label:'Action cost',value:`${weapon.apCost} AP${weapon.requiresPositiveAp?' · requires positive AP':''}`});if(weapon.consumesOnUse)facts.push({label:'Use',value:'Consumed after use'});if(weapon.usesCharges)facts.push({label:'Use',value:'Consumes one charge per attack'});if(weapon.breakChancePercent&&weapon.brokenType)facts.push({label:'Break risk',value:`${weapon.breakChancePercent}% → ${ITEMS[weapon.brokenType].name}`});if(weapon.confidence==='approximate')facts.push({label:'Source fidelity',value:'Approximate behavior pending a fully unambiguous source rule'})}
  const openable=openableDefinition(type)
  if(openable){const behavior=openable.morphTo?`Morphs into ${ITEMS[openable.morphTo].name}`:openable.mode==='remaining_contents'?'Retained until its contents are exhausted':openable.mode==='attempt'?`${openable.successPercent??100}% successful opening attempt`:'Consumed when opened';facts.push({label:'Opening',value:behavior});facts.push({label:'Open cost',value:`${openable.apCost??0} AP`});if(openable.openableBy?.length)facts.push({label:'Open with',value:itemNames(openable.openableBy)});if(!openable.morphTo){const outcomes=openable.outputTable.entries.map((entry)=>`${entry.items.map((item)=>ITEMS[item.type].name).join(' + ')} (${entry.weight})`).join(', ');facts.push({label:'Possible contents',value:outcomes})}}
  else if(definition.containerPool?.length){facts.push({label:'Possible contents',value:itemNames(definition.containerPool)});facts.push({label:'Opening',value:'Legacy container path'})}
  return facts
}

function stateFacts(state:ItemCodexFamilyState):CodexFact[]{
  const facts:CodexFact[]=[]
  if(state.sourceCategories.length)facts.push({label:'MyHordes source category',value:[...new Set(state.sourceCategories.map((category)=>sourceCategoryLabels[category]))].join(', ')})
  if(state.heavy!==null)facts.push({label:'Heavy',value:state.heavy?'Yes':'No'})
  if(state.decoration!==null&&state.decoration!==0)facts.push({label:'Decoration',value:String(state.decoration)})
  if(state.watchPoints!==null&&state.watchPoints!==0)facts.push({label:'Watch points',value:state.watchPoints>0?`+${state.watchPoints}`:String(state.watchPoints)})
  if(state.runtimeType)facts.push(...runtimeFacts(state.runtimeType))
  return mergeFacts([facts])
}

function preferredRuntimeType(types:readonly ItemType[]):ItemType|null{return types.find((type)=>!type.startsWith('broken_'))??types[0]??null}
function familyEntry(family:(typeof ITEM_CODEX_FAMILIES)[number]):CodexItemEntry{
  const preferred=preferredRuntimeType(family.runtimeTypes)
  const facts=mergeFacts(family.runtimeTypes.map(runtimeFacts))
  const states:CodexItemStateEntry[]=family.states.map((state)=>({id:state.id,name:state.name,sourceCatalog:state.sourceCatalog,sourceRefs:state.sourceRefs,sourceCategoryLabels:state.sourceCategories.map((category)=>sourceCategoryLabels[category]),runtimeType:state.runtimeType,implementation:state.implementation,facts:stateFacts(state)}))
  const capabilities=[...new Set(family.runtimeTypes.flatMap((type)=>ITEMS[type].capabilities.map(titleCase)))]
  const usedIn=mergeGroups(family.runtimeTypes.map(usedInGroups))
  const obtainedFrom=mergeGroups(family.runtimeTypes.map(obtainedFromGroups))
  const purpose=preferred?ITEMS[preferred].purpose:`MyHordes item family catalogued for parity. Its gameplay behavior is not implemented in Live2Nite yet.`
  return{id:`family:${family.id}`,type:preferred,runtimeTypes:family.runtimeTypes,sourceCatalog:states.some((state)=>state.sourceCatalog),sourceRef:states.flatMap((state)=>state.sourceRefs)[0]??null,implementation:family.implementation,name:family.name,purpose,category:family.category,categoryLabel:categoryLabel(family.category),sourceLabel:`MyHordes catalogue · ${states.filter((state)=>state.sourceCatalog).length} source state${states.filter((state)=>state.sourceCatalog).length===1?'':'s'}`,capabilities,facts,states,usedIn,obtainedFrom}
}

export const CODEX_ITEM_ENTRIES:readonly CodexItemEntry[]=ITEM_CODEX_FAMILIES.map(familyEntry)
export const CODEX_ITEM_FAMILY_COUNT=CODEX_ITEM_ENTRIES.length
export const CODEX_SOURCE_ITEM_COUNT=ITEM_CODEX_SOURCE_STATE_COUNT
export const CODEX_SUPPLEMENTAL_ITEM_COUNT=ITEM_CODEX_SUPPLEMENTAL_RUNTIME_STATE_COUNT

export function itemImplementationStatusLabel(status:ItemImplementationStatus):string{return status==='implemented'?'Implemented':status==='partial'?'Partial':'WIP'}
export function codexItemEntry(type:ItemType):CodexItemEntry{const entry=CODEX_ITEM_ENTRIES.find((candidate)=>candidate.runtimeTypes.includes(type));if(!entry)throw new Error(`Missing Codex family for ${type}`);return entry}
export function filterCodexItems(category:CodexItemCategory,query:string,entries:readonly CodexItemEntry[]=CODEX_ITEM_ENTRIES):CodexItemEntry[]{
  const needle=query.trim().toLocaleLowerCase()
  return entries.filter((entry)=>{if(category!=='all'&&entry.category!==category)return false;if(!needle)return true;const relationships=[...entry.usedIn,...entry.obtainedFrom].flatMap((groupEntry)=>[groupEntry.label,...groupEntry.entries.flatMap((relation)=>[relation.label,relation.detail,relation.badge??''])]);const facts=entry.facts.flatMap((fact)=>[fact.label,fact.value]);const states=entry.states.flatMap((state)=>[state.name,itemImplementationStatusLabel(state.implementation),...state.sourceCategoryLabels,...state.facts.flatMap((fact)=>[fact.label,fact.value])]);return[entry.name,entry.purpose,entry.categoryLabel,entry.sourceLabel,entry.implementation,itemImplementationStatusLabel(entry.implementation),...entry.capabilities,...facts,...states,...relationships].some((value)=>value.toLocaleLowerCase().includes(needle))})
}
export function codexCategoryCount(category:CodexItemCategory):number{return category==='all'?CODEX_ITEM_ENTRIES.length:CODEX_ITEM_ENTRIES.filter((entry)=>entry.category===category).length}
