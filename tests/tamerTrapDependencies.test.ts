import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { catapultProfile } from '../src/core/catapult'
import { executeCommand } from '../src/core/commands'
import { COMBINATION_RECIPES } from '../src/core/combinations'
import { foodApTarget, isKitchenCookable } from '../src/core/food'
import { garbageDumpCategory } from '../src/core/garbageDump'
import { createInitialGame } from '../src/core/game'
import { CURRENT_ITEM_SOURCE_CATALOG_BY_REF } from '../src/core/itemSourceCurrent'
import { createItemInstance, itemHasCapability } from '../src/core/items'
import { nightWatchEquipment } from '../src/core/nightWatch'
import type { ConstructionId, GameState, ItemType } from '../src/core/types'

const TRAP_ANIMALS=['mangy_dachshund','furious_kitten_partially_digested'] as const satisfies readonly ItemType[]

function completed(game:GameState,...ids:ConstructionId[]):GameState{
  let construction=game.town.construction
  for(const id of ids)construction={...construction,[id]:{...construction[id],discovered:true,completed:true}}
  return{...game,town:{...game.town,construction}}
}
function withInventory(game:GameState,...types:ItemType[]):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:types.map((type,index)=>createItemInstance(`trap-${index}`,type))}:citizen)}
}

describe('Tamer Trap source-safe dependencies',()=>{
  it('activates the special Trap outputs with conservative source status',()=>{
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('tekel_#00')).toMatchObject({runtimeType:'mangy_dachshund',implementation:'partial',watchPoints:18})
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('angryc_#00')).toMatchObject({runtimeType:'furious_kitten_partially_digested',implementation:'partial',watchPoints:18,decoration:1})
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('flesh_#00')).toMatchObject({runtimeType:'grisly_bomb',implementation:'partial'})
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('moldy_food_subpart_#00')).toMatchObject({runtimeType:'fistful_of_insects',implementation:'implemented'})
    for(const type of TRAP_ANIMALS)expect(itemHasCapability(type,'animal')).toBe(true)
  })

  it('routes both special animals through shared Dump, Trebuchet, and Pet Shop Watch behavior',()=>{
    for(const type of TRAP_ANIMALS){
      expect(garbageDumpCategory(createItemInstance(`dump-${type}`,type))).toBe('animal')
      expect(catapultProfile(type)).toMatchObject({landing:'destroyed',damage:'ridiculous',shape:'zone',requiresSmallTrebuchet:true})
    }
    let game=completed(createInitialGame(9920,1),'battlements','miniature_armory')
    game=withInventory(game,...TRAP_ANIMALS)
    expect(Object.fromEntries(nightWatchEquipment(game,game.citizens[0]).map((item)=>[item.type,item.baseDefense]))).toEqual({mangy_dachshund:18,furious_kitten_partially_digested:18})
    game=completed(game,'pet_shop')
    expect(Object.fromEntries(nightWatchEquipment(game,game.citizens[0]).map((item)=>[item.type,item.defense]))).toEqual({mangy_dachshund:23,furious_kitten_partially_digested:23})
  })

  it('implements the exact special-animal Butcher outputs at zero AP',()=>{
    const expected=[
      {type:'mangy_dachshund' as const,recipe:'butcher_mangy_dachshund' as const,output:'tasty_looking_steak' as const},
      {type:'furious_kitten_partially_digested' as const,recipe:'butcher_furious_kitten' as const,output:'grisly_bomb' as const},
    ]
    for(const rule of expected){
      expect(COMBINATION_RECIPES[rule.recipe]).toMatchObject({category:'butcher',apCost:0,townOnly:true,requiresConstruction:'butcher',outputType:rule.output,outputCount:2})
      let game=withInventory(completed(createInitialGame(9921,1),'butcher'),rule.type)
      const beforeAp=game.citizens[0].ap
      const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId===rule.recipe)
      expect(action,rule.type).toBeDefined()
      const result=executeCommand(game,action!)
      game=result.state
      expect(game.citizens[0].ap).toBe(beforeAp)
      expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(false)
      expect(game.citizens[0].inventory.filter((item)=>item.type===rule.output)).toHaveLength(2)
    }
  })

  it('implements Fistful of insects as the source 4-AP target without making it Kitchen bait',()=>{
    expect(foodApTarget('fistful_of_insects',6)).toBe(4)
    expect(isKitchenCookable(createItemInstance('insects','fistful_of_insects'))).toBe(false)
  })
})
