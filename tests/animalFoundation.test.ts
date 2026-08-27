import { describe, expect, it } from 'vitest'
import { lootScore } from '../src/agents/planning/LootPolicy'
import { getLegalActions } from '../src/core/actions'
import { catapultProfile } from '../src/core/catapult'
import { executeCommand } from '../src/core/commands'
import { constructionImplementationStatus, constructionPlayable } from '../src/core/construction'
import { garbageDumpCategory } from '../src/core/garbageDump'
import { createInitialGame } from '../src/core/game'
import { isCumbersomeItemType } from '../src/core/inventory'
import { CURRENT_ITEM_SOURCE_CATALOG_BY_REF } from '../src/core/itemSourceCurrent'
import { createItemInstance, itemHasCapability } from '../src/core/items'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'
import { nightWatchEquipment } from '../src/core/nightWatch'
import { playableRuinSourceDrops } from '../src/core/ruinLoot'
import { tamerDogTransportableItems } from '../src/core/tamer'
import type { ConstructionId, GameState, ItemType } from '../src/core/types'

const ANIMALS:readonly ItemType[]=['chicken','stinking_pig','giant_rat','guard_dog','fat_cat','huge_snake']

function completed(game:GameState,...ids:ConstructionId[]):GameState{
  let construction=game.town.construction
  for(const id of ids)construction={...construction,[id]:{...construction[id],discovered:true,completed:true}}
  return{...game,town:{...game.town,construction}}
}
function outsideTamer(game:GameState,types:ItemType[]):GameState{
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x:1,y:0},inventory:types.map((type,index)=>createItemInstance(`tamer-${index}`,type))}:citizen)}
}

