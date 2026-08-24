import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { randomInt } from '../src/core/rng'
import { WOUND_LOCATIONS, citizenControlPoints, effectiveMaxAp, nightlyStatusEvents } from '../src/core/status'
import type { CitizenStatusState, GameCommand, GameState, ItemType, WoundLocation } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'
import { bankFromCounts } from './bankFixtures'

const bots=new BasicBotController()

function statusPatch(game:GameState,patch:Partial<CitizenStatusState>,citizenId='c01'):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?{...citizen,status:{...citizen.status,...patch}}:citizen)}
}
function citizenPatch(game:GameState,patch:Partial<GameState['citizens'][number]>,citizenId='c01'):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id===citizenId?{...citizen,...patch}:citizen)}
}
function inventory(game:GameState,types:readonly ItemType[],citizenId='c01'):GameState{
  return citizenPatch(game,{inventory:types.map((type,index)=>createItemInstance(`test-${index}`,type))},citizenId)
}
function itemAction(game:GameState,actionId:Extract<GameCommand,{type:'USE_ITEM_ACTION'}>['actionId'],citizenId='c01'):Extract<GameCommand,{type:'USE_ITEM_ACTION'}>{
  const action=getLegalActions(game,citizenId).find((candidate):candidate is Extract<GameCommand,{type:'USE_ITEM_ACTION'}>=>candidate.type==='USE_ITEM_ACTION'&&candidate.actionId===actionId)
  if(!action)throw new Error(`Missing item action ${actionId}`)
  return action
}
function outside(game:GameState,x=1,y=0,citizenId='c01'):GameState{
  return citizenPatch(game,{location:{type:'world',x,y}},citizenId)
}
function withZoneZombies(game:GameState,x:number,y:number,zombies:number):GameState{
  const key=zoneKey(x,y),zone=game.world.zones[key]
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,zombies}}}}
}
function failedLegSeed():number{
  for(let seed=1;seed<10000;seed+=1)if(randomInt(seed,1,100).value<=25)return seed
  throw new Error('No deterministic leg-failure seed found')
}

