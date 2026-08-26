import { describe, expect, it } from 'vitest'
import { createAgentWorldKnowledge } from '../src/agents/WorldKnowledge'
import { CONSTRUCTIONS } from '../src/core/construction'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import type { ConstructionId, GameState } from '../src/core/types'
import { nightlyObservationEvents } from '../src/core/worldObservation'

function complete(game:GameState,...ids:ConstructionId[]):GameState{
  const construction={...game.town.construction}
  for(const id of ids)construction[id]={...construction[id],discovered:true,completed:true,apContributed:CONSTRUCTIONS[id].apCost}
  return{...game,town:{...game.town,construction}}
}
function observationLevel(game:GameState,level:number):GameState{return{...game,town:{...game.town,upgradeProjects:{...game.town.upgradeProjects,levels:{...game.town.upgradeProjects.levels,observation_platform:level}}}}}

describe('Observation Platform information boundary',()=>{
  it('reveals a coarse zombie band without discovering or exposing an unseen zone',()=>{
    let game=observationLevel(complete(createInitialGame(7301,2),'watchtower','observation_platform'),1)
    const key='1,0';const zone=game.world.zones[key]
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,discovered:false,zombies:3,searchesRemaining:2,groundItems:[{id:'hidden-log',type:'rotten_log'}]}}}}

    const events=nightlyObservationEvents(game)
    expect(events.some((event)=>event.type==='ZONE_DISCOVERED'&&event.zoneKey===key)).toBe(false)
    const applied=applyEvents(game,events)
    expect(applied.world.zones[key].discovered).toBe(false)

    const knowledge=createAgentWorldKnowledge(applied,'c01').zone(1,0)
    expect(knowledge?.discovered).toBe(false)
    expect(knowledge?.zombies).toBe(4)
    expect(knowledge?.zombieIntel).toBe('map_estimate')
    expect(knowledge?.searchesRemaining).toBeNull()
    expect(knowledge?.specialSite).toBeUndefined()
  })

  it('allows Upgraded Map exact zombie intel without converting the cell into discovered terrain',()=>{
    let game=observationLevel(complete(createInitialGame(7302,2),'watchtower','observation_platform','upgraded_map'),1)
    const key='1,0';const zone=game.world.zones[key]
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,discovered:false,zombies:3}}}}

    const applied=applyEvents(game,nightlyObservationEvents(game))
    const knowledge=createAgentWorldKnowledge(applied,'c01').zone(1,0)
    expect(applied.world.zones[key].discovered).toBe(false)
    expect(knowledge?.discovered).toBe(false)
    expect(knowledge?.zombies).toBe(3)
    expect(knowledge?.zombieIntel).toBe('observed')
    expect(knowledge?.searchesRemaining).toBeNull()
  })
})
