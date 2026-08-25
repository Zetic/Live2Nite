import { describe, expect, it } from 'vitest'
import { totalTownDefense } from '../src/core/defense'
import { createInitialGame } from '../src/core/game'
import { BASE_PERSONAL_HOME_DEFENSE, contributableHomeDefense, personalDefense } from '../src/core/home'
import {
  GUARDIAN_CONTROL_POINTS,
  GUARDIAN_PERSONAL_HOME_DEFENSE,
  GUARDIAN_TOWER_TOWN_DEFENSE,
  GUARDIAN_TOWN_DEFENSE,
  citizenEquipment,
  equipCitizenProfession,
  equipmentItemPurpose,
  guardianTownDefenseBonus,
} from '../src/core/professions'
import { citizenControlPoints } from '../src/core/status'
import type { Citizen, GameState } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'

function replaceCitizen(game:GameState,citizen:Citizen):GameState{
  return{...game,citizens:game.citizens.map((candidate)=>candidate.id===citizen.id?citizen:candidate)}
}
function outsideAt(game:GameState,citizenId:string,x:number,y:number):GameState{
  return{
    ...game,
    citizens:game.citizens.map((citizen)=>citizen.id===citizenId?{...citizen,location:{type:'world' as const,x,y}}:citizen),
  }
}

describe('Guardian profession',()=>{
  it('derives four control points from the Riot Shield and still yields to Terror',()=>{
    const game=createInitialGame(6201,1,'guardian')
    const guardian=game.citizens[0]
    expect(citizenControlPoints(guardian)).toBe(GUARDIAN_CONTROL_POINTS)

    const terrorized={...guardian,status:{...guardian.status,terrorized:true}}
    expect(citizenControlPoints(terrorized)).toBe(0)

    const swapped=equipCitizenProfession(guardian,'scout')
    expect(citizenControlPoints(swapped)).toBe(2)
  })

  it('uses Guardian control in the real zone-control calculation',()=>{
    let game=createInitialGame(6202,1,'guardian')
    game=outsideAt(game,'c01',1,0)
    const key=zoneKey(1,0)
    game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],zombies:3}}}}
    expect(zoneControl(game,1,0)).toMatchObject({humanPoints:4,zombiePoints:3,trapped:false})

    const player=game.citizens[0]
    game=replaceCitizen(game,equipCitizenProfession(player,'scavenger'))
    expect(zoneControl(game,1,0)).toMatchObject({humanPoints:2,zombiePoints:3,trapped:true})
  })

  it('adds one personal Home defense without making that point contributable to town defense',()=>{
    const game=createInitialGame(6203,1,'guardian')
    const guardian={...game.citizens[0],home:{...game.citizens[0].home,storage:[]}}
    const structural=contributableHomeDefense(guardian,game)
    expect(personalDefense(guardian,game)-structural).toBe(BASE_PERSONAL_HOME_DEFENSE+GUARDIAN_PERSONAL_HOME_DEFENSE)

    const swapped=equipCitizenProfession(guardian,'technician')
    expect(contributableHomeDefense(swapped,game)).toBe(structural)
    expect(personalDefense(swapped,game)-structural).toBe(BASE_PERSONAL_HOME_DEFENSE)
  })

  it('adds five town defense only while an alive Riot Shield Guardian is physically in town',()=>{
    let game=createInitialGame(6204,1,'guardian')
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,home:{...citizen.home,storage:[]}}))}
    expect(guardianTownDefenseBonus(game)).toBe(GUARDIAN_TOWN_DEFENSE)
    expect(totalTownDefense(game)).toBe(40+GUARDIAN_TOWN_DEFENSE)

    const outside=outsideAt(game,'c01',0,0)
    expect(guardianTownDefenseBonus(outside)).toBe(0)
    expect(totalTownDefense(outside)).toBe(40)

    const dead=replaceCitizen(game,{...game.citizens[0],alive:false})
    expect(guardianTownDefenseBonus(dead)).toBe(0)

    const swapped=replaceCitizen(game,equipCitizenProfession(game.citizens[0],'survivalist'))
    expect(guardianTownDefenseBonus(swapped)).toBe(0)
    expect(totalTownDefense(swapped)).toBe(40)
  })

  it('stacks Guardian town defense for bots and raises each contribution to fifteen when Guard Tower is completed',()=>{
    let game=createInitialGame(6205,3,'guardian')
    game={
      ...game,
      citizens:game.citizens.map((citizen,index)=>{
        const equipped=index<2?equipCitizenProfession(citizen,'guardian'):equipCitizenProfession(citizen,'scout')
        return{...equipped,home:{...equipped.home,storage:[]}}
      }),
    }
    expect(guardianTownDefenseBonus(game)).toBe(GUARDIAN_TOWN_DEFENSE*2)
    expect(totalTownDefense(game)).toBe(40+GUARDIAN_TOWN_DEFENSE*2)

    game={
      ...game,
      town:{
        ...game.town,
        construction:{
          ...game.town.construction,
          guard_tower:{...game.town.construction.guard_tower,completed:true,discovered:true},
        },
      },
    }
    expect(guardianTownDefenseBonus(game)).toBe(GUARDIAN_TOWER_TOWN_DEFENSE*2)
    expect(totalTownDefense(game)).toBe(40+GUARDIAN_TOWER_TOWN_DEFENSE*2)
  })

  it('describes the implemented Riot Shield perks through the profession equipment tooltip source',()=>{
    const game=createInitialGame(6206,1,'guardian')
    const item=citizenEquipment(game.citizens[0])?.professionItem
    expect(item).toBeDefined()
    if(!item)return
    const purpose=equipmentItemPurpose(item)
    expect(purpose).toContain('4 World Beyond control points')
    expect(purpose).toContain('+1 personal Home defense')
    expect(purpose).toContain('+5 town defense')
    expect(purpose).toContain('+15')
  })
})
