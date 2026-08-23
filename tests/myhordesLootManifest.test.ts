import { describe, expect, it } from 'vitest'
import { MYHORDES_511_DEPLETED_SOURCE_LOOT, MYHORDES_511_NORMAL_SOURCE_LOOT, ordinaryNormalSourceLoot } from '../src/core/myhordesLootManifest'

describe('pinned MyHordes loot manifest',()=>{
  it('keeps the exact depleted source table',()=>{
    expect(MYHORDES_511_DEPLETED_SOURCE_LOOT.map((entry)=>[entry.sourceId,entry.weight])).toEqual([
      ['wood_bad_#00',20],['metal_bad_#00',12],
    ])
  })

  it('pins representative normal-zone entries that drive Part 2 dependencies',()=>{
    const byId=new Map(MYHORDES_511_NORMAL_SOURCE_LOOT.map((entry)=>[entry.sourceId,entry]))
    expect(byId.get('wood2_#00')?.weight).toBe(170)
    expect(byId.get('grenade_empty_#00')?.weight).toBe(70)
    expect(byId.get('food_bag_#00')?.weight).toBe(50)
    expect(byId.get('can_#00')?.weight).toBe(25)
    expect(byId.get('chest_tools_#00')?.weight).toBe(15)
    expect(byId.get('chest_food_#00')?.weight).toBe(4)
    expect(byId.get('saw_tool_part_#00')?.weight).toBe(1)
    expect(byId.get('safe_#00')?.weight).toBe(1)
  })

  it('keeps seasonal source entries explicitly gated instead of treating them as ordinary loot',()=>{
    const ordinary=new Set(ordinaryNormalSourceLoot().map((entry)=>entry.sourceId))
    expect(ordinary.has('wood2_#00')).toBe(true)
    expect(ordinary.has('christmas_suit_1_#00')).toBe(false)
    expect(ordinary.has('paques_#00')).toBe(false)
    expect(ordinary.has('hurling_stick_#00')).toBe(false)
    expect(ordinary.has('pumpkin_raw_#00')).toBe(false)
  })

  it('does not duplicate raw source ids',()=>{
    const ids=MYHORDES_511_NORMAL_SOURCE_LOOT.map((entry)=>entry.sourceId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
