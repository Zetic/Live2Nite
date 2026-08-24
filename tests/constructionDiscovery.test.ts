import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS, constructionMaxHp, constructionUnlocked, temporaryCompletedProjects } from '../src/core/construction'
import { createInitialGame, resolveNight } from '../src/core/game'
import { bankFromCounts } from './bankFixtures'

describe('construction discovery progression', () => {
  it('starts with the full playable no-blueprint tree known but keeps blueprint tiers hidden', () => {
    const game=createInitialGame(2601,2)
    for(const id of ['wall_upgrade','great_pit','moat','barbed_wire','advanced_ramparts','pump','drilling_rig','workshop','factory','watchtower','search_tower','foundations','portal_lock','reinforced_gates','soul_purifying_source'] as const)
      expect(game.town.construction[id].discovered).toBe(true)

    expect(game.town.construction.reinforcing_beams.discovered).toBe(false)
    expect(game.town.construction.second_layer.discovered).toBe(false)
    expect(game.town.construction.water_detector.discovered).toBe(false)
    expect(game.town.construction.sanctuary.discovered).toBe(true)
    expect(constructionUnlocked(game,'sanctuary')).toBe(false)
  })

  it('shows known child sites before their parents are complete but blocks construction work', () => {
    let game=createInitialGame(2602,2)
    expect(game.town.construction.great_pit.discovered).toBe(true)
    expect(constructionUnlocked(game,'great_pit')).toBe(false)

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
    expect(constructionUnlocked(result.state,'great_pit')).toBe(true)
    expect(result.events.some((event)=>event.type==='CONSTRUCTION_DISCOVERED')).toBe(false)
  })

  it('shows WIP no-blueprint descendants without making them buildable', () => {
    const game=createInitialGame(2603,2)
    expect(game.town.construction.soul_purifying_source.discovered).toBe(true)
    expect(game.town.construction.sanctuary.discovered).toBe(true)
    expect(constructionUnlocked(game,'sanctuary')).toBe(false)
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

  it('uses verified completion-water effects for no-blueprint Pump projects', () => {
    expect(CONSTRUCTIONS.pump.effects).toContainEqual({type:'well_water_on_complete',amount:15})
    expect(CONSTRUCTIONS.drilling_rig.effects).toContainEqual({type:'well_water_on_complete',amount:50})
    expect(CONSTRUCTIONS.hydraulic_network.effects).toContainEqual({type:'well_water_on_complete',amount:5})
  })
})
