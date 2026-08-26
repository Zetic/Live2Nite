import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { planMission } from '../src/agents/planning/ExpeditionPlanner'
import { campingChanceBreakdown, campingChancePercent, ORDINARY_CAMPING_CAP_PERCENT, SURVIVALIST_CAMPING_CAP_PERCENT } from '../src/core/camping'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame, resolveNight } from '../src/core/game'
import { equipCitizenProfession } from '../src/core/professions'
import type { BotMissionAssignment, GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'

const bots=new BasicBotController()
function outsideAt(game:GameState,citizenId:string,x:number,y:number):GameState{
  const key=zoneKey(x,y)
  return{
    ...game,
    town:{...game.town,gateOpen:true},
    world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],discovered:true,zombies:0,campImprovements:0}}},
    citizens:game.citizens.map((citizen)=>citizen.id===citizenId?{...citizen,location:{type:'world' as const,x,y}}:citizen),
  }
}
function mission(targetX=4,phase:BotMissionAssignment['phase']='camp',allowsCamping=true,overnightPlanned?:boolean):BotMissionAssignment{return{missionId:'overnight-test',role:'scout',purpose:'explore',target:{x:targetX,y:0},targetLabel:`Scout [${targetX},0]`,reason:'test',phase,assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:false,allowsCamping,...(overnightPlanned===undefined?{}:{overnightPlanned})}}

