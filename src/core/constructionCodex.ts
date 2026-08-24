import { CONSTRUCTION_BRANCHES, CONSTRUCTION_CATALOG, CONSTRUCTION_CATALOG_ORDER, blueprintClassLabel, constructionCatalogChildren, constructionCatalogRoots, type ConstructionBlueprintClass, type ConstructionBranchId, type ConstructionImplementationStatus } from './constructionCatalog'
import type { ConstructionId } from './constructionIds'

export interface ConstructionCodexEntry{
  id:ConstructionId
  name:string
  description:string
  branchId:ConstructionBranchId
  branchLabel:string
  parentId:ConstructionId|null
  parentName:string|null
  childIds:ConstructionId[]
  childNames:string[]
  blueprintClass:ConstructionBlueprintClass
  blueprintLabel:string
  apCost:number
  maxHp:number
  defense:number
  breakable:boolean
  temporary:boolean
  hasUpgrade:boolean
  resources:readonly {name:string;amount:number}[]
  implementation:ConstructionImplementationStatus
  wipReason:string|null
  depth:number
}

function depthOf(id:ConstructionId):number{
  let depth=0
  let current=CONSTRUCTION_CATALOG[id].parentId
  const seen=new Set<ConstructionId>()
  while(current&&!seen.has(current)){seen.add(current);depth+=1;current=CONSTRUCTION_CATALOG[current].parentId}
  return depth
}

export function constructionCodexEntry(id:ConstructionId):ConstructionCodexEntry{
  const source=CONSTRUCTION_CATALOG[id]
  const childIds=CONSTRUCTION_CATALOG_ORDER.filter((candidate)=>CONSTRUCTION_CATALOG[candidate].parentId===id)
  return{
    id,
    name:source.name,
    description:source.description,
    branchId:source.branchId,
    branchLabel:source.branchLabel,
    parentId:source.parentId,
    parentName:source.parentId?CONSTRUCTION_CATALOG[source.parentId].name:null,
    childIds,
    childNames:childIds.map((childId)=>CONSTRUCTION_CATALOG[childId].name),
    blueprintClass:source.blueprintClass,
    blueprintLabel:blueprintClassLabel(source.blueprintClass),
    apCost:source.apCost,
    maxHp:source.maxHp,
    defense:source.defense,
    breakable:source.breakable,
    temporary:source.temporary,
    hasUpgrade:source.hasUpgrade,
    resources:source.resources,
    implementation:source.implementation,
    wipReason:source.wipReason,
    depth:depthOf(id),
  }
}

function treeOrder():ConstructionId[]{
  const result:ConstructionId[]=[]
  const visit=(id:ConstructionId)=>{result.push(id);for(const child of constructionCatalogChildren(id))visit(child)}
  for(const branch of CONSTRUCTION_BRANCHES)for(const root of constructionCatalogRoots(branch.id))visit(root)
  return result
}
export const CONSTRUCTION_CODEX_TREE_ORDER:readonly ConstructionId[]=treeOrder()
export const CONSTRUCTION_CODEX_ENTRIES:readonly ConstructionCodexEntry[]=CONSTRUCTION_CODEX_TREE_ORDER.map(constructionCodexEntry)

export const CONSTRUCTION_CODEX_BRANCHES:readonly {id:'all'|ConstructionBranchId;label:string;count:number}[]=[
  {id:'all',label:'All branches',count:CONSTRUCTION_CODEX_ENTRIES.length},
  ...CONSTRUCTION_BRANCHES.map((branch)=>({id:branch.id,label:branch.label,count:CONSTRUCTION_CODEX_ENTRIES.filter((entry)=>entry.branchId===branch.id).length})),
]

export type SpecializedRuinBlueprintFamily='hotel'|'bunker'|'hospital'
export type SpecializedRuinBlueprintRarity=2|3|4
export interface SpecializedRuinBlueprintMetadata{
  id:string
  name:string
  family:SpecializedRuinBlueprintFamily
  familyLabel:string
  rarity:SpecializedRuinBlueprintRarity
  rarityLabel:'Uncommon'|'Rare'|'Very Rare'
  acquisitionNote:string
  implementation:'wip'
}

