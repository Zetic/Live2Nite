import { describe, expect, it } from 'vitest'
import { campingChanceBreakdown } from '../src/core/camping'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function outside(game:GameState):GameState{
  const x=6,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  return{
    ...game,
    world:{...game.world,zones:{...game.world.zones,[key]:{...base,discovered:true,zombies:0,campImprovements:0}}},
    citizens:game.citizens.map((citizen)=>({...citizen,location:{type:'world' as const,x,y},inventory:[]})),
  }
}

describe('carried camping items',()=>{
  it('maps Groundsheet and Smelly Meat as ordinary runtime item identities',()=>{
    expect(createItemInstance('ground','groundsheet').type).toBe('groundsheet')
    expect(createItemInstance('meat','smelly_meat').type).toBe('smelly_meat')
  })

  it('adds +5 per carried source camping item and stacks both to +10',()=>{
    let game=outside(createInitialGame(160,1))
    const base=campingChanceBreakdown(game,'c01')
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,inventory:[createItemInstance('ground','groundsheet')]}))}
    expect(campingChanceBreakdown(game,'c01').campitems).toBe(5)
    expect(campingChanceBreakdown(game,'c01').raw).toBe(base.raw+5)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,inventory:[createItemInstance('ground','groundsheet'),createItemInstance('meat','smelly_meat')]}))}
    expect(campingChanceBreakdown(game,'c01').campitems).toBe(10)
    expect(campingChanceBreakdown(game,'c01').raw).toBe(base.raw+10)
  })
})
