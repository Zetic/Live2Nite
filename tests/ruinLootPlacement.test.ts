import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import { enterRuin, generateRuinInterior, getRuinExplorer, getRuinInterior, type RuinExplorerState, type RuinInteriorState } from '../src/core/ruinExploration'
import { searchRuinRoom } from '../src/core/ruinRoomActions'
import type { GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { getZone, zoneKey } from '../src/core/world'

function clearZombies(interior:RuinInteriorState):RuinInteriorState{return{...interior,cells:interior.cells.map((cell)=>({...cell,zombies:0}))}}
function withHospital(game:GameState,interior:RuinInteriorState):GameState{
  const x=1,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  const site:SpecialSiteState&{interior:RuinInteriorState}={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false,interior}
  const zone={...base,x,y,discovered:true,zombies:0,groundItems:[],specialSite:site} as WorldZone
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:zone}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:6,location:{type:'world' as const,x,y},inventory:[],status:{...citizen.status,wound:null,terrorized:false},camping:{...citizen.camping,hidden:false}}:citizen)}
}

describe('explorable ruin search placement',()=>{
  it('puts a supported room-search find directly in the rucksack before using floor overflow',()=>{
    const now=100_000,interior=clearZombies(generateRuinInterior(1201,1,0,'abandoned_hospital'))
    let game=enterRuin(withHospital(createInitialGame(1201,1),interior),'c01',now).state
    const active=getRuinInterior(getZone(game.world,1,0))!,room=active.rooms.find((candidate)=>candidate.stocked)!,explorer=getRuinExplorer(game,'c01')!
    const shifted:RuinExplorerState={...explorer,cellId:room.corridorCellId,inRoomId:room.id,visitedCellIds:[...new Set([...explorer.visitedCellIds,room.corridorCellId])],visitedRoomIds:[room.id]}
    game={...game,rngState:1,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ruinExplorer:shifted}:citizen)}

    const searched=searchRuinRoom(game,'c01',now)
    expect(searched.ok).toBe(true)
    const citizen=searched.state.citizens.find((candidate)=>candidate.id==='c01')!
    const after=getRuinInterior(getZone(searched.state.world,1,0))!,cell=after.cells.find((candidate)=>candidate.id===room.corridorCellId)!
    expect(citizen.inventory).toHaveLength(1)
    expect(citizen.inventory[0]?.type).toBe('uncommon_blueprint')
    expect(cell.floorItems).toEqual([])
    expect(searched.message).toContain('placed it in the rucksack')
  })
})
