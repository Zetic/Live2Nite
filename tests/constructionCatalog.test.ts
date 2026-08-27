import { describe, expect, it } from 'vitest'
import { CONSTRUCTION_BRANCHES, CONSTRUCTION_CATALOG, CONSTRUCTION_CATALOG_ORDER, constructionCatalogTreeRows } from '../src/core/constructionCatalog'
import { CONSTRUCTION_CODEX_ENTRIES, GENERIC_BLUEPRINT_CLASSES, SPECIALIZED_RUIN_BLUEPRINTS, filterSpecializedRuinBlueprints } from '../src/core/constructionCodex'
import { CONSTRUCTION_ORDER, CONSTRUCTIONS, blueprintEligibleProjects, constructionBlueprintTier, constructionImplementationStatus, constructionPlayable, constructionUnlocked } from '../src/core/construction'
import { EXPLORABLE_BLUEPRINT_POOLS } from '../src/core/explorableBlueprints'
import { createInitialGame } from '../src/core/game'
import { migrateStoredGame } from '../src/persistence/IndexedDbGameRepository'

describe('complete current construction catalog',()=>{
  it('accounts for all 166 current constructions exactly once using Live2Nite identities',()=>{
    expect(CONSTRUCTION_CATALOG_ORDER).toHaveLength(166);expect(CONSTRUCTION_ORDER).toHaveLength(166);expect(CONSTRUCTION_CODEX_ENTRIES).toHaveLength(166)
    expect(new Set(CONSTRUCTION_CATALOG_ORDER).size).toBe(166);expect(new Set(CONSTRUCTION_CODEX_ENTRIES.map((entry)=>entry.name)).size).toBe(166);expect(CONSTRUCTION_CATALOG_ORDER).not.toContain('improved_drill')
  })
  it('preserves the current seven source branches and blueprint-class counts',()=>{
    expect(CONSTRUCTION_BRANCHES.map((branch)=>branch.label)).toEqual(['Defensive Wall','Pump','Portal Lock','Workshop','Foundations','Watchtower','Soul Purifying Source'])
    expect(Object.fromEntries(CONSTRUCTION_BRANCHES.map((branch)=>[branch.label,CONSTRUCTION_CATALOG_ORDER.filter((id)=>CONSTRUCTION_CATALOG[id].branchId===branch.id).length]))).toEqual({'Defensive Wall':37,Pump:33,'Portal Lock':7,Workshop:20,Foundations:28,Watchtower:25,'Soul Purifying Source':16})
    expect(Object.fromEntries([0,1,2,3,4,5,6].map((value)=>[value,CONSTRUCTION_CATALOG_ORDER.filter((id)=>CONSTRUCTION_CATALOG[id].blueprintClass===value).length]))).toEqual({0:53,1:41,2:17,3:35,4:13,5:1,6:6})
  })
  it('renders each source branch in true parent-first tree order',()=>{
    const pumpRows=constructionCatalogTreeRows(CONSTRUCTION_CATALOG_ORDER,'pump');expect(pumpRows[0]).toMatchObject({id:'pump',depth:0,prefix:'◆ '})
    const index=new Map(pumpRows.map((row,i)=>[row.id,i]));for(const row of pumpRows){const parent=CONSTRUCTION_CATALOG[row.id].parentId;if(parent)expect(index.get(parent)).toBeLessThan(index.get(row.id)!)}
    expect(pumpRows.some((row)=>row.prefix.includes('├─')||row.prefix.includes('└─'))).toBe(true);const allRows=constructionCatalogTreeRows();expect(allRows).toHaveLength(166)
    for(const branch of CONSTRUCTION_BRANCHES)expect(allRows.find((row)=>CONSTRUCTION_CATALOG[row.id].branchId===branch.id&&CONSTRUCTION_CATALOG[row.id].parentId===null)?.depth).toBe(0)
  })
  it('tracks the implementation backlog explicitly',()=>{
    const counts={implemented:0,partial:0,wip:0};for(const id of CONSTRUCTION_CATALOG_ORDER)counts[CONSTRUCTION_CATALOG[id].implementation]+=1;expect(counts).toEqual({implemented:83,partial:25,wip:58})
    for(const id of ['scouts_lair','technicians_workbench','battlements','miniature_armory','pet_shop','scanner','upgraded_map','search_tower','water_purifier','water_filter','faucet','water_turrets','vegetable_plot','fertilizer','outer_world_apple_tree','central_cafeteria','garbage_dump','dump_upgrade','defence_dump','weapons_dump','food_dump','wood_dump','metal_dump','animal_dump','organized_dump','upgraded_catapult','small_trebuchet'] as const)expect(CONSTRUCTION_CATALOG[id].implementation).toBe('implemented')
    expect(CONSTRUCTION_CATALOG.catapult.implementation).toBe('partial');expect(CONSTRUCTION_CATALOG.grapeboom.implementation).toBe('partial');expect(CONSTRUCTION_CATALOG.observation_platform.implementation).toBe('partial');expect(CONSTRUCTION_CATALOG.henhouse.implementation).toBe('partial')
  })
  it('keeps every parent inside the same complete Live2Nite tree',()=>{
    const ids=new Set(CONSTRUCTION_CATALOG_ORDER);for(const id of CONSTRUCTION_CATALOG_ORDER){const entry=CONSTRUCTION_CATALOG[id];expect(CONSTRUCTIONS[id].id).toBe(id);expect(CONSTRUCTIONS[id].name).toBe(entry.name);expect(constructionBlueprintTier(id)).toBe(entry.blueprintClass);expect(Boolean(CONSTRUCTIONS[id].expiresAfterAttack)).toBe(entry.temporary);if(entry.parentId){expect(ids.has(entry.parentId)).toBe(true);expect(CONSTRUCTION_CATALOG[entry.parentId].branchId).toBe(entry.branchId);expect(CONSTRUCTIONS[id].parentId).toBe(entry.parentId)}else expect(CONSTRUCTIONS[id].parentId).toBeUndefined()}
  })
  it('uses implementation status as a build gate rather than as a discovery gate',()=>{
    const game=createInitialGame(8801,2);expect(game.town.construction.sanctuary.discovered).toBe(true);expect(constructionImplementationStatus('sanctuary')).toBe('wip');expect(constructionPlayable('sanctuary')).toBe(false);expect(constructionUnlocked(game,'sanctuary')).toBe(false)
    for(const id of ['defensive_supports','scouts_lair','central_laboratory','central_cafeteria','garbage_dump','dump_upgrade','organized_dump','upgraded_catapult','small_trebuchet','pet_shop'] as const){expect(constructionImplementationStatus(id)).toBe('implemented');expect(constructionPlayable(id)).toBe(true)}
    for(const id of ['observation_platform','catapult'] as const){expect(constructionImplementationStatus(id)).toBe('partial');expect(constructionPlayable(id)).toBe(true)}
  })
  it('includes WIP projects in generic blueprint candidate pools while excluding special classes',()=>{
    const game=createInitialGame(8802,2);expect(blueprintEligibleProjects(game,1).some((id)=>constructionImplementationStatus(id)==='wip')).toBe(true)
    for(const tier of GENERIC_BLUEPRINT_CLASSES)expect(blueprintEligibleProjects(game,tier).every((id)=>constructionBlueprintTier(id)===tier)).toBe(true)
    expect(GENERIC_BLUEPRINT_CLASSES.flatMap((tier)=>blueprintEligibleProjects(game,tier)).some((id)=>constructionBlueprintTier(id)>=5)).toBe(false)
  })
  it('represents all nine specialized explorable-ruin blueprints as active source-weighted pools',()=>{
    expect(SPECIALIZED_RUIN_BLUEPRINTS).toHaveLength(9);expect(new Set(SPECIALIZED_RUIN_BLUEPRINTS.map((entry)=>entry.id)).size).toBe(9);expect(SPECIALIZED_RUIN_BLUEPRINTS.every((entry)=>entry.implementation==='implemented')).toBe(true)
    expect(Object.fromEntries(['hotel','bunker','hospital'].map((family)=>[family,SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>entry.family===family).length]))).toEqual({hotel:3,bunker:3,hospital:3});expect(Object.fromEntries([2,3,4].map((rarity)=>[rarity,SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>entry.rarity===rarity).length]))).toEqual({2:3,3:3,4:3})
    expect(SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>entry.tier==='uncommon').every((entry)=>entry.sourceWeight===800)).toBe(true);expect(SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>entry.tier==='rare').every((entry)=>entry.sourceWeight===400)).toBe(true);expect(SPECIALIZED_RUIN_BLUEPRINTS.filter((entry)=>entry.tier==='exceptional').every((entry)=>entry.sourceWeight===200&&entry.rarityLabel==='Exceptional')).toBe(true)
    for(const entry of SPECIALIZED_RUIN_BLUEPRINTS)expect(entry.poolSize).toBe(EXPLORABLE_BLUEPRINT_POOLS[`${entry.family}_${entry.tier}`].length);expect(filterSpecializedRuinBlueprints('hotel')).toHaveLength(3);expect(filterSpecializedRuinBlueprints('exceptional')).toHaveLength(3)
  })
  it('normalizes schema-19 saves onto the complete catalog and drops the obsolete prototype-only drill',()=>{
    const game=createInitialGame(8803,1);const legacy={...game,town:{...game.town,construction:{...game.town.construction,wall_upgrade:{...game.town.construction.wall_upgrade,completed:true,apContributed:25,hp:25},improved_drill:{id:'improved_drill',discovered:true,apContributed:90,completed:true,hp:90}}}} as unknown as Record<string,unknown>;const migrated=migrateStoredGame(legacy);expect(migrated).not.toBeNull();expect(Object.keys(migrated!.town.construction)).toHaveLength(166);expect('improved_drill' in migrated!.town.construction).toBe(false);expect('hp' in migrated!.town.construction.wall_upgrade).toBe(false)
  })
  it('stores source costs for Codex reference even when a WIP project is not buildable',()=>{
    const shredder=CONSTRUCTION_CATALOG.shredder_wall;expect(shredder.implementation).toBe('wip');expect(shredder.apCost).toBe(40);expect(shredder.resources).toEqual(expect.arrayContaining([{name:'Wrought Iron',amount:15},{name:'Handful of nuts and bolts',amount:2}]));expect(CONSTRUCTIONS.shredder_wall.playable).toBe(false);expect(CONSTRUCTIONS.shredder_wall.effects).toEqual([]);expect(CONSTRUCTIONS.hammam.playable).toBe(false);expect(CONSTRUCTIONS.hammam.effects).toEqual([])
  })
})
