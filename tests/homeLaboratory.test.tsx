import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { chooseTownWork } from '../src/agents/townWork'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTIONS, constructionImplementationStatus, constructionPlayable } from '../src/core/construction'
import { HOME_LAB_FAILURE_OUTPUTS, homeLabBaseDailyUses, homeLabDailyUseLimit, homeLabSuccessChance, homeLabUsesToday, resolveHomeLabUse } from '../src/core/drugLab'
import { createInitialGame } from '../src/core/game'
import { HOME_IMPROVEMENTS } from '../src/core/home'
import { NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import type { Citizen, GameState, ItemInstance } from '../src/core/types'
import { HomeView } from '../src/ui/components/HomeView'

function pharma(id:string):ItemInstance{return{id,type:'pharmaceutical_products'}}
function updateCitizen(game:GameState,citizenId:string,update:(citizen:Citizen)=>Citizen):GameState{return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?update(citizen):citizen)}}
function withLab(game:GameState,level:number,pharmaCount=2):GameState{return updateCitizen(game,'c01',(citizen)=>({...citizen,home:{...citizen.home,level:'tent',defense:1,improvements:{...citizen.home.improvements,laboratory:level}},inventory:Array.from({length:pharmaCount},(_,index)=>pharma(`p${index+1}`))}))}
function withCentralLab(game:GameState):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,central_laboratory:{...game.town.construction.central_laboratory,discovered:true,completed:true}}}}}

describe('Home Laboratory progression',()=>{
  it('uses the source-backed four-level costs and activates Central Laboratory as a real project',()=>{
    const lab=HOME_IMPROVEMENTS.laboratory
    expect(lab.name).toBe('Home Laboratory')
    expect(lab.status).toBe('implemented')
    expect(lab.effectReady).toBe(true)
    expect([1,2,3,4].map((level)=>lab.apCost(level))).toEqual([6,4,4,6])
    expect(lab.resources(1)).toEqual({old_washing_machine:1})
    expect(lab.resources(2)).toEqual({electronic_component:1})
    expect(lab.resources(3)).toEqual({copper_pipe:1})
    expect(lab.resources(4)).toEqual({engine:1})

    const central=CONSTRUCTIONS.central_laboratory
    expect(central.apCost).toBe(20)
    expect(central.resources).toEqual({
      nuts_and_bolts:1,
      pharmaceutical_products:4,
      patchwork_beam:5,
      metal_support:5,
      bag_of_damp_grass:2,
      convex_lens:1,
      old_washing_machine:1,
    })
    expect(constructionImplementationStatus('central_laboratory')).toBe('implemented')
    expect(constructionPlayable('central_laboratory')).toBe(true)
  })

  it('uses 25/50/75/100% Twinoid chances with 1/1/1/4 base daily uses',()=>{
    const game=createInitialGame(9301,1)
    const rows=[1,2,3,4].map((level)=>{
      const state=withLab(game,level)
      const citizen=state.citizens[0]
      return[chanceOrZero(homeLabSuccessChance(citizen)),homeLabBaseDailyUses(citizen)]
    })
    expect(rows).toEqual([[25,1],[50,1],[75,1],[100,4]])
  })

  it('consumes exactly two Pharmaceutical Products, costs 0 AP, records the use, and respects the daily limit',()=>{
    let game=withLab(createInitialGame(9302,1),1,2)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,ap:3}))
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_LAB')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    const event=result.events.find((candidate)=>candidate.type==='HOME_LAB_USED')
    expect(event&&event.type==='HOME_LAB_USED'&&event.successChance).toBe(25)
    expect(result.state.citizens[0].ap).toBe(3)
    expect(result.state.citizens[0].inventory.filter((item)=>item.type==='pharmaceutical_products')).toHaveLength(0)
    expect(result.state.citizens[0].inventory).toHaveLength(1)
    expect(homeLabUsesToday(result.state,'c01')).toBe(1)
    expect(getLegalActions(result.state,'c01').some((candidate)=>candidate.type==='USE_HOME_LAB')).toBe(false)
  })

  it('makes level 4 a guaranteed Twinoid result and keeps the roll deterministic',()=>{
    const game=withLab(createInitialGame(9303,1),4,2)
    const first=resolveHomeLabUse(game,game.citizens[0])
    const second=resolveHomeLabUse(game,game.citizens[0])
    expect(first).toEqual(second)
    expect(first.success).toBe(true)
    expect(first.successChance).toBe(100)
    expect(first.output.type).toBe('twinoid_500mg')
    expect(first.rngStateAfter).not.toBe(game.rngState)
  })

  it('uses only the five source lesser-drug outputs on failed experiments',()=>{
    expect(HOME_LAB_FAILURE_OUTPUTS).toEqual(['anabolic_steroids','valium_shot','unlabelled_drug','hydratone_100mg','water_purifying_tablets'])
    const allowed=new Set(HOME_LAB_FAILURE_OUTPUTS)
    const observed=new Set<string>()
    for(let rngState=1;rngState<=500;rngState+=1){
      const game={...withLab(createInitialGame(9304,1),1,2),rngState}
      const event=resolveHomeLabUse(game,game.citizens[0])
      if(!event.success){expect(allowed.has(event.output.type)).toBe(true);observed.add(event.output.type)}
    }
    expect(observed.size).toBeGreaterThan(1)
  })

  it('adds five daily uses from Central Laboratory without changing the success chance',()=>{
    let game=withCentralLab(withLab(createInitialGame(9305,1),1,12))
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,home:{...citizen.home,storageCapacity:20}}))
    expect(homeLabDailyUseLimit(game,game.citizens[0])).toBe(6)
    expect(homeLabSuccessChance(game.citizens[0])).toBe(25)
    for(let use=0;use<6;use+=1){
      const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_HOME_LAB')
      expect(action,`use ${use+1}`).toBeTruthy()
      game=executeCommand(game,action!).state
    }
    expect(homeLabUsesToday(game,'c01')).toBe(6)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='USE_HOME_LAB')).toBe(false)

    const level4=withCentralLab(withLab(createInitialGame(9306,1),4,18))
    expect(homeLabDailyUseLimit(level4,level4.citizens[0])).toBe(9)
  })

  it('keeps the washing machine reachable and water tablets non-drug components',()=>{
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('old_washing_machine')
    let game=createInitialGame(9307,1)
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,inventory:[{id:'tabs',type:'water_purifying_tablets'}]}))
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='USE_ITEM_ACTION'&&candidate.itemId==='tabs')).toBe(false)
  })
})

