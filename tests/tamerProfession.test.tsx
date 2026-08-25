import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { opportunisticFieldAction } from '../src/agents/planning/LootPolicy'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { applyEvents } from '../src/core/events'
import { createInitialGame } from '../src/core/game'
import { canCarryItem, isCumbersomeItem } from '../src/core/inventory'
import { createItemInstance } from '../src/core/items'
import { citizenEquipment, equipCitizenProfession, equipmentItemPurpose } from '../src/core/professions'
import { enterRuin, getRuinExplorer, type RuinInteriorState } from '../src/core/ruinExploration'
import { executeRuinSharedAction, getRuinSharedActions } from '../src/core/ruinSharedActions'
import {
  hasTamerDog,
  tamerDogDruggedToday,
  tamerDogTransportableItems,
  tamerDogUsedToday,
  tamerRuinExitGuidance,
} from '../src/core/tamer'
import type { BotMissionAssignment, Citizen, GameCommand, GameState, ItemInstance, ItemType, SpecialSiteState, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { TamerDogPanel } from '../src/ui/components/TamerDogPanel'

function item(id:string,type:ItemType):ItemInstance{return createItemInstance(id,type)}
function outsideWith(game:GameState,items:ItemInstance[],x=1,y=0):GameState{
  return{
    ...game,
    citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{
      ...citizen,
      ap:6,
      location:{type:'world' as const,x,y},
      inventory:items,
      status:{...citizen.status,terrorized:false,wound:null},
      camping:{...citizen.camping,hidden:false},
    }:citizen),
  }
}
function replaceCitizen(game:GameState,citizen:Citizen):GameState{return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}}
function sendAction(game:GameState,destination:'bank'|'home'):Extract<GameCommand,{type:'SEND_TAMER_DOG'}>{
  const action=getLegalActions(game,'c01').find((candidate):candidate is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>candidate.type==='SEND_TAMER_DOG'&&candidate.destination===destination)
  if(!action)throw new Error(`Missing SEND_TAMER_DOG ${destination} action`)
  return action
}
function withExplorable(game:GameState):GameState{
  const key=zoneKey(1,0),base=game.world.zones[key]
  const site:SpecialSiteState={type:'abandoned_hospital',status:'accessible',excavationRequired:0,excavationProgress:0,hiddenLoot:[],searchedBy:[],blueprintFound:false}
  const zone:WorldZone={...base,x:1,y:0,discovered:true,zombies:0,groundItems:[],specialSite:site}
  const outside=outsideWith(game,[item('ruin-loot','twisted_plank')])
  return{...outside,world:{...outside.world,zones:{...outside.world.zones,[key]:zone}}}
}
function mission(overrides:Partial<BotMissionAssignment>={}):BotMissionAssignment{return{
  missionId:'tamer-test',role:'gatherer',purpose:'gather_construction',target:{x:4,y:0},targetLabel:'test haul',reason:'test',phase:'operate',assignedDay:1,assignedHour:1,returnByHour:20,safetyReserve:2,emergency:false,...overrides,
}}

