import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { acceptedAssignment, makeAssignment } from '../src/agents/planning/AssignmentPolicy'
import type { MissionOpportunity } from '../src/agents/planning/MissionOpportunities'
import { chooseScoutTarget } from '../src/agents/planning/RoutePlanner'
import { knownOpportunities } from '../src/agents/planning/MissionOpportunities'
import { zoneIntelFreshness } from '../src/agents/WorldKnowledge'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { resolveNightAttack } from '../src/core/night'
import type { BotMissionAssignment, Direction, GameState, WorldZone } from '../src/core/types'
import { zoneControlState } from '../src/core/world'
import { advanceOneHour } from '../src/simulation/advanceTime'
import { runBotHour } from '../src/simulation/runBotHour'

const bots=new BasicBotController()

function zonePatch(game:GameState,x:number,y:number,patch:Partial<WorldZone>,observedZombies?:number,observedDay?:number):GameState{
  const key=`${x},${y}`
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],...patch}},intel:{...game.world.intel,[key]:observedZombies===undefined?game.world.intel[key]:{observedZombies,lastObservedDay:observedDay??game.day,lastObservedHour:game.clock.hour}}}}
}
function move(game:GameState,citizenId:string,direction:Direction){return getLegalActions(game,citizenId).find((action)=>action.type==='MOVE'&&action.direction===direction)!}

describe('World Beyond shared intelligence',()=>{
  it('keeps authoritative zombies separate from a stale town observation',()=>{
    let game=createInitialGame(7001,2)
    game=zonePatch(game,1,0,{discovered:true,zombies:7},2,game.day-1)
    expect(game.world.zones['1,0'].zombies).toBe(7)
    expect(game.world.intel['1,0'].observedZombies).toBe(2)
    expect(zoneIntelFreshness(game,1,0)).toBe('stale')
  })

  it('evolves authoritative zombies deterministically without rewriting town observations',()=>{
    let game=createInitialGame(7002,2)
    game=zonePatch(game,1,0,{discovered:true,zombies:3},3,game.day)
    game={...game,town:{...game.town,defense:999}}
    const beforeIntel=game.world.intel['1,0']
    const after=resolveNightAttack(game)
    expect(after.world.intel['1,0']).toEqual(beforeIntel)
    expect(after.world.zones['1,0'].zombies).not.toBeUndefined()
  })

  it('refreshes shared zombie intelligence when a citizen enters a zone',()=>{
    let game=createInitialGame(7003,2)
    game={...game,town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world' as const,x:0,y:0}}:citizen)}
    game=zonePatch(game,1,0,{discovered:true,zombies:4},1,game.day-1)
    game=executeCommand(game,move(game,'c02','EAST')).state
    expect(game.world.intel['1,0'].observedZombies).toBe(4)
    expect(game.world.intel['1,0'].lastObservedDay).toBe(game.day)
  })

  it('chooses stale useful territory for repeat reconnaissance before an unknown frontier',()=>{
    let game=createInitialGame(7004,2)
    game=zonePatch(game,1,0,{discovered:true,zombies:0,searchesRemaining:1},0,game.day-1)
    const choice=chooseScoutTarget(game,'c02',new Set())
    expect(choice?.kind).toBe('recon')
    expect(choice?.zone.x).toBe(1)
    expect(choice?.zone.y).toBe(0)
  })

  it('withholds ordinary gather assignments until the destination has current-day intel',()=>{
    let game=createInitialGame(7005,4)
    game=zonePatch(game,1,0,{discovered:true,zombies:0,searchesRemaining:1,specialSite:{type:'supermarket',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:['food'],searchedBy:[]}},0,game.day-1)
    expect(knownOpportunities(game).some((opportunity)=>opportunity.target.x===1&&opportunity.target.y===0)).toBe(false)
    game=zonePatch(game,1,0,{},0,game.day)
    expect(knownOpportunities(game).some((opportunity)=>opportunity.target.x===1&&opportunity.target.y===0)).toBe(true)
  })
})

describe('temporary zone control and extraction',()=>{
  it('grants an escape window when a departure loses control, while productive search stays blocked',()=>{
    let game=createInitialGame(7101,3)
    game={...game,town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>({...citizen,location:{type:'world' as const,x:1,y:0}}))}
    game=zonePatch(game,1,0,{discovered:true,zombies:5},5,game.day)
    const departure=move(game,'c03','EAST')
    game=executeCommand(game,departure).state
    expect(game.citizens.find((citizen)=>citizen.id==='c02')?.temporaryControl?.zoneKey).toBe('1,0')
    const actions=getLegalActions(game,'c02')
    expect(actions.some((action)=>action.type==='MOVE')).toBe(true)
    expect(actions.some((action)=>action.type==='SEARCH_ZONE')).toBe(false)
  })

  it('expires unused temporary control at the hourly boundary',()=>{
    let game=createInitialGame(7102,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,temporaryControl:{zoneKey:'1,0',grantedDay:game.day,grantedHour:game.clock.hour}}:citizen)}
    game=advanceOneHour(game,bots,'c01')
    expect(game.citizens.find((citizen)=>citizen.id==='c02')?.temporaryControl).toBeNull()
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

  it('uses a weapon when a rescue team only has fragile control, then stops combat and resumes free scavenging once secure',()=>{
    const rescue:BotMissionAssignment={missionId:'rescue:1,0',role:'rescue',purpose:'rescue',target:{x:1,y:0},targetLabel:'Rescue [1,0]',reason:'test',phase:'operate',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:true,allowsCamping:false,overnightPlanned:false}
    let game=createInitialGame(7202,2)
    game={...game,botMissions:{c02:rescue},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world' as const,x:1,y:0},inventory:[{id:'weapon',type:'staff' as const}]}:{...citizen,location:{type:'world' as const,x:1,y:0}})}
    game=zonePatch(game,1,0,{discovered:true,zombies:3},3,game.day)
    expect(zoneControlState(game,1,0)).toBe('fragile')
    expect(bots.decide(game,'c02')?.type).toBe('USE_WEAPON')
    game=zonePatch(game,1,0,{zombies:2},2,game.day)
    expect(zoneControlState(game,1,0)).toBe('secure')
    expect(bots.decide(game,'c02')?.type).toBe('SEARCH_ZONE')
  })
})