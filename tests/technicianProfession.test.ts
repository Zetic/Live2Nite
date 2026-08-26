import { describe, expect, it } from 'vitest'
import { chooseTownWork, townWorkApCost } from '../src/agents/townWork'
import { getLegalActions } from '../src/core/actions'
import { CONSTRUCTION_CATALOG } from '../src/core/constructionCatalog'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { equipCitizenProfession } from '../src/core/professions'
import { enterRuin, getRuinExplorer, getRuinInterior, type RuinInteriorState } from '../src/core/ruinExploration'
import { takeTechnicianRuinImprint, technicianPoints, technicianWorkbenchCost, TECHNICIAN_MAX_CP, workbenchOutput } from '../src/core/technician'
import { executeCommandWithTechnician } from '../src/core/technicianCommandExecutor'
import type { Citizen, GameCommand, GameState, SpecialSiteState, WorldZone } from '../src/core/types'
import { workshopRecipeApCost } from '../src/core/workshop'
import { zoneKey } from '../src/core/world'

function replaceCitizen(game:GameState,citizen:Citizen):GameState{return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}}
function readyGreatPit(game:GameState):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,wall_upgrade:{...game.town.construction.wall_upgrade,completed:true,discovered:true},great_pit:{...game.town.construction.great_pit,completed:false,discovered:true,apContributed:0}}}}}
function workshop(game:GameState,workbench=false):GameState{return{...game,town:{...game.town,construction:{...game.town.construction,workshop:{...game.town.construction.workshop,completed:true,discovered:true},technicians_workbench:{...game.town.construction.technicians_workbench,completed:workbench,discovered:true}}}}}
function command<T extends GameCommand['type']>(game:GameState,type:T,predicate?:(candidate:Extract<GameCommand,{type:T}>)=>boolean):Extract<GameCommand,{type:T}>{const found=getLegalActions(game,'c01').find((candidate)=>candidate.type===type&&(!predicate||predicate(candidate as Extract<GameCommand,{type:T}>)));if(!found)throw new Error(`Missing ${type}`);return found as Extract<GameCommand,{type:T}>}
function patchZone(game:GameState,x:number,y:number,patch:Partial<WorldZone>):GameState{const key=zoneKey(x,y),base=game.world.zones[key];if(!base)throw new Error(`Missing ${key}`);return{...game,world:{...game.world,zones:{...game.world.zones,[key]:{...base,...patch}}}}}

