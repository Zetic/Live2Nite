import { describe, expect, it } from 'vitest'
import { CODEX_ITEM_CATEGORIES, CODEX_ITEM_ENTRIES, CODEX_SOURCE_ITEM_COUNT, CODEX_SUPPLEMENTAL_ITEM_COUNT, codexCategoryCount, codexItemEntry, filterCodexItems } from '../src/core/codex'
import { ITEM_TYPE_IDS } from '../src/core/itemCatalog'
import { ITEMS } from '../src/core/items'
import { ITEM_SOURCE_CATALOG } from '../src/core/itemSourceCatalog'
import { CITIZEN_STATUS_DEFINITIONS } from '../src/core/status'
import { STATUS_CODEX_ENTRIES, codexStatusEntry, filterCodexStatuses } from '../src/core/statusCodex'


describe('item codex',()=>{
  it('combines the complete 383-entry MyHordes source catalogue with supplemental Live2Nite runtime variants',()=>{
    expect(CODEX_SOURCE_ITEM_COUNT).toBe(383)
    expect(ITEM_SOURCE_CATALOG).toHaveLength(383)
    const sourceEntries=CODEX_ITEM_ENTRIES.filter((entry)=>entry.sourceCatalog)
    expect(sourceEntries).toHaveLength(383)
    expect(CODEX_ITEM_ENTRIES).toHaveLength(CODEX_SOURCE_ITEM_COUNT+CODEX_SUPPLEMENTAL_ITEM_COUNT)
    expect(new Set(sourceEntries.map((entry)=>entry.id)).size).toBe(383)
    for(const type of ITEM_TYPE_IDS)expect(CODEX_ITEM_ENTRIES.some((entry)=>entry.type===type),type).toBe(true)
    for(const entry of CODEX_ITEM_ENTRIES.filter((candidate)=>!candidate.sourceCatalog&&candidate.type)){
      expect(entry.name).toBe(ITEMS[entry.type!].name)
      expect(entry.purpose).toBe(ITEMS[entry.type!].purpose)
    }
  })

  it('keeps category counts derived instead of hard-coded',()=>{
    expect(codexCategoryCount('all')).toBe(CODEX_ITEM_ENTRIES.length)
    for(const category of CODEX_ITEM_CATEGORIES.filter((entry)=>entry.id!=='all')){
      expect(codexCategoryCount(category.id)).toBe(CODEX_ITEM_ENTRIES.filter((entry)=>entry.category===category.id).length)
    }
  })

  it('filters by category and free-text item information including relationships',()=>{
    const armoury=filterCodexItems('armoury','')
    expect(armoury.length).toBeGreaterThan(0)
    expect(armoury.every((entry)=>entry.category==='armoury')).toBe(true)
    expect(filterCodexItems('all','water bomb').map((entry)=>entry.type)).toContain('water_bomb')
    expect(filterCodexItems('all','myhordes').length).toBeGreaterThan(0)
    expect(filterCodexItems('all','defensive wall').map((entry)=>entry.type)).toContain('twisted_plank')
    const marshmallows=filterCodexItems('all','dried marshmallows')
    expect(marshmallows.some((entry)=>entry.name==='Dried Marshmallows'&&entry.implementation==='wip'&&entry.type===null)).toBe(true)
    expect(filterCodexItems('all','WIP').some((entry)=>entry.implementation==='wip')).toBe(true)
  })

  it('derives structured combat and openable facts from gameplay systems',()=>{
    const bomb=codexItemEntry('water_bomb')
    expect(bomb.facts.some((fact)=>fact.label==='Combat'&&fact.value.includes('2–4'))).toBe(true)
    const toolbox=codexItemEntry('toolbox')
    expect(toolbox.facts.some((fact)=>fact.label==='Open with')).toBe(true)
    expect(toolbox.facts.some((fact)=>fact.label==='Possible contents'&&fact.value.includes('Pharmaceutical Products'))).toBe(true)
  })

  it('reverse-indexes downstream uses by category',()=>{
    const plank=codexItemEntry('twisted_plank')
    expect(plank.usedIn.find((group)=>group.id==='constructions')?.entries.some((entry)=>entry.label==='Defensive Wall')).toBe(true)
    expect(plank.usedIn.find((group)=>group.id==='workshop')?.entries.some((entry)=>entry.label.includes('Patchwork Beam'))).toBe(true)
    expect(plank.usedIn.find((group)=>group.id==='combinations')?.entries.some((entry)=>entry.label==='Assemble Repair Kit')).toBe(true)
    const knife=codexItemEntry('serrated_knife')
    expect(knife.usedIn.find((group)=>group.id==='opening')?.entries.some((entry)=>entry.label==='Open Toolbox')).toBe(true)
  })

  it('derives generalized condition item actions from the real effect definitions',()=>{
    const steroids=codexItemEntry('anabolic_steroids')
    expect(steroids.facts.some((fact)=>fact.label.includes('Take Anabolic Steroids')&&fact.value.toLowerCase().includes('addiction'))).toBe(true)
    const paracetoid=codexItemEntry('paracetoid')
    expect(paracetoid.facts.some((fact)=>fact.value.includes('remove infected')&&fact.value.includes('apply immune'))).toBe(true)
    const valium=codexItemEntry('valium_shot')
    expect(valium.facts.some((fact)=>fact.value.includes('remove terrorized'))).toBe(true)
    expect(filterCodexItems('all','addiction').map((entry)=>entry.type)).toContain('anabolic_steroids')
  })

  it('derives active acquisition sources and rarity from runtime pools',()=>{
    const log=codexItemEntry('rotten_log')
    expect(log.obtainedFrom.find((group)=>group.id==='scavenging')?.entries.some((entry)=>entry.label==='Depleted zones'&&entry.detail.includes('62.5%'))).toBe(true)
    const pharma=codexItemEntry('pharmaceutical_products')
    expect(pharma.obtainedFrom.find((group)=>group.id==='containers')?.entries.some((entry)=>entry.label==='Toolbox'&&entry.detail.includes('25.3%'))).toBe(true)
    const staff=codexItemEntry('staff')
    expect(staff.obtainedFrom.find((group)=>group.id==='special-locations')?.entries.some((entry)=>entry.label==='Dark Woods'&&entry.badge==='Unique location')).toBe(true)
    const food=codexItemEntry('food')
    expect(food.obtainedFrom.find((group)=>group.id==='constructions')?.entries.some((entry)=>entry.label==='Vegetable Plot')??false).toBe(false)
  })
})


