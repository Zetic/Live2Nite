import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { canUseCatapult, catapultActionCost, catapultMissChancePercent, catapultProfile, fireCatapult, provisionalCatapultOperator } from '../src/core/catapult'
import { constructionImplementationStatus, constructionPlayable } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { randomInt } from '../src/core/rng'
import type { ConstructionId, GameState, ItemType } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { CatapultView } from '../src/ui/components/CatapultView'
import { availableScreens } from '../src/ui/navigation'

function completed(game:GameState,...ids:ConstructionId[]):GameState{
  let construction=game.town.construction
  for(const id of ids)construction={...construction,[id]:{...construction[id],discovered:true,completed:true}}
  return{...game,town:{...game.town,construction}}
}
function withInventory(game:GameState,...types:ItemType[]):GameState{
  return{...game,citizens:game.citizens.map((citizen,index)=>index===0?{...citizen,ap:30,inventory:types.map((type,itemIndex)=>createItemInstance(`cata-${itemIndex}`,type))}:citizen)}
}
function rngStateFor(predicate:(roll:number)=>boolean):number{
  for(let state=1;state<100000;state+=1)if(predicate(randomInt(state,1,100).value))return state
  throw new Error('No deterministic RNG state found')
}
function forceHit(game:GameState):GameState{return{...game,rngState:rngStateFor((roll)=>roll>25)}}
function forceMiss(game:GameState):GameState{return{...game,rngState:rngStateFor((roll)=>roll<=25)}}
function withZombieSquare(game:GameState,x:number,y:number,zombies:number):GameState{
  const zones={...game.world.zones}
  for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1){const key=zoneKey(x+dx,y+dy);if(zones[key])zones[key]={...zones[key],zombies}}
  return{...game,world:{...game.world,zones}}
}
function zombieTotal(game:GameState,x:number,y:number,radius=1):number{
  let total=0
  for(let dy=-radius;dy<=radius;dy+=1)for(let dx=-radius;dx<=radius;dx+=1)total+=game.world.zones[zoneKey(x+dx,y+dy)]?.zombies??0
  return total
}