const specializedRuinBlueprint=(family:SpecializedRuinBlueprintFamily,familyLabel:string,rarity:SpecializedRuinBlueprintRarity,rarityLabel:SpecializedRuinBlueprintMetadata['rarityLabel']):SpecializedRuinBlueprintMetadata=>({
  id:`ruin_${family}_${rarityLabel.toLocaleLowerCase().replaceAll(' ','_')}`,
  name:`${familyLabel} Blueprint (${rarityLabel.toLocaleLowerCase()})`,
  family,
  familyLabel,
  rarity,
  rarityLabel,
  acquisitionNote:`Specialized ${familyLabel} ruin blueprint. The source family and rarity are catalogued; explorable-ruin acquisition and its dedicated unlock pool are not implemented yet.`,
  implementation:'wip',
})

export const SPECIALIZED_RUIN_BLUEPRINTS:readonly SpecializedRuinBlueprintMetadata[]=[
  specializedRuinBlueprint('hotel','Hotel',2,'Uncommon'),
  specializedRuinBlueprint('bunker','Bunker',2,'Uncommon'),
  specializedRuinBlueprint('hospital','Hospital',2,'Uncommon'),
  specializedRuinBlueprint('hotel','Hotel',3,'Rare'),
  specializedRuinBlueprint('bunker','Bunker',3,'Rare'),
  specializedRuinBlueprint('hospital','Hospital',3,'Rare'),
  specializedRuinBlueprint('hotel','Hotel',4,'Very Rare'),
  specializedRuinBlueprint('bunker','Bunker',4,'Very Rare'),
  specializedRuinBlueprint('hospital','Hospital',4,'Very Rare'),
]

export function filterSpecializedRuinBlueprints(query:string):SpecializedRuinBlueprintMetadata[]{
  const needle=query.trim().toLocaleLowerCase()
  if(!needle)return[...SPECIALIZED_RUIN_BLUEPRINTS]
  return SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>[
    entry.name,entry.family,entry.familyLabel,entry.rarityLabel,entry.acquisitionNote,entry.implementation,'explorable ruin','specialized blueprint',
  ].some((value)=>value.toLocaleLowerCase().includes(needle)))
}

export const GENERIC_BLUEPRINT_CLASSES=[1,2,3,4] as const

export const BLUEPRINT_ACQUISITION_NOTES:Readonly<Record<ConstructionBlueprintClass,string>>={
  0:'No blueprint required; the site is registered with its no-blueprint branch.',
  1:'Common Blueprint. Worn Leather Bag: 50% when opened.',
  2:'Uncommon Blueprint. Worn Leather Bag: 35%; successful camping at an uncovered ruin under 10 km also produces this grade.',
  3:'Rare Blueprint. Worn Leather Bag: 10%; successful camping at an uncovered ruin at 10 km or farther also produces this grade.',
  4:'Very Rare Blueprint. Worn Leather Bag: 5%.',
  5:'Special/manual construction class; not unlocked by a generic blueprint.',
  6:'Dump specialization class; not unlocked by a generic blueprint.',
}

export function filterConstructionCodex(query:string,branch:'all'|ConstructionBranchId='all',blueprintsOnly=false):ConstructionCodexEntry[]{
  const needle=query.trim().toLocaleLowerCase()
  return CONSTRUCTION_CODEX_ENTRIES.filter((entry)=>{
    if(branch!=='all'&&entry.branchId!==branch)return false
    if(blueprintsOnly&&entry.blueprintClass===0)return false
    if(!needle)return true
    const resources=entry.resources.flatMap((resource)=>[resource.name,String(resource.amount)])
    return[
      entry.name,entry.description,entry.branchLabel,entry.parentName??'',...entry.childNames,
      entry.blueprintLabel,entry.implementation,entry.wipReason??'',...resources,
    ].some((value)=>value.toLocaleLowerCase().includes(needle))
  })
}

export function constructionCodexStatusLabel(status:ConstructionImplementationStatus):string{
  return status==='implemented'?'Implemented':status==='partial'?'Partial':'WIP'
}
