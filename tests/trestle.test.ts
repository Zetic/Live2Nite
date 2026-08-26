import { describe, expect, it } from 'vitest'
import { CONSTRUCTIONS, constructionUnlocked, hasRequiredMaterials, missingMaterials } from '../src/core/construction'
import { garbageDumpCategory } from '../src/core/garbageDump'
import { createInitialGame } from '../src/core/game'
import { isCumbersomeItemType } from '../src/core/inventory'
import { CURRENT_ITEM_SOURCE_CATALOG_BY_REF, currentItemSourceCatalogStatusCounts } from '../src/core/itemSourceCurrent'
import { bankDefenseFor, createItemInstance, homeDefenseFor } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'
import { playableRuinSourceDrops } from '../src/core/ruinLoot'
import type { GameState, ItemType } from '../src/core/types'

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

describe('Trestle source dependency',()=>{
  it('projects the pinned Trestle row into a partial current runtime identity',()=>{
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('trestle_#00')).toMatchObject({
      id:'trestle',name:'Trestle',runtimeType:'trestle',implementation:'partial',heavy:true,decoration:1,watchPoints:15,
    })
    expect(currentItemSourceCatalogStatusCounts()).toEqual({implemented:101,partial:15,wip:267})
  })

  it('implements its basic defensive furniture and cumbersome behavior',()=>{
    expect(isCumbersomeItemType('trestle')).toBe(true)
    expect(bankDefenseFor('trestle')).toBe(1)
    expect(homeDefenseFor('trestle')).toBe(1)
    expect(garbageDumpCategory(createItemInstance('trestle-dump','trestle'))).toBe('defense')
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
})
