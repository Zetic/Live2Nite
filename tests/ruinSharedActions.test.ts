import { describe, expect, it } from 'vitest'
import { resolveWeaponAttack } from '../src/core/combat'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, normalizeItemState } from '../src/core/items'
import { enterRuin, generateRuinInterior, getRuinExplorer, getRuinInterior, moveInsideRuin, type RuinExplorerState, type RuinInteriorState } from '../src/core/ruinExploration'
import { executeRuinSharedAction, getRuinSharedActions } from '../src/core/ruinSharedActions'
import type { GameState, SpecialSiteState, SpecialSiteType, WorldZone } from '../src/core/types'
import { getZone, zoneKey } from '../src/core/world'

type SiteWithInterior=SpecialSiteState&{interior:RuinInteriorState}

function entranceThreat(interior:RuinInteriorState,zombies:number):RuinInteriorState{
  const entrance=interior.cells.find((cell)=>cell.kind==='entrance'&&cell.floor===0)!
  return{...interior,cells:interior.cells.map((cell)=>({...cell,zombies:cell.id===entrance.id?zombies:0}))}
}
function withExplorable(game:GameState,type:SpecialSiteType='abandoned_hospital',interior?:RuinInteriorState):GameState{
  const x=1,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  const site:SpecialSiteState&{interior?:RuinInteriorState}={type,status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false,...(interior?{interior}:{})}
  const zone:WorldZone={...base,x,y,discovered:true,zombies:0,groundItems:[],specialSite:site}
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:zone}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:6,location:{type:'world' as const,x,y},status:{...citizen.status,wound:null,terrorized:false},camping:{...citizen.camping,hidden:false}}:citizen)}
}
function enterWithThreat(seed:number,zombies:number):GameState{
  const interior=entranceThreat(generateRuinInterior(seed,1,0,'abandoned_hospital'),zombies)
  return enterRuin(withExplorable(createInitialGame(seed,1),'abandoned_hospital',interior),'c01',100_000).state
}
function currentInterior(game:GameState):RuinInteriorState{return getRuinInterior(getZone(game.world,1,0))!}
function currentCell(game:GameState){const explorer=getRuinExplorer(game,'c01')!;return currentInterior(game).cells.find((cell)=>cell.id===explorer.cellId)!}
function placeExplorerInRoomWithThreat(game:GameState,roomId:string,zombies:number):GameState{
  const key=zoneKey(1,0),zone=game.world.zones[key],site=zone.specialSite as SiteWithInterior,interior=site.interior
  const room=interior.rooms.find((candidate)=>candidate.id===roomId)!,explorer=getRuinExplorer(game,'c01')!
  const shifted:RuinExplorerState={...explorer,cellId:room.corridorCellId,inRoomId:room.id}
  const nextInterior:RuinInteriorState={...interior,cells:interior.cells.map((cell)=>({...cell,zombies:cell.id===room.corridorCellId?zombies:0}))}
  const nextSite:SiteWithInterior={...site,interior:nextInterior}
  const nextZone:WorldZone={...zone,specialSite:nextSite}
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:nextZone}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ruinExplorer:shifted}:citizen)}
}

