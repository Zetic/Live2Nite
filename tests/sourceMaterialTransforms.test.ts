import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, ITEMS } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'
import type { GameState, ItemType, WorkshopRecipeId } from '../src/core/types'

function withWorkshopInput(type:ItemType):GameState{
  const game=createInitialGame(2960,1)
  return{...game,town:{...game.town,bank:[createItemInstance('source-input',type)],construction:{...game.town.construction,workshop:{...game.town.construction.workshop,completed:true,apContributed:CONSTRUCTIONS.workshop.apCost}}}}
}
function runTransform(type:ItemType,recipeId:WorkshopRecipeId,output:ItemType):void{
  let game=withWorkshopInput(type)
  const beforeAp=game.citizens[0].ap
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&candidate.recipeId===recipeId)
  expect(action).toBeTruthy()
  game=executeCommand(game,action!).state
  expect(game.citizens[0].ap).toBe(beforeAp-3)
  expect(game.town.bank.some((item)=>item.type===type)).toBe(false)
  expect(game.town.bank.some((item)=>item.type===output)).toBe(true)
}

describe('ordinary source material transforms',()=>{
  it('maps Quality Log and Sheet Metal (parts) from their exact normal-loot source ids',()=>{
    expect(MYHORDES_NORMAL_LOOT_MAPPING['wood_log_#00']).toEqual({type:'quality_log'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['plate_raw_#00']).toEqual({type:'sheet_metal_bits'})
    const pending=new Set(unmappedOrdinarySourceLootIds())
    expect(pending.has('wood_log_#00')).toBe(false)
    expect(pending.has('plate_raw_#00')).toBe(false)
  })

  it('keeps source identity/categories explicit',()=>{
    expect(ITEMS.quality_log).toMatchObject({name:'Quality Log',source:'MYHORDES_CURRENT',category:'raw',displayCategory:'furniture'})
    expect(ITEMS.quality_log.capabilities).toEqual(expect.arrayContaining(['raw_material','decoration']))
    expect(ITEMS.sheet_metal_bits).toMatchObject({name:'Sheet Metal (parts)',source:'MYHORDES_CURRENT',category:'raw',displayCategory:'resources'})
  })

  it('cuts a Quality Log into one Twisted Plank in the Workshop',()=>{
    runTransform('quality_log','quality_log_to_planks','twisted_plank')
  })

  it('processes Sheet Metal (parts) into one Sheet Metal in the Workshop',()=>{
    runTransform('sheet_metal_bits','sheet_metal_bits_to_sheet_metal','sheet_metal')
  })
})
