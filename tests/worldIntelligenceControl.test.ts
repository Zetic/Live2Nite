import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createAgentWorldKnowledge } from '../src/agents/WorldKnowledge'
import { acceptedAssignment, makeAssignment } from '../src/agents/planning/AssignmentPolicy'
import { knownOpportunities, type MissionOpportunity } from '../src/agents/planning/MissionOpportunities'
import { chooseScoutTarget } from '../src/agents/planning/RoutePlanner'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import type { BotMissionAssignment, GameCommand, GameState } from '../src/core/types'
import { zoneControlState, zoneKey } from '../src/core/world'
import { worldZombieEvolutionEvent } from '../src/core/worldEvolution'
import { advanceOneHour } from '../src/simulation/advanceTime'
import { runBotHour } from '../src/simulation/runBotHour'

const bots=new BasicBotController()

function move(game:GameState,citizenId:string,direction:'NORTH'|'SOUTH'|'EAST'|'WEST'):GameCommand{
  const command=getLegalActions(game,citizenId).find((action)=>action.type==='MOVE'&&action.direction===direction)
  if(!command)throw new Error(`Missing ${direction} move for ${citizenId}`)
  return command
}

function zonePatch(game:GameState,x:number,y:number,patch:Partial<GameState['world']['zones'][string]>,observed?:number|null,lastObservedDay:number|null=game.day):GameState{
  const key=zoneKey(x,y)
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],...patch}},intel:{...game.world.intel,[key]:{observedZombies:observed===undefined?(game.world.intel[key]?.observedZombies??null):observed,lastObservedDay,lastObservedHour:lastObservedDay===null?null:5}}}}
}

describe('World Beyond shared intelligence',()=>{
  it('keeps authoritative zombies separate from a stale town observation',()=>{
    let game=createInitialGame(7001,4)
    game={...game,day:2}
    game=zonePatch(game,1,0,{discovered:true,zombies:7},3,1)
    const knowledge=createAgentWorldKnowledge(game).zone(1,0)!
    expect(game.world.zones[zoneKey(1,0)].zombies).toBe(7)
    expect(knowledge.zombies).toBe(3)
    expect(knowledge.freshness).toBe('stale')
  })

  it('evolves authoritative zombies deterministically without rewriting town observations',()=>{
    const first=createInitialGame(3101,40)
    const second=createInitialGame(3101,40)
    const eventA=worldZombieEvolutionEvent(first)
    const eventB=worldZombieEvolutionEvent(second)
    expect(eventA).toEqual(eventB)
    expect(eventA?.type).toBe('WORLD_ZOMBIES_EVOLVED')
    if(!eventA||eventA.type!=='WORLD_ZOMBIES_EVOLVED')throw new Error('Expected deterministic evolution changes')
    expect(eventA.changes.length).toBeGreaterThan(0)
    const beforeIntel=first.world.intel
    const evolved=applyEvents(first,[eventA])
    expect(evolved.world.intel).toEqual(beforeIntel)
    expect(eventA.changes.some((change)=>evolved.world.zones[change.zoneKey].zombies===change.after)).toBe(true)
  })

  it('refreshes shared zombie intelligence when a citizen enters a zone',()=>{
    let game=createInitialGame(7002,2)
    game={...game,town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x:0,y:0}}:citizen)}
    game=zonePatch(game,1,0,{discovered:false,zombies:5},null,null)
    game=executeCommand(game,move(game,'c01','EAST')).state
    expect(game.world.zones[zoneKey(1,0)].discovered).toBe(true)
    expect(game.world.intel[zoneKey(1,0)]).toMatchObject({observedZombies:5,lastObservedDay:game.day,lastObservedHour:1})
  })

  it('chooses stale useful territory for repeat reconnaissance before an unknown frontier',()=>{
    let game=createInitialGame(7003,40)
    game=zonePatch(game,1,0,{discovered:true,zombies:1,searchesRemaining:5},1,0)
    const target=chooseScoutTarget(game,'c02')
    expect(target?.kind).toBe('recon')
    expect(target?.zone.x).toBe(1)
    expect(target?.zone.y).toBe(0)
  })

  it('withholds ordinary gather assignments until the destination has current-day intel',()=>{
    let game=createInitialGame(7004,40)
    game=zonePatch(game,1,0,{discovered:true,zombies:0,searchesRemaining:5,specialSite:undefined},0,0)
    expect(knownOpportunities(game).some((opportunity)=>opportunity.target.x===1&&opportunity.target.y===0&&!opportunity.emergency)).toBe(false)
    game=zonePatch(game,1,0,{},0,game.day)
    expect(knownOpportunities(game).some((opportunity)=>opportunity.target.x===1&&opportunity.target.y===0&&!opportunity.emergency)).toBe(true)
  })
})

