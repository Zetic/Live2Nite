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
import { SCOUT_BASE_POINTS, isScout, scoutCamouflageActive, scoutLevel, scoutPointsAvailable, scoutZombieEstimate } from '../src/core/scout'
import { enterRuinWithScout } from '../src/core/scoutRuin'
import type { BotMissionAssignment, Citizen, GameEvent, GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function replaceCitizen(game:GameState,citizen:Citizen):GameState{return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}}
function outside(game:GameState,x:number,y:number,patch:Partial<Citizen>={}):GameState{const base=game.citizens[0];return replaceCitizen(game,{...base,location:{type:'world',x,y},ap:6,status:{...base.status,wound:null,terrorized:false},camping:{...base.camping,hidden:false},...patch})}
function patchZone(game:GameState,x:number,y:number,patch:Partial<WorldZone>={}):GameState{const key=zoneKey(x,y),base=game.world.zones[key];if(!base)throw new Error(`Missing ${key}`);return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...base,discovered:true,...patch}}}}}
function deactivate(game:GameState,citizenId='c01'):GameState{return applyEvents(game,[{type:'SCOUT_CAMOUFLAGE_SET',day:game.day,hour:game.clock.hour,citizenId,active:false,reason:'detected'}])}
function lair(game:GameState):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,scouts_lair:{...game.town.construction.scouts_lair,discovered:true,completed:true}}}}}
function move(game:GameState,direction:'NORTH'|'SOUTH'|'EAST'|'WEST'){const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='MOVE'&&candidate.direction===direction);if(!action)throw new Error(`Missing ${direction}`);return action}
function mission(overrides:Partial<BotMissionAssignment>={}):BotMissionAssignment{return{missionId:'scout-test',role:'scout',purpose:'explore',target:{x:3,y:0},targetLabel:'test',reason:'test',phase:'return',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:false,overnightPlanned:false,...overrides}}