describe('Technician profession',()=>{
  it('has six daily CP and spends them before AP on construction',()=>{
    let game=readyGreatPit(createInitialGame(9001,1,'technician'))
    game=replaceCitizen(game,{...game.citizens[0],ap:0})
    expect(technicianPoints(game.citizens[0])).toBe(TECHNICIAN_MAX_CP)
    for(let spent=1;spent<=6;spent+=1){
      const build=command(game,'CONTRIBUTE_CONSTRUCTION',(candidate)=>candidate.projectId==='great_pit')
      const result=executeCommandWithTechnician(game,build)
      expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(false)
      game=result.state
      expect(game.citizens[0].ap).toBe(0)
      expect(technicianPoints(game.citizens[0])).toBe(6-spent)
      expect(game.town.construction.great_pit.apContributed).toBe(spent)
    }
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='CONTRIBUTE_CONSTRUCTION'&&candidate.projectId==='great_pit')).toBe(false)
    game=replaceCitizen(game,{...game.citizens[0],ap:1})
    const fallback=command(game,'CONTRIBUTE_CONSTRUCTION',(candidate)=>candidate.projectId==='great_pit')
    game=executeCommandWithTechnician(game,fallback).state
    expect(game.citizens[0].ap).toBe(0)
    expect(technicianPoints(game.citizens[0])).toBe(0)
  })

  it('refreshes CP on the new day and removes the benefit when the Wrench profession is replaced',()=>{
    let game=readyGreatPit(createInitialGame(9002,1,'technician'))
    game=executeCommandWithTechnician(game,command(game,'CONTRIBUTE_CONSTRUCTION',(candidate)=>candidate.projectId==='great_pit')).state
    expect(technicianPoints(game.citizens[0])).toBe(5)
    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    expect(technicianPoints(game.citizens[0])).toBe(6)
    game=replaceCitizen(game,equipCitizenProfession(game.citizens[0],'guardian'))
    expect(technicianPoints(game.citizens[0])).toBe(0)
  })

  it('spends CP before AP on ordinary Workshop recipes',()=>{
    let game=workshop(createInitialGame(9003,1,'technician'))
    game={...game,town:{...game.town,bank:[createItemInstance('log','rotten_log')]}}
    game=replaceCitizen(game,{...game.citizens[0],ap:0})
    const convert=command(game,'WORKSHOP_CONVERT',(candidate)=>candidate.recipeId==='logs_to_planks'&&!workbenchOutput(candidate))
    const result=executeCommandWithTechnician(game,convert)
    expect(result.state.citizens[0].ap).toBe(0)
    expect(technicianPoints(result.state.citizens[0])).toBe(3)
    expect(result.state.town.bank.some((item)=>item.type==='twisted_plank')).toBe(true)
  })

  it('repairs supported broken equipment with the Wrench for 3 CP and no AP',()=>{
    let game=createInitialGame(9004,1,'technician')
    game=replaceCitizen(game,{...game.citizens[0],inventory:[createItemInstance('blade','broken_machete')],ap:6})
    const repair=command(game,'COMBINE_ITEMS',(candidate)=>candidate.itemIds.length===1&&candidate.itemIds[0]==='blade')
    const result=executeCommandWithTechnician(game,repair)
    expect(result.state.citizens[0].ap).toBe(6)
    expect(technicianPoints(result.state.citizens[0])).toBe(3)
    expect(result.state.citizens[0].inventory).toContainEqual(expect.objectContaining({id:'blade',type:'machete'}))
    expect(result.events).toContainEqual(expect.objectContaining({type:'ITEMS_COMBINED',technicianWrenchRepair:true,technicianPointsSpent:3}))
  })

  it('blocks Wrench repair when exhausted or wounded in the hands',()=>{
    let exhausted=createInitialGame(9005,1,'technician')
    exhausted=replaceCitizen(exhausted,{...exhausted.citizens[0],inventory:[createItemInstance('blade','broken_machete')],ap:0})
    expect(getLegalActions(exhausted,'c01').some((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.itemIds.length===1)).toBe(false)
    let wounded=createInitialGame(9006,1,'technician')
    wounded=replaceCitizen(wounded,{...wounded.citizens[0],inventory:[createItemInstance('blade','broken_machete')],status:{...wounded.citizens[0].status,wound:'hands'}})
    expect(getLegalActions(wounded,'c01').some((candidate)=>candidate.type==='COMBINE_ITEMS'&&candidate.itemIds.length===1)).toBe(false)
  })

  it('adds the +4 Technician Workbench surcharge to the ordinary Workshop cost',()=>{
    expect(CONSTRUCTION_CATALOG.technicians_workbench.implementation).toBe('implemented')
    let game=workshop(createInitialGame(9007,1,'technician'),true)
    game={...game,town:{...game.town,bank:[createItemInstance('device','broken_electronic_device')]}}
    const ordinaryCost=workshopRecipeApCost(game,'dismantle_electronic_device','c01')
    expect(ordinaryCost).toBe(3)
    expect(technicianWorkbenchCost(game.citizens[0],ordinaryCost)).toBe(7)
    const selected=command(game,'WORKSHOP_CONVERT',(candidate)=>candidate.recipeId==='dismantle_electronic_device'&&workbenchOutput(candidate)==='nuts_and_bolts')
    const rng=game.rngState
    const result=executeCommandWithTechnician(game,selected)
    expect(result.state.rngState).toBe(rng)
    expect(result.events).toContainEqual(expect.objectContaining({type:'AP_SPENT',amount:1}))
    expect(result.state.citizens[0].ap).toBe(5)
    expect(technicianPoints(result.state.citizens[0])).toBe(0)
    expect(result.state.citizens[0].daily.technicianWorkbenchUsed).toBe(true)
    expect(result.state.town.bank).toContainEqual(expect.objectContaining({type:'nuts_and_bolts'}))
    expect(getLegalActions(result.state,'c01').some((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&Boolean(workbenchOutput(candidate)))).toBe(false)
  })

  it('applies Factory and Hacksaw discounts to the base before the Workbench surcharge',()=>{
    let game=workshop(createInitialGame(9011,1,'technician'),true)
    game={...game,town:{...game.town,bank:[createItemInstance('device','broken_electronic_device')],construction:{...game.town.construction,factory:{...game.town.construction.factory,completed:true,discovered:true}}}}
    game=replaceCitizen(game,{...game.citizens[0],ap:0,inventory:[createItemInstance('saw','saw_tool')]})
    const ordinaryCost=workshopRecipeApCost(game,'dismantle_electronic_device','c01')
    expect(ordinaryCost).toBe(1)
    expect(technicianWorkbenchCost(game.citizens[0],ordinaryCost)).toBe(5)
    const selected=command(game,'WORKSHOP_CONVERT',(candidate)=>candidate.recipeId==='dismantle_electronic_device'&&workbenchOutput(candidate)==='electronic_component')
    game=executeCommandWithTechnician(game,selected).state
    expect(game.citizens[0].ap).toBe(0)
    expect(technicianPoints(game.citizens[0])).toBe(1)
  })

  it('adds the +6 non-Technician Workbench surcharge to the ordinary Workshop cost',()=>{
    let game=workshop(createInitialGame(9008,1,'guardian'),true)
    game={...game,town:{...game.town,bank:[createItemInstance('device','broken_electronic_device')]}}
    expect(workshopRecipeApCost(game,'dismantle_electronic_device','c01')).toBe(3)
    expect(technicianWorkbenchCost(game.citizens[0],3)).toBe(9)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='WORKSHOP_CONVERT'&&Boolean(workbenchOutput(candidate)))).toBe(false)
    game=replaceCitizen(game,{...game.citizens[0],ap:9})
    const selected=command(game,'WORKSHOP_CONVERT',(candidate)=>candidate.recipeId==='dismantle_electronic_device'&&workbenchOutput(candidate)==='battery')
    game=executeCommandWithTechnician(game,selected).state
    expect(game.citizens[0].ap).toBe(0)
    expect(game.citizens[0].daily.technicianWorkbenchUsed).toBe(true)
    expect(game.town.bank).toContainEqual(expect.objectContaining({type:'battery'}))
  })

  it('forms the exact matching ruin key without unlocking the room',()=>{
    let game=createInitialGame(9009,1,'technician')
    const site:SpecialSiteState={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}
    game=replaceCitizen(game,{...game.citizens[0],location:{type:'world',x:1,y:0}})
    game=patchZone(game,1,0,{zombies:0,specialSite:site})
    const entered=enterRuin(game,'c01',1_000_000);expect(entered.ok).toBe(true);game=entered.state
    const interior=getRuinInterior(game.world.zones['1,0'])!;const room=interior.rooms[0];const cell=interior.cells.find((candidate)=>candidate.id===room.corridorCellId)!
    const forcedInterior:RuinInteriorState={...interior,cells:interior.cells.map((candidate)=>candidate.id===cell.id?{...candidate,zombies:0}:candidate),rooms:interior.rooms.map((candidate)=>candidate.id===room.id?{...candidate,locked:true,lockType:'magnetic_key'}:candidate)}
    const explorer=getRuinExplorer(game,'c01')!
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ruinExplorer:{...explorer,cellId:cell.id,inRoomId:null}} as Citizen:citizen),world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],specialSite:{...game.world.zones['1,0'].specialSite!,interior:forcedInterior} as SpecialSiteState}}}}
    const result=takeTechnicianRuinImprint(game,'c01',1_000_001)
    expect(result.ok).toBe(true)
    expect(result.state.citizens[0].inventory).toContainEqual(expect.objectContaining({type:'magnetic_key'}))
    expect(getRuinInterior(result.state.world.zones['1,0'])!.rooms.find((candidate)=>candidate.id===room.id)?.locked).toBe(true)
  })

  it('lets bot town planning treat CP-funded construction as zero-AP work',()=>{
    let game=readyGreatPit(createInitialGame(9010,1,'technician'))
    const citizen={...game.citizens[0],ap:0};game=replaceCitizen(game,citizen)
    const actions=getLegalActions(game,'c01');const chosen=chooseTownWork(game,citizen,actions)
    expect(chosen).toMatchObject({type:'CONTRIBUTE_CONSTRUCTION'})
    expect(chosen&&townWorkApCost(game,citizen,chosen)).toBe(0)
  })
})
