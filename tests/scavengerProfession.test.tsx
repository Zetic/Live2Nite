import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { equipCitizenProfession } from '../src/core/professions'
import {
  BASE_AUTO_SEARCH_INTERVAL_MINUTES,
  DEPLETED_SEARCH_SUCCESS_PERCENT,
  NORMAL_SEARCH_SUCCESS_PERCENT,
  SCAVENGER_REPEAT_SEARCH_INTERVAL_MINUTES,
  SCAVENGER_RUIN_OXYGEN_MULTIPLIER,
  SCAVENGER_SEARCH_BONUS_PERCENTAGE_POINTS,
  isSpadeReplenishCommand,
  repeatSearchIntervalMinutes,
  resolveSearchAttempt,
  ruinOxygenSecondsForCitizen,
  searchResourceStatus,
  searchSuccessChancePercent,
  spadeReplenishmentUsed,
  type ReplenishmentEvent,
} from '../src/core/scavenging'
import { enterRuin, getRuinExplorer, oxygenSecondsRemaining, RUIN_OXYGEN_SECONDS } from '../src/core/ruinExploration'
import { runAutomaticSearches } from '../src/core/search'
import type { GameEvent, GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'
import { WorldView } from '../src/ui/components/WorldView'

const bots=new BasicBotController()

function citizenAs(game:GameState,citizenId:string,profession:'scavenger'|'scout',x=1,y=0):GameState{
  return{
    ...game,
    citizens:game.citizens.map((citizen)=>citizen.id===citizenId?equipCitizenProfession({...citizen,ap:6,location:{type:'world' as const,x,y},status:{...citizen.status,terrorized:false,wound:null},camping:{...citizen.camping,hidden:false}},profession):citizen),
  }
}
function searchable(game:GameState,citizenId:string,profession:'scavenger'|'scout',searchesRemaining=12):GameState{
  const key=zoneKey(1,0)
  const hiddenLoot=Array.from({length:Math.max(1,searchesRemaining)},()=> 'twisted_plank' as const)
  const equipped=citizenAs(game,citizenId,profession)
  return{...equipped,world:{...equipped.world,zones:{...equipped.world.zones,[key]:{...equipped.world.zones[key],discovered:true,zombies:0,searchesRemaining,hiddenLoot:searchesRemaining>0?hiddenLoot:[],searchedBy:[],depletedSearchedBy:[],groundItems:[]}}}}
}
function normalSearchCommand(game:GameState,citizenId:string){
  const action=getLegalActions(game,citizenId).find((candidate)=>candidate.type==='SEARCH_ZONE'&&!isSpadeReplenishCommand(candidate))
  if(!action)throw new Error('Missing normal SEARCH_ZONE action')
  return action
}
function spadeCommand(game:GameState,citizenId:string){
  const action=getLegalActions(game,citizenId).find(isSpadeReplenishCommand)
  if(!action)throw new Error('Missing Replenish with Spade action')
  return action
}
function automaticSearchHours(game:GameState,throughHour:number):number[]{
  let next=game
  for(let hour=14;hour<=throughHour;hour+=1){next={...next,clock:{hour,phase:'day'}};next=runAutomaticSearches(next)}
  return next.events.filter((event)=>event.type==='ZONE_SEARCHED'&&event.citizenId==='c01'&&event.automatic).map((event)=>event.hour!)
}
function rawNormalSearch(state:GameState):Extract<GameEvent,{type:'ZONE_SEARCHED'}>{
  return{type:'ZONE_SEARCHED',day:state.day,hour:state.clock.hour,zoneKey:'1,0',citizenId:'c01',mode:'normal',item:{id:`i${String(state.nextItemId).padStart(6,'0')}`,type:'twisted_plank'}}
}
function stateForNormalSearchOutcome(success:boolean):GameState{
  const base=searchable({...createInitialGame(1201,1),clock:{hour:13,phase:'day'}},'c01','scout',2)
  for(let index=1;index<=1000;index+=1){const rngState=Math.imul(index,0x9e3779b1)>>>0;const candidate={...base,rngState};if(Boolean(resolveSearchAttempt(candidate,rawNormalSearch(candidate)).item)===success)return candidate}
  throw new Error(`Could not find deterministic ${success?'success':'failure'} search RNG`)
}
function withExplorable(game:GameState,profession:'scavenger'|'scout'):GameState{
  const key=zoneKey(1,0),base=game.world.zones[key]
  const site:SpecialSiteState={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}
  const zone:WorldZone={...base,x:1,y:0,discovered:true,zombies:0,groundItems:[],specialSite:site}
  const equipped=citizenAs(game,'c01',profession)
  return{...equipped,world:{...equipped.world,zones:{...equipped.world.zones,[key]:zone}}}
}

describe('Scavenger profession',()=>{
  it('derives every Scavenger modifier from the Small Shovel equipment token',()=>{
    const base=createInitialGame(1101,1)
    const scavenger=equipCitizenProfession(base.citizens[0],'scavenger')
    const scout=equipCitizenProfession(scavenger,'scout')
    expect(searchSuccessChancePercent(scavenger,'normal')).toBe(NORMAL_SEARCH_SUCCESS_PERCENT+SCAVENGER_SEARCH_BONUS_PERCENTAGE_POINTS)
    expect(searchSuccessChancePercent(scavenger,'depleted')).toBe(DEPLETED_SEARCH_SUCCESS_PERCENT+SCAVENGER_SEARCH_BONUS_PERCENTAGE_POINTS)
    expect(repeatSearchIntervalMinutes(scavenger)).toBe(SCAVENGER_REPEAT_SEARCH_INTERVAL_MINUTES)
    expect(ruinOxygenSecondsForCitizen(scavenger,RUIN_OXYGEN_SECONDS)).toBe(RUIN_OXYGEN_SECONDS*SCAVENGER_RUIN_OXYGEN_MULTIPLIER)
    expect(searchSuccessChancePercent(scout,'normal')).toBe(NORMAL_SEARCH_SUCCESS_PERCENT)
    expect(searchSuccessChancePercent(scout,'depleted')).toBe(DEPLETED_SEARCH_SUCCESS_PERCENT)
    expect(repeatSearchIntervalMinutes(scout)).toBe(BASE_AUTO_SEARCH_INTERVAL_MINUTES)
    expect(ruinOxygenSecondsForCitizen(scout,RUIN_OXYGEN_SECONDS)).toBe(RUIN_OXYGEN_SECONDS)
  })

  it('keeps ordinary repeats at two hours and carries Scavenger 90-minute repeats across hourly ticks',()=>{
    let ordinary=searchable({...createInitialGame(1102,1),clock:{hour:13,phase:'day'}},'c01','scout',20)
    ordinary=executeCommand(ordinary,normalSearchCommand(ordinary,'c01')).state
    expect(automaticSearchHours(ordinary,21)).toEqual([15,17,19,21])

    let scavenger=searchable({...createInitialGame(1103,1),clock:{hour:13,phase:'day'}},'c01','scavenger',20)
    scavenger=executeCommand(scavenger,normalSearchCommand(scavenger,'c01')).state
    expect(automaticSearchHours(scavenger,21)).toEqual([15,17,18,20,21])
  })

  it('does not consume a buried find on failure and consumes exactly one on success',()=>{
    const failed=stateForNormalSearchOutcome(false)
    const failedAfter=applyEvents(failed,[rawNormalSearch(failed)])
    expect(failedAfter.world.zones['1,0'].searchesRemaining).toBe(2)
    expect(failedAfter.world.zones['1,0'].hiddenLoot).toHaveLength(2)
    expect(failedAfter.events.at(-1)).toMatchObject({type:'ZONE_SEARCHED',item:null})

    const successful=stateForNormalSearchOutcome(true)
    const successAfter=applyEvents(successful,[rawNormalSearch(successful)])
    expect(successAfter.world.zones['1,0'].searchesRemaining).toBe(1)
    expect(successAfter.world.zones['1,0'].hiddenLoot).toHaveLength(1)
    expect(successAfter.events.at(-1)).toMatchObject({type:'ZONE_SEARCHED',item:{type:'twisted_plank'}})
  })

  it('keeps an active search session running when its final normal find makes the zone depleted',()=>{
    const base=searchable({...createInitialGame(1104,1),clock:{hour:13,phase:'day'}},'c01','scout',1)
    const manual:Extract<GameEvent,{type:'ZONE_SEARCHED'}>={type:'ZONE_SEARCHED',day:1,hour:13,zoneKey:'1,0',citizenId:'c01',mode:'normal',item:{id:'manual-find',type:'twisted_plank'},rngStateAfter:base.rngState}
    let game={...base,world:{...base.world,zones:{...base.world.zones,'1,0':{...base.world.zones['1,0'],searchesRemaining:0,hiddenLoot:[]}}},events:[...base.events,manual]}
    game={...game,clock:{hour:15,phase:'day'}}
    game=runAutomaticSearches(game)
    expect(game.events.at(-1)).toMatchObject({type:'ZONE_SEARCHED',citizenId:'c01',automatic:true,mode:'depleted'})
    expect(game.world.zones['1,0'].searchesRemaining).toBe(0)
  })

  it('cancels automatic searching when the citizen moves away',()=>{
    let game=searchable({...createInitialGame(1105,1),clock:{hour:13,phase:'day'}},'c01','scavenger',20)
    game=executeCommand(game,normalSearchCommand(game,'c01')).state
    game=applyEvents(game,[{type:'CITIZEN_LOCATION_CHANGED',day:1,hour:14,citizenId:'c01',location:{type:'world',x:2,y:0}}])
    game={...game,clock:{hour:21,phase:'day'}}
    game=runAutomaticSearches(game)
    expect(game.events.filter((event)=>event.type==='ZONE_SEARCHED'&&event.automatic)).toHaveLength(0)
  })

  it('replenishes a depleted zone with the Small Shovel once without blocking other replenishment sources',()=>{
    let game=searchable(createInitialGame(1106,1),'c01','scavenger',0)
    const key='1,0'
    const first=spadeCommand(game,'c01')
    game=executeCommand(game,first).state
    const spadeEvent=game.events.at(-1) as ReplenishmentEvent
    expect(spadeEvent).toMatchObject({type:'ZONE_REPLENISHED',zoneKey:key,source:'scavenger_spade',citizenId:'c01'})
    expect(game.world.zones[key].searchesRemaining).toBe(1)
    expect(game.world.zones[key].hiddenLoot).toHaveLength(1)
    expect(spadeReplenishmentUsed(game,key)).toBe(true)

    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],searchesRemaining:0,hiddenLoot:[]}}}}
    expect(getLegalActions(game,'c01').some(isSpadeReplenishCommand)).toBe(false)
    game=applyEvents(game,[{type:'ZONE_REPLENISHED',day:game.day,hour:game.clock.hour,zoneKey:key,loot:'twisted_plank'}])
    expect(game.world.zones[key].searchesRemaining).toBe(1)
    expect(game.world.zones[key].hiddenLoot).toEqual(['twisted_plank'])
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],searchesRemaining:0,hiddenLoot:[]}}}}
    expect(getLegalActions(game,'c01').some(isSpadeReplenishCommand)).toBe(false)
  })

  it('shows exact depletion tiers only to Scavengers and never exposes the numeric buried-find count',()=>{
    const scavenger=searchable(createInitialGame(1107,1),'c01','scavenger',2)
    const ordinary=searchable(createInitialGame(1108,1),'c01','scout',2)
    expect(searchResourceStatus(scavenger.citizens[0],scavenger.world.zones['1,0'])).toBe('almost_depleted')
    expect(searchResourceStatus(ordinary.citizens[0],ordinary.world.zones['1,0'])).toBe('available')

    const markup=renderToStaticMarkup(<WorldView game={scavenger} citizenId="c01" legalActions={getLegalActions(scavenger,'c01')} currentZone={scavenger.world.zones['1,0']} control={zoneControl(scavenger,1,0)} act={()=>{}} move={()=>{}} onRuinResult={()=>{}}/>)
    expect(markup).toContain('ALMOST DEPLETED')
    expect(markup).not.toContain('2 normal search')
    expect(markup).not.toContain('search opportunity')
  })

  it('gives a Small-Shovel explorer 50 percent more ruin oxygen',()=>{
    const now=900_000
    const scavenger=enterRuin(withExplorable(createInitialGame(1109,1),'scavenger'),'c01',now)
    expect(scavenger.ok).toBe(true)
    expect(oxygenSecondsRemaining(getRuinExplorer(scavenger.state,'c01')!,now)).toBe(450)
    const ordinary=enterRuin(withExplorable(createInitialGame(1110,1),'scout'),'c01',now)
    expect(ordinary.ok).toBe(true)
    expect(oxygenSecondsRemaining(getRuinExplorer(ordinary.state,'c01')!,now)).toBe(300)
  })

  it('lets bot Scavengers use the same one-time Spade replenish action',()=>{
    let game=searchable(createInitialGame(1111,2),'c02','scavenger',0)
    game={...game,world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],searchedBy:['c02'],depletedSearchedBy:['c02']}}}}
    const decision=bots.decide(game,'c02')
    expect(decision).toBeTruthy()
    expect(isSpadeReplenishCommand(decision!)).toBe(true)
  })
})
