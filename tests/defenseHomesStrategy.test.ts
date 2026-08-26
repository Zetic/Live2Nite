import { describe, expect, it } from 'vitest'
import { publicDefenseAssessment, strategicConstructionScore } from '../src/agents/planning/TownDefenseStrategy'
import { getLegalActions } from '../src/core/actions'
import { CONSTRUCTIONS } from '../src/core/construction'
import { executeCommand } from '../src/core/commands'
import { homeTownDefense } from '../src/core/defense'
import { HOME_LEVEL_ORDER, HOME_LEVELS, personalDefense } from '../src/core/home'
import { createInitialGame } from '../src/core/game'
import { watchtowerEstimate } from '../src/core/night'
import type { GameState } from '../src/core/types'
import { contributeWatchtowerEstimation } from '../src/core/watchtowerEstimation'

function completed(game:GameState,projectId:keyof GameState['town']['construction']):GameState{
  return{...game,town:{...game.town,construction:{...game.town.construction,[projectId]:{...game.town.construction[projectId],discovered:true,completed:true,apContributed:CONSTRUCTIONS[projectId].apCost}}}}
}

describe('historical-style Home progression',()=>{
  it('preserves the Season-16 structural defense and AP curve',()=>{
    expect(HOME_LEVEL_ORDER.map((level)=>HOME_LEVELS[level].defense)).toEqual([0,1,4,9,16,25,36,49,64])
    expect(HOME_LEVEL_ORDER.map((level)=>HOME_LEVELS[level].apCost)).toEqual([0,2,4,5,6,6,7,7,8])
  })

  it('allows only one structural upgrade per day and consumes personal materials on later tiers',()=>{
    let game=createInitialGame(2101,1)
    const tent=getLegalActions(game,'c01').find((action)=>action.type==='UPGRADE_HOME')!
    game=executeCommand(game,tent).state
    expect(game.citizens[0].home.level).toBe('tent')
    expect(game.citizens[0].home.upgradedDay).toBe(1)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='UPGRADE_HOME')).toBe(false)

    game={
      ...game,
      day:2,
      citizens:game.citizens.map((citizen)=>({...citizen,ap:6,inventory:[{id:'log',type:'rotten_log'}]})),
    }
    const hovel=getLegalActions(game,'c01').find((action)=>action.type==='UPGRADE_HOME')!
    expect(hovel).toBeTruthy()
    game=executeCommand(game,hovel).state
    expect(game.citizens[0].home.level).toBe('hovel')
    expect(game.citizens[0].home.defense).toBe(4)
    expect(game.citizens[0].inventory.some((item)=>item.type==='rotten_log')).toBe(false)
  })

  it('makes installed Fence defense contributable while loose chest objects remain personal',()=>{
    let game=createInitialGame(2102,1)
    game={
      ...game,
      citizens:game.citizens.map((citizen)=>({...citizen,home:{...citizen.home,level:'tent',defense:1,storage:[{id:'door',type:'old_door'}],improvements:{reinforcements:0,fence:1,storage:0}}})),
    }
    expect(personalDefense(game.citizens[0],game)).toBe(7)
    expect(homeTownDefense(game)).toBe(1)
  })

  it('raises the same eligible home contribution from 40% to 80% with Circular Quarters',()=>{
    let game=createInitialGame(2103,1)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,home:{...citizen.home,level:'house',defense:16}}))}
    expect(homeTownDefense(game)).toBe(6)
    game=completed(completed(game,'workshop'),'circular_quarters')
    expect(homeTownDefense(game)).toBe(12)
  })
})

describe('public defense strategy',()=>{
  it('does not expose the exact deterministic attack through contributed Watchtower information',()=>{
    let game=createInitialGame(2201,8)
    expect(publicDefenseAssessment(game).source).toBe('none')
    game=completed(game,'watchtower')
    expect(watchtowerEstimate(game)).toBeNull()
    for(const citizen of game.citizens)game=contributeWatchtowerEstimation(game,citizen.id)
    const estimate=watchtowerEstimate(game)!
    const assessment=publicDefenseAssessment(game)
    expect('actual' in estimate).toBe(false)
    expect(assessment.source).toBe('watchtower')
    expect(assessment.expectedMin).toBe(estimate.min)
    expect(assessment.expectedMax).toBe(estimate.max)
  })

  it('falls back to the previous public Night Report when no Watchtower exists',()=>{
    let game=createInitialGame(2202,4)
    game={...game,day:2,lastNight:{day:1,attackStrength:80,defenseBeforeAttack:40,effectiveDefense:40,gateOpen:false,breached:true,outsideDeaths:0}}
    const assessment=publicDefenseAssessment(game)
    expect(assessment.source).toBe('history')
    expect(assessment.expectedMin).toBe(80)
    expect(assessment.expectedMax).toBe(108)
    expect(assessment.pressure).toBe('critical')
  })

  it('lets public critical defense pressure outrank the ordinary Workshop bootstrap preference',()=>{
    let game=createInitialGame(2203,4)
    game={...game,day:2,lastNight:{day:1,attackStrength:100,defenseBeforeAttack:40,effectiveDefense:40,gateOpen:false,breached:true,outsideDeaths:0}}
    expect(strategicConstructionScore(game,'wall_upgrade')).toBeGreaterThan(strategicConstructionScore(game,'workshop'))
  })
})