describe('source-backed camping and overnight survival',()=>{
  it('starts schema v19 with camping state and campsite state initialized',()=>{
    const game=createInitialGame(123,2)
    expect(game.schemaVersion).toBe(19)
    expect(game.citizens.every((citizen)=>citizen.camping.hidden===false&&citizen.camping.nightsSurvived===0)).toBe(true)
    expect(Object.values(game.world.zones).every((zone)=>zone.campImprovements===0)).toBe(true)
  })

  it('does not allow hiding on the town-gate tile',()=>{
    const game=outsideAt(createInitialGame(123,1),'c01',0,0)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='HIDE_FOR_NIGHT')).toBe(false)
    expect(campingChancePercent(game,'c01')).toBe(0)
  })

  it('uses the exact standard previous-camping table',()=>{
    let game=outsideAt(createInitialGame(124,1),'c01',6,0)
    const expected=[80,60,35,15,0,-50,-100,-200,-400,-1000,-2000,-5000,-5000]
    for(let nights=0;nights<expected.length;nights+=1){
      game={...game,citizens:game.citizens.map((citizen)=>({...citizen,camping:{...citizen.camping,nightsSurvived:nights}}))}
      expect(campingChanceBreakdown(game,'c01').previous).toBe(expected[nights])
    }
  })

  it('uses the exact source distance bands',()=>{
    const expected=[-100,-75,-50,-25,-10,0,0,0,0,0,0,0,5,7,10,15,20,20]
    for(let distance=1;distance<expected.length;distance+=1){
      const game=outsideAt(createInitialGame(125+distance,1),'c01',distance,0)
      expect(campingChanceBreakdown(game,'c01').distance).toBe(expected[distance])
    }
  })

  it('spends one AP improving a campsite and adds five permanent camping points',()=>{
    let game=outsideAt(createInitialGame(150,1),'c01',6,0)
    const before=campingChanceBreakdown(game,'c01')
    const improve=getLegalActions(game,'c01').find((action)=>action.type==='IMPROVE_CAMP')!
    game=executeCommand(game,improve).state
    const after=campingChanceBreakdown(game,'c01')
    expect(game.citizens[0].ap).toBe(5)
    expect(game.world.zones[zoneKey(6,0)].campImprovements).toBe(1)
    expect(after.zone-before.zone).toBe(5)
  })

  it('freezes the complete camping snapshot when hiding and clears it on leave',()=>{
    let game=outsideAt(createInitialGame(151,1),'c01',6,0)
    const expected=campingChanceBreakdown(game,'c01')
    const hide=getLegalActions(game,'c01').find((action)=>action.type==='HIDE_FOR_NIGHT')!
    game=executeCommand(game,hide).state
    expect(game.citizens[0].camping.survivalChance).toBe(expected.final)
    expect(game.citizens[0].camping.chanceBreakdown).toEqual(expected)
    expect(getLegalActions(game,'c01').map((action)=>action.type)).toEqual(['LEAVE_HIDEOUT'])
    const key=zoneKey(6,0)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],campImprovements:10}}}}
    expect(campingChancePercent(game,'c01')).not.toBe(expected.final)
    expect(game.citizens[0].camping.survivalChance).toBe(expected.final)
    game=executeCommand(game,getLegalActions(game,'c01')[0]).state
    expect(game.citizens[0].camping.hidden).toBe(false)
    expect(game.citizens[0].camping.survivalChance).toBeNull()
    expect(game.citizens[0].camping.chanceBreakdown).toBeNull()
  })

  it('gives grave camping +8 for one AP and hides immediately',()=>{
    let game=outsideAt(createInitialGame(152,1),'c01',6,0)
    const normal=campingChanceBreakdown(game,'c01')
    const grave=getLegalActions(game,'c01').find((action)=>action.type==='DIG_CAMPING_GRAVE')!
    game=executeCommand(game,grave).state
    expect(game.citizens[0].ap).toBe(5)
    expect(game.citizens[0].camping.hidden).toBe(true)
    expect(game.citizens[0].camping.grave).toBe(true)
    expect(game.citizens[0].camping.chanceBreakdown?.tomb).toBe(8)
    expect(game.citizens[0].camping.chanceBreakdown?.raw).toBe(normal.raw+8)
  })

  it('caps ordinary citizens at 90% and Survivalists at 100% without adding a flat Survivalist bonus',()=>{
    let ordinary=outsideAt(createInitialGame(153,1),'c01',16,0)
    ordinary={...ordinary,citizens:ordinary.citizens.map((citizen)=>equipCitizenProfession(citizen,'scavenger'))}
    const ordinaryRaw=campingChanceBreakdown(ordinary,'c01').raw
    expect(campingChancePercent(ordinary,'c01')).toBe(Math.min(ORDINARY_CAMPING_CAP_PERCENT,ordinaryRaw))
    let survivalist={...ordinary,citizens:ordinary.citizens.map((citizen)=>equipCitizenProfession(citizen,'survivalist'))}
    const survivalRaw=campingChanceBreakdown(survivalist,'c01').raw
    expect(survivalRaw).toBe(ordinaryRaw)
    expect(campingChanceBreakdown(survivalist,'c01').cap).toBe(SURVIVALIST_CAMPING_CAP_PERCENT)
    expect(campingChancePercent(survivalist,'c01')).toBe(Math.min(SURVIVALIST_CAMPING_CAP_PERCENT,survivalRaw))
  })

  it('applies source hide-order crowd penalties beginning with the third camper',()=>{
    let game=createInitialGame(154,3)
    game=outsideAt(game,'c01',6,0);game=outsideAt(game,'c02',6,0);game=outsideAt(game,'c03',6,0)
    const baseline=campingChanceBreakdown(game,'c03')
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,camping:{...citizen.camping,hidden:true,survivalChance:50,hiddenDay:1}}:citizen)}
    expect(campingChanceBreakdown(game,'c03').campers).toBe(0)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,camping:{...citizen.camping,hidden:true,survivalChance:50,hiddenDay:1}}:citizen)}
    const crowded=campingChanceBreakdown(game,'c03')
    expect(crowded.campers).toBe(-10)
    expect(crowded.raw).toBe(baseline.raw-10)
  })

  it('uses ruin camping level only while shelter capacity remains',()=>{
    let game=createInitialGame(155,3)
    game=outsideAt(game,'c01',6,0);game=outsideAt(game,'c02',6,0);game=outsideAt(game,'c03',6,0)
    const key=zoneKey(6,0)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],specialSite:{type:'citizens_home',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}}}}}
    expect(campingChanceBreakdown(game,'c01').zoneBuilding).toBe(10)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'||citizen.id==='c02'?{...citizen,camping:{...citizen.camping,hidden:true,survivalChance:50,hiddenDay:1}}:citizen)}
    expect(campingChanceBreakdown(game,'c03').zoneBuilding).toBe(-25)
  })

  it('uses +15 for an available buried ruin shelter and +25 for Lighthouse',()=>{
    let game=outsideAt(createInitialGame(156,1),'c01',6,0)
    const key=zoneKey(6,0)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],specialSite:{type:'citizens_home',status:'buried',excavationRequired:3,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}}}},town:{...game.town,construction:{...game.town.construction,lighthouse:{...game.town.construction.lighthouse,completed:true}}}}
    const breakdown=campingChanceBreakdown(game,'c01')
    expect(breakdown.zoneBuilding).toBe(15)
    expect(breakdown.lighthouse).toBe(25)
  })

  it('plans an overnight mission only when a safe same-day round trip is not feasible',()=>{
    let game=createInitialGame(131,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,daily:{...citizen.daily,ate:true},inventory:[{id:'water',type:'water_ration' as const}]}:citizen)}
    const provisional=mission(6,'prepare',true)
    const overnightPlan=planMission(game,'c02',provisional)
    expect(overnightPlan?.roundTripRequiredAp).toBeGreaterThan(overnightPlan?.loadout.potentialAp??0)
    expect(overnightPlan?.campingPlanned).toBe(true)
    expect(overnightPlan?.feasible).toBe(true)
    const persistedOvernight=planMission(game,'c02',mission(6,'prepare',true,true))
    expect(persistedOvernight?.campingPlanned).toBe(true)
    const lockedSameDay=planMission(game,'c02',mission(6,'prepare',true,false))
    expect(lockedSameDay?.campingPlanned).toBe(false)
    expect(lockedSameDay?.feasible).toBe(false)
    const nearby=planMission(game,'c02',mission(2,'prepare',true))
    expect(nearby?.campingPlanned).toBe(false)
    expect(nearby?.feasible).toBe(true)
  })

  it('lets a camp-phase bot prepare and then hide deliberately',()=>{
    let game=outsideAt(createInitialGame(132,2),'c02',6,0)
    game={...game,clock:{hour:20,phase:'day'},citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,inventory:[{id:'water',type:'water_ration' as const}]}:citizen),botMissions:{c02:mission(6,'camp',true,true)}}
    for(let step=0;step<10&&!game.citizens[1].camping.hidden;step+=1){const command=bots.decide(game,'c02');expect(command).toBeTruthy();game=executeCommand(game,command!).state}
    expect(game.citizens[1].camping.hidden).toBe(true)
    expect(game.events.some((event)=>event.type==='CAMP_IMPROVED'&&event.citizenId==='c02')||game.events.some((event)=>event.type==='CITIZEN_HIDING_SET'&&event.citizenId==='c02'&&event.grave)).toBe(true)
  })

  it('still kills an outside citizen who never hid',()=>{
    let game=outsideAt(createInitialGame(127,1),'c01',3,0)
    game=resolveNight(game)
    expect(game.citizens[0].alive).toBe(false)
    expect(game.lastNight?.outsideDeaths).toBe(1)
    expect(game.lastNight?.campingSurvivors).toBe(0)
  })

  it('lets a successful camper remain outside, regain AP, and retain an overnight mission',()=>{
    let game=outsideAt(createInitialGame(128,1),'c01',4,0)
    game={...game,clock:{hour:0,phase:'attack'},citizens:game.citizens.map((citizen)=>({...citizen,ap:0,camping:{...citizen.camping,hidden:true,survivalChance:100,hiddenDay:1}})),botMissions:{c01:mission(4,'camp',true,true)}}
    game=resolveNight(game)
    const citizen=game.citizens[0]
    expect(citizen.alive).toBe(true)
    expect(citizen.location).toEqual({type:'world',x:4,y:0})
    expect(citizen.ap).toBe(6)
    expect(citizen.camping.hidden).toBe(false)
    expect(citizen.camping.nightsSurvived).toBe(1)
    expect(game.botMissions.c01?.phase).toBe('operate')
    expect(game.lastNight?.campingSurvivors).toBe(1)
    expect(game.lastNight?.campingDeaths).toBe(0)
  })

  it('records a failed camping attempt separately from an unprepared outside death',()=>{
    let game=outsideAt(createInitialGame(129,1),'c01',4,0)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,camping:{...citizen.camping,hidden:true,survivalChance:0,hiddenDay:1}}))}
    game=resolveNight(game)
    expect(game.citizens[0].alive).toBe(false)
    expect(game.lastNight?.outsideDeaths).toBe(0)
    expect(game.lastNight?.campingDeaths).toBe(1)
    expect(game.events.some((event)=>event.type==='CITIZEN_DIED'&&event.reason==='camping_failure')).toBe(true)
  })

  it('keeps campsite improvements permanently after night resolution',()=>{
    let game=outsideAt(createInitialGame(130,1),'c01',4,0)
    const key=zoneKey(4,0)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],campImprovements:3}}},citizens:game.citizens.map((citizen)=>({...citizen,camping:{...citizen.camping,hidden:true,survivalChance:100,hiddenDay:1}}))}
    game=resolveNight(game)
    expect(game.world.zones[key].campImprovements).toBe(3)
    expect(game.events.some((event)=>event.type==='CAMP_IMPROVEMENTS_DECAYED')).toBe(false)
  })
})
