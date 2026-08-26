import { describe, expect, it } from 'vitest'
import { executeCommand } from '../src/core/commands'
import { totalTownDefense } from '../src/core/defense'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { agricultureProduction } from '../src/core/agriculture'
import { townWaterAllocation, waterTurretNightlyRequirement, waterTurretTotalDefense } from '../src/core/waterEconomy'
import type { ConstructionId, GameState } from '../src/core/types'

function complete(state:GameState,...ids:ConstructionId[]):GameState{
  const construction={...state.town.construction}
  for(const id of ids)construction[id]={...construction[id],discovered:true,completed:true}
  return{...state,town:{...state.town,construction}}
}
function withPlayerItem(state:GameState,type:Parameters<typeof createItemInstance>[1],id='water-test'):GameState{
  return{...state,citizens:state.citizens.map((citizen,index)=>index===0?{...citizen,inventory:[...citizen.inventory,createItemInstance(id,type)]}:citizen)}
}

describe('Well transactions',()=>{
  it('marks a Pump-enabled second ration as an extra withdrawal',()=>{
    let state=createInitialGame(9101,1)
    state=complete(state,'pump')
    state={...state,town:{...state.town,well:{water:10}}}
    const citizenId=state.citizens[0].id
    const first=executeCommand(state,{type:'TAKE_WATER',citizenId})
    const second=executeCommand(first.state,{type:'TAKE_WATER',citizenId})
    expect(first.events.find((event)=>event.type==='WATER_TAKEN')).toMatchObject({extra:false})
    expect(second.events.find((event)=>event.type==='WATER_TAKEN')).toMatchObject({extra:true})
    expect(second.state.town.well.water).toBe(8)
  })

  it('returns a Water Ration to the Well and removes the exact personal item',()=>{
    let state=createInitialGame(9102,1)
    state=withPlayerItem(state,'water_ration','return-me')
    const citizenId=state.citizens[0].id
    const before=state.town.well.water
    const result=executeCommand(state,{type:'RETURN_WATER_TO_WELL',citizenId,itemId:'return-me'})
    expect(result.state.town.well.water).toBe(before+1)
    expect(result.state.citizens[0].inventory.some((item)=>item.id==='return-me')).toBe(false)
    expect(result.events).toContainEqual(expect.objectContaining({type:'WATER_RETURNED',citizenId}))
  })

  it('Purifier consumes a Full Jerrycan and adds 1-3 water, while Filter raises output to 4-9',()=>{
    const run=(filtered:boolean)=>{
      let state=createInitialGame(filtered?9104:9103,1)
      state=complete(state,'water_purifier',...(filtered?(['water_filter'] as ConstructionId[]):[]))
      state=withPlayerItem(state,'full_jerrycan','jerry')
      const citizenId=state.citizens[0].id
      const before=state.town.well.water
      const result=executeCommand(state,{type:'PURIFY_JERRYCAN',citizenId,itemId:'jerry'})
      const event=result.events.find((candidate)=>candidate.type==='WATER_PURIFIED')
      expect(event?.type).toBe('WATER_PURIFIED')
      if(event?.type==='WATER_PURIFIED'){
        expect(event.filtered).toBe(filtered)
        expect(event.amount).toBeGreaterThanOrEqual(filtered?4:1)
        expect(event.amount).toBeLessThanOrEqual(filtered?9:3)
        expect(result.state.town.well.water).toBe(before+event.amount)
      }
      expect(result.state.citizens[0].inventory.some((item)=>item.id==='jerry')).toBe(false)
    }
    run(false);run(true)
  })

  it('Faucet refills supported equipment without consuming Well water',()=>{
    let state=createInitialGame(9105,1)
    state=complete(state,'faucet')
    state=withPlayerItem(state,'water_pistol','pistol')
    state={...state,citizens:state.citizens.map((citizen,index)=>index===0?{...citizen,inventory:citizen.inventory.map((item)=>item.id==='pistol'?createItemInstance(item.id,item.type,{charges:0}):item)}:citizen)}
    const citizenId=state.citizens[0].id
    const before=state.town.well.water
    const result=executeCommand(state,{type:'REFILL_WATER_ITEM',citizenId,itemId:'pistol'})
    expect(result.state.town.well.water).toBe(before)
    expect(result.state.citizens[0].inventory.find((item)=>item.id==='pistol')?.state?.charges).toBe(3)
  })
})

