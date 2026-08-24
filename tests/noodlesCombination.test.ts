import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, ITEMS } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'

describe('Chinese noodles source combination',()=>{
  it('maps the normal-loot ingredients and existing damp-grass identity',()=>{
    expect(MYHORDES_NORMAL_LOOT_MAPPING['food_noodles_#00']).toEqual({type:'chinese_noodles'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['spices_#00']).toEqual({type:'strong_spices'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['chama_#00']).toBeUndefined()
    expect(MYHORDES_NORMAL_LOOT_MAPPING['ryebag_#00']).toEqual({type:'bag_of_damp_grass'})
    const pending=new Set(unmappedOrdinarySourceLootIds())
    expect(pending.has('food_noodles_#00')).toBe(false)
    expect(pending.has('spices_#00')).toBe(false)
    expect(pending.has('chama_#00')).toBe(true)
    expect(pending.has('ryebag_#00')).toBe(false)
    expect(ITEMS.chinese_noodles).toMatchObject({name:'Chinese Noodles',source:'MYHORDES_CURRENT',consumableKind:'food'})
    expect(ITEMS.strong_spices).toMatchObject({name:'Strong Spices',source:'MYHORDES_CURRENT'})
    expect(ITEMS.spicy_chinese_noodles).toMatchObject({name:'Spicy Chinese Noodles',source:'MYHORDES_CURRENT',consumableKind:'food'})
  })

  it('combines exact personal ingredient ids into Spicy Chinese Noodles for zero AP',()=>{
    let game=createInitialGame(2971,1)
    const citizen=game.citizens[0]
    game={...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?{...candidate,inventory:[
      createItemInstance('noodles','chinese_noodles'),
      createItemInstance('spices','strong_spices'),
      createItemInstance('water','water_ration'),
    ]}:candidate)}
    const beforeAp=game.citizens[0].ap
    const action=getLegalActions(game,citizen.id).find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId==='prepare_spicy_noodles')
    expect(action).toEqual({type:'COMBINE_ITEMS',citizenId:citizen.id,recipeId:'prepare_spicy_noodles',itemIds:['noodles','spices','water']})
    game=executeCommand(game,action!).state
    const after=game.citizens[0]
    expect(after.ap).toBe(beforeAp)
    expect(after.inventory.some((item)=>['noodles','spices','water'].includes(item.id))).toBe(false)
    const prepared=after.inventory.find((item)=>item.type==='spicy_chinese_noodles')
    expect(prepared).toBeTruthy()
    expect(prepared?.id).not.toBe('noodles')
  })

  it('uses the source 7 AP food target for Spicy Chinese Noodles',()=>{
    let game=createInitialGame(2972,1)
    const citizen=game.citizens[0]
    game={...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?{...candidate,ap:0,daily:{...candidate.daily,ate:false},inventory:[createItemInstance('spicy','spicy_chinese_noodles')]}:candidate)}
    const eat=getLegalActions(game,citizen.id).find((candidate)=>candidate.type==='EAT_ITEM'&&candidate.itemId==='spicy')
    expect(eat).toBeTruthy()
    game=executeCommand(game,eat!).state
    expect(game.citizens[0].ap).toBe(7)
    expect(game.citizens[0].daily.ate).toBe(true)
    expect(game.citizens[0].inventory.some((item)=>item.id==='spicy')).toBe(false)
  })
})
