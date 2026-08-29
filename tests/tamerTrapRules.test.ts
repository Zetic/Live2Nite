import { describe, expect, it } from 'vitest'
import { TAMER_TRAP_BAIT_SCORES, TAMER_TRAP_FAILURE_ITEM, TAMER_TRAP_POISON_PENALTY, TAMER_TRAP_PROFESSION_BONUS, TAMER_TRAP_TIERS, resolveTamerTrap, rollTamerTrapAnimal, rollTamerTrapFailure, tamerTrapBaitsValid, tamerTrapFailureRate, tamerTrapScore, tamerTrapTier, type TamerTrapBaitSelection } from '../src/core/tamerTrap'

const baits=(overrides:Partial<TamerTrapBaitSelection>[]=[]):TamerTrapBaitSelection[]=>[
  {itemId:'bait-1',prototype:'bait_a',lureGroups:['lure2'],poisoned:false,...overrides[0]},
  {itemId:'bait-2',prototype:'bait_b',lureGroups:['lure3'],poisoned:false,...overrides[1]},
  {itemId:'bait-3',prototype:'bait_c',lureGroups:['lure5'],poisoned:false,...overrides[2]},
]

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

  it('requires exactly three distinct source bait prototypes and instances',()=>{
    expect(tamerTrapBaitsValid(baits())).toBe(true)
    expect(tamerTrapBaitsValid(baits().slice(0,2))).toBe(false)
    expect(tamerTrapBaitsValid(baits([{prototype:'bait_a'},{prototype:'bait_a'}]))).toBe(false)
    expect(tamerTrapBaitsValid(baits([{itemId:'bait-1'},{itemId:'bait-1'}]))).toBe(false)
  })

  it('scores profession, poison and every lure-group membership exactly',()=>{
    expect(tamerTrapScore(baits(),false)).toBe(11)
    expect(tamerTrapScore(baits(),true)).toBe(16)
    expect(tamerTrapScore(baits([{poisoned:true},{lureGroups:['lure1','lure4']}]),true)).toBe(17)
  })

  it('resolves failure or a uniformly selected tier animal into the exact output count',()=>{
    const success=resolveTamerTrap(12345,0,baits(),false)
    expect(success.failed).toBe(false)
    expect(success.score).toBe(11)
    expect(success.outputCount).toBe(3)
    expect(['giant_rat','chicken','stinking_pig','fat_cat']).toContain(success.outputType)
    expect(success.rngStateAfter).not.toBe(12345)

    let seed=1
    let failure=resolveTamerTrap(seed,301,baits(),true)
    while(!failure.failed&&seed<10000){seed+=1;failure=resolveTamerTrap(seed,301,baits(),true)}
    expect(failure.failed).toBe(true)
    expect(failure.failureRate).toBe(39)
    expect(failure.outputType).toBe('fistful_of_insects')
    expect(failure.outputCount).toBe(1)
  })
})
