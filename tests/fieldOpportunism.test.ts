import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createAgentDecisionContext } from '../src/agents/AgentDecisionContext'
import { unloadAction } from '../src/agents/actions/InventoryActions'
import { opportunisticFieldAction } from '../src/agents/planning/LootPolicy'
import { planLoadout, wellAllowanceRemaining } from '../src/agents/planning/SupplyPolicy'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { consumableKind } from '../src/core/items'
import { resolveNightAttack } from '../src/core/night'
import type { BotMissionAssignment, GameState, ItemInstance } from '../src/core/types'
import { runBotHour } from '../src/simulation/runBotHour'

function patchCitizen(game:GameState,id:string,patch:Partial<GameState['citizens'][number]>):GameState{return {...game,citizens:game.citizens.map((citizen)=>citizen.id===id?{...citizen,...patch}:citizen)}}
function mission(overrides:Partial<BotMissionAssignment>={}):BotMissionAssignment{return {missionId:'test-route',role:'scout',purpose:'explore',target:{x:3,y:0},targetLabel:'test',reason:'test',phase:'outbound',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:1,emergency:false,overnightPlanned:false,...overrides}}
function item(id:string,type:ItemInstance['type']):ItemInstance{return{id,type}}

describe('field opportunism and hydration assurance',()=>{
  it('drops a carried item onto the current world tile for zero AP',()=>{
    let game=createInitialGame(8101,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:1,y:0},inventory:[item('battery','battery')],ap:4})
    const action=getLegalActions(game,'c02').find((candidate)=>candidate.type==='DROP_ITEM')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    const citizen=result.state.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.ap).toBe(4)
    expect(citizen.inventory).toHaveLength(0)
    expect(result.state.world.zones['1,0'].groundItems.some((ground)=>ground.id==='battery')).toBe(true)
  })

  it('drinks a Water Ration directly from the ground without picking it up first',()=>{
    let game=createInitialGame(8110,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:1,y:0},inventory:[],ap:1,status:{hydration:'thirsty',desertStepsToday:0},daily:{ate:false,drank:false,waterTaken:false}})
    game={...game,world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],discovered:true,zombies:0,groundItems:[item('ground-water','water_ration')]}}}}
    const drink=getLegalActions(game,'c02').find((candidate)=>candidate.type==='DRINK_ITEM'&&candidate.itemId==='ground-water')
    expect(drink).toBeTruthy()
    const after=executeCommand(game,drink!).state
    const citizen=after.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.inventory).toHaveLength(0)
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.daily.drank).toBe(true)
    expect(citizen.ap).toBe(citizen.maxAp)
    expect(after.world.zones['1,0'].groundItems).toHaveLength(0)
  })

  it('opens a container on the ground and leaves its output on that same tile',()=>{
    let game=createInitialGame(8111,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:1,y:0},inventory:[],ap:4})
    game={...game,world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],discovered:true,zombies:0,groundItems:[item('ground-bag','doggy_bag')]}}}}
    const open=getLegalActions(game,'c02').find((candidate)=>candidate.type==='OPEN_CONTAINER'&&candidate.itemId==='ground-bag')
    expect(open).toBeTruthy()
    const after=executeCommand(game,open!).state
    const citizen=after.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.inventory).toHaveLength(0)
    expect(after.world.zones['1,0'].groundItems).toHaveLength(1)
    expect(after.world.zones['1,0'].groundItems[0].id).not.toBe('ground-bag')
    expect(consumableKind(after.world.zones['1,0'].groundItems[0].type)).toBe('food')
  })

  it('searches a depleted route tile before spending another movement AP',()=>{
    let game=createInitialGame(8102,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:1,y:0},inventory:[],ap:5})
    game={...game,botMissions:{c02:mission()},world:{...game.world,zones:{...game.world.zones,'1,0':{...game.world.zones['1,0'],discovered:true,zombies:0,searchesRemaining:0,depletedSearchedBy:[]}}}}
    const controller=new BasicBotController()
    const action=controller.decide(createAgentDecisionContext(game),'c02')
    expect(action?.type).toBe('SEARCH_ZONE')
  })

  it('picks up useful ground loot while returning instead of walking past it',()=>{
    let game=createInitialGame(8103,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:2,y:0},inventory:[],ap:4})
    game={...game,botMissions:{c02:mission({phase:'return'})},world:{...game.world,zones:{...game.world.zones,'2,0':{...game.world.zones['2,0'],discovered:true,zombies:0,groundItems:[item('plank','twisted_plank')],searchedBy:['c02']}}}}
    const controller=new BasicBotController()
    const action=controller.decide(createAgentDecisionContext(game),'c02')
    expect(action).toEqual({type:'PICK_UP_ITEM',citizenId:'c02',itemId:'plank'})
  })

  it('drops a low-value carry before taking a substantially better ground item',()=>{
    let game=createInitialGame(8104,2)
    game=patchCitizen(game,'c02',{location:{type:'world',x:2,y:0},inventory:[item('a','battery'),item('b','box_of_matches'),item('c','pharmaceutical_products'),item('d','broken_human_bone')],ap:4})
    game={...game,botMissions:{c02:mission({phase:'return'})},world:{...game.world,zones:{...game.world.zones,'2,0':{...game.world.zones['2,0'],discovered:true,zombies:0,groundItems:[item('pack','resource_pack')],searchedBy:['c02']}}}}
    const actions=getLegalActions(game,'c02')
    const first=opportunisticFieldAction(game,game.citizens.find((citizen)=>citizen.id==='c02')!,actions,game.botMissions.c02)
    expect(first?.type).toBe('DROP_ITEM')
    const afterDrop=executeCommand(game,first!).state
    const second=new BasicBotController().decide(createAgentDecisionContext(afterDrop),'c02')
    expect(second).toEqual({type:'PICK_UP_ITEM',citizenId:'c02',itemId:'pack'})
  })

  it('does not count an exhausted Well allowance as expedition water availability',()=>{
    let game=createInitialGame(8105,2)
    game=patchCitizen(game,'c02',{daily:{ate:false,drank:false,waterTaken:true},status:{hydration:'normal',desertStepsToday:8},inventory:[],home:{...game.citizens[1].home,storage:[]}})
    game={...game,town:{...game.town,well:{water:50},bank:[]}}
    const citizen=game.citizens.find((candidate)=>candidate.id==='c02')!
    expect(wellAllowanceRemaining(game,citizen)).toBe(0)
    const loadout=planLoadout(game,citizen,'explore',4,0,{desertStepsPlanned:4})
    expect(loadout.water).toBe(false)
    expect(loadout.hydrationReady).toBe(false)
  })

  it('lets a zero-AP thirsty reserve citizen use available Well water before the attack',()=>{
    let game=createInitialGame(8106,2)
    game={...game,day:3,clock:{hour:23,phase:'day'},town:{...game.town,well:{water:20}}}
    game=patchCitizen(game,'c02',{ap:0,status:{hydration:'thirsty',desertStepsToday:0},daily:{ate:false,drank:false,waterTaken:false},home:{...game.citizens[1].home,upgradedDay:3,storage:[]}})
    const after=runBotHour(game,new BasicBotController(),'c01')
    const citizen=after.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.daily.drank).toBe(true)
    expect(after.town.well.water).toBe(19)
  })

  it('does not roll a thirsty autonomous citizen into Dehydrated when town water was legally available before the attack',()=>{
    let game=createInitialGame(8107,2)
    game={...game,day:3,clock:{hour:23,phase:'day'},town:{...game.town,defense:10_000,well:{water:20}}}
    game=patchCitizen(game,'c02',{ap:4,status:{hydration:'thirsty',desertStepsToday:0},daily:{ate:false,drank:false,waterTaken:false},inventory:[],home:{...game.citizens[1].home,storage:[]}})
    const beforeAttack=runBotHour(game,new BasicBotController(),'c01')
    const prepared=beforeAttack.citizens.find((candidate)=>candidate.id==='c02')!
    expect(prepared.daily.drank).toBe(true)
    expect(prepared.status.hydration).toBe('normal')
    const afterAttack=resolveNightAttack(beforeAttack)
    const citizen=afterAttack.citizens.find((candidate)=>candidate.id==='c02')!
    expect(citizen.alive).toBe(true)
    expect(citizen.status.hydration).toBe('normal')
  })

  it('keeps a deliberately withdrawn next-home material instead of redepositing it into a Bank ping-pong loop',()=>{
    let game=createInitialGame(8108,2)
    const base=game.citizens.find((citizen)=>citizen.id==='c02')!
    game=patchCitizen(game,'c02',{inventory:[item('home-log','rotten_log')],home:{...base.home,level:'tent',defense:1,storage:[]}})
    const citizen=game.citizens.find((candidate)=>candidate.id==='c02')!
    const action=unloadAction(citizen,getLegalActions(game,'c02'),null,false)
    expect(action).toEqual({type:'MOVE_ITEM_TO_HOME',citizenId:'c02',itemId:'home-log'})
  })
})
