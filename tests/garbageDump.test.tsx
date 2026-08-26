import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { constructionImplementationStatus, constructionPlayable } from '../src/core/construction'
import { totalTownDefense } from '../src/core/defense'
import { garbageDumpActionCost, garbageDumpCategory, garbageDumpDefenseForItem, garbageDumpTemporaryDefense } from '../src/core/garbageDump'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { ConstructionId, GameState, ItemType } from '../src/core/types'
import { chronicleCategory } from '../src/ui/chronicle'
import { GarbageDumpView } from '../src/ui/components/GarbageDumpView'
import { availableScreens } from '../src/ui/navigation'

function completed(game:GameState,...ids:ConstructionId[]):GameState{
  let construction=game.town.construction
  for(const id of ids)construction={...construction,[id]:{...construction[id],discovered:true,completed:true}}
  return{...game,town:{...game.town,construction}}
}
function withBank(game:GameState,...types:ItemType[]):GameState{return{...game,town:{...game.town,bank:types.map((type,index)=>createItemInstance(`dump-${index}`,type))}}}

describe('Garbage Dump source rules',()=>{
  it('activates the base Dump, wet upgrade, and six category specializations while keeping unresolved Organized Dump fail-closed',()=>{
    for(const id of ['garbage_dump','dump_upgrade','defence_dump','weapons_dump','food_dump','wood_dump','metal_dump','animal_dump'] as const){
      expect(constructionImplementationStatus(id)).toBe('implemented')
      expect(constructionPlayable(id)).toBe(true)
    }
    expect(constructionImplementationStatus('organized_dump')).toBe('wip')
    expect(constructionPlayable('organized_dump')).toBe(false)
  })

  it('classifies only supported categories and uses base 4/1 yields',()=>{
    const game=completed(createInitialGame(9801,1),'garbage_dump')
    const cases:[ItemType,string|null,number][]=[
      ['old_door','defense',4],['human_bone','weapon',1],['vegetable','food',1],['rotten_log','wood',1],['twisted_plank','wood',1],['scrap_metal','metal',1],['wrought_iron','metal',1],['chicken','animal',1],
      ['water_ration',null,0],['patchwork_beam',null,0],['metal_support',null,0],['broken_human_bone',null,0],
    ]
    for(const[type,category,defense]of cases){const item=createItemInstance(`case-${type}`,type);expect(garbageDumpCategory(item)).toBe(category);expect(garbageDumpDefenseForItem(game,item)).toBe(defense)}
  })

  it('spends 1 AP, destroys the exact Bank item, and contributes defense for the current night only',()=>{
    let game=withBank(completed(createInitialGame(9802,1),'garbage_dump'),'old_door')
    const beforeAp=game.citizens[0].ap
    const beforeDefense=totalTownDefense(game)
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DUMP_BANK_ITEM'&&candidate.itemId==='dump-0')
    expect(action).toBeTruthy()
    const result=executeCommand(game,action!)
    game=result.state
    const dumped=result.events.find((event)=>event.type==='BANK_ITEM_DUMPED')
    expect(game.citizens[0].ap).toBe(beforeAp-1)
    expect(game.town.bank).toHaveLength(0)
    expect(dumped).toMatchObject({type:'BANK_ITEM_DUMPED',defenseGained:4,category:'defense'})
    expect(dumped&&chronicleCategory(dumped)).toBe('bank')
    expect(garbageDumpTemporaryDefense(game)).toBe(4)
    // The Old Door's normal +2 Bank defense disappears when destroyed, then +4 Dump defense replaces it.
    expect(totalTownDefense(game)).toBe(beforeDefense+2)
    expect(garbageDumpTemporaryDefense({...game,day:game.day+1})).toBe(0)
    expect(totalTownDefense({...game,day:game.day+1})).toBe(beforeDefense-2)
  })

  it('stacks category specialization and wet Dump Upgrade bonuses',()=>{
    let game=withBank(completed(createInitialGame(9803,1),'garbage_dump','weapons_dump','dump_upgrade'),'human_bone')
    expect(garbageDumpDefenseForItem(game,game.town.bank[0])).toBe(7)
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DUMP_BANK_ITEM')
    game=executeCommand(game,action!).state
    expect(garbageDumpTemporaryDefense(game)).toBe(7)
  })

  it('implements Organized Dump zero-AP behavior without making its unresolved construction falsely playable',()=>{
    const game=withBank(completed(createInitialGame(9804,1),'garbage_dump','organized_dump'),'vegetable')
    const before=game.citizens[0].ap
    expect(garbageDumpActionCost(game)).toBe(0)
    const action=getLegalActions(game,'c01').find((candidate)=>candidate.type==='DUMP_BANK_ITEM')
    const result=executeCommand(game,action!)
    expect(result.state.citizens[0].ap).toBe(before)
    expect(result.events.some((event)=>event.type==='AP_SPENT')).toBe(false)
    expect(garbageDumpTemporaryDefense(result.state)).toBe(1)
  })

  it('exposes the built facility and renders destructive Bank choices with current yield',()=>{
    const game=withBank(completed(createInitialGame(9805,1),'garbage_dump','food_dump'),'vegetable','water_ration')
    expect(availableScreens(game).some((entry)=>entry.id==='garbage_dump')).toBe(true)
    const legal=getLegalActions(game,'c01')
    const html=renderToStaticMarkup(<GarbageDumpView game={game} citizenId="c01" legalActions={legal} act={()=>{}}/>)
    expect(html).toContain('Garbage Dump')
    expect(html).toContain('Destroy Suspicious-looking Vegetable · +4 defense')
    expect(html).not.toContain('Destroy Water Ration')
  })
})