describe('temporary zone control and extraction',()=>{
  it('grants an escape window when a departure loses control, while productive search stays blocked',()=>{
    let game=createInitialGame(7101,2)
    game={...game,town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>({...citizen,controller:'human' as const,location:{type:'world' as const,x:1,y:0}}))}
    game=zonePatch(game,1,0,{discovered:true,zombies:3,searchesRemaining:2},3,game.day)
    game=executeCommand(game,move(game,'c01','WEST')).state
    expect(zoneControlState(game,1,0,'c02')).toBe('temporary')
    const legal=getLegalActions(game,'c02')
    expect(legal.some((action)=>action.type==='MOVE')).toBe(true)
    expect(legal.some((action)=>action.type==='SEARCH_ZONE')).toBe(false)
    expect(game.events.some((event)=>event.type==='ZONE_CONTROL_LOST'&&event.zoneKey==='1,0')).toBe(true)
    expect(game.events.some((event)=>event.type==='TEMPORARY_CONTROL_GRANTED'&&event.citizenId==='c02')).toBe(true)
  })

  it('expires unused temporary control at the hourly boundary',()=>{
    let game=createInitialGame(7102,2)
    game={...game,town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>({...citizen,controller:'human' as const,location:{type:'world' as const,x:1,y:0}}))}
    game=zonePatch(game,1,0,{discovered:true,zombies:3,searchesRemaining:2},3,game.day)
    game=executeCommand(game,move(game,'c01','WEST')).state
    game=advanceOneHour(game,bots,'c01')
    expect(zoneControlState(game,1,0,'c02')).toBe('trapped')
    expect(getLegalActions(game,'c02').some((action)=>action.type==='MOVE')).toBe(false)
    expect(game.events.some((event)=>event.type==='TEMPORARY_CONTROL_EXPIRED'&&event.citizenId==='c02')).toBe(true)
  })

  it('lets the rescued citizen leave first and the responder extract instead of becoming the replacement victim',()=>{
    let game=createInitialGame(7103,2)
    const rescue:BotMissionAssignment={missionId:'rescue:test',role:'rescue',purpose:'rescue',target:{x:1,y:0},targetLabel:'Rescue [1,0]',reason:'regression',phase:'operate',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:true,allowsCamping:false,overnightPlanned:false}
    game={...game,town:{...game.town,gateOpen:true},botMissions:{c02:rescue},citizens:game.citizens.map((citizen)=>({...citizen,location:{type:'world' as const,x:1,y:0}}))}
    game=zonePatch(game,1,0,{discovered:true,zombies:3},3,game.day)
    game=executeCommand(game,move(game,'c01','WEST')).state
    expect(zoneControlState(game,1,0,'c02')).toBe('temporary')
    game=runBotHour(game,bots,'c01')
    expect(game.citizens.find((citizen)=>citizen.id==='c02')?.location).toEqual({type:'town'})
    expect(game.botMissions.c02).toBeUndefined()
  })
})

describe('rescue planning and control-aware combat',()=>{
  it('rejects an emergency responder who can reach the victim but cannot fund extraction and return',()=>{
    let game=createInitialGame(7201,4)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c04'?{...citizen,daily:{...citizen.daily,ate:true,drank:true},inventory:[]}:citizen)}
    const opportunity:MissionOpportunity={missionId:'rescue:4,0',role:'rescue',purpose:'rescue',target:{x:4,y:0},targetLabel:'Rescue [4,0]',reason:'test',desiredCitizens:1,priority:300,safetyReserve:1,emergency:true}
    const citizen=game.citizens.find((candidate)=>candidate.id==='c04')!
    const proposed=makeAssignment(game,citizen,opportunity)
    expect(acceptedAssignment(game,citizen,proposed,opportunity)).toBeNull()
  })

  it('uses a weapon when a rescue team only has fragile control, then stops once the zone is secure',()=>{
    const rescue:BotMissionAssignment={missionId:'rescue:1,0',role:'rescue',purpose:'rescue',target:{x:1,y:0},targetLabel:'Rescue [1,0]',reason:'test',phase:'operate',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:true,allowsCamping:false,overnightPlanned:false}
    let game=createInitialGame(7202,2)
    game={...game,botMissions:{c02:rescue},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world' as const,x:1,y:0},inventory:[{id:'weapon',type:'staff' as const}]}:{...citizen,location:{type:'world' as const,x:1,y:0}})}
    game=zonePatch(game,1,0,{discovered:true,zombies:3},3,game.day)
    expect(zoneControlState(game,1,0)).toBe('fragile')
    expect(bots.decide(game,'c02')?.type).toBe('USE_WEAPON')
    game=zonePatch(game,1,0,{zombies:2},2,game.day)
    expect(zoneControlState(game,1,0)).toBe('secure')
    expect(bots.decide(game,'c02')).toBeNull()
  })
})
