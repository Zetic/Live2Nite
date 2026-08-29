import { describe, expect, it } from 'vitest'
import { advanceOneHour, advanceToHour } from '../src/core/game'
import { createInitialGame } from '../src/core/game'
import { missionSafety } from '../src/agents/planning/missionSafety'
import { createAutonomousCitizenDriver } from '../src/agents/CitizenDriver'
import type { BotMissionAssignment, GameState } from '../src/core/types'

const bots=createAutonomousCitizenDriver()

function clearPath(game:GameState,distance:number):GameState{
  const zones={...game.world.zones}
  for(let x=0;x<=distance;x+=1){const key=`${x},0`;const zone=zones[key];if(zone)zones[key]={...zone,discovered:true,zombies:0}}
  return{...game,world:{...game.world,zones}}
}
function mission(distance:number,phase:BotMissionAssignment['phase']='outbound'):BotMissionAssignment{return{missionId:'test-mission',role:'scout',purpose:'explore',target:{x:distance,y:0},targetLabel:`${distance},0`,reason:'test',phase,assignedDay:1,assignedHour:1,returnByHour:21,safetyReserve:0,emergency:false,scoutKind:'frontier'}}

describe('distributed citizen coordination',()=>{
  it('starts day one with staged scout teams instead of flooding all bots through the gate',()=>{
    let game=createInitialGame(4401,40)
    game=advanceOneHour(game,bots,'c01')
    const outside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world')
    expect(outside.length).toBeGreaterThan(0)
    expect(outside.length).toBeLessThanOrEqual(12)
    expect(game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').length).toBeGreaterThanOrEqual(28)
  })

  it('creates gate coverage through public volunteering rather than a preselected hidden reserve',()=>{
    let game=createInitialGame(4402,40)
    game=advanceOneHour(game,bots,'c01')
    const gateCommitments=game.coordination.commitments.filter((commitment)=>commitment.kind==='gate_primary'||commitment.kind==='gate_backup')
    expect(gateCommitments).toHaveLength(2)
    expect(new Set(gateCommitments.map((commitment)=>commitment.citizenId)).size).toBe(2)
    for(const commitment of gateCommitments){
      const citizen=game.citizens.find((candidate)=>candidate.id===commitment.citizenId)!
      expect(citizen.location).toEqual({type:'town'})
      expect(citizen.alive).toBe(true)
    }
  })

  it('lets gate volunteers spend spare AP on town work while preserving the final gate AP',()=>{
    let game=createInitialGame(4403,40)
    game=advanceOneHour(game,bots,'c01')
    const primary=game.coordination.commitments.find((commitment)=>commitment.kind==='gate_primary')!
    const before=game.citizens.find((citizen)=>citizen.id===primary.citizenId)!
    expect(before.ap).toBeGreaterThanOrEqual(primary.reservedAp)
    game=advanceOneHour(game,bots,'c01')
    const after=game.citizens.find((citizen)=>citizen.id===primary.citizenId)!
    expect(after.ap).toBeGreaterThanOrEqual(primary.reservedAp)
  })

  it('saturates construction volunteers instead of making every build-capable citizen a town worker',()=>{
    let game=createInitialGame(4404,40)
    game=advanceOneHour(game,bots,'c01')
    const construction=game.coordination.commitments.filter((commitment)=>commitment.kind==='construction')
    expect(construction.length).toBeGreaterThan(0)
    expect(construction.length).toBeLessThan(game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').length)
  })

  it('stages follow-up mobilization while keeping citizens in town',()=>{
    let game=createInitialGame(4405,40)
    game=advanceOneHour(game,bots,'c01')
    const firstOutside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length
    game=advanceOneHour(game,bots,'c01')
    const secondOutside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length
    expect(secondOutside).toBeGreaterThanOrEqual(firstOutside)
    expect(game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='town').length).toBeGreaterThanOrEqual(20)
  })

  it('becomes more willing to volunteer for exploration on a later resource-starved day',()=>{
    let game=createInitialGame(4406,40)
    game={...game,day:3,town:{...game.town,bank:[]}}
    game=advanceOneHour(game,bots,'c01')
    expect(game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length).toBeGreaterThan(0)
  })

  it('keeps gate volunteers home and guarantees the gate is sealed without field missions',()=>{
    let game=createInitialGame(4407,40)
    game=advanceOneHour(game,bots,'c01')
    const primary=game.coordination.commitments.find((commitment)=>commitment.kind==='gate_primary')?.citizenId
    const backup=game.coordination.commitments.find((commitment)=>commitment.kind==='gate_backup')?.citizenId
    expect(primary).toBeDefined();expect(backup).toBeDefined()
    game=advanceToHour(game,22,bots,'c01')
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
  it('regresses the reported mass-death seed without a town-wide suicide march',()=>{let game=createInitialGame(2241014753,40);game=advanceToHour(game,0,bots,'c01');const outsideAtMidnight=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').length;expect(outsideAtMidnight).toBeLessThanOrEqual(6);game=advanceOneHour(game,bots,'c01');expect(game.lastNight?.outsideDeaths??99).toBeLessThanOrEqual(6);expect(game.citizens.filter((citizen)=>citizen.alive).length).toBeGreaterThanOrEqual(30)},10_000)
})