describe('current MyHordes Catapult mechanics',()=>{
  it('activates Catapult as partial only for the missing elected role and fully activates its two mechanical upgrades',()=>{
    expect(constructionImplementationStatus('catapult')).toBe('partial')
    expect(constructionPlayable('catapult')).toBe(true)
    expect(constructionImplementationStatus('upgraded_catapult')).toBe('implemented')
    expect(constructionImplementationStatus('small_trebuchet')).toBe('implemented')
  })

  it('uses the sole human citizen as an explicit provisional operator until town-role voting exists',()=>{
    const game=completed(createInitialGame(9901,3),'catapult')
    expect(provisionalCatapultOperator(game)?.id).toBe('c01')
    expect(canUseCatapult(game,'c01')).toBe(true)
    expect(canUseCatapult(game,'c02')).toBe(false)
  })

  it('uses 4 AP and 25% miss chance, reduced to 2 AP and 5% by Upgraded Catapult',()=>{
    const base=completed(createInitialGame(9902,1),'catapult')
    expect(catapultActionCost(base)).toBe(4);expect(catapultMissChancePercent(base)).toBe(25)
    const upgraded=completed(base,'upgraded_catapult')
    expect(catapultActionCost(upgraded)).toBe(2);expect(catapultMissChancePercent(upgraded)).toBe(5)
  })

  it('delivers a verified supply item from the operator rucksack to the selected World Beyond zone',()=>{
    let game=forceHit(withInventory(completed(createInitialGame(9903,1),'catapult'),'water_ration'))
    const beforeAp=game.citizens[0].ap
    const result=fireCatapult(game,'c01','cata-0',2,2)
    game=result.state
    expect(result.log).toMatchObject({itemType:'water_ration',intended:{x:2,y:2},landed:{x:2,y:2},missed:false,kills:0,landing:'intact'})
    expect(game.citizens[0].ap).toBe(beforeAp-4)
    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(game.world.zones['2,2'].groundItems.some((item)=>item.id==='cata-0'&&item.type==='water_ration')).toBe(true)
    expect(game.town.catapultLog?.at(-1)).toEqual(result.log)
  })

  it('scatters a miss to exactly one cardinally adjacent zone before resolving the payload',()=>{
    const game=forceMiss(withInventory(completed(createInitialGame(9904,1),'catapult'),'water_ration'))
    const result=fireCatapult(game,'c01','cata-0',2,2)
    expect(result.log.missed).toBe(true)
    const dx=Math.abs(result.log.landed.x-2);const dy=Math.abs(result.log.landed.y-2)
    expect(dx+dy).toBe(1)
    expect(result.state.world.zones[zoneKey(result.log.landed.x,result.log.landed.y)].groundItems.some((item)=>item.id==='cata-0')).toBe(true)
    expect(result.state.world.zones['2,2'].groundItems.some((item)=>item.id==='cata-0')).toBe(false)
  })

  it('applies wide Exploding Grapefruit bombardment as 11–20 total kills over the 3×3 impact footprint',()=>{
    let game=completed(createInitialGame(9905,1),'catapult')
    game=withInventory(game,'exploding_grapefruit');game=withZombieSquare(game,2,2,20);game=forceHit(game)
    const before=zombieTotal(game,2,2)
    const result=fireCatapult(game,'c01','cata-0',2,2)
    const after=zombieTotal(result.state,2,2)
    expect(result.log.missed).toBe(false)
    expect(result.log.kills).toBeGreaterThanOrEqual(11);expect(result.log.kills).toBeLessThanOrEqual(20)
    expect(before-after).toBe(result.log.kills)
    expect(result.state.world.zones['2,2'].groundItems.some((item)=>item.id==='cata-0')).toBe(false)
  })

  it('applies Claymore important damage as 21–30 total kills over the 3×3 footprint',()=>{
    let game=completed(createInitialGame(9906,1),'catapult')
    game=withInventory(game,'claymore');game=withZombieSquare(game,2,2,20);game=forceHit(game)
    const before=zombieTotal(game,2,2)
    const result=fireCatapult(game,'c01','cata-0',2,2)
    expect(result.log.kills).toBeGreaterThanOrEqual(21);expect(result.log.kills).toBeLessThanOrEqual(30)
    expect(before-zombieTotal(result.state,2,2)).toBe(result.log.kills)
  })

  it('applies Trestle low cross damage while recording the unresolved generic debris landing outcome',()=>{
    let game=completed(createInitialGame(9907,1),'catapult')
    game=withInventory(game,'trestle');game=withZombieSquare(game,2,2,20);game=forceHit(game)
    const beforeCross=['2,2','2,3','3,2','2,1','1,2'].reduce((sum,key)=>sum+game.world.zones[key].zombies,0)
    const result=fireCatapult(game,'c01','cata-0',2,2)
    const afterCross=['2,2','2,3','3,2','2,1','1,2'].reduce((sum,key)=>sum+result.state.world.zones[key].zombies,0)
    expect(result.log.landing).toBe('debris')
    expect(result.log.kills).toBeGreaterThanOrEqual(4);expect(result.log.kills).toBeLessThanOrEqual(10)
    expect(beforeCross-afterCross).toBe(result.log.kills)
    expect(result.state.world.zones['2,2'].groundItems.some((item)=>item.id==='cata-0')).toBe(false)
  })

  it('preserves source impact transformations that have runtime equivalents',()=>{
    expect(catapultProfile('telescope')).toMatchObject({landing:'scrap'})
    expect(catapultProfile('mechanism')).toMatchObject({landing:'scrap'})
    expect(catapultProfile('machete')).toMatchObject({landing:'broken',brokenInto:'broken_machete',damage:'low',shape:'zone'})
    expect(catapultProfile('water_bomb')).toMatchObject({landing:'destroyed',damage:'low',shape:'cross'})
    expect(catapultProfile('sheet_metal_bits')).toMatchObject({landing:'destroyed',damage:'low',shape:'square3x3'})
  })

  it('requires Small Trebuchet before a Chicken can be launched',()=>{
    let game=forceHit(withInventory(completed(createInitialGame(9908,1),'catapult'),'chicken'))
    expect(()=>fireCatapult(game,'c01','cata-0',2,2)).toThrow(/Small Trebuchet/)
    game=completed(game,'small_trebuchet')
    expect(()=>fireCatapult(game,'c01','cata-0',2,2)).not.toThrow()
  })

  it('deducts only 2 AP when the Upgraded Catapult is complete',()=>{
    const game=forceHit(withInventory(completed(createInitialGame(9909,1),'catapult','upgraded_catapult'),'water_ration'))
    const before=game.citizens[0].ap
    const result=fireCatapult(game,'c01','cata-0',2,2)
    expect(result.state.citizens[0].ap).toBe(before-2)
  })

  it('rejects town targeting and non-carried payloads',()=>{
    const game=forceHit(withInventory(completed(createInitialGame(9910,1),'catapult'),'water_ration'))
    expect(()=>fireCatapult(game,'c01','cata-0',0,0)).toThrow(/cannot target the town/)
    expect(()=>fireCatapult(game,'c01','missing',2,2)).toThrow(/must be carried/)
  })

  it('exposes the built Catapult facility and renders payload, targeting and register UI',()=>{
    const game=withInventory(completed(createInitialGame(9911,1),'catapult'),'water_ration','exploding_grapefruit')
    expect(availableScreens(game).some((entry)=>entry.id==='catapult')).toBe(true)
    const html=renderToStaticMarkup(<CatapultView game={game} citizenId="c01" onChange={()=>{}}/>)
    expect(html).toContain('Catapult')
    expect(html).toContain('4 AP')
    expect(html).toContain('25%')
    expect(html).toContain('Water Ration')
    expect(html).toContain('Exploding Grapefruit')
    expect(html).toContain('Catapult Register')
    expect(html).toContain('provisional until town-role voting is implemented')
  })
})
