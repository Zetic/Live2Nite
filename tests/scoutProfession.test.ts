import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createAgentDecisionContext } from '../src/agents/AgentDecisionContext'
import { getLegalActions } from '../src/core/actions'
import { campingChancePercent } from '../src/core/camping'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { citizenEquipment, equipCitizenProfession, hasProfession } from '../src/core/professions'
import { enterRuin } from '../src/core/ruinExploration'
import { ruinOxygenSecondsForCitizen, searchSuccessChancePercent } from '../src/core/scavenging'
import {
  SCOUT_BASE_POINTS,
  SCOUTS_LAIR_SCOUT_BONUS,
  isScout,
  scoutCamouflageActive,
  scoutLevel,
  scoutPointsAvailable,
  scoutZombieEstimate,
} from '../src/core/scout'
import { enterRuinWithScout } from '../src/core/scoutRuin'
import type { BotMissionAssignment, Citizen, GameEvent, GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function replaceCitizen(game:GameState,citizen:Citizen):GameState{return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}}
function outside(game:GameState,x:number,y:number,patch:Partial<Citizen>={}):GameState{
  const base=game.citizens[0]
  return replaceCitizen(game,{...base,location:{type:'world',x,y},ap:6,status:{...base.status,wound:null,terrorized:false},camping:{...base.camping,hidden:false},...patch})
}
function zone(game:GameState,x:number,y:number,patch:Partial<WorldZone>={}):GameState{
  const key=zoneKey(x,y),base=game.world.zones[key]
  if(!base)throw new Error(`Missing test zone ${key}`)
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...base,discovered:true,...patch}}}}
}
function deactivate(game:GameState,citizenId='c01'):GameState{return applyEvents(game,[{type:'SCOUT_CAMOUFLAGE_SET',day:game.day,hour:game.clock.hour,citizenId,active:false,reason:'detected'}])}
function completeScoutsLair(game:GameState):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,scouts_lair:{...game.town.construction.scouts_lair,discovered:true,completed:true,apContributed:game.town.construction.scouts_lair.apContributed}}}}}
function moveAction(game:GameState,direction:'NORTH'|'SOUTH'|'EAST'|'WEST'){
  const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='MOVE'&&candidate.direction===direction)
  if(!action)throw new Error(`Missing ${direction} move`)
  return action
}
function mission(overrides:Partial<BotMissionAssignment>={}):BotMissionAssignment{return{missionId:'scout-test',role:'scout',purpose:'explore',target:{x:2,y:0},targetLabel:'scout route',reason:'test',phase:'outbound',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:false,overnightPlanned:false,...overrides}}

