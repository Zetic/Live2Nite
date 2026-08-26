import { describe, expect, it } from 'vitest'
import { CODEX_ITEM_CATEGORIES, CODEX_ITEM_ENTRIES, CODEX_ITEM_FAMILY_COUNT, CODEX_SOURCE_ITEM_COUNT, codexCategoryCount, codexItemEntry, filterCodexItems } from '../src/core/codex'
import { ITEM_TYPE_IDS } from '../src/core/itemCatalog'
import { ITEM_CODEX_FAMILIES, ITEM_CODEX_SOURCE_STATE_COUNT } from '../src/core/itemCodexFamilies'
import { ITEM_SOURCE_CATALOG } from '../src/core/itemSourceCatalog'
import { CITIZEN_STATUS_DEFINITIONS } from '../src/core/status'
import { STATUS_CODEX_ENTRIES, codexStatusEntry, filterCodexStatuses } from '../src/core/statusCodex'

describe('item codex',()=>{
  it('keeps all 383 source states while collapsing them into conceptual item families',()=>{
    expect(CODEX_SOURCE_ITEM_COUNT).toBe(383)
    expect(ITEM_CODEX_SOURCE_STATE_COUNT).toBe(383)
    expect(ITEM_SOURCE_CATALOG).toHaveLength(383)
    expect(CODEX_ITEM_FAMILY_COUNT).toBe(CODEX_ITEM_ENTRIES.length)
    expect(CODEX_ITEM_FAMILY_COUNT).toBeLessThan(383)
    expect(new Set(CODEX_ITEM_ENTRIES.map((entry)=>entry.id)).size).toBe(CODEX_ITEM_ENTRIES.length)
    const representedSourceStates=CODEX_ITEM_ENTRIES.flatMap((entry)=>entry.states.filter((state)=>state.sourceCatalog))
    expect(representedSourceStates).toHaveLength(383)
    for(const type of ITEM_TYPE_IDS)expect(CODEX_ITEM_ENTRIES.some((entry)=>entry.runtimeTypes.includes(type)),type).toBe(true)
  })

  it('groups physical state variants into one list entry',()=>{
    const waterPistol=codexItemEntry('water_pistol')
    expect(CODEX_ITEM_ENTRIES.filter((entry)=>entry.runtimeTypes.includes('water_pistol'))).toHaveLength(1)
    expect(waterPistol.states.map((state)=>state.name)).toEqual(expect.arrayContaining(['Water Pistol (empty)','Water Pistol (1 shot)','Water Pistol (2 shots)','Water Pistol (3 shots)']))

    const can=codexItemEntry('can')
    expect(can.runtimeTypes).toEqual(expect.arrayContaining(['can','open_can']))
    expect(can.states.map((state)=>state.name)).toEqual(expect.arrayContaining(['Can','Open Can']))

    const repairKit=codexItemEntry('repair_kit')
    expect(repairKit.states.some((state)=>state.name==='Repair Kit (damaged)')).toBe(true)
  })

  it('uses player-facing categories instead of leaking raw source categories into tabs',()=>{
    expect(codexItemEntry('doggy_bag').category).toBe('containers')
    expect(codexItemEntry('food_box').category).toBe('containers')
    expect(codexItemEntry('can').category).toBe('containers')
    expect(codexItemEntry('bag_of_cement').category).toBe('resources')
    expect(codexItemEntry('chicken').category).toBe('creatures')
    expect(codexItemEntry('common_blueprint').category).toBe('blueprints')
    expect(filterCodexItems('documents','dusty book').some((entry)=>entry.name==='Dusty Book')).toBe(true)
    expect(filterCodexItems('food','').some((entry)=>entry.name==='Doggy Bag')).toBe(false)
    expect(filterCodexItems('containers','').filter((entry)=>entry.name==='Doggy Bag')).toHaveLength(1)
  })

  it('keeps category counts derived instead of hard-coded',()=>{
    expect(codexCategoryCount('all')).toBe(CODEX_ITEM_ENTRIES.length)
    expect(CODEX_ITEM_CATEGORIES.some((entry)=>entry.id==='creatures'&&entry.label==='Creatures')).toBe(true)
    for(const category of CODEX_ITEM_CATEGORIES.filter((entry)=>entry.id!=='all'))expect(codexCategoryCount(category.id)).toBe(CODEX_ITEM_ENTRIES.filter((entry)=>entry.category===category.id).length)
  })

  it('filters by family, state, category and free-text relationships',()=>{
    expect(filterCodexItems('armoury','').every((entry)=>entry.category==='armoury')).toBe(true)
    expect(filterCodexItems('all','water pistol (2 shots)').map((entry)=>entry.type)).toContain('water_pistol')
    expect(filterCodexItems('all','myhordes').length).toBeGreaterThan(0)
    expect(filterCodexItems('all','defensive wall').map((entry)=>entry.type)).toContain('twisted_plank')
    const marshmallows=filterCodexItems('all','dried marshmallows')
    expect(marshmallows.some((entry)=>entry.name==='Dried Marshmallows'&&entry.runtimeTypes.includes('dried_marshmallows'))).toBe(true)
    expect(filterCodexItems('all','WIP').some((entry)=>entry.states.some((state)=>state.implementation==='wip'))).toBe(true)
  })

  it('shows complete construction and combination ingredient context',()=>{
    const plank=codexItemEntry('twisted_plank')
    const wall=plank.usedIn.find((group)=>group.id==='constructions')?.entries.find((entry)=>entry.label==='Defensive Wall')
    expect(wall?.detail).toContain('Twisted Plank')
    expect(wall?.detail).toContain('Wrought Iron')
    expect(wall?.detail).toContain('AP')

    const repair=plank.usedIn.find((group)=>group.id==='combinations')?.entries.find((entry)=>entry.label==='Assemble Repair Kit')
    expect(repair?.detail).toContain('Tool Bag')
    expect(repair?.detail).toContain('Duct Tape')
    expect(repair?.detail).toContain('Handful of Nuts and Bolts')
    expect(repair?.detail).toContain('Twisted Plank')
    expect(repair?.detail).toContain('→ Repair Kit')

    const telescope=codexItemEntry('telescope')
    const telescopeRecipe=telescope.obtainedFrom.find((group)=>group.id==='combinations')?.entries.find((entry)=>entry.label==='Assemble Telescope')
    expect(telescopeRecipe?.detail).toContain('Copper Pipe')
    expect(telescopeRecipe?.detail).toContain('Convex Lens')
    expect(telescopeRecipe?.detail).toContain('→ Telescope')
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
    const twinoid=codexItemEntry('twinoid_500mg')
    expect(twinoid.facts.some((fact)=>fact.label.includes('Take Twinoid 500mg')&&fact.value.includes('restore AP toward 8'))).toBe(true)
    const hydratone=codexItemEntry('hydratone_100mg')
    expect(hydratone.facts.some((fact)=>fact.value.includes('Thirsty/Dehydrated'))).toBe(true)
    const randomDrug=codexItemEntry('unlabelled_drug')
    expect(randomDrug.facts.some((fact)=>fact.value.includes('random weighted outcome'))).toBe(true)
    expect(filterCodexItems('all','addiction').flatMap((entry)=>entry.runtimeTypes)).toContain('anabolic_steroids')
  })

  it('derives active acquisition sources and rarity from runtime pools',()=>{
    const log=codexItemEntry('rotten_log')
    expect(log.obtainedFrom.find((group)=>group.id==='scavenging')?.entries.some((entry)=>entry.label==='Depleted zones'&&entry.detail.includes('62.5%'))).toBe(true)
    const pharma=codexItemEntry('pharmaceutical_products')
    expect(pharma.obtainedFrom.find((group)=>group.id==='containers')?.entries.some((entry)=>entry.label==='Toolbox'&&entry.detail.includes('25.3%'))).toBe(true)
    const water=codexItemEntry('water_ration')
    expect(water.obtainedFrom.find((group)=>group.id==='special-locations')?.entries.some((entry)=>entry.label==='Abandoned Well')).toBe(true)
  })

  it('keeps the family index deterministic and complete',()=>{
    expect(ITEM_CODEX_FAMILIES.map((family)=>family.id)).toEqual([...ITEM_CODEX_FAMILIES].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).map((family)=>family.id))
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
    expect(terror.obtainedFrom.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='Unlabelled Drug')).toBe(true)
    expect(terror.clearedBy.find((group)=>group.id==='items')?.entries.some((entry)=>entry.label==='Valium Shot')).toBe(true)
  })

  it('searches status sources, treatments, effects, and progression',()=>{
    expect(filterCodexStatuses('EMS').map((entry)=>entry.id)).toContain('wounded')
    expect(filterCodexStatuses('withdrawal').map((entry)=>entry.id)).toContain('addicted')
    expect(filterCodexStatuses('Paracetoid').map((entry)=>entry.id)).toContain('infected')
  })
})