describe('current MyHordes animal foundation',()=>{
  it('activates all six ordinary source pets without promoting unresolved animal actions',()=>{
    const expected:Record<string,ItemType>={
      'pet_chick_#00':'chicken',
      'pet_pig_#00':'stinking_pig',
      'pet_rat_#00':'giant_rat',
      'pet_dog_#00':'guard_dog',
      'pet_cat_#00':'fat_cat',
      'pet_snake_#00':'huge_snake',
    }
    for(const[sourceRef,runtimeType]of Object.entries(expected)){
      const source=CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get(sourceRef)
      expect(source?.runtimeType).toBe(runtimeType)
      expect(source?.implementation).toBe('partial')
      expect(itemHasCapability(runtimeType,'animal')).toBe(true)
    }
    expect(CURRENT_ITEM_SOURCE_CATALOG_BY_REF.get('pet_cat_#00')?.decoration).toBe(5)
  })

  it('derives cumbersome handling from source heavy metadata',()=>{
    expect(isCumbersomeItemType('stinking_pig')).toBe(true)
    expect(isCumbersomeItemType('huge_snake')).toBe(true)
    expect(isCumbersomeItemType('chicken')).toBe(false)
    expect(isCumbersomeItemType('giant_rat')).toBe(false)
    expect(isCumbersomeItemType('guard_dog')).toBe(false)
    expect(isCumbersomeItemType('fat_cat')).toBe(false)
  })

  it('routes animals through the existing Maltese whole-rucksack and steroid rules',()=>{
    const light=outsideTamer(createInitialGame(9903,1,'tamer'),['fat_cat'])
    expect(tamerDogTransportableItems(light,light.citizens[0]).map((item)=>item.type)).toEqual(['fat_cat'])
    expect(getLegalActions(light,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')).toBe(true)

    let heavy=outsideTamer(createInitialGame(9904,1,'tamer'),['stinking_pig','anabolic_steroids'])
    expect(tamerDogTransportableItems(heavy,heavy.citizens[0])).toEqual([])
    expect(getLegalActions(heavy,'c01').some((action)=>action.type==='SEND_TAMER_DOG')).toBe(false)
    const drug=getLegalActions(heavy,'c01').find((action)=>action.type==='DRUG_TAMER_DOG')
    expect(drug).toBeDefined()
    heavy=executeCommand(heavy,drug!).state
    expect(tamerDogTransportableItems(heavy,heavy.citizens[0]).map((item)=>item.type)).toEqual(['stinking_pig'])
    expect(getLegalActions(heavy,'c01').some((action)=>action.type==='SEND_TAMER_DOG'&&action.destination==='bank')).toBe(true)
  })

  it('makes every ordinary pet an Animal Dump and Small Trebuchet payload',()=>{
    for(const type of ANIMALS){
      expect(garbageDumpCategory(createItemInstance(`animal-${type}`,type))).toBe('animal')
      expect(catapultProfile(type)).toMatchObject({landing:'destroyed',damage:'ridiculous',shape:'zone',requiresSmallTrebuchet:true})
    }
  })

  it('uses the source Watch values and Pet Shop multiplier for the full family',()=>{
    let game=completed(createInitialGame(9901,1),'battlements','miniature_armory')
    const citizen=game.citizens[0]
    const inventory=ANIMALS.map((type,index)=>createItemInstance(`watch-${index}`,type))
    game={...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?{...candidate,inventory}:candidate)}
    expect(Object.fromEntries(nightWatchEquipment(game,game.citizens[0]).map((item)=>[item.type,item.baseDefense]))).toEqual({
      chicken:8,stinking_pig:25,giant_rat:12,guard_dog:25,fat_cat:12,huge_snake:25,
    })

    game=completed(game,'pet_shop')
    expect(Object.fromEntries(nightWatchEquipment(game,game.citizens[0]).map((item)=>[item.type,item.defense]))).toEqual({
      chicken:10,stinking_pig:32,giant_rat:15,guard_dog:32,fat_cat:15,huge_snake:32,
    })
  })

  it('activates Pet Shop now that its pet dependency is playable',()=>{
    expect(constructionImplementationStatus('pet_shop')).toBe('implemented')
    expect(constructionPlayable('pet_shop')).toBe(true)
    expect(constructionImplementationStatus('tamer_s_trap_system')).toBe('wip')
    expect(constructionImplementationStatus('butcher')).toBe('wip')
    expect(constructionImplementationStatus('pigsty')).toBe('wip')
  })

  it('maps the ordinary normal-source pet identities while preserving the global loot gate',()=>{
    const normalPets:Readonly<Record<string,ItemType>>={
      'pet_chick_#00':'chicken',
      'pet_pig_#00':'stinking_pig',
      'pet_rat_#00':'giant_rat',
      'pet_cat_#00':'fat_cat',
      'pet_snake_#00':'huge_snake',
    }
    const unresolved=unmappedOrdinarySourceLootIds()
    for(const[sourceRef,runtimeType]of Object.entries(normalPets)){
      expect(MYHORDES_NORMAL_LOOT_MAPPING[sourceRef]).toEqual({type:runtimeType})
      expect(unresolved).not.toContain(sourceRef)
    }
    expect(unresolved).toContain('bag_#00')
  })

  it('enables source ruin acquisition paths without inventing new spawn tables',()=>{
    const cosmetics=new Map(playableRuinSourceDrops('cosmetics_lab').map((drop)=>[drop.sourceRef,drop.runtimeType]))
    expect(cosmetics.get('pet_chick_#00')).toBe('chicken')
    expect(cosmetics.get('pet_pig_#00')).toBe('stinking_pig')
    expect(cosmetics.get('pet_rat_#00')).toBe('giant_rat')
    expect(cosmetics.get('pet_dog_#00')).toBe('guard_dog')
    expect(cosmetics.get('pet_cat_#00')).toBe('fat_cat')
    expect(cosmetics.get('pet_snake_#00')).toBe('huge_snake')
  })

  it('gives autonomous scavengers explicit value for every runtime animal',()=>{
    const game=createInitialGame(9902,1)
    const citizen=game.citizens[1]
    for(const type of ANIMALS)expect(lootScore(game,citizen,type)).toBeGreaterThan(0)
    expect(lootScore(game,citizen,'stinking_pig')).toBeGreaterThan(lootScore(game,citizen,'giant_rat'))
  })
})
