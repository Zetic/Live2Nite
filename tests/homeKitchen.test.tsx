import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { chooseTownWork } from '../src/agents/townWork'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS, constructionImplementationStatus, constructionPlayable } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { HOME_IMPROVEMENTS } from '../src/core/home'
import { createItemInstance, normalizeItemState } from '../src/core/items'
import { kitchenBaseDailyUses, kitchenDailyUseLimit, kitchenGoodChance, kitchenUsesToday } from '../src/core/kitchen'
import type { Citizen, GameState, ItemInstance, ItemType } from '../src/core/types'
import { HomeView } from '../src/ui/components/HomeView'

function updateCitizen(game:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}}
function item(id:string,type:ItemType):ItemInstance{return createItemInstance(id,type)}
function withKitchen(game:GameState,level:number,inventory:ItemInstance[]=[],storage:ItemInstance[]=[]):GameState{return updateCitizen(game,'c01',(citizen)=>({...citizen,home:{...citizen.home,level:'tent',defense:1,improvements:{...citizen.home.improvements,kitchen:level},storage},inventory}))}
function withCafeteria(game:GameState):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,central_cafeteria:{...game.town.construction.central_cafeteria,discovered:true,completed:true}}}}}

describe('Home Kitchen progression',()=>{
  it('uses the source-backed four-level costs and activates Central Cafeteria with current materials',()=>{
    const kitchen=HOME_IMPROVEMENTS.kitchen
    expect(kitchen.status).toBe('implemented')
    expect(kitchen.effectReady).toBe(true)
    expect([1,2,3,4].map((level)=>kitchen.apCost(level))).toEqual([6,3,4,4])
    expect(kitchen.resources(1)).toEqual({})
    expect(kitchen.resources(2)).toEqual({pathetic_penknife:1})
    expect(kitchen.resources(3)).toEqual({carcinogenic_oven:1})
    expect(kitchen.resources(4)).toEqual({student_refrigerator:1})

    const cafeteria=CONSTRUCTIONS.central_cafeteria
    expect(cafeteria.apCost).toBe(20)
    expect(cafeteria.resources).toEqual({
      pharmaceutical_products:1,
      patchwork_beam:5,
      metal_support:1,
      table:1,
      bag_of_damp_grass:1,
      carcinogenic_oven:1,
    })
    expect(constructionImplementationStatus('central_cafeteria')).toBe('implemented')
    expect(constructionPlayable('central_cafeteria')).toBe(true)
  })

  it('uses 33/66/99/99% good-meal chances with 1/1/2/3 base daily preparations',()=>{
    const game=createInitialGame(9401,1)
    const rows=[1,2,3,4].map((level)=>{
      const state=withKitchen(game,level)
      const citizen=state.citizens[0]
      return[kitchenGoodChance(citizen),kitchenBaseDailyUses(citizen)]
    })
    expect(rows).toEqual([[33,1],[66,1],[99,2],[99,3]])
  })

  it('doubles every Kitchen level daily allowance when Central Cafeteria is complete',()=>{
    const game=createInitialGame(9402,1)
    expect([1,2,3,4].map((level)=>{
      const state=withCafeteria(withKitchen(game,level))
      return kitchenDailyUseLimit(state,state.citizens[0])
    })).toEqual([2,2,4,6])
  })

  it('transforms an eligible rucksack food into one prepared meal without spending AP or eating it',()=>{
    let game=withKitchen(createInitialGame(9403,1),1,[item('meal','vegetable')])
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:3}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_KITCHEN'&&candidate.itemId==='meal')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_KITCHEN_USED')
    expect(event&&event.type==='HOME_KITCHEN_USED'&&event.successChance).toBe(33)
    expect(result.state.citizens[0].ap).toBe(3)
    expect(result.state.citizens[0].daily.ate).toBe(false)
    expect(result.state.citizens[0].inventory.some((candidate)=>candidate.id==='meal')).toBe(false)
    expect(result.state.citizens[0].inventory).toHaveLength(1)
    expect(result.state.citizens[0].inventory[0].type).toBe(event&&event.type==='HOME_KITCHEN_USED'&&event.success?'good_home_made_meal':'dubious_home_made_meal')
    expect(kitchenUsesToday(result.state,'c01')).toBe(1)
    expect(getLegalActions(result.state,'c01').some((candidate)=>candidate.type==='USE_HOME_KITCHEN')).toBe(false)
  })

  it('can cook from the Home Chest and puts the resulting meal back in the Home Chest',()=>{
    const game=withKitchen(createInitialGame(9404,1),1,[],[item('chest-food','soft_crisps')])
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_KITCHEN'&&candidate.itemId==='chest-food')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    expect(result.state.citizens[0].inventory).toHaveLength(0)
    expect(result.state.citizens[0].home.storage).toHaveLength(1)
    expect(['good_home_made_meal','dubious_home_made_meal']).toContain(result.state.citizens[0].home.storage[0].type)
  })

  it('rejects poisoned food, accepts Meaty Bone, and cooking produces a clean prepared meal',()=>{
    const poisoned=createItemInstance('poisoned','food',{contamination:'poisoned'})
    const bone=createItemInstance('bone','meaty_bone',{contamination:'infected'})
    let game=withKitchen(createInitialGame(9405,1),1,[poisoned,bone])
    const actions=getLegalActions(game,'c01')
    expect(actions.some((candidate)=>candidate.type==='USE_HOME_KITCHEN'&&candidate.itemId==='poisoned')).toBe(false)
    const cookBone=actions.find((candidate)=>candidate.type==='USE_HOME_KITCHEN'&&candidate.itemId==='bone')
    expect(cookBone).toBeTruthy()
    game=executeCommand(game,cookBone!).state
    const prepared=game.citizens[0].inventory.find((candidate)=>candidate.type==='good_home_made_meal'||candidate.type==='dubious_home_made_meal')
    expect(prepared).toBeTruthy()
    expect(normalizeItemState(prepared!.type,prepared!.state).contamination).toBe('clean')
    expect(game.citizens[0].inventory.some((candidate)=>candidate.id==='poisoned')).toBe(true)
  })

  it('does not offer already-good or already-prepared meals as Kitchen inputs',()=>{
    const game=withKitchen(createInitialGame(9406,1),4,[item('steak','tasty_looking_steak'),item('good','good_home_made_meal'),item('dubious','dubious_home_made_meal')])
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='USE_HOME_KITCHEN')).toBe(false)
  })

  it('enforces the level 3 two-use daily limit',()=>{
    let game=withKitchen(createInitialGame(9407,1),3,[item('a','food'),item('b','vegetable'),item('c','soft_crisps')])
    for(let use=0;use<2;use+=1){
      const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_KITCHEN')
      expect(action,`use ${use+1}`).toBeTruthy()
      game=executeCommand(game,action!).state
    }
    expect(kitchenUsesToday(game,'c01')).toBe(2)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='USE_HOME_KITCHEN')).toBe(false)
  })
})

