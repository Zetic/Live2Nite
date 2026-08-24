import { describe, expect, it } from 'vitest'
import { CONSTRUCTION_BRANCHES, CONSTRUCTION_CATALOG, CONSTRUCTION_CATALOG_ORDER } from '../src/core/constructionCatalog'
import { CONSTRUCTION_CODEX_ENTRIES, GENERIC_BLUEPRINT_CLASSES } from '../src/core/constructionCodex'
import { CONSTRUCTION_ORDER, CONSTRUCTIONS, blueprintEligibleProjects, constructionBlueprintTier, constructionImplementationStatus, constructionPlayable, constructionUnlocked } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'

describe('complete current construction catalog',()=>{
  it('accounts for all 166 current constructions exactly once using Live2Nite identities',()=>{
    expect(CONSTRUCTION_CATALOG_ORDER).toHaveLength(166)
    expect(CONSTRUCTION_ORDER).toHaveLength(166)
    expect(CONSTRUCTION_CODEX_ENTRIES).toHaveLength(166)
    expect(new Set(CONSTRUCTION_CATALOG_ORDER).size).toBe(166)
    expect(new Set(CONSTRUCTION_CODEX_ENTRIES.map((entry)=>entry.name)).size).toBe(166)
    expect(CONSTRUCTION_CATALOG_ORDER).not.toContain('improved_drill')
  })

  it('preserves the current seven source branches and blueprint-class counts',()=>{
    expect(CONSTRUCTION_BRANCHES.map((branch)=>branch.label)).toEqual([
      'Defensive Wall','Pump','Portal Lock','Workshop','Foundations','Watchtower','Soul Purifying Source',
    ])
    const branchCounts=Object.fromEntries(CONSTRUCTION_BRANCHES.map((branch)=>[
      branch.label,
      CONSTRUCTION_CATALOG_ORDER.filter((id)=>CONSTRUCTION_CATALOG[id].branchId===branch.id).length,
    ]))
    expect(branchCounts).toEqual({
      'Defensive Wall':37,
      Pump:33,
      'Portal Lock':7,
      Workshop:20,
      Foundations:28,
      Watchtower:25,
      'Soul Purifying Source':16,
    })
    const rarityCounts=Object.fromEntries([0,1,2,3,4,5,6].map((value)=>[
      value,
      CONSTRUCTION_CATALOG_ORDER.filter((id)=>CONSTRUCTION_CATALOG[id].blueprintClass===value).length,
    ]))
    expect(rarityCounts).toEqual({0:53,1:41,2:17,3:35,4:13,5:1,6:6})
  })

  it('keeps every parent inside the same complete Live2Nite tree',()=>{
    const ids=new Set(CONSTRUCTION_CATALOG_ORDER)
    for(const id of CONSTRUCTION_CATALOG_ORDER){
      const entry=CONSTRUCTION_CATALOG[id]
      expect(CONSTRUCTIONS[id].id).toBe(id)
      expect(CONSTRUCTIONS[id].name).toBe(entry.name)
      expect(constructionBlueprintTier(id)).toBe(entry.blueprintClass)
      expect(CONSTRUCTIONS[id].maxHp).toBe(entry.maxHp)
      expect(CONSTRUCTIONS[id].breakable).toBe(entry.breakable)
      expect(Boolean(CONSTRUCTIONS[id].expiresAfterAttack)).toBe(entry.temporary)
      if(entry.parentId){
        expect(ids.has(entry.parentId)).toBe(true)
        expect(CONSTRUCTION_CATALOG[entry.parentId].branchId).toBe(entry.branchId)
        expect(CONSTRUCTIONS[id].parentId).toBe(entry.parentId)
      }else expect(CONSTRUCTIONS[id].parentId).toBeUndefined()
    }
  })

  it('uses implementation status as a build gate rather than as a discovery gate',()=>{
    const game=createInitialGame(8801,2)
    expect(game.town.construction.sanctuary.discovered).toBe(true)
    expect(constructionImplementationStatus('sanctuary')).toBe('wip')
    expect(constructionPlayable('sanctuary')).toBe(false)
    expect(constructionUnlocked(game,'sanctuary')).toBe(false)

    expect(constructionImplementationStatus('defensive_supports')).toBe('partial')
    expect(constructionPlayable('defensive_supports')).toBe(true)
  })

  it('includes WIP projects in generic blueprint candidate pools while excluding special classes',()=>{
    const game=createInitialGame(8802,2)
    const common=blueprintEligibleProjects(game,1)
    expect(common.some((id)=>constructionImplementationStatus(id)==='wip')).toBe(true)
    for(const tier of GENERIC_BLUEPRINT_CLASSES)expect(blueprintEligibleProjects(game,tier).every((id)=>constructionBlueprintTier(id)===tier)).toBe(true)
    expect([...blueprintEligibleProjects(game,1),...blueprintEligibleProjects(game,2),...blueprintEligibleProjects(game,3),...blueprintEligibleProjects(game,4)].some((id)=>constructionBlueprintTier(id)>=5)).toBe(false)
  })

  it('stores source costs for Codex reference even when a WIP project is not buildable',()=>{
    const shredder=CONSTRUCTION_CATALOG.shredder_wall
    expect(shredder.implementation).toBe('wip')
    expect(shredder.apCost).toBe(40)
    expect(shredder.resources).toEqual(expect.arrayContaining([
      {name:'Wrought Iron',amount:15},
      {name:'Handful of nuts and bolts',amount:2},
    ]))
    expect(CONSTRUCTIONS.shredder_wall.playable).toBe(false)
    expect(CONSTRUCTIONS.shredder_wall.effects).toEqual([])
  })
})
