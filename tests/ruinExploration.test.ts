import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import { equipCitizenProfession } from '../src/core/professions'
import {
  RUIN_INITIAL_ZOMBIES,
  RUIN_OXYGEN_SECONDS,
  enterRuin,
  expireRuinExploration,
  generateRuinInterior,
  getRuinExplorer,
  getRuinInterior,
  leaveRuin,
  moveInsideRuin,
  oxygenSecondsRemaining,
  useRuinStairs,
  type RuinInteriorState,
} from '../src/core/ruinExploration'
import type { GameState, SpecialSiteState, SpecialSiteType, WorldZone } from '../src/core/types'
import { getZone, zoneKey } from '../src/core/world'
import { migrateStoredGame } from '../src/persistence/IndexedDbGameRepository'

function clearZombies(interior:RuinInteriorState):RuinInteriorState{return{...interior,cells:interior.cells.map((cell)=>({...cell,zombies:0}))}}
function withExplorable(game:GameState,type:SpecialSiteType='abandoned_hospital',interior?:RuinInteriorState):GameState{
  const x=1,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  const site:SpecialSiteState&{interior?:RuinInteriorState}={
    type,status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false,
    ...(interior?{interior}:{}),
  }
  const zone:WorldZone={...base,x,y,discovered:true,zombies:0,groundItems:[],specialSite:site}
  return{
    ...game,
    world:{...game.world,zones:{...game.world.zones,[key]:zone}},
    citizens:game.citizens.map((citizen)=>citizen.id==='c01'?equipCitizenProfession({...citizen,ap:6,location:{type:'world' as const,x,y},status:{...citizen.status,wound:null,terrorized:false},camping:{...citizen.camping,hidden:false}},'scout'):citizen),
  }
}

describe('explorable ruin interior model',()=>{
  it('generates the source-configured two-floor, fifteen-room topology',()=>{
    const hospital=generateRuinInterior(701,1,0,'abandoned_hospital')
    const bunker=generateRuinInterior(701,1,0,'abandoned_bunker')
    expect(hospital.rooms).toHaveLength(15)
    expect(new Set(hospital.cells.map((cell)=>cell.floor))).toEqual(new Set([0,1]))
    expect(new Set(bunker.cells.map((cell)=>cell.floor))).toEqual(new Set([0,-1]))
    for(const floor of [0,1])expect(hospital.rooms.filter((room)=>room.floor===floor).length).toBeGreaterThanOrEqual(5)
    expect(hospital.cells.every((cell)=>Math.abs(cell.x)<=6&&Math.abs(cell.y)<=6)).toBe(true)
    expect(hospital.cells.reduce((sum,cell)=>sum+cell.zombies,0)).toBe(RUIN_INITIAL_ZOMBIES)
    expect(hospital.cells.find((cell)=>cell.floor===0&&cell.x===0&&cell.y===0)?.kind).toBe('entrance')
  })

  it('charges one AP and begins with five minutes of effective oxygen plus grace',()=>{
    const now=100_000
    const game=withExplorable(createInitialGame(702,1))
    const result=enterRuin(game,'c01',now)
    expect(result.ok).toBe(true)
    const citizen=result.state.citizens.find((candidate)=>candidate.id==='c01')!
    const explorer=getRuinExplorer(result.state,'c01')!
    expect(citizen.ap).toBe(5)
    expect(explorer.active).toBe(true)
    expect(oxygenSecondsRemaining(explorer,now)).toBe(RUIN_OXYGEN_SECONDS)
    expect(explorer.graceUntilMs).toBe(now+30_000)
    expect(getRuinInterior(getZone(result.state.world,1,0))?.activeExplorerCitizenId).toBe('c01')
  })

  it('preserves the entry grace until first movement and then starts real-time oxygen loss',()=>{
    const now=200_000
    const interior=clearZombies(generateRuinInterior(703,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(703,1),'abandoned_hospital',interior),'c01',now).state
    expect(oxygenSecondsRemaining(getRuinExplorer(game,'c01')!,now+5_000)).toBe(RUIN_OXYGEN_SECONDS)
    game=moveInsideRuin(game,'c01','NORTH',now+5_000).state
    const explorer=getRuinExplorer(game,'c01')!
    expect(explorer.graceUntilMs).toBeNull()
    expect(oxygenSecondsRemaining(explorer,now+5_000)).toBe(RUIN_OXYGEN_SECONDS)
    expect(oxygenSecondsRemaining(explorer,now+6_000)).toBe(RUIN_OXYGEN_SECONDS-1)
  })

  it('connects floors through stairs and applies the source 15–24 second oxygen penalty',()=>{
    const now=300_000
    const interior=clearZombies(generateRuinInterior(704,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(704,1),'abandoned_hospital',interior),'c01',now).state
    for(let step=0;step<5;step+=1)game=moveInsideRuin(game,'c01','NORTH',now).state
    const before=oxygenSecondsRemaining(getRuinExplorer(game,'c01')!,now)
    const result=useRuinStairs(game,'c01',now)
    expect(result.ok).toBe(true)
    const afterExplorer=getRuinExplorer(result.state,'c01')!
    const after=oxygenSecondsRemaining(afterExplorer,now)
    expect(before-after).toBeGreaterThanOrEqual(15)
    expect(before-after).toBeLessThanOrEqual(24)
    expect(afterExplorer.cellId.startsWith('1:')).toBe(true)
  })

  it('only permits a normal exit after returning to the entrance',()=>{
    const now=400_000
    const interior=clearZombies(generateRuinInterior(705,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(705,1),'abandoned_hospital',interior),'c01',now).state
    game=moveInsideRuin(game,'c01','NORTH',now).state
    expect(leaveRuin(game,'c01',now).ok).toBe(false)
    game=moveInsideRuin(game,'c01','SOUTH',now).state
    const exit=leaveRuin(game,'c01',now)
    expect(exit.ok).toBe(true)
    expect(getRuinExplorer(exit.state,'c01')?.active).toBe(false)
    expect(getRuinInterior(getZone(exit.state.world,1,0))?.activeExplorerCitizenId).toBeNull()
  })

  it('forces an oxygen-depleted explorer out and inflicts a wound',()=>{
    const now=500_000
    const game=enterRuin(withExplorable(createInitialGame(706,1)),'c01',now).state
    const result=expireRuinExploration(game,'c01',now+331_000)
    expect(result.ok).toBe(false)
    expect(getRuinExplorer(result.state,'c01')?.active).toBe(false)
    expect(result.state.citizens.find((candidate)=>candidate.id==='c01')?.status.wound).not.toBeNull()
    expect(getRuinInterior(getZone(result.state.world,1,0))?.activeExplorerCitizenId).toBeNull()
  })

  it('prevents same-day re-entry after a completed exploration',()=>{
    const now=600_000
    let game=enterRuin(withExplorable(createInitialGame(707,1)),'c01',now).state
    game=leaveRuin(game,'c01',now).state
    const reentry=enterRuin(game,'c01',now+1_000)
    expect(reentry.ok).toBe(false)
    expect(reentry.message).toContain('cannot re-enter')
  })

  it('persists active explorer and interior state through schema-19 normalization',()=>{
    const now=700_000
    const active=enterRuin(withExplorable(createInitialGame(708,1)),'c01',now).state
    const migrated=migrateStoredGame(JSON.parse(JSON.stringify(active)) as Record<string,unknown>)
    expect(migrated).not.toBeNull()
    expect(getRuinExplorer(migrated!,'c01')?.active).toBe(true)
    expect(getRuinInterior(getZone(migrated!.world,1,0))?.rooms).toHaveLength(15)
  })
})