describe('MyHordes citizen condition foundation',()=>{
  it('starts every citizen with the complete neutral condition state',()=>{
    const game=createInitialGame(7101,3)
    expect(game.citizens.every((citizen)=>citizen.status.wound===null&&!citizen.status.infected&&!citizen.status.terrorized&&!citizen.status.drugged&&!citizen.status.addicted&&!citizen.status.drunk&&!citizen.status.hangover&&!citizen.status.immune)).toBe(true)
  })

  it('keeps all six source wound locations and reduces the normal AP cap by one',()=>{
    expect(WOUND_LOCATIONS).toEqual(['head','eye','arms','hands','leg','foot'])
    for(const wound of WOUND_LOCATIONS){
      const game=statusPatch(createInitialGame(7102,1),{wound})
      expect(effectiveMaxAp(game.citizens[0])).toBe(5)
    }
  })

  it('applies the wound penalty to food targets and the next day AP reset',()=>{
    let game=inventory(statusPatch(createInitialGame(7103,1),{wound:'eye'}),['tasty_looking_steak'])
    game=citizenPatch(game,{ap:0})
    const eat=getLegalActions(game,'c01').find((action)=>action.type==='EAT_ITEM')!
    game=executeCommand(game,eat).state
    expect(game.citizens[0].ap).toBe(6)
    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    expect(game.citizens[0].ap).toBe(5)
  })

  it('uses Bandage through the generic item-action pipeline and limits treatment to once per day',()=>{
    let game=inventory(statusPatch(createInitialGame(7104,1),{wound:'hands'}),['bandage','bandage'])
    game=executeCommand(game,itemAction(game,'bandage')).state
    expect(game.citizens[0].status.wound).toBeNull()
    expect(game.citizens[0].daily.woundTreated).toBe(true)
    expect(game.citizens[0].inventory.filter((item)=>item.type==='bandage')).toHaveLength(1)
    game=statusPatch(game,{wound:'foot'})
    expect(getLegalActions(game,'c01').some((action)=>action.type==='USE_ITEM_ACTION'&&action.actionId==='bandage')).toBe(false)
  })

  it('blocks gate and construction labor with an arms wound while leaving Workshop transforms separate',()=>{
    let game=createInitialGame(7105,1)
    game={...game,town:{...game.town,bank:bankFromCounts({twisted_plank:6,wrought_iron:4},'condition-arms')}}
    expect(getLegalActions(game,'c01').some((action)=>action.type==='OPEN_GATE')).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='CONTRIBUTE_CONSTRUCTION')).toBe(true)
    game=statusPatch(game,{wound:'arms'})
    expect(getLegalActions(game,'c01').some((action)=>action.type==='OPEN_GATE'||action.type==='CLOSE_GATE')).toBe(false)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='CONTRIBUTE_CONSTRUCTION')).toBe(false)
  })

  it('blocks hand-operated containers, combinations, melee and bare hands while preserving water-weapon exceptions',()=>{
    let town=inventory(statusPatch(createInitialGame(7106,1),{wound:'hands'}),['plastic_bag','water_ration'])
    const bag=town.citizens[0].home.storage.find((item)=>item.type==='doggy_bag')!
    town={...town,citizens:[{...town.citizens[0],home:{...town.citizens[0].home,storage:[bag]}}]}
    const townActions=getLegalActions(town,'c01')
    expect(townActions.some((action)=>action.type==='OPEN_CONTAINER')).toBe(false)
    expect(townActions.some((action)=>action.type==='COMBINE_ITEMS')).toBe(false)

    let field=inventory(outside(statusPatch(createInitialGame(7107,1),{wound:'hands'})),['human_bone','water_bomb'])
    field=withZoneZombies(field,1,0,1)
    const fieldActions=getLegalActions(field,'c01')
    expect(fieldActions.some((action)=>action.type==='ATTACK_BAREHANDED')).toBe(false)
    expect(fieldActions.some((action)=>action.type==='USE_WEAPON'&&field.citizens[0].inventory.find((item)=>item.id===action.itemId)?.type==='human_bone')).toBe(false)
    expect(fieldActions.some((action)=>action.type==='USE_WEAPON'&&field.citizens[0].inventory.find((item)=>item.id===action.itemId)?.type==='water_bomb')).toBe(true)
  })

  it('spends AP but can fail to move with a leg wound',()=>{
    let game=outside(statusPatch(createInitialGame(7108,1),{wound:'leg'}),0,0)
    game={...game,rngState:failedLegSeed()}
    const before=game.citizens[0].location
    const move=getLegalActions(game,'c01').find((action)=>action.type==='MOVE')!
    const result=executeCommand(game,move)
    expect(result.state.citizens[0].ap).toBe(5)
    expect(result.state.citizens[0].location).toEqual(before)
    expect(result.events.some((event)=>event.type==='WOUNDED_MOVEMENT_RESOLVED'&&event.failed)).toBe(true)
  })

  it('makes Terrorized citizens contribute zero control and preserves Valium as an emergency legal action',()=>{
    let game=inventory(outside(statusPatch(createInitialGame(7109,1),{terrorized:true})),['food','valium_shot'])
    game=withZoneZombies(game,1,0,1)
    expect(citizenControlPoints(game.citizens[0])).toBe(0)
    expect(zoneControl(game,1,0).trapped).toBe(true)
    const actions=getLegalActions(game,'c01')
    expect(actions.some((action)=>action.type==='EAT_ITEM')).toBe(false)
    expect(actions.some((action)=>action.type==='ATTACK_BAREHANDED')).toBe(false)
    expect(actions.some((action)=>action.type==='USE_ITEM_ACTION'&&action.actionId==='valium_shot')).toBe(true)
    game=executeCommand(game,itemAction(game,'valium_shot')).state
    expect(game.citizens[0].status.terrorized).toBe(false)
    expect(game.citizens[0].status.drugged).toBe(true)
  })

  it('turns an untreated wound into Infection, while temporary immunity protects that attack',()=>{
    let wounded=statusPatch(createInitialGame(7110,1),{wound:'foot'})
    const woundEvents=nightlyStatusEvents(wounded,()=>100)
    const woundChange=woundEvents.find((event)=>event.type==='CITIZEN_STATUS_CHANGED')
    expect(woundChange?.type).toBe('CITIZEN_STATUS_CHANGED')
    if(woundChange?.type==='CITIZEN_STATUS_CHANGED')expect(woundChange.status.infected).toBe(true)

    wounded=statusPatch(wounded,{immune:true})
    const immuneEvents=nightlyStatusEvents(wounded,()=>100)
    const immuneChange=immuneEvents.find((event)=>event.type==='CITIZEN_STATUS_CHANGED')
    expect(immuneChange?.type).toBe('CITIZEN_STATUS_CHANGED')
    if(immuneChange?.type==='CITIZEN_STATUS_CHANGED'){expect(immuneChange.status.infected).toBe(false);expect(immuneChange.status.immune).toBe(false)}
  })

  it('uses the source 50% Infection death threshold only for pre-existing Infection',()=>{
    const infected=statusPatch(createInitialGame(7111,1),{infected:true})
    expect(nightlyStatusEvents(infected,()=>50).some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='infection')).toBe(true)
    expect(nightlyStatusEvents(infected,()=>51).some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='infection')).toBe(false)
    const newlyWounded=statusPatch(createInitialGame(7112,1),{wound:'head'})
    expect(nightlyStatusEvents(newlyWounded,()=>1).some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='infection')).toBe(false)
  })

  it('makes the second drug use establish Addiction and enforces withdrawal on a later drug-free attack',()=>{
    let game=inventory(citizenPatch(createInitialGame(7113,1),{ap:0}),['anabolic_steroids','paracetoid'])
    game=executeCommand(game,itemAction(game,'anabolic_steroids')).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].status.drugged).toBe(true)
    expect(game.citizens[0].status.addicted).toBe(false)
    game=executeCommand(game,itemAction(game,'paracetoid')).state
    expect(game.citizens[0].status.addicted).toBe(true)

    const firstAttack=nightlyStatusEvents(game,()=>100)
    expect(firstAttack.some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='drug_withdrawal')).toBe(false)
    game=applyEvents(game,firstAttack)
    expect(game.citizens[0].status.addicted).toBe(true)
    expect(game.citizens[0].status.drugged).toBe(false)
    expect(nightlyStatusEvents(game,()=>100).some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='drug_withdrawal')).toBe(true)
  })

  it('lets Paracetoid cure Infection, grant immunity, and participate in the shared drug cycle',()=>{
    let game=inventory(statusPatch(createInitialGame(7114,1),{infected:true}),['paracetoid'])
    game=executeCommand(game,itemAction(game,'paracetoid')).state
    expect(game.citizens[0].status.infected).toBe(false)
    expect(game.citizens[0].status.immune).toBe(true)
    expect(game.citizens[0].status.drugged).toBe(true)
  })

  it('lets Valium clear Terror even when no other ordinary trapped action is legal',()=>{
    let game=inventory(statusPatch(createInitialGame(7115,1),{terrorized:true}),['valium_shot'])
    game=executeCommand(game,itemAction(game,'valium_shot')).state
    expect(game.citizens[0].status.terrorized).toBe(false)
    expect(game.citizens[0].status.drugged).toBe(true)

    game=inventory(createInitialGame(7116,1),['valium_shot'])
    game=executeCommand(game,itemAction(game,'valium_shot')).state
    expect(game.citizens[0].status.drugged).toBe(true)
  })

  it('progresses Drunk to Hangover, blocks more alcohol, then clears Hangover at the following attack',()=>{
    let game=inventory(citizenPatch(createInitialGame(7117,1),{ap:0}),['vodka_marinostov','wake_the_dead'])
    game=executeCommand(game,itemAction(game,'drink_alcohol')).state
    expect(game.citizens[0].ap).toBe(6)
    expect(game.citizens[0].status.drunk).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='USE_ITEM_ACTION'&&action.actionId==='drink_alcohol')).toBe(false)
    game=applyEvents(game,nightlyStatusEvents(game,()=>100))
    expect(game.citizens[0].status.drunk).toBe(false)
    expect(game.citizens[0].status.hangover).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='USE_ITEM_ACTION'&&action.actionId==='drink_alcohol')).toBe(false)
    game=applyEvents(game,nightlyStatusEvents(game,()=>100))
    expect(game.citizens[0].status.hangover).toBe(false)
  })

  it('keeps Dehydrated treatment separate from the Refreshed daily-water status',()=>{
    let game=inventory(citizenPatch(statusPatch(createInitialGame(7118,1),{hydration:'dehydrated'}),{ap:0}),['water_ration'])
    const drink=getLegalActions(game,'c01').find((action)=>action.type==='DRINK_ITEM')!
    game=executeCommand(game,drink).state
    expect(game.citizens[0].status.hydration).toBe('thirsty')
    expect(game.citizens[0].ap).toBe(0)
    expect(game.citizens[0].daily.drank).toBe(false)

    game=inventory(citizenPatch(createInitialGame(7119,1),{ap:0}),['water_ration'])
    game=executeCommand(game,getLegalActions(game,'c01').find((action)=>action.type==='DRINK_ITEM')!).state
    expect(game.citizens[0].daily.drank).toBe(true)
    expect(game.citizens[0].ap).toBe(6)
  })

  it('makes autonomous citizens use the same legal treatment actions as the human player',()=>{
    let game=inventory(statusPatch(createInitialGame(7120,2),{wound:'foot'},'c02'),['bandage'],'c02')
    expect(bots.decide(game,'c02')).toMatchObject({type:'USE_ITEM_ACTION',actionId:'bandage'})

    game=inventory(statusPatch(createInitialGame(7121,2),{infected:true},'c02'),['paracetoid'],'c02')
    expect(bots.decide(game,'c02')).toMatchObject({type:'USE_ITEM_ACTION',actionId:'paracetoid'})

    game=inventory(statusPatch(createInitialGame(7122,2),{terrorized:true},'c02'),['valium_shot'],'c02')
    expect(bots.decide(game,'c02')).toMatchObject({type:'USE_ITEM_ACTION',actionId:'valium_shot'})
  })
})
