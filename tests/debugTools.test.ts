import { describe, expect, it } from 'vitest'
import { completionWaterBonus } from '../src/core/construction'
import { debugGodMove, debugInstantBuild, debugSummonItem, debugToggleGod } from '../src/core/debug'
import { DEBUG_GOD_AP, enforceGodMode, isGodCitizen } from '../src/core/debugGod'
import { createInitialGame } from '../src/core/game'
import type { GameState } from '../src/core/types'
import { zoneKey } from '../src/core/world'

describe('Codex and God debug tools',()=>{
  it('toggles God mode, clears conditions, enforces infinite AP, and restores the original AP cap',()=>{
    const game=createInitialGame(9101,1)
    const baseMax=game.citizens.find((citizen)=>citizen.id==='c01')!.maxAp
    const damaged:GameState={
      ...game,
      citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{
        ...citizen,
        ap:0,
        status:{...citizen.status,hydration:'dehydrated' as const,desertStepsToday:10,wound:'leg' as const,infected:true,terrorized:true,drugged:true,addicted:true,drunk:true,hangover:true,immune:true},
      }:citizen),
    }
    const enabled=debugToggleGod(damaged,'c01')
    const god=enabled.citizens.find((citizen)=>citizen.id==='c01')!
    expect(isGodCitizen(god)).toBe(true)
    expect(god.ap).toBe(DEBUG_GOD_AP)
    expect(god.maxAp).toBe(DEBUG_GOD_AP)
    expect(god.status).toMatchObject({hydration:'normal',desertStepsToday:0,wound:null,infected:false,terrorized:false,drugged:false,addicted:false,drunk:false,hangover:false,immune:false})

    const contaminated:GameState={...enabled,citizens:enabled.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,ap:1,status:{...citizen.status,wound:'head' as const,infected:true,terrorized:true}}:citizen)}
    const enforced=enforceGodMode(contaminated)
    const protectedCitizen=enforced.citizens.find((citizen)=>citizen.id==='c01')!
    expect(protectedCitizen.ap).toBe(DEBUG_GOD_AP)
    expect(protectedCitizen.status.wound).toBeNull()
    expect(protectedCitizen.status.infected).toBe(false)
    expect(protectedCitizen.status.terrorized).toBe(false)

    const disabled=debugToggleGod(enforced,'c01')
    const mortal=disabled.citizens.find((citizen)=>citizen.id==='c01')!
    expect(isGodCitizen(mortal)).toBe(false)
    expect(mortal.maxAp).toBe(baseMax)
    expect(mortal.ap).toBe(baseMax)
  })

  it('lets a God citizen cross a zombie-controlled zone without applying travel conditions',()=>{
    const game=createInitialGame(9102,1)
    const originKey=zoneKey(1,0)
    const trapped:GameState={
      ...game,
      world:{...game.world,zones:{...game.world.zones,[originKey]:{...game.world.zones[originKey],discovered:true,zombies:50}}},
      citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x:1,y:0}}:citizen),
    }
    const god=debugToggleGod(trapped,'c01')
    const moved=debugGodMove(god,'c01','EAST')
    const citizen=moved.citizens.find((candidate)=>candidate.id==='c01')!
    expect(citizen.location).toEqual({type:'world',x:2,y:0})
    expect(citizen.status.hydration).toBe('normal')
    expect(citizen.status.desertStepsToday).toBe(0)
    expect(citizen.ap).toBe(DEBUG_GOD_AP)
    expect(moved.world.zones[zoneKey(2,0)].discovered).toBe(true)
  })

  it('summons a runtime item directly into the controlled citizen rucksack',()=>{
    const game=createInitialGame(9103,1)
    const before=game.citizens.find((citizen)=>citizen.id==='c01')!.inventory.length
    const summoned=debugSummonItem(game,'c01','water_ration')
    const citizen=summoned.citizens.find((candidate)=>candidate.id==='c01')!
    expect(citizen.inventory).toHaveLength(before+1)
    expect(citizen.inventory.at(-1)?.type).toBe('water_ration')
    expect(summoned.nextItemId).toBe(game.nextItemId+1)
  })

  it('instant-builds a construction and its prerequisite chain without consuming Bank materials',()=>{
    const game=createInitialGame(9104,1)
    const bankBefore=game.town.bank.map((item)=>item.id)
    const waterBefore=game.town.well.water
    const built=debugInstantBuild(game,'eden_project')
    for(const id of ['pump','drilling_rig','eden_project'] as const){
      expect(built.town.construction[id]).toMatchObject({discovered:true,completed:true})
    }
    expect(built.town.bank.map((item)=>item.id)).toEqual(bankBefore)
    expect(built.town.well.water).toBe(waterBefore+completionWaterBonus('pump')+completionWaterBonus('drilling_rig')+completionWaterBonus('eden_project'))
  })
})