describe('nightly Well consumers',()=>{
  it('uses the source-backed Water Turret requirement/defense upgrade track',()=>{
    let state=createInitialGame(9106,1)
    state=complete(state,'water_turrets')
    state={...state,town:{...state.town,upgradeProjects:{...state.town.upgradeProjects,levels:{...state.town.upgradeProjects.levels,water_turrets:5}},well:{water:20}}}
    expect(waterTurretNightlyRequirement(state)).toBe(12)
    expect(waterTurretTotalDefense(state)).toBe(350)
    expect(townWaterAllocation(state).consumers.find((consumer)=>consumer.projectId==='water_turrets')).toMatchObject({required:12,active:true})
  })

  it('keeps the 70 base defense when upgraded turrets cannot be funded',()=>{
    let funded=createInitialGame(9107,1)
    funded=complete(funded,'water_turrets')
    funded={...funded,town:{...funded.town,upgradeProjects:{...funded.town.upgradeProjects,levels:{...funded.town.upgradeProjects.levels,water_turrets:1}},well:{water:2}}}
    const dry={...funded,town:{...funded.town,well:{water:1}}}
    expect(totalTownDefense(funded)-totalTownDefense(dry)).toBe(56)
    expect(townWaterAllocation(dry).consumers.find((consumer)=>consumer.projectId==='water_turrets')?.active).toBe(false)
  })

  it('debits only funded all-or-nothing consumer requests',()=>{
    let state=createInitialGame(9108,1)
    state=complete(state,'water_turrets')
    state={...state,town:{...state.town,upgradeProjects:{...state.town.upgradeProjects,levels:{...state.town.upgradeProjects.levels,water_turrets:1}},well:{water:2}}}
    const allocation=townWaterAllocation(state)
    const consumers=allocation.consumers.map(({projectId,label,required,active})=>({projectId,label,required,active}))
    const next=applyEvents(state,[{type:'WELL_WATER_CONSUMED',day:state.day,amount:allocation.consumed,consumers}])
    expect(allocation.consumed).toBe(2)
    expect(next.town.well.water).toBe(0)
  })
})

describe('agriculture',()=>{
  it('Vegetable Plot uses 4-7 ordinary and 0-2 rich food before Fertilizer',()=>{
    let state=createInitialGame(9109,1)
    state=complete(state,'vegetable_plot')
    const outputs=agricultureProduction(state)
    const ordinary=outputs.find((output)=>output.itemType==='vegetable')?.amount??0
    const rich=outputs.find((output)=>output.itemType==='blue_apple')?.amount??0
    expect(ordinary).toBeGreaterThanOrEqual(4);expect(ordinary).toBeLessThanOrEqual(7)
    expect(rich).toBeGreaterThanOrEqual(0);expect(rich).toBeLessThanOrEqual(2)
  })

  it('Fertilizer raises Vegetable Plot production to 6-8 ordinary and 3-5 rich food',()=>{
    let state=createInitialGame(9110,1)
    state=complete(state,'vegetable_plot','fertilizer')
    const outputs=agricultureProduction(state)
    const ordinary=outputs.find((output)=>output.itemType==='vegetable')?.amount??0
    const rich=outputs.find((output)=>output.itemType==='blue_apple')?.amount??0
    expect(ordinary).toBeGreaterThanOrEqual(6);expect(ordinary).toBeLessThanOrEqual(8)
    expect(rich).toBeGreaterThanOrEqual(3);expect(rich).toBeLessThanOrEqual(5)
  })

  it('Grapeboom and Apple Tree use their documented daily ranges',()=>{
    let state=createInitialGame(9111,1)
    state=complete(state,'grapeboom','outer_world_apple_tree')
    const outputs=agricultureProduction(state)
    const grapes=outputs.find((output)=>output.itemType==='exploding_grapefruit')?.amount??0
    const apples=outputs.find((output)=>output.projectId==='outer_world_apple_tree')?.amount??0
    expect(grapes).toBeGreaterThanOrEqual(3);expect(grapes).toBeLessThanOrEqual(7)
    expect(apples).toBeGreaterThanOrEqual(3);expect(apples).toBeLessThanOrEqual(5)
  })
})
