import { describe, expect, it } from 'vitest'
import { CONSTRUCTIONS, completionWaterBonus } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { resolveNightAttack } from '../src/core/night'
import type { ConstructionId, GameState } from '../src/core/types'

function complete(state:GameState,...ids:ConstructionId[]):GameState{
  const construction={...state.town.construction}
  for(const id of ids)construction[id]={...construction[id],discovered:true,completed:true}
  return{...state,town:{...state.town,construction}}
}

describe('simple Well additions',()=>{
  it('keeps every implemented add-water construction on its source-backed completion amount',()=>{
    expect(Object.fromEntries(([
      ['pump',15],
      ['drilling_rig',50],
      ['hydraulic_network',5],
      ['eden_project',50],
      ['water_detector',100],
      ['derrick',75],
      ['water_catcher',2],
      ['divining_rocket',60],
    ] as const).map(([id])=>[id,completionWaterBonus(id)]))).toEqual({
      pump:15,
      drilling_rig:50,
      hydraulic_network:5,
      eden_project:50,
      water_detector:100,
      derrick:75,
      water_catcher:2,
      divining_rocket:60,
    })
  })

  it('keeps Water Catcher rebuildable after each attack',()=>{
    expect(CONSTRUCTIONS.water_catcher.expiresAfterAttack).toBe(true)
  })
})

describe('nightly water pipeline',()=>{
  it('funds upgraded Water Turrets, records consumption, and debits the Well through night resolution',()=>{
    let state=createInitialGame(9112,1)
    state=complete(state,'water_turrets')
    state={...state,town:{...state.town,gateOpen:false,well:{water:2},upgradeProjects:{...state.town.upgradeProjects,levels:{...state.town.upgradeProjects.levels,water_turrets:1}}}}
    const after=resolveNightAttack(state)
    expect(after.town.well.water).toBe(0)
    expect(after.lastNight?.waterConsumed).toBe(2)
    expect(after.lastNight?.waterConsumers).toEqual(expect.arrayContaining([expect.objectContaining({projectId:'water_turrets',required:2,active:true})]))
    expect(after.events.some((event)=>event.type==='WELL_WATER_CONSUMED'&&event.amount===2)).toBe(true)
  })
})