describe('Home Kitchen player and bot parity',()=>{
  it('renders compact Kitchen state and Cafeteria multiplier in Home Works',()=>{
    const game=withCafeteria(withKitchen(createInitialGame(9410,1),2,[item('meal','vegetable')]))
    const markup=renderToStaticMarkup(<HomeView game={game} citizenId="c01" legalActions={getLegalActions(game,'c01')} act={()=>{}} initialTab="works"/>)
    expect(markup).toContain('Kitchen')
    expect(markup).toContain('66% good meal')
    expect(markup).toContain('Cook Suspicious-looking Vegetable · 66% good')
    expect(markup).toContain('Central Cafeteria active · 2 preparations/day')
  })

  it('lets a late-day bot prepare food in an available Kitchen for zero AP',()=>{
    let game=withKitchen(createInitialGame(9411,1),1,[item('meal','vegetable')])
    game={...game,clock:{hour:21,phase:'day'}}
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,controller:'basic-bot',ap:0}))
    const actions=getLegalActions(game,'c01')
    const decision=chooseTownWork(game,game.citizens[0],actions)
    expect(decision?.type).toBe('USE_HOME_KITCHEN')
    const result=executeCommand(game,decision!)
    expect(result.state.citizens[0].ap).toBe(0)
    expect(result.events.some((event)=>event.type==='HOME_KITCHEN_USED')).toBe(true)
  })
})
