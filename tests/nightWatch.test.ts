import { describe, expect, it } from 'vitest'
import { BUILDABLE_CONSTRUCTION_IDS, CONSTRUCTIONS } from '../src/core/construction'
import { constructionUpgradeLevel } from '../src/core/constructionUpgrades'
import { createInitialGame, resolveNight } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import { attackStrengthForDay } from '../src/core/night'
import { nightWatchCapacity, nightWatchDeathChance, nightWatchDefenseForCitizen, nightWatchFatigueChance, resolveNightWatch, setNightWatchEnrollment } from '../src/core/nightWatch'
import { equipCitizenProfession } from '../src/core/professions'
import type { GameState } from '../src/core/types'

function withWatchBuildings(game:GameState,armory=false):GameState{return{
  ...game,
  town:{...game.town,construction:{
    ...game.town.construction,
    watchtower:{...game.town.construction.watchtower,discovered:true,completed:true,apContributed:15},
    battlements:{...game.town.construction.battlements,discovered:true,completed:true,apContributed:25},
    ...(armory?{miniature_armory:{...game.town.construction.miniature_armory,discovered:true,completed:true,apContributed:40}}:{}),
  }},
}}

describe('Battlements construction branch',()=>{
  it('activates Battlements and Miniature Armory with their verified source bills',()=>{
    expect(BUILDABLE_CONSTRUCTION_IDS).toContain('battlements')
    expect(BUILDABLE_CONSTRUCTION_IDS).toContain('miniature_armory')
    expect(CONSTRUCTIONS.battlements.apCost).toBe(25)
    expect(CONSTRUCTIONS.battlements.resources).toEqual({twisted_plank:6,patchwork_beam:2,metal_support:2,nuts_and_bolts:1})
    expect(CONSTRUCTIONS.miniature_armory.apCost).toBe(40)
    expect(CONSTRUCTIONS.miniature_armory.resources).toEqual({nuts_and_bolts:1,twisted_plank:10,wrought_iron:8,sheet_metal:2,duct_tape:2})
    expect(CONSTRUCTIONS.battlements.effects).toEqual([])
    expect(CONSTRUCTIONS.miniature_armory.effects).toEqual([])
  })

  it('uses the 10 → 20 → 40 → 40 voted Watch capacity track',()=>{
    let game=withWatchBuildings(createInitialGame(10,1))
    expect(nightWatchCapacity(game)).toBe(10)
    game={...game,town:{...game.town,upgradeProjects:{...game.town.upgradeProjects,levels:{battlements:1}}}}
    expect(constructionUpgradeLevel(game,'battlements')).toBe(1)
    expect(nightWatchCapacity(game)).toBe(20)
    game={...game,town:{...game.town,upgradeProjects:{...game.town.upgradeProjects,levels:{battlements:2}}}}
    expect(nightWatchCapacity(game)).toBe(40)
    game={...game,town:{...game.town,upgradeProjects:{...game.town.upgradeProjects,levels:{battlements:3}}}}
    expect(nightWatchCapacity(game)).toBe(40)
  })
})

describe('Night Watch citizens',()=>{
  it('keeps Guardian Riot Shield Watch effects active before Miniature Armory and gates ordinary equipment behind it',()=>{
    let game=withWatchBuildings(createInitialGame(20,1,'guardian'))
    game={...game,citizens:game.citizens.map((citizen)=>({...equipCitizenProfession(citizen,'guardian'),inventory:[createItemInstance('machete-1','machete')]}))}
    expect(nightWatchDefenseForCitizen(game,game.citizens[0])).toBe(25)
    expect(nightWatchDeathChance(game,game.citizens[0])).toBe(3)
    game=withWatchBuildings(game,true)
    expect(nightWatchDefenseForCitizen(game,game.citizens[0])).toBe(40)
  })

  it('matches the ordinary repeated-Watch fatigue curve',()=>{
    expect([0,1,2,3,4,5,6,7,8,9,15].map(nightWatchFatigueChance)).toEqual([0,1,4,9,20,30,42,56,72,90,90])
  })

  it('consumes and breaks enabled Watch equipment when zombies reach the Watch',()=>{
    let game=withWatchBuildings(createInitialGame(30,1,'scout'),true)
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,inventory:[createItemInstance('mine-1','claymore'),createItemInstance('blade-1','machete')]}))}
    game=setNightWatchEnrollment(game,'c01',true)
    const resolved=resolveNightWatch(game,1)
    const citizen=resolved.state.citizens[0]
    expect(citizen.inventory.some((item)=>item.id==='mine-1')).toBe(false)
    expect([...citizen.inventory,...citizen.home.storage].some((item)=>item.id==='blade-1'&&item.type==='broken_machete')).toBe(true)
    expect(resolved.report.defense).toBe(65)
  })

  it('subtracts Watch defense from normal-defense overflow before home attacks',()=>{
    const seed=40
    const attack=attackStrengthForDay(seed,1)
    let game=withWatchBuildings(createInitialGame(seed,1,'scout'))
    game={...game,town:{...game.town,defense:Math.max(0,attack-20)}}
    game=setNightWatchEnrollment(game,'c01',true)
    game=resolveNight(game)
    expect(game.lastNight?.nightWatch?.overflowBefore).toBe(10)
    expect(game.lastNight?.nightWatch?.defense).toBe(10)
    expect(game.lastNight?.nightWatch?.overflowAfter).toBe(0)
    expect(game.lastNight?.zombiesInside).toBe(0)
    expect(game.lastNight?.homeAttacks).toEqual([])
  })
})
