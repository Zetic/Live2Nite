import { ITEM_TYPE_IDS, type ItemDisplayCategory, type ItemType } from './itemCatalog'
import { ITEMS } from './items'
import { ITEM_SOURCE_CATALOG, type ItemImplementationStatus, type ItemSourceCatalogEntry } from './itemSourceCatalog'

export type ItemCodexCategory=
  | 'resources'
  | 'food'
  | 'pharmacy'
  | 'armoury'
  | 'tools'
  | 'containers'
  | 'defences'
  | 'furniture'
  | 'blueprints'
  | 'documents'
  | 'creatures'
  | 'miscellaneous'

export const ITEM_CODEX_CATEGORIES:readonly {id:ItemCodexCategory;label:string}[]=[
  {id:'resources',label:'Resources'},
  {id:'food',label:'Food & Drink'},
  {id:'pharmacy',label:'Pharmacy'},
  {id:'armoury',label:'Armoury'},
  {id:'tools',label:'Tools & Equipment'},
  {id:'containers',label:'Containers'},
  {id:'defences',label:'Defences'},
  {id:'furniture',label:'Furniture'},
  {id:'blueprints',label:'Blueprints'},
  {id:'documents',label:'Documents'},
  {id:'creatures',label:'Creatures'},
  {id:'miscellaneous',label:'Miscellaneous'},
]

export interface ItemCodexFamilyState{
  id:string
  name:string
  sourceCatalog:boolean
  sourceRefs:readonly string[]
  sourceCategories:readonly ItemDisplayCategory[]
  runtimeType:ItemType|null
  implementation:ItemImplementationStatus
  heavy:boolean|null
  decoration:number|null
  watchPoints:number|null
}

export interface ItemCodexFamily{
  id:string
  name:string
  category:ItemCodexCategory
  implementation:ItemImplementationStatus
  runtimeTypes:readonly ItemType[]
  states:readonly ItemCodexFamilyState[]
}

const TOOL_RUNTIME_TYPES=new Set<ItemType>([
  'adjustable_spanner','screwdriver','swiss_army_knife','box_cutter','can_opener',
  'saw_tool_part','saw_tool','repair_kit','tool_bag','kwik_fix','telescope',
  'radio_cassette_player_off','working_radio','ems_system_empty','ems_system_charged',
])

const RUNTIME_FAMILY_OVERRIDES:Partial<Record<ItemType,string>>={
  open_can:'can',
  radio_cassette_player_off:'radio_cassette_player',
  working_radio:'radio_cassette_player',
  ems_system_empty:'ems_system',
  ems_system_charged:'ems_system',
  engine_incomplete:'engine',
  engine:'engine',
  resource_pack:'resource_pack',
  water_pistol:'water_pistol',
  water_cooler_bottle:'water_cooler_bottle',
  battery_launcher:'battery_launcher',
}

function slug(value:string):string{
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'item'
}

function runtimeFamilyId(type:ItemType):string{
  const override=RUNTIME_FAMILY_OVERRIDES[type]
  if(override)return override
  if(type.startsWith('broken_')){
    const base=type.slice('broken_'.length) as ItemType
    if((ITEM_TYPE_IDS as readonly string[]).includes(base))return runtimeFamilyId(base)
  }
  return type
}

function isBlueprintRef(ref:string):boolean{return /^(?:bplan_|hbplan_|bbplan_|mbplan_)/.test(ref)}

