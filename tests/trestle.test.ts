import { describe, expect, it } from 'vitest'
import { campingAction } from '../src/agents/actions/SurvivalActions'
import { getLegalActions } from '../src/core/actions'
import { CAMP_IMPROVEMENT_MAX_LEVEL, TRESTLE_CAMP_IMPROVEMENT_POINTS, campImproveCommandItemId, campImprovementLevel, campingChanceBreakdown } from '../src/core/camping'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS, constructionUnlocked, hasRequiredMaterials, missingMaterials } from '../src/core/construction'
import { garbageDumpCategory } from '../src/core/garbageDump'
import { createInitialGame } from '../src/core/game'
import { isCumbersomeItemType } from '../src/core/inventory'
import { CURRENT_ITEM_SOURCE_CATALOG_BY_REF, currentItemSourceCatalogStatusCounts } from '../src/core/itemSourceCurrent'
import { bankDefenseFor, createItemInstance, homeDefenseFor } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'
import { nightWatchDefenseForCitizen, nightWatchEquipment, resolveNightWatch, setNightWatchEnrollment } from '../src/core/nightWatch'
import { playableRuinSourceDrops } from '../src/core/ruinLoot'
import type { GameState, ItemType } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function discoveredOrganizedDump(game:GameState):GameState{
  return{...game,town:{...game.town,construction:{...game.town.construction,
    garbage_dump:{...game.town.construction.garbage_dump,discovered:true,completed:true},
    organized_dump:{...game.town.construction.organized_dump,discovered:true},
  }}}
}
function bankWith(game:GameState,types:ItemType[]):GameState{
  return{...game,town:{...game.town,bank:types.map((type,index)=>createItemInstance(`trestle-cost-${index}`,type))}}
}
function repeat(type:ItemType,count:number):ItemType[]{return Array.from({length:count},()=>type)}
function outsideWithTrestle(game:GameState,level?:number):GameState{
  const key=zoneKey(6,0);const zone=game.world.zones[key]
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,discovered:true,zombies:0,specialSite:undefined,campImprovements:level===undefined?0:Math.floor(level/5),...(level===undefined?{}:{campImprovementLevel:level})}}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x:6,y:0},inventory:[createItemInstance('trestle-field','trestle')]}:citizen)}
}
function withWatch(game:GameState,swedish=false):GameState{
  const construction={...game.town.construction,
    watchtower:{...game.town.construction.watchtower,discovered:true,completed:true},
    battlements:{...game.town.construction.battlements,discovered:true,completed:true},
    miniature_armory:{...game.town.construction.miniature_armory,discovered:true,completed:true},
    ...(swedish?{swedish_workshop:{...game.town.construction.swedish_workshop,discovered:true,completed:true}}:{}),
  }
  return{...game,town:{...game.town,construction},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('trestle-watch','trestle')]}:citizen)}
}

