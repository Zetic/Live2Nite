import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { createInitialGame } from '../src/core/game'
import { BASE_HOME_STORAGE, BASE_PERSONAL_HOME_DEFENSE, contributableHomeDefense, personalDefense } from '../src/core/home'
import { PROFESSION_IDS, assignBotProfessions, citizenEquipment, citizenProfession, equipCitizenProfession, townHasProfessionEquipment } from '../src/core/professions'

describe('profession foundation',()=>{
  it('equips the selected player profession without consuming cargo capacity',()=>{
    const game=createInitialGame(6101,40,'scout')
    const player=game.citizens[0]
    const equipment=citizenEquipment(player)
    expect(citizenProfession(player)).toBe('scout')
    expect(equipment?.townUniform.type).toBe('town_uniform')
    expect(equipment?.professionItem.type).toBe('profession_camouflage_suit')
    expect(player.inventory).toEqual([])
    expect(player.inventoryCapacity).toBe(5)
    expect(player.home.storageCapacity).toBe(BASE_HOME_STORAGE)
    expect(player.home.storageCapacity).toBe(5)
  })

  it('gives the universal two points of personal home defense without increasing contributable defense',()=>{
    const game=createInitialGame(6102,1,'guardian')
    const player={...game.citizens[0],home:{...game.citizens[0].home,storage:[]}}
    expect(personalDefense(player,game)-contributableHomeDefense(player,game)).toBe(BASE_PERSONAL_HOME_DEFENSE)
    expect(BASE_PERSONAL_HOME_DEFENSE).toBe(2)
  })

  it('assigns every bot a seeded approximately even profession distribution',()=>{
    const game=createInitialGame(6103,40,'survivalist')
    const bots=game.citizens.slice(1)
    expect(citizenProfession(game.citizens[0])).toBe('survivalist')
    expect(citizenEquipment(game.citizens[0])?.professionItem.type).toBe('profession_survival_manual')
    expect(townHasProfessionEquipment(game.citizens)).toBe(true)
    const counts=new Map(PROFESSION_IDS.map((id)=>[id,0]))
    for(const bot of bots){const profession=citizenProfession(bot);expect(profession).not.toBeNull();if(profession)counts.set(profession,(counts.get(profession)??0)+1)}
    const values=[...counts.values()]
    expect(Math.max(...values)-Math.min(...values)).toBeLessThanOrEqual(1)
    expect(assignBotProfessions(6103,39)).toEqual(assignBotProfessions(6103,39))
  })

  it('derives profession from the equipped profession item so a future dedicated swap can change it',()=>{
    const game=createInitialGame(6104,1,'scavenger')
    const before=game.citizens[0]
    const uniformId=citizenEquipment(before)?.townUniform.id
    const changed=equipCitizenProfession(before,'technician')
    expect(citizenProfession(before)).toBe('scavenger')
    expect(citizenProfession(changed)).toBe('technician')
    expect(citizenEquipment(changed)?.professionItem.type).toBe('profession_technician_wrench')
    expect(citizenEquipment(changed)?.townUniform.id).toBe(uniformId)
  })

  it('never exposes locked equipment through ordinary item commands',()=>{
    const game=createInitialGame(6105,2,'tamer')
    const player=game.citizens[0]
    const equipment=citizenEquipment(player)
    const serialized=JSON.stringify(getLegalActions(game,player.id))
    expect(serialized).not.toContain(equipment?.townUniform.id)
    expect(serialized).not.toContain(equipment?.professionItem.id)
  })
})
