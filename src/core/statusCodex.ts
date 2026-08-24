import { ITEM_USE_ACTIONS, statusRelationsForEffects, type ItemUseActionDefinition, type StatusEffectRelationKind } from './itemEffects'
import { itemName } from './items'
import { CITIZEN_STATUS_DEFINITIONS, type StatusVariantDefinition } from './status'
import { WORLD_STATUS_ACTIONS } from './statusSources'
import type { CitizenStatusId, ItemType } from './types'
import type { CodexRelationshipGroup } from './codex'

export interface CodexStatusEntry {
  id:CitizenStatusId
  label:string
  family:string
  severity:'neutral'|'warning'|'danger'
  effect:string
  mechanics:readonly string[]
  obtainedFrom:CodexRelationshipGroup[]
  clearedBy:CodexRelationshipGroup[]
  progression:readonly {label:string;detail:string}[]
  variants:readonly StatusVariantDefinition[]
}

function titleCase(value:string):string{return value.replaceAll('_',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase())}
function dedupe(entries:Array<{label:string;detail:string;badge?:string}>):Array<{label:string;detail:string;badge?:string}>{
  const seen=new Set<string>()
  return entries.filter((entry)=>{const key=entry.label+'|'+entry.detail+'|'+(entry.badge??'');if(seen.has(key))return false;seen.add(key);return true})
}
function effectGroups(statusId:CitizenStatusId,kind:StatusEffectRelationKind):CodexRelationshipGroup[]{
  const itemEntries:Array<{label:string;detail:string;badge?:string}>=[]
  for(const [type,actions] of Object.entries(ITEM_USE_ACTIONS) as Array<[ItemType,readonly ItemUseActionDefinition[]|undefined]>){
    for(const action of actions??[]){
      for(const relation of statusRelationsForEffects(action.effects)){
        if(relation.status===statusId&&relation.kind===kind)itemEntries.push({label:itemName(type),detail:action.label+' · '+relation.detail})
      }
    }
  }
  const worldEntries:Array<{label:string;detail:string;badge?:string}>=[]
  for(const action of Object.values(WORLD_STATUS_ACTIONS)){
    for(const relation of statusRelationsForEffects(action.effects)){
      if(relation.status===statusId&&relation.kind===kind)worldEntries.push({label:action.label,detail:relation.detail+' '+action.detail})
    }
  }
  const definition=CITIZEN_STATUS_DEFINITIONS[statusId]
  const system=(kind==='acquire'?definition.systemSources:definition.systemClears)??[]
  const groups:CodexRelationshipGroup[]=[]
  if(worldEntries.length)groups.push({id:'world-actions',label:'World actions',entries:dedupe(worldEntries)})
  if(itemEntries.length)groups.push({id:'items',label:'Items',entries:dedupe(itemEntries)})
  if(system.length)groups.push({id:'system',label:'System progression',entries:system.map((entry)=>({label:entry.label,detail:entry.detail}))})
  return groups
}

export function codexStatusEntry(id:CitizenStatusId):CodexStatusEntry{
  const definition=CITIZEN_STATUS_DEFINITIONS[id]
  return{
    id,
    label:definition.label,
    family:titleCase(definition.family),
    severity:definition.severity,
    effect:definition.effect,
    mechanics:definition.mechanics??[],
    obtainedFrom:effectGroups(id,'acquire'),
    clearedBy:effectGroups(id,'clear'),
    progression:definition.progression??[],
    variants:definition.variants??[],
  }
}

export const STATUS_CODEX_ENTRIES:CodexStatusEntry[]=(Object.keys(CITIZEN_STATUS_DEFINITIONS) as CitizenStatusId[]).map(codexStatusEntry)

export function filterCodexStatuses(query:string,entries:readonly CodexStatusEntry[]=STATUS_CODEX_ENTRIES):CodexStatusEntry[]{
  const needle=query.trim().toLocaleLowerCase()
  if(!needle)return[...entries]
  return entries.filter((entry)=>{
    const relationships=[...entry.obtainedFrom,...entry.clearedBy].flatMap((group)=>[group.label,...group.entries.flatMap((relation)=>[relation.label,relation.detail,relation.badge??''])])
    const variants=entry.variants.flatMap((variant)=>[variant.label,variant.detail,variant.active?'active':'tracked'])
    const progression=entry.progression.flatMap((relation)=>[relation.label,relation.detail])
    return[entry.label,entry.family,entry.severity,entry.effect,...entry.mechanics,...relationships,...variants,...progression].some((value)=>value.toLocaleLowerCase().includes(needle))
  })
}
