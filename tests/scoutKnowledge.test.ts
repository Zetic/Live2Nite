import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createAgentDecisionContext } from '../src/agents/AgentDecisionContext'
import { createAgentWorldKnowledge } from '../src/agents/WorldKnowledge'
import { routeBetween } from '../src/agents/planning/RoutePlanner'
import { createInitialGame } from '../src/core/game'
import { equipCitizenProfession } from '../src/core/professions'
import { scoutArrivalEvents, scoutDetectionChancePercent } from '../src/core/scout'
import type { Citizen, GameState, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function replaceCitizen(game:GameState,citizen:Citizen):GameState{return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}}
function outside(game:GameState,citizenId:string,x:number,y:number):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)!
  return replaceCitizen(game,{...citizen,location:{type:'world',x,y},status:{...citizen.status,wound:null,terrorized:false},camping:{...citizen.camping,hidden:false}})
}
function patchZone(game:GameState,x:number,y:number,patch:Partial<WorldZone>):GameState{
  const key=zoneKey(x,y),base=game.world.zones[key]
  if(!base)throw new Error(`Missing zone ${key}`)
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...base,...patch}}}}
}

describe('Scout knowledge boundary',()=>{
  it('exposes only a bounded adjacent zombie estimate to a Scout viewer while preserving hidden zone details',()=>{
    let game=outside(createInitialGame(7301,1,'scout'),'c01',1,0)
    game=patchZone(game,2,0,{discovered:false,zombies:7,searchesRemaining:5})

    const generic=createAgentWorldKnowledge(game).zone(2,0)!
    expect(generic.discovered).toBe(false)
    expect(generic.zombies).toBeNull()
    expect(generic.searchesRemaining).toBeNull()
    expect(generic.specialSite).toBeUndefined()

    const sensed=createAgentWorldKnowledge(game,'c01').zone(2,0)!
    expect(sensed.discovered).toBe(false)
    expect(sensed.zombieIntel).toBe('scout_estimate')
    expect(sensed.freshness).toBe('fresh')
    expect(sensed.zombies).toBeGreaterThanOrEqual(5)
    expect(sensed.zombies).toBeLessThanOrEqual(9)
    expect(sensed.searchesRemaining).toBeNull()
    expect(sensed.specialSite).toBeUndefined()

    const guardian=equipCitizenProfession(game.citizens[0],'guardian')
    game=replaceCitizen(game,guardian)
    expect(createAgentWorldKnowledge(game,'c01').zone(2,0)?.zombies).toBeNull()
  })

  it('lets Scout route planning react to sensed adjacent danger without reading hidden exact counts',()=>{
    let game=outside(createInitialGame(7302,1,'scout'),'c01',1,0)
    game=patchZone(game,1,1,{discovered:false,zombies:20})
    game=patchZone(game,2,0,{discovered:false,zombies:0})
    game=patchZone(game,1,-1,{discovered:false,zombies:20})
    const route=routeBetween(game,{x:1,y:0},{x:2,y:2},'c01')
    expect(route[0]).toBe('EAST')
  })

  it('uses the pre-arrival Scout Level for camouflage detection and records the milestone visit afterward',()=>{
    let game=outside(createInitialGame(7303,1,'scout'),'c01',1,0)
    game=patchZone(game,2,0,{discovered:true,zombies:8,scoutVisits:4})
    const citizen=game.citizens[0]
    const target=game.world.zones['2,0']
    expect(scoutDetectionChancePercent(game,citizen,target)).toBe(7)
    const events=scoutArrivalEvents(game,citizen,target)
    expect(events[0]?.type).toBe('SCOUT_DETECTION_RESOLVED')
    expect(events.at(-1)?.type).toBe('SCOUT_VISIT_RECORDED')
  })

  it('lets ordinary autonomous citizens use the completed Scouts Lair for the source-backed next-day SP bonus',()=>{
    let game=createInitialGame(7304,2,'scout')
    const bot=equipCitizenProfession(game.citizens[1],'guardian')
    game=replaceCitizen(game,{...bot,controller:'basic-bot'})
    game={...game,town:{...game.town,construction:{...game.town.construction,scouts_lair:{...game.town.construction.scouts_lair,discovered:true,completed:true}}}}
    const action=new BasicBotController().decide(createAgentDecisionContext(game,'c02'),'c02')
    expect(action).toMatchObject({type:'MAP_WASTELAND',citizenId:'c02'})
  })
})