function sourceFamilyOverride(ref:string):string|null{
  if(ref==='can_#00'||ref==='can_open_#00')return'can'
  if(/^watergun_(?:empty|[123])_#/.test(ref))return'water_pistol'
  if(/^water_can_/.test(ref))return'water_cooler_bottle'
  if(/^rsc_pack_/.test(ref))return'resource_pack'
  if(/^pilegun_up/.test(ref))return'battery_launcher_mk_ii'
  if(/^pilegun(?:_empty)?_#/.test(ref))return'battery_launcher'
  if(/^sport_elec/.test(ref))return'ems_system'
  if(/^radio_(?:on|off)/.test(ref))return'radio_cassette_player'
  if(/^repair_kit/.test(ref))return'repair_kit'
  if(/^engine(?:_part)?_/.test(ref))return'engine'
  if(/^watergun_opt_/.test(ref))return'aqua_splash'
  if(/^mixergun/.test(ref))return'electric_whisk'
  if(/^chainsaw/.test(ref))return'chainsaw'
  if(/^jerrygun/.test(ref))return'jerrycan_gun'
  if(/^lpoint/.test(ref))return'burning_laser_pointer'
  if(/^maglite/.test(ref))return'novelty_torch'
  return null
}

function baseStateName(name:string):string{
  const stateSuffix=/\s*\((?:loaded|empty!?|broken|damaged|incomplete|charged|discharged|unloaded|ready|unattached|no battery|not equipped!?|equipped!?|\d+\s*(?:shots?|charges?|rations?|uses?)(?:\s+left)?|\d+\s+left)\)\s*$/i
  return name.replace(stateSuffix,'').trim()
}

function sourceFamilyId(entry:ItemSourceCatalogEntry):string{
  if(entry.runtimeType)return runtimeFamilyId(entry.runtimeType)
  if(isBlueprintRef(entry.sourceRef))return entry.id
  return sourceFamilyOverride(entry.sourceRef)??slug(baseStateName(entry.name))
}

function familyDisplayName(id:string,states:readonly ItemCodexFamilyState[],runtimeTypes:readonly ItemType[]):string{
  const preferred=runtimeTypes.find((type)=>runtimeFamilyId(type)===id&&!type.startsWith('broken_'))??runtimeTypes.find((type)=>!type.startsWith('broken_'))??runtimeTypes[0]
  if(preferred)return baseStateName(ITEMS[preferred].name)
  return baseStateName(states[0]?.name??id.replaceAll('_',' '))
}

function statusRank(status:ItemImplementationStatus):number{return status==='implemented'?2:status==='partial'?1:0}
function aggregateStatus(states:readonly ItemCodexFamilyState[]):ItemImplementationStatus{
  return states.reduce<ItemImplementationStatus>((best,state)=>statusRank(state.implementation)>statusRank(best)?state.implementation:best,'wip')
}

function categoryForFamily(states:readonly ItemCodexFamilyState[],runtimeTypes:readonly ItemType[]):ItemCodexCategory{
  const refs=states.flatMap((state)=>state.sourceRefs)
  const names=states.map((state)=>state.name).join(' | ')
  const sourceCategories=new Set(states.flatMap((state)=>state.sourceCategories))
  const definitions=runtimeTypes.map((type)=>ITEMS[type])
  const capabilities=new Set(definitions.flatMap((definition)=>definition.capabilities))

  if(refs.some(isBlueprintRef)||capabilities.has('blueprint'))return'blueprints'
  if(refs.some((ref)=>/^(?:pet_|tamed_pet_)/.test(ref)))return'creatures'
  if(capabilities.has('container')||sourceCategories.has('containers'))return'containers'
  if(definitions.some((definition)=>definition.capabilities.includes('raw_material')||definition.capabilities.includes('construction_material'))||definitions.some((definition)=>definition.displayCategory==='resources'))return'resources'
  if(refs.some((ref)=>/^(?:rp_|surv_book_|lilboo_|book_)/.test(ref)))return'documents'
  if(runtimeTypes.some((type)=>TOOL_RUNTIME_TYPES.has(type))||/(?:spade|toolbelt|repair kit|hacksaw|calibrator|radio cassette|ems system|telescope|groundsheet|camouflage vest|voodoo mask)/i.test(names))return'tools'
  if(definitions.some((definition)=>definition.displayCategory==='pharmacy')||sourceCategories.has('pharmacy'))return'pharmacy'
  if(definitions.some((definition)=>definition.displayCategory==='food')||sourceCategories.has('food'))return'food'
  if(sourceCategories.has('furniture')&&!/(?:revolver|rifle|gun|launcher|chainsaw|taser|machete|knife)/i.test(names))return'furniture'
  if(definitions.some((definition)=>definition.displayCategory==='armoury')||sourceCategories.has('armoury')||/(?:revolver|rifle|gun|launcher|chainsaw|taser|machete|knife)/i.test(names))return'armoury'
  if(definitions.some((definition)=>definition.displayCategory==='defences')||sourceCategories.has('defences')||/riot shield/i.test(names))return'defences'
  if(sourceCategories.has('resources'))return'resources'
  if(sourceCategories.has('furniture'))return'furniture'
  return'miscellaneous'
}

function sourceState(entry:ItemSourceCatalogEntry):ItemCodexFamilyState{
  return{
    id:`source:${entry.id}`,
    name:entry.name,
    sourceCatalog:true,
    sourceRefs:[entry.sourceRef],
    sourceCategories:[entry.category],
    runtimeType:entry.runtimeType,
    implementation:entry.implementation,
    heavy:entry.heavy,
    decoration:entry.decoration,
    watchPoints:entry.watchPoints,
  }
}

const mutable=new Map<string,{states:ItemCodexFamilyState[];runtimeTypes:Set<ItemType>}>()
function bucket(id:string){
  let value=mutable.get(id)
  if(!value){value={states:[],runtimeTypes:new Set<ItemType>()};mutable.set(id,value)}
  return value
}

for(const source of ITEM_SOURCE_CATALOG){
  const id=sourceFamilyId(source)
  const target=bucket(id)
  target.states.push(sourceState(source))
  if(source.runtimeType)target.runtimeTypes.add(source.runtimeType)
}

const mappedRuntimeTypes=new Set<ItemType>(ITEM_SOURCE_CATALOG.flatMap((entry)=>entry.runtimeType?[entry.runtimeType]:[]))
for(const type of ITEM_TYPE_IDS){
  if(mappedRuntimeTypes.has(type))continue
  const id=runtimeFamilyId(type)
  const target=bucket(id)
  target.runtimeTypes.add(type)
  target.states.push({
    id:`runtime:${type}`,
    name:ITEMS[type].name,
    sourceCatalog:false,
    sourceRefs:[],
    sourceCategories:[],
    runtimeType:type,
    implementation:'implemented',
    heavy:null,
    decoration:null,
    watchPoints:null,
  })
}

export const ITEM_CODEX_FAMILIES:readonly ItemCodexFamily[]=[...mutable.entries()].map(([id,value])=>{
  const runtimeTypes=[...value.runtimeTypes]
  const states=[...value.states].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))
  return{
    id,
    name:familyDisplayName(id,states,runtimeTypes),
    category:categoryForFamily(states,runtimeTypes),
    implementation:aggregateStatus(states),
    runtimeTypes,
    states,
  }
}).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))

export const ITEM_CODEX_FAMILY_BY_ID:ReadonlyMap<string,ItemCodexFamily>=new Map(ITEM_CODEX_FAMILIES.map((family)=>[family.id,family]))
export const ITEM_CODEX_SOURCE_STATE_COUNT=ITEM_CODEX_FAMILIES.reduce((sum,family)=>sum+family.states.filter((state)=>state.sourceCatalog).length,0)
export const ITEM_CODEX_SUPPLEMENTAL_RUNTIME_STATE_COUNT=ITEM_CODEX_FAMILIES.reduce((sum,family)=>sum+family.states.filter((state)=>!state.sourceCatalog).length,0)
