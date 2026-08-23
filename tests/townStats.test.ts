import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import type { GameEvent, GameState } from '../src/core/types'
import { computeTownStats } from '../src/ui/townStats'

function gameWithEvents():GameState{
  const base=createInitialGame(7788,2)
  const events:GameEvent[]=[
    {type:'ZONE_SEARCHED',day:1,hour:3,citizenId:'c01',zoneKey:'1,0',mode:'normal',automatic:true,item:{id:'i1',type:'twisted_plank'}},
    {type:'SPECIAL_SITE_SEARCHED',day:1,hour:4,citizenId:'c02',zoneKey:'2,0',item:{id:'i2',type:'wrought_iron'}},
    {type:'CITIZEN_LOCATION_CHANGED',day:1,hour:5,citizenId:'c01',location:{type:'world',x:3,y:-2},desertStep:true},
    {type:'ITEM_DEPOSITED',day:1,hour:8,citizenId:'c01',item:{id:'i1',type:'twisted_plank'}},
    {type:'ITEM_WITHDRAWN',day:1,hour:9,citizenId:'c02',item:{id:'i3',type:'food'}},
    {type:'COMBAT_RESOLVED',day:1,hour:10,citizenId:'c01',zoneKey:'3,-2',method:'staff',kills:3,item:{id:'weapon',type:'staff'},consumed:false,brokenInto:'broken_staff',rngStateAfter:4},
    {type:'CONSTRUCTION_AP_CONTRIBUTED',day:1,hour:12,citizenId:'c02',projectId:'workshop',amount:2},
    {type:'WORKSHOP_CONVERTED',day:1,hour:13,citizenId:'c01',recipeId:'logs_to_planks',input:'rotten_log',inputCount:1,inputItemIds:['log-object'],output:'twisted_plank',outputCount:1},
    {type:'BOT_MISSION_ASSIGNED',day:1,hour:2,citizenId:'c02',mission:{missionId:'m1',role:'scout',purpose:'explore',target:{x:2,y:0},targetLabel:'[2,0]',reason:'test',phase:'prepare',assignedDay:1,assignedHour:2,returnByHour:19,safetyReserve:1,emergency:false}},
    {type:'CAMPING_RESOLVED',day:1,hour:0,citizenId:'c02',survivalChance:70,roll:20,survived:true},
    {type:'CITIZEN_DIED',day:1,hour:0,citizenId:'c02',reason:'outside_at_night'},
    {type:'NIGHT_RESOLVED',day:1,hour:0,report:{day:1,attackStrength:30,defenseBeforeAttack:40,effectiveDefense:40,gateOpen:false,breached:false,outsideDeaths:1}},
  ]
  return{...base,citizens:base.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,alive:false}:citizen),events}
}

describe('town statistics',()=>{
  it('aggregates town, expedition, combat, economy, and citizen records from events',()=>{const stats=computeTownStats(gameWithEvents());expect(stats.populationStart).toBe(2);expect(stats.populationAlive).toBe(1);expect(stats.populationDead).toBe(1);expect(stats.nightsResolved).toBe(1);expect(stats.terminalNight).toBeNull();expect(stats.searches).toBe(2);expect(stats.normalSearches).toBe(1);expect(stats.specialSiteSearches).toBe(1);expect(stats.automaticSearches).toBe(1);expect(stats.lootFound).toBe(2);expect(stats.furthestDistance).toBe(5);expect(stats.bankDeposits).toBe(1);expect(stats.bankWithdrawals).toBe(1);expect(stats.combatEncounters).toBe(1);expect(stats.zombiesKilled).toBe(3);expect(stats.weaponsBroken).toBe(1);expect(stats.constructionAp).toBe(2);expect(stats.workshopConversions).toBe(1);expect(stats.campingAttempts).toBe(1);expect(stats.campingSurvivors).toBe(1);expect(stats.deathsByReason.outside_at_night).toBe(1);const first=stats.citizens.find((record)=>record.citizenId==='c01')!;expect(first.searches).toBe(1);expect(first.lootFound).toBe(1);expect(first.zombieKills).toBe(3);expect(first.bankDeposits).toBe(1);expect(first.travelSteps).toBe(1);expect(first.furthestDistance).toBe(5);expect(stats.leaders.zombieKills?.citizenId).toBe('c01');const second=stats.citizens.find((record)=>record.citizenId==='c02')!;expect(second.deathReason).toBe('outside_at_night');expect(second.deathDay).toBe(1);expect(second.constructionAp).toBe(2);expect(second.missions).toBe(1);expect(second.campingSurvivals).toBe(1)})
  it('marks the last resolved night as terminal only when every citizen is dead',()=>{const game=gameWithEvents();const ended={...game,citizens:game.citizens.map((citizen)=>({...citizen,alive:false}))};expect(computeTownStats(ended).terminalNight).toBe(1)})
})
