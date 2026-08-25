import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { enterRuin, generateRuinInterior, getRuinExplorer, getRuinInterior } from '../src/core/ruinExploration'
import { advanceExplorableRuinLifecycleForNewDay, advanceRuinInteriorToDay, ruinInteriorZombieTotal, ruinOccupiedZombieCells, SOURCE_RUIN_DAILY_ZOMBIES, SOURCE_RUIN_INITIAL_ZOMBIES } from '../src/core/ruinEvolution'
import { RUIN_CATALOG } from '../src/core/ruinCatalog'
import { normalizeRuinId } from '../src/core/specialSites'
import type { GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { distanceToTown, zoneKey } from '../src/core/world'
import { initialWorldZombieCount, SOURCE_MASSIVE_RESPAWN_FACTOR, SOURCE_MASSIVE_RESPAWN_THRESHOLD_PERCENT, worldZombieEvolutionChanges } from '../src/core/worldEvolution'

function explorableZone(game:GameState):WorldZone{
  return Object.values(game.world.zones).find((zone)=>{
    const id=zone.specialSite?normalizeRuinId(zone.specialSite.type):null
    return Boolean(id&&RUIN_CATALOG[id].explorable)
  })!
}

describe('source-calibrated zombie population',()=>{
  it('keeps Day-1 town approaches clear and ramps threat outward deterministically',()=>{
    const game=createInitialGame(7001,1)
    const same=createInitialGame(7001,1)
    for(const zone of Object.values(game.world.zones)){
      expect(zone.zombies).toBe(same.world.zones[zoneKey(zone.x,zone.y)]?.zombies)
      const distance=distanceToTown(zone.x,zone.y)
      if(distance<=1)expect(zone.zombies).toBe(0)
      if(distance===2)expect(zone.zombies).toBeLessThanOrEqual(1)
      if(distance>=10)expect(zone.zombies).toBeGreaterThanOrEqual(2)
      expect(zone.zombies).toBe(initialWorldZombieCount(game.seed,zone.x,zone.y))
    }
  })

  it('uses the current source massive-respawn tuning without repopulating the starter approaches',()=>{
    expect(SOURCE_MASSIVE_RESPAWN_THRESHOLD_PERCENT).toBe(50)
    expect(SOURCE_MASSIVE_RESPAWN_FACTOR).toBe(0.5)
    const base=createInitialGame(7002,1)
    const emptied:GameState={...base,world:{...base.world,zones:Object.fromEntries(Object.entries(base.world.zones).map(([key,zone])=>[key,{...zone,zombies:0}]))}}
    const changes=worldZombieEvolutionChanges(emptied)
    const after=new Map(changes.map((change)=>[change.zoneKey,change.after]))
    expect(changes.length).toBeGreaterThan(0)
    for(const zone of Object.values(emptied.world.zones))if(distanceToTown(zone.x,zone.y)<=2)expect(after.get(zoneKey(zone.x,zone.y))??0).toBe(0)
  })

  it('keeps the source ten-zombie ruin start but concentrates it into visible threat pockets',()=>{
    const interior=generateRuinInterior(7003,1,0,'abandoned_hospital')
    expect(ruinInteriorZombieTotal(interior)).toBe(SOURCE_RUIN_INITIAL_ZOMBIES)
    expect(ruinOccupiedZombieCells(interior)).toBeLessThanOrEqual(5)
    expect(interior.cells.find((cell)=>cell.kind==='entrance'&&cell.floor===0)?.zombies).toBe(0)
  })

  it('adds exactly five persistent ruin zombies per new day and is idempotent for the same day',()=>{
    const interior=generateRuinInterior(7004,1,0,'abandoned_hospital')
    const day2=advanceRuinInteriorToDay(7004,1,0,interior,2)
    expect(ruinInteriorZombieTotal(day2)).toBe(SOURCE_RUIN_INITIAL_ZOMBIES+SOURCE_RUIN_DAILY_ZOMBIES)
    const repeated=advanceRuinInteriorToDay(7004,1,0,day2,2)
    expect(ruinInteriorZombieTotal(repeated)).toBe(ruinInteriorZombieTotal(day2))
  })

  it('preserves ruin room state and floor caches while clearing stale explorer locks at rollover',()=>{
    let game=createInitialGame(7005,1)
    const zone=explorableZone(game)
    const key=zoneKey(zone.x,zone.y)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...zone,zombies:0}}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x:zone.x,y:zone.y},ap:6}:citizen)}
    game=enterRuin(game,'c01',100_000).state
    const initial=getRuinInterior(game.world.zones[key])!
    const room=initial.rooms[0]!
    const cacheCell=initial.cells.find((cell)=>cell.kind!=='entrance')!
    const cached=createItemInstance('cached-item','bandage')
    const site=game.world.zones[key]!.specialSite as SpecialSiteState&{interior:typeof initial}
    const customized={...initial,rooms:initial.rooms.map((candidate)=>candidate.id===room.id?{...candidate,searched:true,locked:false}:candidate),cells:initial.cells.map((cell)=>cell.id===cacheCell.id?{...cell,floorItems:[...(cell.floorItems??[]),cached]}:cell)}
    const updatedSite:SpecialSiteState&{interior:typeof initial}={...site,interior:customized}
    const updatedZone:WorldZone={...game.world.zones[key]!,specialSite:updatedSite}
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:updatedZone}}}
    const before=ruinInteriorZombieTotal(customized)
    const next=advanceExplorableRuinLifecycleForNewDay(game,2)
    const evolved=getRuinInterior(next.world.zones[key])!
    expect(ruinInteriorZombieTotal(evolved)).toBe(before+SOURCE_RUIN_DAILY_ZOMBIES)
    expect(evolved.rooms.find((candidate)=>candidate.id===room.id)).toMatchObject({searched:true,locked:false})
    expect(evolved.cells.find((cell)=>cell.id===cacheCell.id)?.floorItems?.map((item)=>item.id)).toContain('cached-item')
    expect(evolved.activeExplorerCitizenId).toBeNull()
    expect(getRuinExplorer(next,'c01')?.active).toBe(false)
  })
})
