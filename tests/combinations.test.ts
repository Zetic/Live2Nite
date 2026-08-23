import { describe, expect, it } from 'vitest'
import { chooseTownWork } from '../src/agents/townWork'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import type { CombinationRecipeId, GameState, WorkshopRecipeId } from '../src/core/types'
import { bankFromCounts } from './bankFixtures'

function combination(game:GameState,recipeId:CombinationRecipeId){const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId===recipeId);if(!action||action.type!=='COMBINE_ITEMS')throw new Error(`Missing combination ${recipeId}`);return action}
function workshop(game:GameState,recipeId:WorkshopRecipeId){const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&candidate.recipeId===recipeId);if(!action||action.type!=='WORKSHOP_CONVERT')throw new Error(`Missing Workshop recipe ${recipeId}`);return action}
function personal(game:GameState,inventory:ReturnType<typeof createItemInstance>[],home:ReturnType<typeof createItemInstance>[]):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory,home:{...citizen.home,storage:home,storageCapacity:Math.max(citizen.home.storageCapacity,home.length+2)}}:citizen)}}

describe('portable combinations',()=>{
  it('combines exact Rucksack and Home objects into a Telescope without Workshop or AP',()=>{
    const copper=createItemInstance('copper','copper_pipe');const lens=createItemInstance('lens','convex_lens')
    let game=personal(createInitialGame(2801,1),[copper],[lens]);const beforeId=game.nextItemId;const beforeAp=game.citizens[0].ap
    const action=combination(game,'assemble_telescope');expect(action.itemIds).toEqual(['copper','lens'])
    game=executeCommand(game,action).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory.some((item)=>item.type==='telescope')).toBe(true)
    expect(game.citizens[0].inventory.some((item)=>item.id==='copper')).toBe(false)
    expect(game.citizens[0].home.storage.some((item)=>item.id==='lens')).toBe(false)
    expect(game.nextItemId).toBe(beforeId+1)
  })

  it('uses only the Rucksack for combinations after leaving town',()=>{
    const copper=createItemInstance('copper','copper_pipe');const lens=createItemInstance('lens','convex_lens')
    let game=personal(createInitialGame(2802,1),[copper],[lens])
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='OPEN_GATE')!).state
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='EXIT_TOWN')!).state
    expect(getLegalActions(game,'c01').some((action)=>action.type==='COMBINE_ITEMS'&&action.recipeId==='assemble_telescope')).toBe(false)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[copper,lens],home:{...citizen.home,storage:[]}}:citizen)}
    expect(getLegalActions(game,'c01').some((action)=>action.type==='COMBINE_ITEMS'&&action.recipeId==='assemble_telescope')).toBe(true)
  })

  it('mixes source-backed cement and water into a construction block anywhere',()=>{
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('bag_of_cement')
    const cement=createItemInstance('cement','bag_of_cement');const water=createItemInstance('water','water_ration')
    let game=personal(createInitialGame(2807,1),[cement,water],[]);const beforeAp=game.citizens[0].ap
    game=executeCommand(game,combination(game,'mix_concrete')).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory.some((item)=>item.type==='unshaped_concrete_block')).toBe(true)
    expect(game.citizens[0].inventory.some((item)=>item.id==='cement'||item.id==='water')).toBe(false)
  })

  it('lets town AI prepare construction combinations by withdrawing Bank ingredients',()=>{
    let game=createInitialGame(2808,1)
    game={...game,town:{...game.town,bank:bankFromCounts({twisted_plank:5,wrought_iron:2,bag_of_cement:1,water_ration:1},'concrete-prep'),construction:{...game.town.construction,advanced_ramparts:{...game.town.construction.advanced_ramparts,completed:true,apContributed:CONSTRUCTIONS.advanced_ramparts.apCost},spiked_wall:{...game.town.construction.spiked_wall,apContributed:1}}}}
    let citizen=game.citizens[0];let actions=getLegalActions(game,citizen.id);let work=chooseTownWork(game,citizen,actions)
    expect(work?.type).toBe('WITHDRAW_BANK_ITEM')
    if(!work)throw new Error('Expected concrete ingredient withdrawal')
    game=executeCommand(game,work).state
    citizen=game.citizens[0];actions=getLegalActions(game,citizen.id);work=chooseTownWork(game,citizen,actions)
    expect(work?.type).toBe('WITHDRAW_BANK_ITEM')
    if(!work)throw new Error('Expected second concrete ingredient withdrawal')
    game=executeCommand(game,work).state
    citizen=game.citizens[0];actions=getLegalActions(game,citizen.id);work=chooseTownWork(game,citizen,actions)
    expect(work?.type).toBe('COMBINE_ITEMS')
    if(work?.type==='COMBINE_ITEMS')expect(work.recipeId).toBe('mix_concrete')
  })

  it('reloads a Water Pistol in place and consumes the Water Ration',()=>{
    const pistol=createItemInstance('pistol','water_pistol',{charges:0});const water=createItemInstance('water','water_ration')
    let game=personal(createInitialGame(2803,1),[pistol,water],[]);const beforeNext=game.nextItemId
    game=executeCommand(game,combination(game,'reload_water_pistol')).state
    const reloaded=game.citizens[0].inventory.find((item)=>item.id==='pistol')
    expect(reloaded?.type).toBe('water_pistol');expect(reloaded?.state).toEqual({charges:3});expect(game.citizens[0].inventory.some((item)=>item.id==='water')).toBe(false);expect(game.nextItemId).toBe(beforeNext)
  })

  it('refills and drinks from a Water Cooler Bottle without replacing the bottle',()=>{
    const bottle=createItemInstance('cooler','water_cooler_bottle',{charges:0});const water=createItemInstance('water','water_ration')
    let game=personal(createInitialGame(2804,1),[bottle,water],[])
    game=executeCommand(game,combination(game,'refill_water_cooler')).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='cooler')?.state?.charges).toBe(1)
    const drink=getLegalActions(game,'c01').find((action)=>action.type==='DRINK_ITEM'&&action.itemId==='cooler');expect(drink).toBeTruthy();game=executeCommand(game,drink!).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='cooler')?.state?.charges).toBe(0)
  })

  it('repairs with an exact Repair Kit, damages that kit, then restores the same kit at Workshop',()=>{
    const broken=createItemInstance('staff-object','broken_staff');const kit=createItemInstance('kit-object','repair_kit')
    let game=personal(createInitialGame(2805,1),[broken,kit],[]);const beforeAp=game.citizens[0].ap
    game=executeCommand(game,combination(game,'repair_staff')).state
    expect(game.citizens[0].ap).toBe(beforeAp-1)
    expect(game.citizens[0].inventory.find((item)=>item.id==='staff-object')?.type).toBe('staff')
    expect(game.citizens[0].inventory.find((item)=>item.id==='kit-object')?.state?.condition).toBe('damaged')
    const damaged=game.citizens[0].inventory.find((item)=>item.id==='kit-object')!
    game={...game,town:{...game.town,bank:[damaged],construction:{...game.town.construction,workshop:{id:'workshop',completed:true,apContributed:CONSTRUCTIONS.workshop.apCost}}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:citizen.inventory.filter((item)=>item.id!=='kit-object')}:citizen)}
    game=executeCommand(game,workshop(game,'repair_repair_kit')).state
    const restored=game.town.bank.find((item)=>item.id==='kit-object');expect(restored?.type).toBe('repair_kit');expect(restored?.state?.condition).toBe('intact')
  })

  it('consumes Kwik-Fix while preserving the repaired object identity',()=>{
    const broken=createItemInstance('knife-object','broken_serrated_knife');const fix=createItemInstance('fix-object','kwik_fix')
    let game=personal(createInitialGame(2806,1),[broken,fix],[])
    game=executeCommand(game,combination(game,'kwik_fix_serrated_knife')).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='knife-object')?.type).toBe('serrated_knife')
    expect(game.citizens[0].inventory.some((item)=>item.id==='fix-object')).toBe(false)
  })
})
