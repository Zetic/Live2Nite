import { describe, expect, it } from 'vitest'
import { ITEM_TYPE_IDS } from '../src/core/itemCatalog'
import { ITEM_SOURCE_CATALOG, ITEM_SOURCE_CATALOG_BY_REF, itemSourceCatalogStatusCounts } from '../src/core/itemSourceCatalog'

describe('complete MyHordes item source catalogue',()=>{
  it('pins all 383 source item/state entries behind Live2Nite semantic identities',()=>{
    expect(ITEM_SOURCE_CATALOG).toHaveLength(383)
    expect(new Set(ITEM_SOURCE_CATALOG.map((entry)=>entry.id)).size).toBe(383)
    expect(new Set(ITEM_SOURCE_CATALOG.map((entry)=>entry.sourceRef)).size).toBe(383)
    expect(ITEM_SOURCE_CATALOG.every((entry)=>!entry.id.includes('#')&&entry.id!==entry.sourceRef)).toBe(true)
    expect(ITEM_SOURCE_CATALOG.every((entry)=>!('numericalId' in entry))).toBe(true)
  })

  it('preserves the eight source category counts',()=>{
    const counts=Object.fromEntries(['resources','furniture','armoury','containers','defences','pharmacy','food','miscellaneous'].map((category)=>[
      category,ITEM_SOURCE_CATALOG.filter((entry)=>entry.category===category).length,
    ]))
    expect(counts).toEqual({
      resources:25,
      furniture:47,
      armoury:55,
      containers:27,
      defences:12,
      pharmacy:19,
      food:59,
      miscellaneous:139,
    })
  })

  it('tracks implementation coverage without making WIP entries runtime items',()=>{
    expect(itemSourceCatalogStatusCounts()).toEqual({implemented:101,partial:14,wip:268})
    expect(ITEM_SOURCE_CATALOG.filter((entry)=>entry.implementation==='wip').every((entry)=>entry.runtimeType===null)).toBe(true)
    expect(ITEM_SOURCE_CATALOG.filter((entry)=>entry.implementation!=='wip').every((entry)=>entry.runtimeType!==null)).toBe(true)
    const runtimeIds=new Set(ITEM_TYPE_IDS)
    for(const entry of ITEM_SOURCE_CATALOG)if(entry.runtimeType)expect(runtimeIds.has(entry.runtimeType),entry.runtimeType).toBe(true)
  })

  it('maps generic construction blueprints but keeps specialized ruin blueprints WIP',()=>{
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('bplan_c_#00')?.runtimeType).toBe('common_blueprint')
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('bplan_u_#00')?.runtimeType).toBe('uncommon_blueprint')
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('bplan_r_#00')?.runtimeType).toBe('rare_blueprint')
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('bplan_e_#00')?.runtimeType).toBe('very_rare_blueprint')
    for(const ref of ['hbplan_u_#00','hbplan_r_#00','hbplan_e_#00','bbplan_u_#00','bbplan_r_#00','bbplan_e_#00','mbplan_u_#00','mbplan_r_#00','mbplan_e_#00']){
      expect(ITEM_SOURCE_CATALOG_BY_REF.get(ref)?.implementation,ref).toBe('wip')
      expect(ITEM_SOURCE_CATALOG_BY_REF.get(ref)?.runtimeType,ref).toBeNull()
    }
  })

  it('locks source-name reconciliation discovered during the catalogue pass',()=>{
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('rustine_#00')).toMatchObject({name:'Duct Tape',runtimeType:'duct_tape',implementation:'implemented'})
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('repair_one_#00')).toMatchObject({name:'Kwik-fix',runtimeType:'kwik_fix',implementation:'implemented'})
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('chama_#00')).toMatchObject({name:'Dried Marshmallows',runtimeType:null,implementation:'wip'})
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('ryebag_#00')).toMatchObject({name:'Bag of Damp Grass',runtimeType:'bag_of_damp_grass'})
    expect(ITEM_SOURCE_CATALOG_BY_REF.get('poison_part_#00')).toMatchObject({name:'Corrosive Liquid',runtimeType:'poison_gland',implementation:'partial'})
  })
})
