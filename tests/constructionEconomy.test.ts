import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS } from '../src/core/construction'
import { MYHORDES_CURRENT_CONSTRUCTION_COSTS } from '../src/core/constructionEconomy'
import { createInitialGame } from '../src/core/game'
import type { GameState, WorkshopRecipeId } from '../src/core/types'
import { bankFromCounts, bankCount as countBank } from './bankFixtures'

function withWorkshop(game:GameState,bank:GameState['town']['bank']):GameState{
  return {...game,town:{...game.town,bank,construction:{...game.town.construction,workshop:{id:'workshop',completed:true,apContributed:CONSTRUCTIONS.workshop.apCost}}}}
}
function recipeAction(game:GameState,recipeId:WorkshopRecipeId){
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&candidate.recipeId===recipeId)
  if(!action||action.type!=='WORKSHOP_CONVERT')throw new Error(`Missing Workshop recipe ${recipeId}`)
  return action
}

describe('current MyHordes construction cost layer',()=>{
  it('pins representative early, advanced, observation, and extreme projects',()=>{
    createInitialGame(123,2)
    expect(MYHORDES_CURRENT_CONSTRUCTION_COSTS.wall_upgrade).toEqual({referenceName:'Defensive Wall',apCost:25,resources:{twisted_plank:8,wrought_iron:4}})
    expect(CONSTRUCTIONS.wall_upgrade.apCost).toBe(25)
    expect(CONSTRUCTIONS.wall_upgrade.resources).toEqual({twisted_plank:8,wrought_iron:4})
    expect(CONSTRUCTIONS.wall_upgrade.source).toBe('MYHORDES_CURRENT')

    expect(CONSTRUCTIONS.advanced_ramparts.apCost).toBe(40)
    expect(CONSTRUCTIONS.advanced_ramparts.resources).toEqual({nuts_and_bolts:2,patchwork_beam:5,metal_support:5})

    expect(CONSTRUCTIONS.watchtower.apCost).toBe(15)
    expect(CONSTRUCTIONS.watchtower.resources).toEqual({twisted_plank:3,patchwork_beam:1,wrought_iron:1})

    expect(CONSTRUCTIONS.false_town.apCost).toBe(400)
    expect(CONSTRUCTIONS.false_town.resources).toEqual({nuts_and_bolts:15,twisted_plank:20,wrought_iron:20,patchwork_beam:20,metal_support:20})
  })
})

describe('advanced Workshop material flow',()=>{
  it('requires and consumes both current-MyHordes Telescope inputs',()=>{
    const base=createInitialGame(456,2)
    let game=withWorkshop(base,bankFromCounts({convex_lens:1},'telescope-one-input'))
    expect(getLegalActions(game,'c01').some((action)=>action.type==='WORKSHOP_CONVERT'&&action.recipeId==='assemble_telescope')).toBe(false)

    game=withWorkshop(base,bankFromCounts({convex_lens:1,copper_pipe:1},'telescope-ready'))
    const result=executeCommand(game,recipeAction(game,'assemble_telescope'))
    expect(countBank(result.state.town.bank,'convex_lens')).toBe(0)
    expect(countBank(result.state.town.bank,'copper_pipe')).toBe(0)
    expect(countBank(result.state.town.bank,'telescope')).toBe(1)
    expect(result.state.citizens[0].ap).toBe(3)
    const converted=result.events.find((event)=>event.type==='WORKSHOP_CONVERTED')
    expect(converted?.type).toBe('WORKSHOP_CONVERTED')
    if(converted?.type==='WORKSHOP_CONVERTED'){
      expect(converted.inputs).toEqual({convex_lens:1,copper_pipe:1})
      expect(converted.output).toBe('telescope')
    }
  })

  it('resolves salvage outcomes deterministically and persists the post-roll RNG state',()=>{
    const base=withWorkshop(createInitialGame(789,2),bankFromCounts({broken_electronic_device:1},'electronic-salvage'))
    const first=executeCommand(base,recipeAction(base,'dismantle_electronic_device'))
    const second=executeCommand(base,recipeAction(base,'dismantle_electronic_device'))
    const firstEvent=first.events.find((event)=>event.type==='WORKSHOP_CONVERTED')
    const secondEvent=second.events.find((event)=>event.type==='WORKSHOP_CONVERTED')
    expect(firstEvent?.type).toBe('WORKSHOP_CONVERTED')
    expect(secondEvent?.type).toBe('WORKSHOP_CONVERTED')
    if(firstEvent?.type==='WORKSHOP_CONVERTED'&&secondEvent?.type==='WORKSHOP_CONVERTED'){
      expect(firstEvent.output).toBe(secondEvent.output)
      expect(firstEvent.rngStateAfter).toBe(secondEvent.rngStateAfter)
      expect(['electronic_component','nuts_and_bolts','battery','compact_detonator']).toContain(firstEvent.output)
      expect(first.state.rngState).toBe(firstEvent.rngStateAfter)
      expect(first.state.rngState).not.toBe(base.rngState)
      expect(countBank(first.state.town.bank,'broken_electronic_device')).toBe(0)
      expect(countBank(first.state.town.bank,firstEvent.output)).toBe(1)
    }
  })

  it('supports reversible basic-to-advanced structural resource processing',()=>{
    let game=withWorkshop(createInitialGame(987,2),bankFromCounts({twisted_plank:1,wrought_iron:1},'advanced-materials'))
    game=executeCommand(game,recipeAction(game,'planks_to_beams')).state
    expect(countBank(game.town.bank,'patchwork_beam')).toBe(1)
    game=executeCommand(game,recipeAction(game,'iron_to_supports')).state
    expect(countBank(game.town.bank,'metal_support')).toBe(1)
  })
})
