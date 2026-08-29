import { describe, expect, it } from 'vitest'
import { TAMER_TRAP_BAIT_SCORES, TAMER_TRAP_FAILURE_ITEM, TAMER_TRAP_POISON_PENALTY, TAMER_TRAP_PROFESSION_BONUS, TAMER_TRAP_TIERS, rollTamerTrapAnimal, rollTamerTrapFailure, tamerTrapFailureRate, tamerTrapTier } from '../src/core/tamerTrap'

describe("current MyHordes Tamer's Trap result rules",()=>{
  it('pins the current score constants and five result tiers',()=>{
    expect(TAMER_TRAP_PROFESSION_BONUS).toBe(5)
    expect(TAMER_TRAP_POISON_PENALTY).toBe(-1)
    expect(TAMER_TRAP_BAIT_SCORES).toEqual({lure1:0,lure2:1,lure3:3,lure4:5,lure5:7})
    expect(TAMER_TRAP_FAILURE_ITEM).toBe('fistful_of_insects')
    expect(TAMER_TRAP_TIERS.map(({minScore,count,pool})=>({minScore,count,pool:[...pool]}))).toEqual([
      {minScore:0,count:1,pool:['giant_rat','chicken','stinking_pig','fat_cat','huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']},
      {minScore:6,count:2,pool:['giant_rat','chicken','stinking_pig','fat_cat','huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']},
      {minScore:10,count:3,pool:['giant_rat','chicken','stinking_pig','fat_cat']},
      {minScore:15,count:3,pool:['huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']},
      {minScore:20,count:4,pool:['giant_rat','chicken','stinking_pig','fat_cat','huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']},
    ])
  })

  it('selects the highest threshold reached',()=>{
    expect(tamerTrapTier(-5).minScore).toBe(0)
    expect(tamerTrapTier(0).count).toBe(1)
    expect(tamerTrapTier(5).count).toBe(1)
    expect(tamerTrapTier(6).count).toBe(2)
    expect(tamerTrapTier(9).count).toBe(2)
    expect(tamerTrapTier(10).pool).toHaveLength(4)
    expect(tamerTrapTier(14).count).toBe(3)
    expect(tamerTrapTier(15).pool).toEqual(['huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog'])
    expect(tamerTrapTier(20).count).toBe(4)
    expect(tamerTrapTier(999).count).toBe(4)
  })

  it('implements the exact town-wide successful-lure failure bands',()=>{
    expect([0,1,100,101,200,201,300,301,999].map(tamerTrapFailureRate)).toEqual([0,0,0,13,13,26,26,39,39])
    expect(rollTamerTrapFailure(12345,100)).toEqual({failed:false,rngStateAfter:12345,rate:0})
  })

  it('uses seeded deterministic selection within the selected tier',()=>{
    expect(rollTamerTrapAnimal(12345,10)).toEqual(rollTamerTrapAnimal(12345,10))
    const result=rollTamerTrapAnimal(12345,15)
    expect(result.count).toBe(3)
    expect(['huge_snake','furious_kitten_partially_digested','mangy_dachshund','guard_dog']).toContain(result.animal)
    expect(result.rngStateAfter).not.toBe(12345)
  })
})
