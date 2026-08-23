import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { consumableKind, createItemInstance, ITEMS } from '../src/core/items'
import { OPENABLES } from '../src/core/openables'
import type { GameCommand, GameState, ItemType } from '../src/core/types'

const DOGGY_FOODS:ItemType[]=[
  'mouldy_twinkies','half_eaten_chicken_wings','rancid_shortbread_pack','out_of_date_jaffa_cakes',
  'dried_chewing_gum','stale_tart','soft_crisps','food',
]

function withInventory(types:ItemType[]):GameState{
  const game=createInitialGame(9301,1)
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:1,inventory:types.map((type,index)=>createItemInstance(`item-${index}`,type))}:citizen)}
}

function action(game:GameState,type:GameCommand['type']){
  const found=getLegalActions(game,'c01').find((candidate)=>candidate.type===type)
  if(!found)throw new Error(`Missing ${type}`)
  return found
}

describe('MyHordes Doggy Bag',()=>{
  it('keeps the exact spawn_doggy weights and maps the existing Mouldy Ham Sandwich instead of duplicating it',()=>{
    expect(OPENABLES.doggy_bag?.source).toBe('MYHORDES_CURRENT')
    expect(OPENABLES.doggy_bag?.outputTable.entries.map((entry)=>[entry.items[0]?.type,entry.weight])).toEqual([
      ['mouldy_twinkies',222],
      ['half_eaten_chicken_wings',194],
      ['rancid_shortbread_pack',188],
      ['out_of_date_jaffa_cakes',186],
      ['dried_chewing_gum',181],
      ['stale_tart',174],
      ['soft_crisps',168],
      ['food',162],
    ])
    expect(ITEMS.food.name).toBe('Mouldy Ham Sandwich')
  })

  it('consumes the bag and creates exactly one ordinary food',()=>{
    let game=withInventory(['doggy_bag'])
    const rngBefore=game.rngState
    game=executeCommand(game,action(game,'OPEN_CONTAINER')).state
    expect(game.citizens[0].inventory).toHaveLength(1)
    expect(game.citizens[0].inventory.some((item)=>item.id==='item-0')).toBe(false)
    expect(DOGGY_FOODS).toContain(game.citizens[0].inventory[0].type)
    expect(consumableKind(game.citizens[0].inventory[0].type)).toBe('food')
    expect(game.rngState).not.toBe(rngBefore)
  })

  it('routes every Doggy Bag outcome through the normal food action',()=>{
    for(const type of DOGGY_FOODS){
      let game=withInventory([type])
      const beforeAp=game.citizens[0].ap
      const eat=getLegalActions(game,'c01').find((candidate)=>candidate.type==='EAT_ITEM')
      expect(eat,`${type} should be edible`).toBeDefined()
      game=executeCommand(game,eat!).state
      expect(game.citizens[0].inventory).toHaveLength(0)
      expect(game.citizens[0].daily.ate).toBe(true)
      expect(game.citizens[0].ap,`${type} should use the normal daily food refresh`).toBeGreaterThan(beforeAp)
    }
  })
})