describe('Scout profession',()=>{
  it('derives Scout identity from the Camouflage Suit even while camouflage is inactive',()=>{
    let game=createInitialGame(7201,1,'scout')
    const item=citizenEquipment(game.citizens[0])?.professionItem
    expect(item?.type).toBe('profession_camouflage_suit')
    expect(scoutCamouflageActive(game.citizens[0])).toBe(true)
    game=deactivate(game)
    expect(scoutCamouflageActive(game.citizens[0])).toBe(false)
    expect(isScout(game.citizens[0])).toBe(true)
    expect(hasProfession(game.citizens[0],'scout')).toBe(true)
  })

  it('starts Scouts with 2 SP and spends AP before 3 km, then SP first from 3 km onward with AP fallback',()=>{
    let near=outside(createInitialGame(7202,1,'scout'),2,0)
    near=zone(near,2,0,{zombies:0});near=zone(near,3,0,{zombies:0})
    expect(scoutPointsAvailable(near.citizens[0])).toBe(SCOUT_BASE_POINTS)
    let result=executeCommand(near,moveAction(near,'EAST'))
    expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(true)
    expect(result.events.some((event)=>event.type==='SCOUT_POINTS_SPENT')).toBe(false)
    expect(result.state.citizens[0].ap).toBe(5)
    expect(scoutPointsAvailable(result.state.citizens[0])).toBe(2)

    let far=outside(createInitialGame(7203,1,'scout'),3,0,{ap:4,scoutPoints:2})
    far=zone(far,3,0,{zombies:0});far=zone(far,4,0,{zombies:0})
    result=executeCommand(far,moveAction(far,'EAST'))
    expect(result.events.some((event)=>event.type==='SCOUT_POINTS_SPENT')).toBe(true)
    expect(result.state.citizens[0].ap).toBe(4)
    expect(scoutPointsAvailable(result.state.citizens[0])).toBe(1)

    far=outside(far,3,0,{ap:4,scoutPoints:0})
    result=executeCommand(far,moveAction(far,'EAST'))
    expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(true)
    expect(result.state.citizens[0].ap).toBe(3)
  })

  it('maps the wasteland once per day and gives Scouts 4 bonus SP on the next day',()=>{
    let game=completeScoutsLair(createInitialGame(7204,1,'scout'))
    const map=getLegalActions(game,'c01').find((action)=>action.type==='MAP_WASTELAND')
    expect(map).toBeDefined()
    if(!map)return
    game=executeCommand(game,map).state
    expect(game.citizens[0].ap).toBe(5)
    expect(game.citizens[0].scoutPointBonusNextDay).toBe(SCOUTS_LAIR_SCOUT_BONUS)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='MAP_WASTELAND')).toBe(false)
    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    expect(scoutPointsAvailable(game.citizens[0])).toBe(6)
    expect(game.citizens[0].scoutPointBonusNextDay).toBe(0)
  })

  it('lets ordinary citizens use the Scouts Lair for 2 next-day SP without turning them into Scouts',()=>{
    let game=completeScoutsLair(createInitialGame(7205,1,'guardian'))
    const map=getLegalActions(game,'c01').find((action)=>action.type==='MAP_WASTELAND')
    expect(map).toBeDefined()
    if(!map)return
    game=executeCommand(game,map).state
    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    expect(scoutPointsAvailable(game.citizens[0])).toBe(2)
    expect(isScout(game.citizens[0])).toBe(false)
  })

  it('uses active camouflage to leave zombie control and suppresses the desperate flee action',()=>{
    let scout=outside(createInitialGame(7206,1,'scout'),1,0)
    scout=zone(scout,1,0,{zombies:20});scout=zone(scout,0,0,{zombies:0})
    const scoutActions=getLegalActions(scout,'c01')
    expect(scoutActions.some((action)=>action.type==='MOVE'&&action.direction==='WEST')).toBe(true)
    expect(scoutActions.some((action)=>action.type==='FLEE_ZOMBIES')).toBe(false)

    let ordinary=outside(createInitialGame(7207,1,'guardian'),1,0)
    ordinary=zone(ordinary,1,0,{zombies:20})
    const ordinaryActions=getLegalActions(ordinary,'c01')
    expect(ordinaryActions.some((action)=>action.type==='MOVE')).toBe(false)
    expect(ordinaryActions.some((action)=>action.type==='FLEE_ZOMBIES')).toBe(true)
  })

  it('records every Scout arrival and deterministically breaks camouflage in an overwhelmingly hostile destination',()=>{
    let game=outside(createInitialGame(7208,1,'scout'),1,0)
    game=zone(game,1,0,{zombies:0});game=zone(game,2,0,{zombies:200,scoutVisits:0})
    const result=executeCommand(game,moveAction(game,'EAST'))
    expect(result.events).toContainEqual(expect.objectContaining({type:'SCOUT_VISIT_RECORDED',zoneKey:'2,0'}))
    expect(result.events).toContainEqual(expect.objectContaining({type:'SCOUT_DETECTION_RESOLVED',zoneKey:'2,0',spotted:true}))
    expect(result.events).toContainEqual(expect.objectContaining({type:'SCOUT_CAMOUFLAGE_SET',active:false,reason:'detected'}))
    expect(result.state.world.zones['2,0'].scoutVisits).toBe(1)
    expect(scoutCamouflageActive(result.state.citizens[0])).toBe(false)
    expect(isScout(result.state.citizens[0])).toBe(true)
  })

  it('re-camouflages for 0 AP in town or a controlled outside zone, but not while still trapped',()=>{
    let game=deactivate(createInitialGame(7209,1,'scout'))
    let action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='RECAMOUFLAGE')
    expect(action).toBeDefined()
    if(!action)return
    game=executeCommand(game,action).state
    expect(game.citizens[0].ap).toBe(6)
    expect(scoutCamouflageActive(game.citizens[0])).toBe(true)

    game=deactivate(outside(game,1,0))
    game=zone(game,1,0,{zombies:20})
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='RECAMOUFLAGE')).toBe(false)
    game=zone(game,1,0,{zombies:0})
    action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='RECAMOUFLAGE')
    expect(action).toBeDefined()
  })

  it('raises persistent Scout Level every five visits, caps it at 3, and grants a town-wide search bonus',()=>{
    let game=createInitialGame(7210,1,'scout')
    const visits:GameEvent[]=Array.from({length:15},()=>({type:'SCOUT_VISIT_RECORDED',day:1,hour:1,citizenId:'c01',zoneKey:'1,0'}))
    game=applyEvents(game,visits)
    expect(scoutLevel(game.world.zones['1,0'])).toBe(3)
    game=applyEvents(game,Array.from({length:10},()=>({type:'SCOUT_VISIT_RECORDED',day:1,hour:1,citizenId:'c01',zoneKey:'1,0'} as GameEvent)))
    expect(scoutLevel(game.world.zones['1,0'])).toBe(3)

    const levelTwo={...game.world.zones['1,0'],scoutVisits:10}
    const ordinary=equipCitizenProfession(game.citizens[0],'guardian')
    const scavenger=equipCitizenProfession(game.citizens[0],'scavenger')
    expect(searchSuccessChancePercent(ordinary,'normal',levelTwo)).toBe(65)
    expect(searchSuccessChancePercent(scavenger,'normal',levelTwo)).toBe(85)
  })

  it('estimates adjacent zombies at ±2, then ±1, then exactly as Scout Level rises',()=>{
    let game=outside(createInitialGame(7211,1,'scout'),1,0)
    game=zone(game,2,0,{zombies:7,scoutVisits:0})
    const citizen=game.citizens[0]
    const level0=scoutZombieEstimate(game,citizen,game.world.zones['2,0'])
    expect(level0).not.toBeNull();expect(level0!).toBeGreaterThanOrEqual(5);expect(level0!).toBeLessThanOrEqual(9)
    const level1=scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],scoutVisits:5})
    expect(level1!).toBeGreaterThanOrEqual(6);expect(level1!).toBeLessThanOrEqual(8)
    expect(scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],scoutVisits:10})).toBe(7)
    expect(scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],zombies:0,scoutVisits:0})).toBe(0)
    expect(scoutZombieEstimate(game,citizen,game.world.zones['3,0'])).toBeNull()
  })

  it('reduces only the zombie component of camping risk while camouflage is active',()=>{
    let active=outside(createInitialGame(7212,1,'scout'),5,0)
    active=zone(active,5,0,{zombies:5,campImprovements:0,specialSite:undefined})
    const activeChance=campingChancePercent(active,'c01')
    const inactiveChance=campingChancePercent(deactivate(active),'c01')
    expect(activeChance).toBeGreaterThan(inactiveChance)
  })

  it('allows a camouflaged Scout to enter an explorable ruin from a trapped exterior without granting interior Scout bonuses',()=>{
    let game=outside(createInitialGame(7213,1,'scout'),1,0)
    const site:SpecialSiteState={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}
    game=zone(game,1,0,{zombies:20,specialSite:site})
    expect(enterRuin(game,'c01',500_000).ok).toBe(false)
    const entered=enterRuinWithScout(game,'c01',500_000)
    expect(entered.ok).toBe(true)
    expect(entered.state.citizens[0].temporaryControl).toBeNull()
    expect(ruinOxygenSecondsForCitizen(game.citizens[0],300)).toBe(300)
    expect(ruinOxygenSecondsForCitizen(equipCitizenProfession(game.citizens[0],'scavenger'),300)).toBe(450)
  })

  it('breaks camouflage when a Scout performs an exposed productive action while zombies control the zone',()=>{
    let game=outside(createInitialGame(7214,1,'scout'),1,0)
    game=zone(game,1,0,{zombies:20,searchesRemaining:1,searchedBy:[],depletedSearchedBy:[],hiddenLoot:['twisted_plank']})
    const search=getLegalActions(game,'c01').find((action)=>action.type==='SEARCH_ZONE')
    expect(search).toBeDefined()
    if(!search)return
    const result=executeCommand(game,search)
    expect(result.events[0]).toMatchObject({type:'SCOUT_CAMOUFLAGE_SET',active:false,reason:'action'})
    expect(scoutCamouflageActive(result.state.citizens[0])).toBe(false)
    expect(getLegalActions(result.state,'c01').some((action)=>action.type==='MOVE')).toBe(false)
  })

  it('lets autonomous Scouts map the wasteland and preserve camouflage by moving out of zombie-controlled zones',()=>{
    const controller=new BasicBotController()
    let town=completeScoutsLair(createInitialGame(7215,2,'guardian'))
    const bot=town.citizens[1]
    town=replaceCitizen(town,{...equipCitizenProfession(bot,'scout'),controller:'basic-bot',scoutPoints:2,scoutPointBonusNextDay:0})
    expect(controller.decide(createAgentDecisionContext(town),'c02')).toMatchObject({type:'MAP_WASTELAND'})

    let trapped=town
    trapped=replaceCitizen(trapped,{...trapped.citizens[1],location:{type:'world',x:1,y:0},ap:0,scoutPoints:2})
    trapped=zone(trapped,1,0,{zombies:20,searchedBy:['c02'],depletedSearchedBy:['c02'],groundItems:[]})
    trapped=zone(trapped,0,0,{zombies:0})
    trapped={...trapped,botMissions:{c02:mission({phase:'return',target:{x:1,y:0}})}}
    const decision=controller.decide(createAgentDecisionContext(trapped),'c02')
    expect(decision).toMatchObject({type:'MOVE',direction:'WEST'})
    const after=executeCommand(trapped,decision!).state
    expect(after.citizens[1].ap).toBe(0)
    expect(scoutPointsAvailable(after.citizens[1])).toBe(1)
    expect(scoutCamouflageActive(after.citizens[1])).toBe(true)
  })
})
