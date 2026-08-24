import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING } from '../src/core/myhordesLootMapping'
import type { GameCommand, GameState, ItemType } from '../src/core/types'
import { zoneControlState } from '../src/core/world'

const bots=new BasicBotController()

function patchCitizen(game:GameState,id:string,patch:Partial<GameState['citizens'][number]>):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id===id?{...citizen,...patch}:citizen)}
}
function trappedOutside(game:GameState,id='c01',hour=10):GameState{
  game={...game,clock:{hour,phase:'day'}}
  game=patchCitizen(game,id,{location:{type:'world',x:1,y:0}})
  return{...game,world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],discovered:true,zombies:3}}}}
}
function itemAction(game:GameState,id:string,actionId:Extract<GameCommand,{type:'USE_ITEM_ACTION'}>['actionId']):Extract<GameCommand,{type:'USE_ITEM_ACTION'}>{
  const action=getLegalActions(game,id).find((candidate):candidate is Extract<GameCommand,{type:'USE_ITEM_ACTION'}>=>candidate.type==='USE_ITEM_ACTION'&&candidate.actionId===actionId)
  if(!action)throw new Error('Missing '+actionId)
  return action
}
function combination(game:GameState,id:string,recipeId:Extract<GameCommand,{type:'COMBINE_ITEMS'}>['recipeId']):Extract<GameCommand,{type:'COMBINE_ITEMS'}>{
  const action=getLegalActions(game,id).find((candidate):candidate is Extract<GameCommand,{type:'COMBINE_ITEMS'}>=>candidate.type==='COMBINE_ITEMS'&&candidate.recipeId===recipeId)
  if(!action)throw new Error('Missing '+recipeId)
  return action
}
function inventory(game:GameState,id:string,types:readonly ItemType[]):GameState{
  return patchCitizen(game,id,{inventory:types.map((type,index)=>createItemInstance('wound-source-'+index,type))})
}

describe('source-backed wound acquisition',()=>{
  it('lets a trapped unwounded citizen flee for a guaranteed wound and personal relative control',()=>{
    let game=trappedOutside(createInitialGame(8201,1))
    expect(zoneControlState(game,1,0,'c01')).toBe('trapped')
    const flee=getLegalActions(game,'c01').find((action)=>action.type==='FLEE_ZOMBIES')
    expect(flee).toBeTruthy()
    const beforeAp=game.citizens[0].ap
    game=executeCommand(game,flee!).state
    const citizen=game.citizens[0]
    expect(citizen.ap).toBe(beforeAp)
    expect(citizen.status.wound).not.toBeNull()
    expect(citizen.relativeControl).toEqual({zoneKey:'1,0'})
    expect(zoneControlState(game,1,0,'c01')).toBe('relative')
    const actions=getLegalActions(game,'c01')
    expect(actions.some((action)=>action.type==='MOVE')).toBe(true)
    expect(actions.some((action)=>action.type==='SEARCH_ZONE'||action.type==='SEARCH_SPECIAL_SITE'||action.type==='EXCAVATE_SPECIAL_SITE')).toBe(false)
    expect(actions.some((action)=>action.type==='FLEE_ZOMBIES')).toBe(false)
  })

  it('keeps relative control through time but clears it when the citizen leaves or actual control returns',()=>{
    let game=trappedOutside(createInitialGame(8202,1))
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='FLEE_ZOMBIES')!).state
    game=applyEvents(game,[{type:'TIME_ADVANCED',day:game.day,fromHour:10,toHour:11,phase:'day'}])
    expect(game.citizens[0].relativeControl).toEqual({zoneKey:'1,0'})
    game=applyEvents(game,[{type:'ZONE_CONTROL_RESTORED',day:game.day,zoneKey:'1,0',reason:'combat'}])
    expect(game.citizens[0].relativeControl).toBeNull()

    game=trappedOutside(createInitialGame(8203,1))
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='FLEE_ZOMBIES')!).state
    game=applyEvents(game,[{type:'CITIZEN_LOCATION_CHANGED',day:game.day,citizenId:'c01',location:{type:'world',x:0,y:0},desertStep:true}])
    expect(game.citizens[0].relativeControl).toBeNull()
  })

  it('does not allow Flee while already Wounded or Terrorized',()=>{
    let wounded=trappedOutside(createInitialGame(8204,1))
    wounded=patchCitizen(wounded,'c01',{status:{...wounded.citizens[0].status,wound:'foot'}})
    expect(getLegalActions(wounded,'c01').some((action)=>action.type==='FLEE_ZOMBIES')).toBe(false)

    let terror=trappedOutside(createInitialGame(8205,1))
    terror=patchCitizen(terror,'c01',{status:{...terror.citizens[0].status,terrorized:true}})
    expect(getLegalActions(terror,'c01').some((action)=>action.type==='FLEE_ZOMBIES')).toBe(false)
  })

  it('can naturally produce a wound by fleeing and then treat it with a Bandage',()=>{
    let game=inventory(trappedOutside(createInitialGame(8206,1)),'c01',['bandage'])
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='FLEE_ZOMBIES')!).state
    expect(game.citizens[0].status.wound).not.toBeNull()
    game=executeCommand(game,itemAction(game,'c01','bandage')).state
    expect(game.citizens[0].status.wound).toBeNull()
  })

  it('charges an EMS with one Battery at 0 AP while preserving the EMS identity',()=>{
    let game=inventory(createInitialGame(8207,1),'c01',['ems_system_empty','battery'])
    const emsId=game.citizens[0].inventory.find((item)=>item.type==='ems_system_empty')!.id
    const beforeAp=game.citizens[0].ap
    game=executeCommand(game,combination(game,'c01','load_ems_battery')).state
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory.some((item)=>item.id===emsId&&item.type==='ems_system_charged')).toBe(true)
    expect(game.citizens[0].inventory.some((item)=>item.type==='battery')).toBe(false)
  })

  it('uses the charged EMS to restore toward 6 AP, guarantee a wound, and discharge the same unit',()=>{
    let game=inventory(createInitialGame(8208,1),'c01',['ems_system_charged'])
    const emsId=game.citizens[0].inventory[0].id
    game=patchCitizen(game,'c01',{ap:0})
    game=executeCommand(game,itemAction(game,'c01','ems_system')).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].status.wound).not.toBeNull()
    expect(game.citizens[0].inventory.some((item)=>item.id===emsId&&item.type==='ems_system_empty')).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='USE_ITEM_ACTION'&&action.actionId==='ems_system')).toBe(false)
  })

  it('makes the discharged EMS an active ordinary scavenging item with the source mapping represented',()=>{
    expect(NORMAL_SCAVENGE_LOOT_POOL.filter((type)=>type==='ems_system_empty')).toHaveLength(4)
    expect(MYHORDES_NORMAL_LOOT_MAPPING['sport_elec_empty_#00']).toEqual({type:'ems_system_empty'})
  })

  it('lets bots wait for rescue early, then choose the same Flee action late and head toward town',()=>{
    let game=trappedOutside(createInitialGame(8209,2),'c02',10)
    expect(bots.decide(game,'c02')?.type).not.toBe('FLEE_ZOMBIES')
    game={...game,clock:{hour:20,phase:'day'}}
    const flee=bots.decide(game,'c02')
    expect(flee?.type).toBe('FLEE_ZOMBIES')
    game=executeCommand(game,flee!).state
    const escape=bots.decide(game,'c02')
    expect(escape?.type).toBe('MOVE')
    if(escape?.type==='MOVE')expect(escape.direction).toBe('WEST')
  })
})
