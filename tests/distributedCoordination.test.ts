import { describe, expect, it } from 'vitest'
import { planTownCoordination } from '../src/agents/coordination/TownCoordination'
import { normalCandidates } from '../src/agents/planning/AssignmentPolicy'
import { knownOpportunities } from '../src/agents/planning/MissionOpportunities'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function withWorkshopResources(game:GameState):GameState{return{...game,town:{...game.town,bank:{...game.town.bank,twisted_plank:10,wrought_iron:8}}}}

describe('forum-like coordination primitives',()=>{
  it('posts one primary and one backup when the gate still needs manual closing',()=>{
    const events=planTownCoordination(createInitialGame(7001,20),'c01')
    const posted=events.filter((event)=>event.type==='COORDINATION_COMMITMENT_POSTED')
    expect(posted.filter((event)=>event.type==='COORDINATION_COMMITMENT_POSTED'&&event.commitment.kind==='gate_primary')).toHaveLength(1)
    expect(posted.filter((event)=>event.type==='COORDINATION_COMMITMENT_POSTED'&&event.commitment.kind==='gate_backup')).toHaveLength(1)
  })

  it('keeps manual closers after Portal Lock but retires them after true auto-close exists',()=>{
    const initial=createInitialGame(7002,20)
    const locked:GameState={...initial,town:{...initial.town,construction:{...initial.town.construction,portal_lock:{...initial.town.construction.portal_lock,completed:true,apContributed:16}}}}
    const lockPosts=planTownCoordination(locked,'c01').filter((event)=>event.type==='COORDINATION_COMMITMENT_POSTED'&&(event.commitment.kind==='gate_primary'||event.commitment.kind==='gate_backup'))
    expect(lockPosts).toHaveLength(2)

    const automatic:GameState={...locked,town:{...locked.town,construction:{...locked.town.construction,automatic_piston_lock:{...locked.town.construction.automatic_piston_lock,completed:true,apContributed:45}}}}
    const automaticPosts=planTownCoordination(automatic,'c01').filter((event)=>event.type==='COORDINATION_COMMITMENT_POSTED'&&(event.commitment.kind==='gate_primary'||event.commitment.kind==='gate_backup'))
    expect(automaticPosts).toHaveLength(0)
  })

  it('saturates build claims while leaving ordinary citizens eligible for the field',()=>{
    const initial=withWorkshopResources(createInitialGame(7003,20))
    const state=applyEvents(initial,planTownCoordination(initial,'c01'))
    const builders=state.coordination.commitments.filter((commitment)=>commitment.kind==='construction')
    expect(builders.length).toBeGreaterThan(0)
    expect(builders.length).toBeLessThanOrEqual(4)
    expect(normalCandidates(state,'c01').length).toBeGreaterThan(0)
  })

  it('treats a nearby depleted safe zone as useful construction salvage',()=>{
    let game=createInitialGame(7004,20)
    const key=zoneKey(1,0)
    game={
      ...game,
      day:3,
      world:{
        ...game.world,
        zones:{...game.world.zones,[key]:{...game.world.zones[key],discovered:true,zombies:0,searchesRemaining:0,searchedBy:[],depletedSearchedBy:[]}},
        intel:{...game.world.intel,[key]:{observedZombies:0,lastObservedDay:3,lastObservedHour:1}},
      },
    }
    const salvage=knownOpportunities(game).find((opportunity)=>opportunity.target.x===1&&opportunity.target.y===0&&opportunity.searchMode==='depleted')
    expect(salvage).toBeTruthy()
    expect(salvage?.desiredCitizens).toBe(1)
    expect(salvage?.reason).toContain('Workshop conversion')
  })
})