describe('Scout profession',()=>{
  it('keeps profession identity on an inactive Camouflage Suit',()=>{
    let game=createInitialGame(7201,1,'scout')
    expect(citizenEquipment(game.citizens[0])?.professionItem.type).toBe('profession_camouflage_suit')
    game=deactivate(game)
    expect(scoutCamouflageActive(game.citizens[0])).toBe(false)
    expect(isScout(game.citizens[0])).toBe(true)
    expect(hasProfession(game.citizens[0],'scout')).toBe(true)
  })

  it('uses AP inside 3 km, then 2 daily SP before falling back to AP',()=>{
    let near=outside(createInitialGame(7202,1,'scout'),2,0);near=patchZone(near,2,0,{zombies:0});near=patchZone(near,3,0,{zombies:0})
    expect(scoutPointsAvailable(near.citizens[0])).toBe(SCOUT_BASE_POINTS)
    let result=executeCommand(near,move(near,'EAST'))
    expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(true);expect(result.state.citizens[0].ap).toBe(5);expect(scoutPointsAvailable(result.state.citizens[0])).toBe(2)

    let far=outside(createInitialGame(7203,1,'scout'),3,0,{ap:4,scoutPoints:2});far=patchZone(far,3,0,{zombies:0});far=patchZone(far,4,0,{zombies:0})
    result=executeCommand(far,move(far,'EAST'))
    expect(result.events.some((event)=>event.type==='SCOUT_POINTS_SPENT')).toBe(true);expect(result.state.citizens[0].ap).toBe(4);expect(scoutPointsAvailable(result.state.citizens[0])).toBe(1)
    far=outside(far,3,0,{ap:4,scoutPoints:0});result=executeCommand(far,move(far,'EAST'))
    expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(true);expect(result.state.citizens[0].ap).toBe(3)
  })

  it('maps once per day and refreshes Scout/ordinary next-day SP correctly',()=>{
    let scout=lair(createInitialGame(7204,1,'scout'))
    const scoutMap=getLegalActions(scout,'c01').find((action)=>action.type==='MAP_WASTELAND');expect(scoutMap).toBeDefined();if(!scoutMap)return
    scout=executeCommand(scout,scoutMap).state;expect(scout.citizens[0].ap).toBe(5);expect(getLegalActions(scout,'c01').some((action)=>action.type==='MAP_WASTELAND')).toBe(false)
    scout=applyEvents(scout,[{type:'DAY_STARTED',day:2,hour:1}]);expect(scoutPointsAvailable(scout.citizens[0])).toBe(6)

    let ordinary=lair(createInitialGame(7205,1,'guardian'));const ordinaryMap=getLegalActions(ordinary,'c01').find((action)=>action.type==='MAP_WASTELAND');expect(ordinaryMap).toBeDefined();if(!ordinaryMap)return
    ordinary=applyEvents(executeCommand(ordinary,ordinaryMap).state,[{type:'DAY_STARTED',day:2,hour:1}]);expect(scoutPointsAvailable(ordinary.citizens[0])).toBe(2);expect(isScout(ordinary.citizens[0])).toBe(false)
  })

  it('lets active camouflage leave zombie control, blocks desperate flee, and breaks on exposed work',()=>{
    let game=outside(createInitialGame(7206,1,'scout'),1,0);game=patchZone(game,1,0,{zombies:20,searchesRemaining:1,searchedBy:[],depletedSearchedBy:[],hiddenLoot:['twisted_plank']});game=patchZone(game,0,0,{zombies:0})
    const actions=getLegalActions(game,'c01');expect(actions.some((action)=>action.type==='MOVE'&&action.direction==='WEST')).toBe(true);expect(actions.some((action)=>action.type==='FLEE_ZOMBIES')).toBe(false)
    const search=actions.find((action)=>action.type==='SEARCH_ZONE');expect(search).toBeDefined();if(!search)return
    const result=executeCommand(game,search);expect(result.events[0]).toMatchObject({type:'SCOUT_CAMOUFLAGE_SET',active:false,reason:'action'});expect(getLegalActions(result.state,'c01').some((action)=>action.type==='MOVE')).toBe(false)
  })

  it('records Scout arrivals and deterministically breaks camouflage in overwhelming zombie pressure',()=>{
    let game=outside(createInitialGame(7207,1,'scout'),1,0);game=patchZone(game,1,0,{zombies:0});game=patchZone(game,2,0,{zombies:200,scoutVisits:0})
    const result=executeCommand(game,move(game,'EAST'))
    expect(result.events).toContainEqual(expect.objectContaining({type:'SCOUT_VISIT_RECORDED',zoneKey:'2,0'}));expect(result.events).toContainEqual(expect.objectContaining({type:'SCOUT_DETECTION_RESOLVED',spotted:true}));expect(result.state.world.zones['2,0'].scoutVisits).toBe(1);expect(scoutCamouflageActive(result.state.citizens[0])).toBe(false);expect(isScout(result.state.citizens[0])).toBe(true)
  })

  it('only re-camouflages outside when usable control exists',()=>{
    let game=deactivate(createInitialGame(7208,1,'scout'));expect(getLegalActions(game,'c01').some((action)=>action.type==='RECAMOUFLAGE')).toBe(true)
    game=deactivate(outside(game,1,0));game=patchZone(game,1,0,{zombies:20});expect(getLegalActions(game,'c01').some((action)=>action.type==='RECAMOUFLAGE')).toBe(false)
    game=patchZone(game,1,0,{zombies:0});expect(getLegalActions(game,'c01').some((action)=>action.type==='RECAMOUFLAGE')).toBe(true)
  })

  it('builds persistent Scout Levels every five visits and shares their search bonus town-wide',()=>{
    let game=createInitialGame(7209,1,'scout');const visits:GameEvent[]=Array.from({length:15},()=>({type:'SCOUT_VISIT_RECORDED',day:1,hour:1,citizenId:'c01',zoneKey:'1,0'}));game=applyEvents(game,visits);expect(scoutLevel(game.world.zones['1,0'])).toBe(3)
    const levelTwo={...game.world.zones['1,0'],scoutVisits:10};expect(searchSuccessChancePercent(equipCitizenProfession(game.citizens[0],'guardian'),'normal',levelTwo)).toBe(65);expect(searchSuccessChancePercent(equipCitizenProfession(game.citizens[0],'scavenger'),'normal',levelTwo)).toBe(85)
  })

  it('improves adjacent zombie estimates from ±2 to ±1 to exact',()=>{
    let game=outside(createInitialGame(7210,1,'scout'),1,0);game=patchZone(game,2,0,{zombies:7,scoutVisits:0});const citizen=game.citizens[0]
    const level0=scoutZombieEstimate(game,citizen,game.world.zones['2,0']);expect(level0!).toBeGreaterThanOrEqual(5);expect(level0!).toBeLessThanOrEqual(9)
    const level1=scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],scoutVisits:5});expect(level1!).toBeGreaterThanOrEqual(6);expect(level1!).toBeLessThanOrEqual(8)
    expect(scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],scoutVisits:10})).toBe(7);expect(scoutZombieEstimate(game,citizen,{...game.world.zones['2,0'],zombies:0})).toBe(0)
  })

  it('applies camouflage camping protection without giving Scout ruin oxygen',()=>{
    let active=outside(createInitialGame(7211,1,'scout'),5,0);active=patchZone(active,5,0,{zombies:5,campImprovements:0,specialSite:undefined});expect(campingChancePercent(active,'c01')).toBeGreaterThan(campingChancePercent(deactivate(active),'c01'))
    expect(ruinOxygenSecondsForCitizen(active.citizens[0],300)).toBe(300);expect(ruinOxygenSecondsForCitizen(equipCitizenProfession(active.citizens[0],'scavenger'),300)).toBe(450)
  })

  it('allows camouflaged trapped-zone ruin entry without granting real temporary control',()=>{
    let game=outside(createInitialGame(7212,1,'scout'),1,0);const site:SpecialSiteState={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false};game=patchZone(game,1,0,{zombies:20,specialSite:site})
    expect(enterRuin(game,'c01',500_000).ok).toBe(false);const result=enterRuinWithScout(game,'c01',500_000);expect(result.ok).toBe(true);expect(result.state.citizens[0].temporaryControl).toBeNull()
  })

  it('gives autonomous Scouts mapping and zero-AP SP escape parity while preserving cover',()=>{
    const controller=new BasicBotController();let game=lair(createInitialGame(7213,2,'guardian'));const bot=game.citizens[1];game=replaceCitizen(game,{...equipCitizenProfession(bot,'scout'),controller:'basic-bot',scoutPoints:2,scoutPointBonusNextDay:0});expect(controller.decide(createAgentDecisionContext(game),'c02')).toMatchObject({type:'MAP_WASTELAND'})
    const current=game.citizens[1];game=replaceCitizen(game,{...current,location:{type:'world',x:3,y:0},ap:0,scoutPoints:2});game=patchZone(game,3,0,{zombies:20,searchedBy:['c02'],depletedSearchedBy:['c02'],groundItems:[]});game=patchZone(game,2,0,{zombies:0});game={...game,botMissions:{c02:mission({target:{x:3,y:0},phase:'return'})}}
    const decision=controller.decide(createAgentDecisionContext(game),'c02');expect(decision).toMatchObject({type:'MOVE',direction:'WEST'});if(!decision)return
    const after=executeCommand(game,decision).state;expect(after.citizens[1].ap).toBe(0);expect(scoutPointsAvailable(after.citizens[1])).toBe(1);expect(scoutCamouflageActive(after.citizens[1])).toBe(true)
  })
})
