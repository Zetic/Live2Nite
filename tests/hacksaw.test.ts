import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'
import type { GameState, ItemInstance } from '../src/core/types'
import { workshopRecipeApCost } from '../src/core/workshop'

function personal(game:GameState,inventory:ItemInstance[],home:ItemInstance[]=[]):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory,home:{...citizen.home,storage:home,storageCapacity:Math.max(citizen.home.storageCapacity,home.length+2)}}:citizen)}
}
function builtWorkshop(game:GameState,bank:ItemInstance[],factory=false):GameState{
  return{...game,town:{...game.town,bank,construction:{...game.town.construction,
    workshop:{...game.town.construction.workshop,completed:true,apContributed:CONSTRUCTIONS.workshop.apCost},
    ...(factory?{factory:{...game.town.construction.factory,completed:true,apContributed:CONSTRUCTIONS.factory.apCost}}:{}),
  }}}
}

describe('MyHordes Hacksaw dependency cluster',()=>{
  it('maps the ordinary Damaged Hacksaw drop instead of leaving the source id unresolved',()=>{
    expect(MYHORDES_NORMAL_LOOT_MAPPING['saw_tool_part_#00']).toEqual({type:'saw_tool_part'})
    expect(unmappedOrdinarySourceLootIds()).not.toContain('saw_tool_part_#00')
  })

  it('assembles Damaged Hacksaw + Kwik-Fix + Nuts & Bolts into a Hacksaw anywhere',()=>{
    const part=createItemInstance('part','saw_tool_part')
    const fix=createItemInstance('fix','kwik_fix')
    const nuts=createItemInstance('nuts','nuts_and_bolts')
    let game=personal(createInitialGame(2951,1),[part,fix,nuts])
    const beforeAp=game.citizens[0].ap
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId==='assemble_hacksaw')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory.some((item)=>item.type==='saw_tool')).toBe(true)
    expect(game.citizens[0].inventory.some((item)=>['part','fix','nuts'].includes(item.id))).toBe(false)
  })

  it('uses the Hacksaw as a reusable source opener for Cans',()=>{
    const can=createItemInstance('can-object','can')
    const saw=createItemInstance('saw-object','saw_tool')
    let game=personal(createInitialGame(2952,1),[can,saw])
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='OPEN_CONTAINER'&&candidate.itemId==='can-object')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='can-object')?.type).toBe('open_can')
    expect(game.citizens[0].inventory.find((item)=>item.id==='saw-object')?.type).toBe('saw_tool')
  })

  it('discounts Workshop AP only while the acting citizen carries the Hacksaw in their Rucksack',()=>{
    const log=createItemInstance('log','rotten_log')
    const saw=createItemInstance('saw','saw_tool')
    let game=builtWorkshop(personal(createInitialGame(2953,1),[],[saw]),[log])
    expect(workshopRecipeApCost(game,'logs_to_planks','c01')).toBe(3)

    game=personal(game,[saw],[])
    expect(workshopRecipeApCost(game,'logs_to_planks','c01')).toBe(2)
    const beforeAp=game.citizens[0].ap
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&candidate.recipeId==='logs_to_planks')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].ap).toBe(beforeAp-2)
    expect(game.town.bank.some((item)=>item.type==='twisted_plank')).toBe(true)
  })

  it('stacks Factory and carried Hacksaw discounts but never below 1 AP',()=>{
    const saw=createItemInstance('saw','saw_tool')
    let game=builtWorkshop(personal(createInitialGame(2954,1),[saw]),[createItemInstance('log','rotten_log')],true)
    expect(workshopRecipeApCost(game,'logs_to_planks','c01')).toBe(1)
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&candidate.recipeId==='logs_to_planks')
    expect(action).toBeTruthy()
    const beforeAp=game.citizens[0].ap
    game=executeCommand(game,action!).state
    expect(game.citizens[0].ap).toBe(beforeAp-1)
  })
})
