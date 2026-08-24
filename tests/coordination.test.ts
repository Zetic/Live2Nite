import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { gateBackupCitizenId, gatePrimaryCitizenId } from '../src/agents/coordination/TownCoordination'
import { missionSafety } from '../src/agents/planning/MissionLifecycle'
import { nightGateReserveCitizenId } from '../src/agents/planning/TownMissionPlanner'
import { createInitialGame } from '../src/core/game'
import type { BotMissionAssignment, GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { advanceOneHour, advanceToHour } from '../src/simulation/advanceTime'
import { bankFromCounts } from './bankFixtures'

const bots=new BasicBotController()
function clearPath(game:GameState,fromX:number,toX=0):GameState{const zones={...game.world.zones};for(let x=Math.min(fromX,toX);x<=Math.max(fromX,toX);x+=1){const key=zoneKey(x,0);zones[key]={...zones[key],discovered:true,zombies:0}}return{...game,world:{...game.world,zones}}}
function mission(targetX:number,phase:BotMissionAssignment['phase']='outbound'):BotMissionAssignment{return{missionId:`test:${targetX}`,role:'scout',purpose:'explore',target:{x:targetX,y:0},targetLabel:`Scout [${targetX},0]`,reason:'test mission',phase,assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:false}}
function withWorkshopResources(game:GameState):GameState{return{...game,town:{...game.town,bank:bankFromCounts({twisted_plank:10,wrought_iron:8},'coordination')}}}

describe('distributed citizen coordination',()=>{
  it('starts day one with staged scout teams instead of flooding all bots through the gate',()=>{
    const initial=createInitialGame(2241014753,40)
    const game=advanceOneHour(initial,bots,'c01')
    const assigned=game.events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.hour===1)
    const scouts=assigned.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.mission.role==='scout')
    expect(scouts).toHaveLength(4)
    const targets=new Set(scouts.map((event)=>event.type==='BOT_MISSION_ASSIGNED'?`${event.mission.target.x},${event.mission.target.y}`:''))
    expect(targets.size).toBeLessThanOrEqual(2)
    const exited=new Set(game.events.filter((event)=>event.type==='CITIZEN_LOCATION_CHANGED'&&event.hour===1&&event.location.type==='world'&&event.location.x===0&&event.location.y===0).map((event)=>event.type==='CITIZEN_LOCATION_CHANGED'?event.citizenId:''))
    expect(exited.size).toBeLessThanOrEqual(4)
  })

  it('creates gate coverage through public volunteering rather than a preselected hidden reserve',()=>{
    let game=createInitialGame(2233,40)
    expect(nightGateReserveCitizenId(game)).toBeNull()
    expect(game.coordination.commitments).toEqual([])
    game=advanceOneHour(game,bots,'c01')
    const primary=gatePrimaryCitizenId(game)
    const backup=gateBackupCitizenId(game)
    expect(primary).toBeTruthy()
    expect(backup).toBeTruthy()
    expect(primary).not.toBe(backup)
    expect(game.coordination.commitments.some((commitment)=>commitment.citizenId===primary&&commitment.kind==='gate_primary'&&commitment.reservedAp===1)).toBe(true)
    expect(game.coordination.commitments.some((commitment)=>commitment.citizenId===backup&&commitment.kind==='gate_backup'&&commitment.reservedAp===1)).toBe(true)
    expect(game.events.some((event)=>event.type==='BOT_MISSION_ASSIGNED'&&(event.citizenId===primary||event.citizenId===backup))).toBe(false)
  })

  it('lets gate volunteers spend spare AP on town work while preserving the final gate AP',()=>{
    let game=withWorkshopResources(createInitialGame(321,8))
    game=advanceOneHour(game,bots,'c01')
    const primary=gatePrimaryCitizenId(game)!
    const backup=gateBackupCitizenId(game)!
    const primaryCitizen=game.citizens.find((citizen)=>citizen.id===primary)!
    const backupCitizen=game.citizens.find((citizen)=>citizen.id===backup)!
    expect(primaryCitizen.location).toEqual({type:'town'})
    expect(backupCitizen.location).toEqual({type:'town'})
    expect(primaryCitizen.ap).toBeGreaterThanOrEqual(1)
    expect(backupCitizen.ap).toBeGreaterThanOrEqual(1)
    expect(game.events.some((event)=>event.type==='CONSTRUCTION_AP_CONTRIBUTED'&&(event.citizenId===primary||event.citizenId===backup))).toBe(true)
  })

  it('saturates construction volunteers instead of making every build-capable citizen a town worker',()=>{
    const game=advanceOneHour(withWorkshopResources(createInitialGame(322,20)),bots,'c01')
    const builders=game.coordination.commitments.filter((commitment)=>commitment.kind==='construction'&&commitment.projectId==='workshop')
    expect(builders.length).toBeGreaterThan(0)
    expect(builders.length).toBeLessThanOrEqual(4)
    const scouts=game.events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.hour===1&&event.mission.role==='scout')
    expect(scouts).toHaveLength(4)
    expect(new Set(builders.map((builder)=>builder.citizenId)).size).toBe(builders.length)
  })

  it('stages follow-up mobilization while keeping citizens in town',()=>{
    let game=createInitialGame(2241014753,40)
    game=advanceOneHour(game,bots,'c01')
    const first=game.events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.hour===1).length
    game=advanceOneHour(game,bots,'c01')
    const second=game.events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.hour===2).length
    expect(first).toBe(4)
    expect(second).toBeLessThanOrEqual(11)
    expect(game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').length).toBeGreaterThan(3)
  })

  it('becomes more willing to volunteer for exploration on a later resource-starved day',()=>{
    let game=createInitialGame(4411,40)
    game={...game,day:3,clock:{hour:1,phase:'day'},events:[]}
    game=advanceOneHour(game,bots,'c01')
    const scouts=game.events.filter((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.hour===1&&event.mission.role==='scout')
    expect(scouts.length).toBeGreaterThan(4)
    expect(scouts.length).toBeLessThanOrEqual(8)
    expect(scouts.some((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.mission.reason.includes('better than waiting in town'))).toBe(true)
  })

  it('keeps gate volunteers home and guarantees the gate is sealed without field missions',()=>{
    let game=createInitialGame(2233,40)
    game=advanceOneHour(game,bots,'c01')
    const primary=gatePrimaryCitizenId(game)!
    const backup=gateBackupCitizenId(game)!
    game=advanceToHour(game,0,bots,'c01')
    expect(game.town.gateOpen).toBe(false)
    for(const id of [primary,backup]){
      const keeper=game.citizens.find((citizen)=>citizen.id===id)!
      expect(keeper.alive).toBe(true)
      expect(keeper.location).toEqual({type:'town'})
      expect(game.events.some((event)=>event.type==='BOT_MISSION_ASSIGNED'&&event.citizenId===id)).toBe(false)
    }
    expect(game.events.some((event)=>event.type==='GATE_SET'&&event.open===false&&(event.citizenId===primary||event.citizenId===backup||(event.citizenId==='system'&&game.town.construction.automatic_piston_lock.completed)))).toBe(true)
  },10_000)

  it('forces a solvent return before a citizen spends the AP reserved for home',()=>{let game=clearPath(createInitialGame(123,2),4);game={...game,clock:{hour:10,phase:'day'},town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,ap:4,location:{type:'world' as const,x:4,y:0},inventory:[]}:citizen),botMissions:{c02:mission(5)}};const before=missionSafety(game,'c02');expect(before.usableAp).toBe(4);expect(before.requiredAp).toBe(5);game=advanceOneHour(game,bots,'c01');expect(game.citizens.find((citizen)=>citizen.id==='c02')?.location).toEqual({type:'town'});expect(game.events.some((event)=>event.type==='BOT_MISSION_PHASE_SET'&&event.citizenId==='c02'&&event.phase==='return')).toBe(true)})
  it('counts carried unused refills as return capacity and can consume them near exhaustion',()=>{let game=clearPath(createInitialGame(123,2),4);game={...game,clock:{hour:10,phase:'day'},town:{...game.town,gateOpen:true},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,ap:0,location:{type:'world' as const,x:4,y:0},inventory:[{id:'water-test',type:'water_ration' as const}]}:citizen),botMissions:{c02:mission(5,'return')}};expect(missionSafety(game,'c02').usableAp).toBe(6);game=advanceOneHour(game,bots,'c01');const bot=game.citizens.find((citizen)=>citizen.id==='c02')!;expect(bot.location).toEqual({type:'town'});expect(bot.daily.drank).toBe(true)})
  it('regresses the reported mass-death seed without a town-wide suicide march',()=>{let game=createInitialGame(2241014753,40);game=advanceToHour(game,0,bots,'c01');const outsideAtMidnight=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length;expect(outsideAtMidnight).toBeLessThanOrEqual(6);game=advanceOneHour(game,bots,'c01');expect(game.lastNight?.outsideDeaths??99).toBeLessThanOrEqual(6);expect(game.citizens.filter((citizen)=>citizen.alive).length).toBeGreaterThanOrEqual(30)})
})