describe('complete Trestle source behavior',()=>{
  it('projects the pinned Trestle row into an implemented current runtime identity',()=>{
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('trestle_#00')).toMatchObject({
      id:'trestle',name:'Trestle',runtimeType:'trestle',implementation:'implemented',heavy:true,decoration:1,watchPoints:15,
    })
    expect(currentItemSourceCatalogStatusCounts()).toEqual({implemented:104,partial:22,wip:257})
  })

  it('implements its defensive furniture and cumbersome behavior',()=>{
    expect(isCumbersomeItemType('trestle')).toBe(true)
    expect(bankDefenseFor('trestle')).toBe(1)
    expect(homeDefenseFor('trestle')).toBe(1)
    expect(garbageDumpCategory(createItemInstance('trestle-dump','trestle'))).toBe('defense')
  })

  it('installs outside for 1 AP, consumes the exact Trestle, and adds the source +9 permanent improvement',()=>{
    let game=outsideWithTrestle(createInitialGame(9806,1))
    const legal=getLegalActions(game,'c01').filter((action)=>action.type==='IMPROVE_CAMP')
    expect(legal.some((action)=>campImproveCommandItemId(action)===null)).toBe(true)
    const install=legal.find((action)=>campImproveCommandItemId(action)==='trestle-field')
    expect(install).toBeTruthy()
    const beforeAp=game.citizens[0].ap
    const result=executeCommand(game,install!)
    game=result.state
    expect(game.citizens[0].ap).toBe(beforeAp-1)
    expect(game.citizens[0].inventory.some((item)=>item.id==='trestle-field')).toBe(false)
    expect(campImprovementLevel(game.world.zones[zoneKey(6,0)])).toBe(TRESTLE_CAMP_IMPROVEMENT_POINTS)
    expect(campingChanceBreakdown(game,'c01').zone).toBe(TRESTLE_CAMP_IMPROVEMENT_POINTS)
    expect(result.events.find((event)=>event.type==='CAMP_IMPROVED')).toMatchObject({amount:1,improvementPoints:9})
  })

  it('preserves legacy +5-step camps, supports exact mixed values, and clamps improvement at 50',()=>{
    let legacy=outsideWithTrestle(createInitialGame(9807,1))
    const key=zoneKey(6,0)
    legacy={...legacy,world:{...legacy.world,zones:{...legacy.world.zones,[key]:{...legacy.world.zones[key],campImprovements:2,campImprovementLevel:undefined}}}}
    expect(campImprovementLevel(legacy.world.zones[key])).toBe(10)
    const install=getLegalActions(legacy,'c01').find((action)=>action.type==='IMPROVE_CAMP'&&campImproveCommandItemId(action)==='trestle-field')!
    legacy=executeCommand(legacy,install).state
    expect(campImprovementLevel(legacy.world.zones[key])).toBe(19)

    let capped=outsideWithTrestle(createInitialGame(9808,1),49)
    const cappedInstall=getLegalActions(capped,'c01').find((action)=>action.type==='IMPROVE_CAMP'&&campImproveCommandItemId(action)==='trestle-field')!
    capped=executeCommand(capped,cappedInstall).state
    expect(campImprovementLevel(capped.world.zones[key])).toBe(CAMP_IMPROVEMENT_MAX_LEVEL)
    expect(getLegalActions(capped,'c01').some((action)=>action.type==='IMPROVE_CAMP')).toBe(false)
  })

  it('contributes 15 IKEA-family Night Watch defense and is destroyed when the Watch uses it',()=>{
    let game=withWatch(createInitialGame(9809,1))
    const citizen=game.citizens[0]
    expect(nightWatchEquipment(game,citizen)).toEqual([expect.objectContaining({itemId:'trestle-watch',baseDefense:15,defense:15,family:'ikea'})])
    expect(nightWatchDefenseForCitizen(game,citizen)).toBe(25)
    game=setNightWatchEnrollment(game,'c01',true)
    const resolved=resolveNightWatch(game,1)
    expect(resolved.report.defense).toBe(25)
    expect(resolved.report.outcomes.find((outcome)=>outcome.citizenId==='c01')?.usedItemIds).toContain('trestle-watch')
    expect(resolved.state.citizens[0].inventory.some((item)=>item.id==='trestle-watch')).toBe(false)
  })

  it('receives the Swedish Carpentry IKEA-family Night Watch multiplier',()=>{
    const game=withWatch(createInitialGame(9811,1),true)
    expect(nightWatchEquipment(game,game.citizens[0])[0]).toMatchObject({baseDefense:15,defense:19,family:'ikea'})
    expect(nightWatchDefenseForCitizen(game,game.citizens[0])).toBe(29)
  })

  it('keeps the source normal-search identity mapped without bypassing the remaining normal-table gate',()=>{
    expect(MYHORDES_NORMAL_LOOT_MAPPING['trestle_#00']).toEqual({type:'trestle'})
    expect(unmappedOrdinarySourceLootIds()).not.toContain('trestle_#00')
  })

  it('activates Trestle at its exact source ruin weights',()=>{
    const expected:Record<string,number>={
      home_depot:8,
      construction_site_shelter:10,
      pi_keya_furniture:10,
      disused_car_park:8,
      abandoned_construction_site:15,
      blocked_road:5,
    }
    for(const [ruin,weight] of Object.entries(expected)){
      const drop=playableRuinSourceDrops(ruin as Parameters<typeof playableRuinSourceDrops>[0]).find((entry)=>entry.runtimeType==='trestle')
      expect(drop,ruin).toMatchObject({sourceRef:'trestle_#00',weight,runtimeType:'trestle'})
    }
  })

  it('makes the full two-Trestle Organized Dump bill satisfiable through ordinary construction rules',()=>{
    expect(CONSTRUCTIONS.organized_dump.apCost).toBe(20)
    expect(CONSTRUCTIONS.organized_dump.resources).toEqual({
      nuts_and_bolts:2,
      unshaped_concrete_block:1,
      patchwork_beam:5,
      metal_support:10,
      trestle:2,
    })
    let game=discoveredOrganizedDump(createInitialGame(9810,1))
    expect(constructionUnlocked(game,'organized_dump')).toBe(true)
    game=bankWith(game,[
      ...repeat('nuts_and_bolts',2),
      'unshaped_concrete_block',
      ...repeat('patchwork_beam',5),
      ...repeat('metal_support',10),
      'trestle',
    ])
    expect(hasRequiredMaterials(game,'organized_dump')).toBe(false)
    expect(missingMaterials(game,'organized_dump')).toEqual({trestle:1})
    game=bankWith(game,[...game.town.bank.map((item)=>item.type),'trestle'])
    expect(hasRequiredMaterials(game,'organized_dump')).toBe(true)
    expect(missingMaterials(game,'organized_dump')).toEqual({})
  })

  it('lets bots use a spare Trestle for an emergency camp but preserves it while Organized Dump still needs one',()=>{
    let needed=outsideWithTrestle(discoveredOrganizedDump(createInitialGame(9812,1)))
    needed={...needed,citizens:needed.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:1}:citizen)}
    const neededActions=getLegalActions(needed,'c01')
    expect(campingAction(needed,needed.citizens[0],neededActions)?.type).not.toBe('IMPROVE_CAMP')

    const spare={...needed,town:{...needed.town,construction:{...needed.town.construction,organized_dump:{...needed.town.construction.organized_dump,completed:true}}}}
    const spareActions=getLegalActions(spare,'c01')
    const choice=campingAction(spare,spare.citizens[0],spareActions)
    expect(choice?.type).toBe('IMPROVE_CAMP')
    expect(choice&&campImproveCommandItemId(choice)).toBe('trestle-field')
  })
})