describe('explorable ruin shared action adapter',()=>{
  it('exposes normal carried-item actions and combinations without exterior-only commands or barehand combat',()=>{
    let game=enterWithThreat(1001,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[
      createItemInstance('machete','machete'),
      createItemInstance('water','water_ration'),
      createItemInstance('bag','doggy_bag'),
      createItemInstance('plastic','plastic_bag'),
    ]}:citizen)}
    const actions=getRuinSharedActions(game,'c01')
    expect(actions.some((action)=>action.type==='USE_WEAPON'&&action.itemId==='machete')).toBe(true)
    expect(actions.some((action)=>action.type==='DRINK_ITEM'&&action.itemId==='water')).toBe(true)
    expect(actions.some((action)=>action.type==='OPEN_CONTAINER'&&action.itemId==='bag')).toBe(true)
    expect(actions.some((action)=>action.type==='COMBINE_ITEMS'&&action.recipeId==='fill_water_bomb')).toBe(true)
    expect(actions.some((action)=>action.type==='ATTACK_BAREHANDED')).toBe(false)
    expect(actions.some((action)=>action.type==='MOVE'||action.type==='DROP_ITEM'||action.type==='SEARCH_ZONE'||action.type==='SEARCH_SPECIAL_SITE')).toBe(false)
  })

  it('uses the existing weapon resolver against only the current interior cell',()=>{
    let game=enterWithThreat(1002,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('machete','machete')]}:citizen)}
    const item=game.citizens.find((citizen)=>citizen.id==='c01')!.inventory[0]
    const expected=resolveWeaponAttack(game,item,2)
    const beforeIntel=game.world.intel[zoneKey(1,0)]
    const command=getRuinSharedActions(game,'c01').find((action)=>action.type==='USE_WEAPON'&&action.itemId==='machete')!
    const resolved=executeRuinSharedAction(game,command)
    expect(currentCell(resolved.state).zombies).toBe(2-expected.kills)
    expect(getZone(resolved.state.world,1,0)?.zombies).toBe(0)
    expect(resolved.state.world.intel[zoneKey(1,0)]).toEqual(beforeIntel)
    expect(resolved.state.rngState).toBe(expected.rngStateAfter)
    const carried=resolved.state.citizens.find((citizen)=>citizen.id==='c01')!.inventory[0]
    expect(carried.type).toBe(expected.brokenInto??'machete')
    expect(resolved.events.map((event)=>event.type)).toEqual(['COMBAT_RESOLVED'])
    expect(getRuinSharedActions(resolved.state,'c01').some((action)=>action.type==='USE_WEAPON')).toBe(false)
    expect(moveInsideRuin(resolved.state,'c01','NORTH',100_000).ok).toBe(true)
  })

  it('preserves normal weapon consumption and charge mutation inside the ruin',()=>{
    let game=enterWithThreat(1006,6)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('bomb','water_bomb'),createItemInstance('pistol','water_pistol')]}:citizen)}
    const bomb=getRuinSharedActions(game,'c01').find((action)=>action.type==='USE_WEAPON'&&action.itemId==='bomb')!
    game=executeRuinSharedAction(game,bomb).state
    expect(game.citizens.find((citizen)=>citizen.id==='c01')!.inventory.some((item)=>item.id==='bomb')).toBe(false)
    expect(currentCell(game).zombies).toBeGreaterThan(0)
    const pistol=getRuinSharedActions(game,'c01').find((action)=>action.type==='USE_WEAPON'&&action.itemId==='pistol')!
    game=executeRuinSharedAction(game,pistol).state
    const pistolAfter=game.citizens.find((citizen)=>citizen.id==='c01')!.inventory.find((item)=>item.id==='pistol')!
    expect(normalizeItemState(pistolAfter.type,pistolAfter.state).charges).toBe(2)
  })

  it('keeps movement blocked when a shared weapon action leaves zombies in the current cell',()=>{
    let game=enterWithThreat(1003,3)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('machete','machete')]}:citizen)}
    const command=getRuinSharedActions(game,'c01').find((action)=>action.type==='USE_WEAPON')!
    game=executeRuinSharedAction(game,command).state
    expect(currentCell(game).zombies).toBe(1)
    expect(moveInsideRuin(game,'c01','NORTH',100_000).ok).toBe(false)
    expect(getRuinSharedActions(game,'c01').some((action)=>action.type==='USE_WEAPON')).toBe(true)
  })

  it('sends non-combat carried-item actions through the ordinary command system unchanged',()=>{
    let game=enterWithThreat(1004,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:3,status:{...citizen.status,hydration:'thirsty' as const},inventory:[createItemInstance('water','water_ration')]}:citizen)}
    const command=getRuinSharedActions(game,'c01').find((action)=>action.type==='DRINK_ITEM'&&action.itemId==='water')!
    const resolved=executeRuinSharedAction(game,command)
    const citizen=resolved.state.citizens.find((candidate)=>candidate.id==='c01')!
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.inventory).toHaveLength(0)
    expect(currentCell(resolved.state).zombies).toBe(2)
    expect(getZone(resolved.state.world,1,0)?.zombies).toBe(0)
    expect(resolved.events.some((event)=>event.type==='ITEM_CONSUMED')).toBe(true)
  })

  it('does not expose corridor weapon actions while the explorer is shifted into a room',()=>{
    let game=enterWithThreat(1005,2)
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[createItemInstance('machete','machete'),createItemInstance('water','water_ration')]}:citizen)}
    const room=currentInterior(game).rooms[0]
    game=placeExplorerInRoomWithThreat(game,room.id,2)
    const actions=getRuinSharedActions(game,'c01')
    expect(actions.some((action)=>action.type==='USE_WEAPON')).toBe(false)
    expect(actions.some((action)=>action.type==='DRINK_ITEM')).toBe(true)
  })
})
