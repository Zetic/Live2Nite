import { describe, expect, it } from 'vitest'
import { CONSTRUCTIONS } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { searchTowerReplenishmentEventsForNight, searchTowerWindDirectionForDay } from '../src/core/worldObservation'
import { worldZombieEvolutionEvent } from '../src/core/worldEvolution'
import { filterChronicleEvents } from '../src/ui/chronicle'
import { describeEvent } from '../src/ui/eventText'

function withSearchtower(game:GameState):GameState{
  return{...game,town:{...game.town,construction:{...game.town.construction,watchtower:{...game.town.construction.watchtower,discovered:true,completed:true,apContributed:CONSTRUCTIONS.watchtower.apCost},search_tower:{...game.town.construction.search_tower,discovered:true,completed:true,apContributed:CONSTRUCTIONS.search_tower.apCost}}}}
}
function allChronicle(events:GameState['events']){return filterChronicleEvents(events,{mode:'all',day:null,citizenId:null,categories:[]})}

describe('natural world recovery information boundary',()=>{
  it('keeps exact recovered zones hidden while level-0 Searchtower reveals only the nightly sector',()=>{
    let game=createInitialGame(7301,2)
    game={...game,world:{...game.world,zones:Object.fromEntries(Object.entries(game.world.zones).map(([key,zone])=>[key,{...zone,searchesRemaining:0}]))}}

    let recovery=searchTowerReplenishmentEventsForNight(game,['rotten_log'])
    for(let seed=1;seed<=128&&recovery.length===0;seed+=1){recovery=searchTowerReplenishmentEventsForNight({...game,seed},['rotten_log'])}
    expect(recovery.length).toBeGreaterThan(0)
    expect(allChronicle(recovery)).toEqual([])

    const withTower=withSearchtower(game)
    const nightEvent=worldZombieEvolutionEvent(withTower)
    expect(nightEvent?.type).toBe('WORLD_ZOMBIES_EVOLVED')
    expect(allChronicle([nightEvent!])).toEqual([nightEvent])
    expect(describeEvent(nightEvent!,withTower)).toContain(`Searchtower recorded the recovery sector as ${searchTowerWindDirectionForDay(withTower.seed,withTower.day)}.`)
  })
})