describe('Tamer profession',()=>{
  it('derives the Maltese capability and tooltip entirely from the profession equipment slot',()=>{
    const game=createInitialGame(7101,1,'tamer')
    const tamer=game.citizens[0]
    expect(hasTamerDog(tamer)).toBe(true)
    const professionItem=citizenEquipment(tamer)?.professionItem
    expect(professionItem).toBeDefined()
    if(professionItem){
      const purpose=equipmentItemPurpose(professionItem)
      expect(purpose).toContain('Once per day')
      expect(purpose).toContain('Anabolic Steroids')
      expect(purpose).toContain('one cumbersome item')
      expect(purpose).toContain('ruin exits')
    }
    expect(hasTamerDog(equipCitizenProfession(tamer,'scout'))).toBe(false)
  })

  it('sends eligible light cargo to the Bank, leaves cumbersome cargo behind, and tires the dog for the day',()=>{
    let game=outsideWith(createInitialGame(7102,1,'tamer'),[item('light','twisted_plank'),item('heavy','sheet_metal')])
    expect(isCumbersomeItem(game.citizens[0].inventory[0])).toBe(false)
    expect(isCumbersomeItem(game.citizens[0].inventory[1])).toBe(true)
    expect(tamerDogTransportableItems(game,game.citizens[0]).map((entry)=>entry.id)).toEqual(['light'])

    const resolved=executeCommand(game,sendAction(game,'bank'))
    game=resolved.state
    expect(resolved.events).toContainEqual(expect.objectContaining({type:'TAMER_DOG_SENT',destination:'bank',items:[expect.objectContaining({id:'light'})]}))
    expect(game.citizens[0].inventory.map((entry)=>entry.id)).toEqual(['heavy'])
    expect(game.town.bank.some((entry)=>entry.id==='light')).toBe(true)
    expect(tamerDogUsedToday(game,'c01')).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG')).toBe(false)
  })

  it('offers Home Chest delivery only when the complete eligible trip fits and blocks every trip under Terror',()=>{
    let game=outsideWith(createInitialGame(7103,1,'tamer'),[item('a','twisted_plank'),item('b','wrought_iron')])
    game=replaceCitizen(game,{...game.citizens[0],home:{...game.citizens[0].home,storage:[],storageCapacity:1}})
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')).toBe(true)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='home')).toBe(false)

    game=replaceCitizen(game,{...game.citizens[0],home:{...game.citizens[0].home,storageCapacity:2}})
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='home')).toBe(true)

    game=replaceCitizen(game,{...game.citizens[0],status:{...game.citizens[0].status,terrorized:true}})
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG')).toBe(false)
  })

  it('consumes Anabolic Steroids on the dog without drugging the citizen and enables one cumbersome shipment',()=>{
    let game=outsideWith(createInitialGame(7104,1,'tamer'),[item('heavy','sheet_metal'),item('steroid','anabolic_steroids')])
    const drug=getLegalActions(game,'c01').find((action):action is Extract<GameCommand,{type:'DRUG_TAMER_DOG'}>=>action.type==='DRUG_TAMER_DOG')
    expect(drug).toBeDefined()
    if(!drug)return
    game=executeCommand(game,drug).state
    expect(game.citizens[0].inventory.some((entry)=>entry.id==='steroid')).toBe(false)
    expect(game.citizens[0].status.drugged).toBe(false)
    expect(tamerDogDruggedToday(game,'c01')).toBe(true)
    expect(tamerDogTransportableItems(game,game.citizens[0]).map((entry)=>entry.id)).toEqual(['heavy'])

    game=executeCommand(game,sendAction(game,'bank')).state
    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(game.town.bank.some((entry)=>entry.id==='heavy')).toBe(true)
  })

  it('resets tired and steroid-boosted dog state naturally when the next day begins',()=>{
    let game=outsideWith(createInitialGame(7105,1,'tamer'),[item('steroid','anabolic_steroids'),item('heavy','sheet_metal')])
    const drug=getLegalActions(game,'c01').find((action):action is Extract<GameCommand,{type:'DRUG_TAMER_DOG'}>=>action.type==='DRUG_TAMER_DOG')
    if(!drug)throw new Error('Missing dog steroid action')
    game=executeCommand(game,drug).state
    game=executeCommand(game,sendAction(game,'bank')).state
    expect(tamerDogUsedToday(game,'c01')).toBe(true)
    expect(tamerDogDruggedToday(game,'c01')).toBe(true)

    game=applyEvents(game,[{type:'DAY_STARTED',day:2,hour:1}])
    game=replaceCitizen(game,{...game.citizens[0],inventory:[item('new-light','twisted_plank')]})
    expect(tamerDogUsedToday(game,'c01')).toBe(false)
    expect(tamerDogDruggedToday(game,'c01')).toBe(false)
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')).toBe(true)
  })

  it('uses source heavy metadata for the generic one-cumbersome-item rucksack rule',()=>{
    const game=outsideWith(createInitialGame(7106,1,'tamer'),[item('sheet','sheet_metal')])
    const citizen=game.citizens[0]
    expect(isCumbersomeItem(citizen.inventory[0])).toBe(true)
    expect(isCumbersomeItem(item('engine','engine'))).toBe(true)
    expect(canCarryItem(citizen,item('engine','engine'))).toBe(false)
    expect(canCarryItem(citizen,item('light','twisted_plank'))).toBe(true)
  })

  it('points toward a ruin exit without granting guidance after the profession item is replaced',()=>{
    const interior:RuinInteriorState={
      version:1,family:'hotel',rooms:[],activeExplorerCitizenId:null,
      cells:[
        {id:'entrance',floor:0,x:0,y:0,kind:'entrance',roomId:null,stairTo:null,zombies:0},
        {id:'middle',floor:0,x:1,y:0,kind:'corridor',roomId:null,stairTo:null,zombies:0},
        {id:'far',floor:0,x:2,y:0,kind:'corridor',roomId:null,stairTo:null,zombies:0},
      ],
    }
    const tamer=createInitialGame(7107,1,'tamer').citizens[0]
    expect(tamerRuinExitGuidance(tamer,interior,interior.cells[2])).toEqual({kind:'direction',direction:'WEST'})
    expect(tamerRuinExitGuidance(tamer,interior,interior.cells[0])).toEqual({kind:'exit'})
    expect(tamerRuinExitGuidance(equipCitizenProfession(tamer,'survivalist'),interior,interior.cells[2])).toBeNull()
  })

  it('keeps the once-per-day dog action available while actively exploring an explorable ruin',()=>{
    const entered=enterRuin(withExplorable(createInitialGame(7108,1,'tamer')),'c01',500_000)
    expect(entered.ok).toBe(true)
    const game=entered.state
    expect(getRuinExplorer(game,'c01')?.active).toBe(true)
    const send=getRuinSharedActions(game,'c01').find((action):action is Extract<GameCommand,{type:'SEND_TAMER_DOG'}>=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')
    expect(send).toBeDefined()
    if(!send)return
    const resolved=executeRuinSharedAction(game,send)
    expect(resolved.state.town.bank.some((entry)=>entry.id==='ruin-loot')).toBe(true)
    expect(getRuinExplorer(resolved.state,'c01')?.active).toBe(true)
  })

  it('lets bot Tamers offload a near-full safe haul but refuses to send expedition-critical water',()=>{
    let safe=outsideWith(createInitialGame(7109,1,'tamer'),[item('a','twisted_plank'),item('b','wrought_iron'),item('c','battery'),item('d','duct_tape')],2,0)
    safe=replaceCitizen(safe,{...safe.citizens[0],controller:'basic-bot'})
    const safeDecision=opportunisticFieldAction(safe,safe.citizens[0],getLegalActions(safe,'c01'),mission())
    expect(safeDecision).toMatchObject({type:'SEND_TAMER_DOG',destination:'bank'})

    let critical=outsideWith(createInitialGame(7110,1,'tamer'),[item('water','water_ration'),item('a','twisted_plank'),item('b','wrought_iron'),item('c','battery')],4,0)
    critical=replaceCitizen(critical,{...critical.citizens[0],controller:'basic-bot',daily:{...critical.citizens[0].daily,drank:false}})
    expect(getLegalActions(critical,'c01').some((action)=>action.type==='SEND_TAMER_DOG')).toBe(true)
    const criticalDecision=opportunisticFieldAction(critical,critical.citizens[0],getLegalActions(critical,'c01'),mission())
    expect(criticalDecision?.type).not.toBe('SEND_TAMER_DOG')
    expect(criticalDecision?.type).not.toBe('DRUG_TAMER_DOG')
  })

  it('lets a bot steroid a cumbersome near-full haul and then completes the Bank trip on its next decision',()=>{
    let game=outsideWith(createInitialGame(7111,1,'tamer'),[item('heavy','sheet_metal'),item('steroid','anabolic_steroids'),item('a','twisted_plank'),item('b','wrought_iron')],2,0)
    game=replaceCitizen(game,{...game.citizens[0],controller:'basic-bot'})
    const first=opportunisticFieldAction(game,game.citizens[0],getLegalActions(game,'c01'),mission())
    expect(first?.type).toBe('DRUG_TAMER_DOG')
    if(!first)return
    game=executeCommand(game,first).state
    const second=opportunisticFieldAction(game,game.citizens[0],getLegalActions(game,'c01'),mission())
    expect(second).toMatchObject({type:'SEND_TAMER_DOG',destination:'bank'})
  })

  it('renders the Maltese as a compact field capability with ready and destination controls',()=>{
    const game=outsideWith(createInitialGame(7112,1,'tamer'),[item('a','twisted_plank')])
    const markup=renderToStaticMarkup(<TamerDogPanel game={game} citizenId="c01" legalActions={getLegalActions(game,'c01')} act={()=>{}}/>)
    expect(markup).toContain('Three-Legged Maltese')
    expect(markup).toContain('READY')
    expect(markup).toContain('Send to Home Chest')
    expect(markup).toContain('Send to Bank')
  })
})
