import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { HOME_IMPROVEMENTS } from '../src/core/home'
import { createInitialGame } from '../src/core/game'
import type { Citizen, GameState } from '../src/core/types'

function updateCitizen(game:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}}

describe('citizen home social interactions',()=>{
  it('discreetly deposits a carried item into another living citizen home',()=>{
    let game=createInitialGame(5101,2)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,inventory:[{id:'gift',type:'twisted_plank'}]}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DEPOSIT_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='gift')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].inventory.some((item)=>item.id==='gift')).toBe(false)
    expect(game.citizens[1].home.storage.some((item)=>item.id==='gift')).toBe(true)
    expect(game.events.at(-1)?.type).toBe('HOME_ITEM_DEPOSITED')
  })

  it('allows one ordinary theft per day only while the living resident is outside',()=>{
    let game=createInitialGame(5102,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0},home:{...citizen.home,storage:[...citizen.home.storage,{id:'loot',type:'wrought_iron'}]}}))
    const theft=getLegalActions(game,'c01').find((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='loot')
    expect(theft).toBeTruthy()
    game=executeCommand(game,theft!).state
    expect(game.citizens[0].inventory.some((item)=>item.id==='loot')).toBe(true)
    expect(game.citizens[1].home.storage.some((item)=>item.id==='loot')).toBe(false)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='STEAL_HOME_ITEM')).toBe(false)

    let residentHome=createInitialGame(5103,2)
    residentHome=updateCitizen(residentHome,'c02',(citizen)=>({...citizen,home:{...citizen.home,storage:[...citizen.home.storage,{id:'loot2',type:'wrought_iron'}]}}))
    expect(getLegalActions(residentHome,'c01').some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02')).toBe(false)
  })

  it('uses Curtain intrusion and Rudimentary Alarm before exposing a living chest',()=>{
    let game=createInitialGame(5104,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0},home:{...citizen.home,improvements:{...citizen.home.improvements,curtain:1,alarm:1},storage:[...citizen.home.storage,{id:'hidden',type:'scrap_metal'}]}}))
    let actions=getLegalActions(game,'c01')
    expect(actions.some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02')).toBe(false)
    const intrude=actions.find((candidate)=>candidate.type==='INTRUDE_HOME'&&candidate.targetCitizenId==='c02')
    expect(intrude).toBeTruthy()
    const result=executeCommand(game,intrude!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_INTRUSION_ATTEMPTED')
    expect(event&&event.type==='HOME_INTRUSION_ATTEMPTED'&&event.success).toBe(true)
    expect(event&&event.type==='HOME_INTRUSION_ATTEMPTED'&&event.alarmed).toBe(true)
    game=result.state
    actions=getLegalActions(game,'c01')
    expect(actions.some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='hidden')).toBe(true)
  })

  it('keeps structural defense separate from Lock theft protection',()=>{
    let game=createInitialGame(5105,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0},home:{...citizen.home,level:'fenced_house',defense:25,storage:[...citizen.home.storage,{id:'open-loot',type:'scrap_metal'}]}}))
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='open-loot')).toBe(true)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,home:{...citizen.home,improvements:{...citizen.home.improvements,lock:1}}}))
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02')).toBe(false)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='INTRUDE_HOME'&&candidate.targetCitizenId==='c02')).toBe(false)
  })

  it('pillages one item per day from a dead citizen independently of ordinary theft',()=>{
    let game=createInitialGame(5106,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,alive:false,ap:0,home:{...citizen.home,storage:[...citizen.home.storage,{id:'dead-loot',type:'twisted_plank'}]}}))
    const pillage=getLegalActions(game,'c01').find((candidate)=>candidate.type==='PILLAGE_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='dead-loot')
    expect(pillage).toBeTruthy()
    game=executeCommand(game,pillage!).state
    expect(game.citizens[0].inventory.some((item)=>item.id==='dead-loot')).toBe(true)
    expect(game.citizens[1].home.storage.some((item)=>item.id==='dead-loot')).toBe(false)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='PILLAGE_HOME_ITEM')).toBe(false)
  })
})

describe('citizen home progression and works',()=>{
  it('fails closed on a structural tier with an unmodeled source requirement',()=>{
    let game=createInitialGame(5201,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:6,home:{...citizen.home,level:'house',defense:16,upgradedDay:null},inventory:[{id:'p1',type:'twisted_plank'},{id:'p2',type:'twisted_plank'},{id:'m1',type:'scrap_metal'},{id:'m2',type:'scrap_metal'},{id:'beam',type:'patchwork_beam'}]}))
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='UPGRADE_HOME')).toBe(false)
  })

  it('uses Wire Mesh for source-backed Reinforcements level 2',()=>{
    let game=createInitialGame(5202,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:6,inventory:[{id:'mesh',type:'wire_mesh'}],home:{...citizen.home,level:'tent',defense:1,improvements:{...citizen.home.improvements,reinforcements:1}}}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='reinforcements')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].home.improvements.reinforcements).toBe(2)
    expect(game.citizens[0].inventory.some((item)=>item.id==='mesh')).toBe(false)
  })

  it('builds the Alarm and records its installed level',()=>{
    let game=createInitialGame(5203,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:6,inventory:[{id:'metal',type:'scrap_metal'}],home:{...citizen.home,level:'tent',defense:1}}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='alarm')
    expect(action).toBeTruthy()
    game=executeCommand(game,action!).state
    expect(game.citizens[0].home.improvements.alarm).toBe(1)
    expect(game.citizens[0].inventory.some((item)=>item.id==='metal')).toBe(false)
  })

  it('uses Siesta at most once per day and applies its event result',()=>{
    let game=createInitialGame(5204,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:2,home:{...citizen.home,level:'tent',defense:1,improvements:{...citizen.home.improvements,siesta:1}}}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_SIESTA')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_SIESTA_USED')
    expect(event&&event.type==='HOME_SIESTA_USED'&&event.chance).toBe(33)
    expect(event&&event.type==='HOME_SIESTA_USED'&&result.state.citizens[0].ap===event.apAfter).toBe(true)
    expect(getLegalActions(result.state,'c01').some((candidate)=>candidate.type==='USE_HOME_SIESTA')).toBe(false)
  })

  it('catalogues Kitchen and Laboratory while their missing subsystems fail closed',()=>{
    expect(HOME_IMPROVEMENTS.kitchen.effectReady).toBe(false)
    expect(HOME_IMPROVEMENTS.laboratory.effectReady).toBe(false)
    let game=createInitialGame(5205,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:6,home:{...citizen.home,level:'tent',defense:1}}))
    const actions=getLegalActions(game,'c01')
    expect(actions.some((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='kitchen')).toBe(false)
    expect(actions.some((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='laboratory')).toBe(false)
  })
})