describe('status effects codex',()=>{
  it('is generated from the complete runtime condition definition set',()=>{
    expect(STATUS_CODEX_ENTRIES.map((entry)=>entry.id)).toEqual(Object.keys(CITIZEN_STATUS_DEFINITIONS))
  })

  it('reverse-indexes real world and item wound sources plus treatment',()=>{
    const wounded=codexStatusEntry('wounded')
    expect(wounded.obtainedFrom.find((group)=>group.id==='world-actions')?.entries.some((entry)=>entry.label==='Flee from Zombies')).toBe(true)
    expect(wounded.obtainedFrom.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='EMS System (charged)')).toBe(true)
    expect(wounded.clearedBy.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='Bandage')).toBe(true)
    expect(wounded.variants).toHaveLength(6)
    expect(wounded.variants.find((variant)=>variant.id==='arms')?.active).toBe(true)
    expect(wounded.variants.find((variant)=>variant.id==='eye')?.active).toBe(false)
  })

  it('derives condition treatment and progression without inventing inactive acquisition routes',()=>{
    const infected=codexStatusEntry('infected')
    expect(infected.obtainedFrom.find((group)=>group.id==='system')?.entries.some((entry)=>entry.label.includes('Untreated wound'))).toBe(true)
    expect(infected.clearedBy.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='Paracetoid 7g')).toBe(true)
    const terror=codexStatusEntry('terrorized')
    expect(terror.obtainedFrom).toHaveLength(0)
    expect(terror.clearedBy.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='Valium Shot')).toBe(true)
  })

  it('searches status sources, treatments, effects, and progression',()=>{
    expect(filterCodexStatuses('EMS').map((entry)=>entry.id)).toContain('wounded')
    expect(filterCodexStatuses('withdrawal').map((entry)=>entry.id)).toContain('addicted')
    expect(filterCodexStatuses('Paracetoid').map((entry)=>entry.id)).toContain('infected')
  })
})
