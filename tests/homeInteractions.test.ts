import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { HOME_IMPROVEMENTS } from '../src/core/home'
import { createInitialGame } from '../src/core/game'
import type { Citizen, GameState } from '../src/core/types'

function updateCitizen(game:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}}
function hasForeignTransfer(game:GameState,citizenId:string):boolean{return getLegalActions(game,citizenId).some((candidate)=>['DEPOSIT_HOME_ITEM','STEAL_HOME_ITEM','PILLAGE_HOME_ITEM'].includes(candidate.type))}

describe('citizen home social interactions',()=>{
  it('allows one discreet deposit only while the living resident is outside and persists its detection roll',()=>{
    let game=createInitialGame(5101,2)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,inventory:[{id:'gift',type:'twisted_plank'}]}))
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0}}))
    const rngBefore=game.rngState
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DEPOSIT_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='gift')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    game=result.state
    const event=result.events.find((candidate)=>candidate.type==='HOME_ITEM_DEPOSITED')
    expect(game.citizens[0].inventory.some((item)=>item.id==='gift')).toBe(false)
    expect(game.citizens[1].home.storage.some((item)=>item.id==='gift')).toBe(true)
    expect(event&&event.type==='HOME_ITEM_DEPOSITED'&&typeof event.spotted==='boolean').toBe(true)
    expect(event&&event.type==='HOME_ITEM_DEPOSITED'&&game.rngState===event.rngStateAfter).toBe(true)
    expect(game.rngState).not.toBe(rngBefore)
    expect(hasForeignTransfer(game,'c01')).toBe(false)

    let residentHome=createInitialGame(5100,2)
    residentHome=updateCitizen(residentHome,'c01',(citizen)=>({...citizen,inventory:[{id:'gift2',type:'twisted_plank'}]}))
    expect(getLegalActions(residentHome,'c01').some((candidate)=>candidate.type==='DEPOSIT_HOME_ITEM'&&candidate.targetCitizenId==='c02')).toBe(false)
  })

  it('allows ordinary theft only while an unprotected living resident is outside',()=>{
    let game=createInitialGame(5102,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0},home:{...citizen.home,storage:[...citizen.home.storage,{id:'loot',type:'wrought_iron'}]}}))
    const rngBefore=game.rngState
    const theft=getLegalActions(game,'c01').find((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='loot')
    expect(theft).toBeTruthy()
    const result=executeCommand(game,theft!)
    game=result.state
    const event=result.events.find((candidate)=>candidate.type==='HOME_ITEM_STOLEN')
    expect(game.citizens[0].inventory.some((item)=>item.id==='loot')).toBe(true)
    expect(game.citizens[1].home.storage.some((item)=>item.id==='loot')).toBe(false)
    expect(event&&event.type==='HOME_ITEM_STOLEN'&&typeof event.spotted==='boolean').toBe(true)
    expect(event&&event.type==='HOME_ITEM_STOLEN'&&game.rngState===event.rngStateAfter).toBe(true)
    expect(game.rngState).not.toBe(rngBefore)
    expect(hasForeignTransfer(game,'c01')).toBe(false)

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
    const intrusion=executeCommand(game,intrude!)
    const intrusionEvent=intrusion.events.find((candidate)=>candidate.type==='HOME_INTRUSION_ATTEMPTED')
    expect(intrusionEvent&&intrusionEvent.type==='HOME_INTRUSION_ATTEMPTED'&&intrusionEvent.success).toBe(true)
    expect(intrusionEvent&&intrusionEvent.type==='HOME_INTRUSION_ATTEMPTED'&&intrusionEvent.alarmed).toBe(true)
    game=intrusion.state
    actions=getLegalActions(game,'c01')
    const theft=actions.find((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='hidden')
    expect(theft).toBeTruthy()
    const rngBefore=game.rngState
    const theftResult=executeCommand(game,theft!)
    const theftEvent=theftResult.events.find((candidate)=>candidate.type==='HOME_ITEM_STOLEN')
    expect(theftEvent&&theftEvent.type==='HOME_ITEM_STOLEN'&&theftEvent.spotted).toBe(true)
    expect(theftResult.state.rngState).toBe(rngBefore)
  })

  it('treats Fenced House tiers and the Lock work as ordinary anti-theft protection',()=>{
    let openHome=createInitialGame(5105,2)
    openHome=updateCitizen(openHome,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0},home:{...citizen.home,level:'house',defense:16,storage:[...citizen.home.storage,{id:'open-loot',type:'scrap_metal'}]}}))
    expect(getLegalActions(openHome,'c01').some((candidate)=>candidate.type==='STEAL_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='open-loot')).toBe(true)

    let fenced=openHome
    fenced=updateCitizen(fenced,'c02',(citizen)=>({...citizen,home:{...citizen.home,level:'fenced_house',defense:25}}))
    expect(getLegalActions(fenced,'c01').some((candidate)=>['DEPOSIT_HOME_ITEM','STEAL_HOME_ITEM','INTRUDE_HOME'].includes(candidate.type)&&'targetCitizenId'in candidate&&candidate.targetCitizenId==='c02')).toBe(false)

    let locked=openHome
    locked=updateCitizen(locked,'c02',(citizen)=>({...citizen,home:{...citizen.home,improvements:{...citizen.home.improvements,lock:1}}}))
    expect(getLegalActions(locked,'c01').some((candidate)=>['DEPOSIT_HOME_ITEM','STEAL_HOME_ITEM','INTRUDE_HOME'].includes(candidate.type)&&'targetCitizenId'in candidate&&candidate.targetCitizenId==='c02')).toBe(false)
  })

  it('shares one daily transfer allowance across deposit, theft and pillage',()=>{
    let game=createInitialGame(5106,3)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,inventory:[{id:'gift',type:'twisted_plank'}]}))
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,location:{type:'world',x:0,y:0}}))
    game=updateCitizen(game,'c03',(citizen)=>({...citizen,alive:false,ap:0,home:{...citizen.home,storage:[...citizen.home.storage,{id:'dead-loot',type:'wrought_iron'}]}}))
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='PILLAGE_HOME_ITEM'&&candidate.targetCitizenId==='c03')).toBe(true)
    const deposit=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DEPOSIT_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='gift')
    expect(deposit).toBeTruthy()
    game=executeCommand(game,deposit!).state
    expect(hasForeignTransfer(game,'c01')).toBe(false)
  })

  it('always identifies pillage without consuming RNG',()=>{
    let game=createInitialGame(5107,2)
    game=updateCitizen(game,'c02',(citizen)=>({...citizen,alive:false,ap:0,home:{...citizen.home,storage:[...citizen.home.storage,{id:'dead-loot',type:'twisted_plank'}]}}))
    const pillage=getLegalActions(game,'c01').find((candidate)=>candidate.type==='PILLAGE_HOME_ITEM'&&candidate.targetCitizenId==='c02'&&candidate.itemId==='dead-loot')
    expect(pillage).toBeTruthy()
    const rngBefore=game.rngState
    const result=executeCommand(game,pillage!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_ITEM_PILLAGED')
    expect(event&&event.type==='HOME_ITEM_PILLAGED'&&event.spotted).toBe(true)
    expect(result.state.rngState).toBe(rngBefore)
    expect(result.state.citizens[0].inventory.some((item)=>item.id==='dead-loot')).toBe(true)
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

  it('uses Siesta at most once per day, only below full AP, and applies its event result',()=>{
    let full=createInitialGame(5204,1)
    full=updateCitizen(full,'c01',(citizen)=>({...citizen,ap:citizen.maxAp,home:{...citizen.home,level:'tent',defense:1,improvements:{...citizen.home.improvements,siesta:1}}}))
    expect(getLegalActions(full,'c01').some((candidate)=>candidate.type==='USE_HOME_SIESTA')).toBe(false)

    let game=updateCitizen(full,'c01',(citizen)=>({...citizen,ap:2}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_SIESTA')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_SIESTA_USED')
    expect(event&&event.type==='HOME_SIESTA_USED'&&event.chance).toBe(33)
    expect(event&&event.type==='HOME_SIESTA_USED'&&result.state.citizens[0].ap===event.apAfter).toBe(true)
    expect(getLegalActions(result.state,'c01').some((candidate)=>candidate.type==='USE_HOME_SIESTA')).toBe(false)
  })

  it('keeps Kitchen and Home Laboratory buildable from their source-backed level-1 requirements',()=>{
    expect(HOME_IMPROVEMENTS.kitchen.effectReady).toBe(true)
    expect(HOME_IMPROVEMENTS.laboratory.effectReady).toBe(true)
    let game=createInitialGame(5205,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:6,inventory:[{id:'washer',type:'old_washing_machine'}],home:{...citizen.home,level:'tent',defense:1}}))
    const actions=getLegalActions(game,'c01')
    expect(actions.some((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='kitchen')).toBe(true)
    const lab=actions.find((candidate)=>candidate.type==='BUILD_HOME_IMPROVEMENT'&&candidate.improvementId==='laboratory')
    expect(lab).toBeTruthy()
    game=executeCommand(game,lab!).state
    expect(game.citizens[0].home.improvements.laboratory).toBe(1)
    expect(game.citizens[0].inventory.some((item)=>item.id==='washer')).toBe(false)
    expect(game.citizens[0].ap).toBe(0)
  })
})