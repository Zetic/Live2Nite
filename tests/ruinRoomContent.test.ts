import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import {
  enterRuin,
  expireRuinExploration,
  generateRuinInterior,
  getRuinExplorer,
  getRuinInterior,
  type RuinExplorerState,
  type RuinInteriorState,
} from '../src/core/ruinExploration'
import { dropRuinInventoryItem, searchRuinRoom, takeRuinFloorItem, unlockRuinRoom } from '../src/core/ruinRoomActions'
import { RUIN_ITEM_FILLRATE, RUIN_LOCK_DISTANCE, ruinRoomDistanceFromEntrance, ruinRoomLootSpecFromSourceRef } from '../src/core/ruinRoomContent'
import type { GameState, SpecialSiteState, SpecialSiteType, WorldZone } from '../src/core/types'
import { getZone, zoneKey } from '../src/core/world'

function clearZombies(interior:RuinInteriorState):RuinInteriorState{return{...interior,cells:interior.cells.map((cell)=>({...cell,zombies:0}))}}
function withExplorable(game:GameState,type:SpecialSiteType='abandoned_hospital',interior?:RuinInteriorState):GameState{
  const x=1,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  const site:SpecialSiteState&{interior?:RuinInteriorState}={type,status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false,...(interior?{interior}:{})}
  const zone:WorldZone={...base,x,y,discovered:true,zombies:0,groundItems:[],specialSite:site}
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:zone}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:6,location:{type:'world' as const,x,y},status:{...citizen.status,wound:null,terrorized:false},camping:{...citizen.camping,hidden:false}}:citizen)}
}
function roomState(game:GameState){const interior=getRuinInterior(getZone(game.world,1,0))!;return interior}
function placeExplorerInRoom(game:GameState,roomId:string):GameState{
  const interior=roomState(game),room=interior.rooms.find((candidate)=>candidate.id===roomId)!,explorer=getRuinExplorer(game,'c01')!
  const nextExplorer:RuinExplorerState={...explorer,cellId:room.corridorCellId,inRoomId:room.id,visitedCellIds:[...new Set([...explorer.visitedCellIds,room.corridorCellId])],visitedRoomIds:[...new Set([...explorer.visitedRoomIds,room.id])]}
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ruinExplorer:nextExplorer}:citizen)}
}
function placeExplorerAtDoor(game:GameState,roomId:string):GameState{
  const interior=roomState(game),room=interior.rooms.find((candidate)=>candidate.id===roomId)!,explorer=getRuinExplorer(game,'c01')!
  const nextExplorer:RuinExplorerState={...explorer,cellId:room.corridorCellId,inRoomId:null,visitedCellIds:[...new Set([...explorer.visitedCellIds,room.corridorCellId])]}
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ruinExplorer:nextExplorer}:citizen)}
}

