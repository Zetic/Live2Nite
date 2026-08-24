import { describe, expect, it } from 'vitest'
import { CODEX_ITEM_CATEGORIES, CODEX_ITEM_ENTRIES, codexCategoryCount, codexItemEntry, filterCodexItems } from '../src/core/codex'
import { ITEM_TYPE_IDS } from '../src/core/itemCatalog'
import { ITEMS } from '../src/core/items'


describe('item codex',()=>{
  it('is generated from the complete Live2Nite item catalogue',()=>{
    expect(CODEX_ITEM_ENTRIES).toHaveLength(ITEM_TYPE_IDS.length)
    expect(new Set(CODEX_ITEM_ENTRIES.map((entry)=>entry.type))).toEqual(new Set(ITEM_TYPE_IDS))
    for(const entry of CODEX_ITEM_ENTRIES){
      expect(entry.name).toBe(ITEMS[entry.type].name)
      expect(entry.purpose).toBe(ITEMS[entry.type].purpose)
      expect(entry.category).toBe(ITEMS[entry.type].displayCategory)
    }
  })

  it('keeps category counts derived instead of hard-coded',()=>{
    expect(codexCategoryCount('all')).toBe(ITEM_TYPE_IDS.length)
    for(const category of CODEX_ITEM_CATEGORIES.filter((entry)=>entry.id!=='all')){
      expect(codexCategoryCount(category.id)).toBe(CODEX_ITEM_ENTRIES.filter((entry)=>entry.category===category.id).length)
    }
  })

  it('filters by category and free-text item information',()=>{
    const armoury=filterCodexItems('armoury','')
    expect(armoury.length).toBeGreaterThan(0)
    expect(armoury.every((entry)=>entry.category==='armoury')).toBe(true)
    expect(filterCodexItems('all','water bomb').map((entry)=>entry.type)).toContain('water_bomb')
    expect(filterCodexItems('all','myhordes').length).toBeGreaterThan(0)
  })

  it('derives structured combat and openable facts from gameplay systems',()=>{
    const bomb=codexItemEntry('water_bomb')
    expect(bomb.facts.some((fact)=>fact.label==='Combat'&&fact.value.includes('2–4'))).toBe(true)
    const toolbox=codexItemEntry('toolbox')
    expect(toolbox.facts.some((fact)=>fact.label==='Open with')).toBe(true)
    expect(toolbox.facts.some((fact)=>fact.label==='Possible contents'&&fact.value.includes('Pharmaceutical Products'))).toBe(true)
  })
})
