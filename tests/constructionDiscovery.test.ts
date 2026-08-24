import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS, constructionMaxHp, temporaryCompletedProjects } from '../src/core/construction'
import { createInitialGame, resolveNight } from '../src/core/game'
import { bankFromCounts } from './bankFixtures'

describe('construction discovery progression', () => {
  it('starts with only playable common roots known', () => {
    const game=createInitialGame(2601,2)
    for(const id of ['wall_upgrade','pump','workshop','watchtower','foundations','portal_lock','soul_purifying_source'] as const)
      expect(game.town.construction[id].discovered).toBe(true)

    expect(game.town.construction.great_pit.discovered).toBe(false)
    expect(game.town.construction.reinforcing_beams.discovered).toBe(false)
    expect(game.town.construction.sanctuary.discovered).toBe(false)
  })

  it('reveals common direct children when a parent completes without revealing blueprint tiers', () => {
    let game=createInitialGame(2602,2)
    game={
      ...game,
      citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:1}:citizen),
      town:{
        ...game.town,
        bank:bankFromCounts({twisted_plank:8,wrought_iron:4},'construction-discovery'),
        construction:{
          ...game.town.construction,
          wall_upgrade:{...game.town.construction.wall_upgrade,apContributed:CONSTRUCTIONS.wall_upgrade.apCost-1},
        },
      },
    }
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='CONTRIBUTE_CONSTRUCTION'&&candidate.projectId==='wall_upgrade')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    expect(result.state.town.construction.wall_upgrade.completed).toBe(true)
    expect(result.state.town.construction.wall_upgrade.hp).toBe(constructionMaxHp('wall_upgrade'))
    expect(result.state.town.construction.great_pit.discovered).toBe(true)
    expect(result.state.town.construction.barbed_wire.discovered).toBe(true)
    expect(result.state.town.construction.reinforcing_beams.discovered).toBe(false)
    expect(result.events.some((event)=>event.type==='CONSTRUCTION_DISCOVERED'&&event.projectId==='great_pit')).toBe(true)
  })

  it('reveals the next common pit projects only after Great Pit is completed', () => {
    let game=createInitialGame(2603,2)
    game={...game,town:{...game.town,construction:{
      ...game.town.construction,
      wall_upgrade:{...game.town.construction.wall_upgrade,discovered:true,completed:true,apContributed:CONSTRUCTIONS.wall_upgrade.apCost,hp:constructionMaxHp('wall_upgrade')},
      great_pit:{...game.town.construction.great_pit,discovered:true,apContributed:CONSTRUCTIONS.great_pit.apCost-1},
    },bank:bankFromCounts({},'great-pit')},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:1}:citizen)}
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='CONTRIBUTE_CONSTRUCTION'&&candidate.projectId==='great_pit')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.town.construction.moat.discovered).toBe(true)
    expect(game.town.construction.spiked_pit.discovered).toBe(true)
    expect(game.town.construction.oubliettes.discovered).toBe(true)
  })

  it('keeps temporary plans known after their one-night construction expires', () => {
    let game=createInitialGame(2604,2)
    game={...game,town:{...game.town,construction:{
      ...game.town.construction,
      bait:{...game.town.construction.bait,discovered:true,completed:true,apContributed:CONSTRUCTIONS.bait.apCost,hp:constructionMaxHp('bait')},
    }}}
    expect(temporaryCompletedProjects(game)).toContain('bait')
    game=resolveNight(game)
    expect(game.town.construction.bait.completed).toBe(false)
    expect(game.town.construction.bait.discovered).toBe(true)
    expect(game.town.construction.bait.hp).toBe(0)
  })

  it('uses verified completion-water effects for common Pump projects', () => {
    expect(CONSTRUCTIONS.pump.effects).toContainEqual({type:'well_water_on_complete',amount:15})
    expect(CONSTRUCTIONS.drilling_rig.effects).toContainEqual({type:'well_water_on_complete',amount:50})
    expect(CONSTRUCTIONS.hydraulic_network.effects).toContainEqual({type:'well_water_on_complete',amount:5})
  })
})