describe('Home Laboratory player and bot parity',()=>{
  it('renders compact experiment state in the Home Works tab',()=>{
    const game=withCentralLab(withLab(createInitialGame(9310,1),2,2))
    const markup=renderToStaticMarkup(<HomeView game={game} citizenId="c01" legalActions={getLegalActions(game,'c01')} act={()=>{}} initialTab="works"/>)
    expect(markup).toContain('Home Laboratory')
    expect(markup).toContain('50% Twinoid')
    expect(markup).toContain('Experiment · 0 AP · 50% Twinoid')
    expect(markup).toContain('Central Laboratory active · 6 uses/day')
    expect(markup).toContain('Pharmaceutical Products')
  })

  it('lets a late-day bot use an available Lab without spending reserved AP',()=>{
    let game=withLab(createInitialGame(9311,1),1,2)
    game={...game,clock:{hour:21,phase:'day'}}
    game=updateCitizen(game,'c01',(citizen)=>({...citizen,controller:'basic-bot',ap:0}))
    const actions=getLegalActions(game,'c01')
    const decision=chooseTownWork(game,game.citizens[0],actions)
    expect(decision?.type).toBe('USE_HOME_LAB')
    const result=executeCommand(game,decision!)
    expect(result.state.citizens[0].ap).toBe(0)
    expect(result.events.some((event)=>event.type==='HOME_LAB_USED')).toBe(true)
  })
})

function chanceOrZero(value:number):number{return value||0}