describe('explorable ruin room content',()=>{
  it('uses the current lock-distance setting and deterministically stocks seven rooms',()=>{
    const interior=generateRuinInterior(901,1,0,'abandoned_hospital')
    expect(interior.rooms.filter((room)=>room.stocked)).toHaveLength(RUIN_ITEM_FILLRATE)
    const locked=interior.rooms.filter((room)=>room.locked)
    expect(locked.length).toBeGreaterThan(0)
    for(const room of interior.rooms){
      const distance=ruinRoomDistanceFromEntrance(interior,room)
      expect(room.locked).toBe(distance>=RUIN_LOCK_DISTANCE)
      if(room.locked)expect(['magnetic_key','bump_key','bottle_opener']).toContain(room.lockType)
    }
  })

  it('maps source ruin keys and specialized plans without using source ids as runtime ids',()=>{
    expect(ruinRoomLootSpecFromSourceRef('magneticKey_#00',null)?.type).toBe('magnetic_key')
    expect(ruinRoomLootSpecFromSourceRef('classicKey_#00',null)?.type).toBe('bottle_opener')
    const plan=ruinRoomLootSpecFromSourceRef('mbplan_u_#00',null)
    expect(plan?.type).toBe('uncommon_blueprint')
    expect(plan?.state).toEqual({blueprintFamily:'hospital',blueprintTier:'uncommon'})
    expect(ruinRoomLootSpecFromSourceRef('unsupported_source_item_#00',null)).toBeNull()
  })

  it('consumes the exact matching key when a deep locked room is opened',()=>{
    const now=100_000,interior=clearZombies(generateRuinInterior(902,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(902,1),'abandoned_hospital',interior),'c01',now).state
    const room=roomState(game).rooms.find((candidate)=>candidate.locked&&candidate.lockType)!
    game=placeExplorerAtDoor(game,room.id)
    const wrong=room.lockType==='magnetic_key'?'bump_key':'magnetic_key'
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('wrong-key',wrong),createItemInstance('right-key',room.lockType!)]}:citizen)}
    const unlocked=unlockRuinRoom(game,'c01',now)
    expect(unlocked.ok).toBe(true)
    expect(unlocked.state.citizens.find((citizen)=>citizen.id==='c01')?.inventory.map((item)=>item.id)).toEqual(['wrong-key'])
    expect(roomState(unlocked.state).rooms.find((candidate)=>candidate.id===room.id)?.locked).toBe(false)
  })

  it('searches a stocked room once and leaves a supported find on the floor when the rucksack is full',()=>{
    const now=200_000,interior=clearZombies(generateRuinInterior(903,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(903,1),'abandoned_hospital',interior),'c01',now).state
    const room=roomState(game).rooms.find((candidate)=>candidate.stocked)!
    game=placeExplorerInRoom(game,room.id)
    const capacity=game.citizens.find((citizen)=>citizen.id==='c01')!.inventoryCapacity
    game={...game,rngState:1,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:Array.from({length:capacity},(_,index)=>createItemInstance(`full-${index}`,'water_ration'))}:citizen)}
    const searched=searchRuinRoom(game,'c01',now)
    expect(searched.ok).toBe(true)
    const afterRoom=roomState(searched.state).rooms.find((candidate)=>candidate.id===room.id)!
    expect(afterRoom.searched).toBe(true)
    const cell=roomState(searched.state).cells.find((candidate)=>candidate.id===room.corridorCellId)!
    expect(cell.floorItems).toHaveLength(1)
    expect(cell.floorItems?.[0]?.type).toBe('uncommon_blueprint')
    expect(cell.floorItems?.[0]?.state).toMatchObject({blueprintFamily:'hospital',blueprintTier:'uncommon'})
    expect(searchRuinRoom(searched.state,'c01',now).ok).toBe(false)
  })

  it('allows floor recovery and deliberate interior drops while respecting rucksack capacity',()=>{
    const now=300_000,interior=clearZombies(generateRuinInterior(904,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(904,1),'abandoned_hospital',interior),'c01',now).state
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('carried','bandage')]}:citizen)}
    game=dropRuinInventoryItem(game,'c01','carried',now).state
    expect(game.citizens.find((citizen)=>citizen.id==='c01')?.inventory).toHaveLength(0)
    const entrance=getRuinExplorer(game,'c01')!.cellId
    expect(roomState(game).cells.find((cell)=>cell.id===entrance)?.floorItems?.map((item)=>item.id)).toContain('carried')
    game=takeRuinFloorItem(game,'c01','carried',now).state
    expect(game.citizens.find((citizen)=>citizen.id==='c01')?.inventory.map((item)=>item.id)).toContain('carried')
  })

  it('drops carried items on the current interior floor when oxygen expires',()=>{
    const now=400_000,interior=clearZombies(generateRuinInterior(905,1,0,'abandoned_hospital'))
    let game=enterRuin(withExplorable(createInitialGame(905,1),'abandoned_hospital',interior),'c01',now).state
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('lost-a','bandage'),createItemInstance('lost-b','water_ration')]}:citizen)}
    const currentCell=getRuinExplorer(game,'c01')!.cellId
    const expired=expireRuinExploration(game,'c01',now+331_000)
    expect(expired.ok).toBe(false)
    expect(expired.state.citizens.find((citizen)=>citizen.id==='c01')?.inventory).toHaveLength(0)
    expect(roomState(expired.state).cells.find((cell)=>cell.id===currentCell)?.floorItems?.map((item)=>item.id)).toEqual(['lost-a','lost-b'])
  })

  it('normalizes pre-room-content interiors on entry without a save schema bump',()=>{
    const generated=generateRuinInterior(906,1,0,'abandoned_hospital')
    const legacy={...generated,cells:generated.cells.map(({floorItems:_,...cell})=>cell),rooms:generated.rooms.map(({lockType:_,stocked:__,...room})=>({...room,locked:false}))} as RuinInteriorState
    const entered=enterRuin(withExplorable(createInitialGame(906,1),'abandoned_hospital',legacy),'c01',500_000)
    expect(entered.ok).toBe(true)
    const normalized=roomState(entered.state)
    expect(normalized.rooms.filter((room)=>room.stocked)).toHaveLength(RUIN_ITEM_FILLRATE)
    expect(normalized.cells.every((cell)=>Array.isArray(cell.floorItems))).toBe(true)
    expect(normalized.rooms.some((room)=>room.locked)).toBe(true)
  })
})
