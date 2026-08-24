import { describe, expect, it } from 'vitest'
import { MYHORDES_511_DEPLETED_SOURCE_LOOT, MYHORDES_511_NORMAL_SOURCE_LOOT, ordinaryNormalSourceLoot } from '../src/core/myhordesLootManifest'
import { MYHORDES_NORMAL_LOOT_MAPPING, unmappedOrdinarySourceLootIds } from '../src/core/myhordesLootMapping'

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

  it('preserves source identity/state when Live2Nite owns the gameplay item',()=>{
    expect(MYHORDES_NORMAL_LOOT_MAPPING['rsc_pack_2_#00']).toEqual({type:'resource_pack',state:{contents:2}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['rsc_pack_3_#00']).toEqual({type:'resource_pack',state:{contents:3}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['watergun_empty_#00']).toEqual({type:'water_pistol',state:{charges:0}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['watergun_1_#00']).toEqual({type:'water_pistol',state:{charges:1}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['watergun_2_#00']).toEqual({type:'water_pistol',state:{charges:2}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['water_can_empty_#00']).toEqual({type:'water_cooler_bottle',state:{charges:0}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['water_can_1_#00']).toEqual({type:'water_cooler_bottle',state:{charges:1}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['water_can_2_#00']).toEqual({type:'water_cooler_bottle',state:{charges:2}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['water_can_3_#00']).toEqual({type:'water_cooler_bottle',state:{charges:3}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['pilegun_empty_#00']).toEqual({type:'battery_launcher',state:{charges:0}})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['grenade_empty_#00']).toEqual({type:'plastic_bag'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['engine_#00']).toEqual({type:'engine'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['repair_kit_#00']).toEqual({type:'repair_kit'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['saw_tool_part_#00']).toEqual({type:'saw_tool_part'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['fence_#00']).toEqual({type:'wire_mesh'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['pet_chick_#00']).toEqual({type:'chicken'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['food_noodles_#00']).toEqual({type:'chinese_noodles'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['spices_#00']).toEqual({type:'strong_spices'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['chama_#00']).toEqual({type:'bag_of_damp_grass'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['chair_basic_#00']).toEqual({type:'ektorp_gluten_chair'})
    expect(MYHORDES_NORMAL_LOOT_MAPPING['pc_#00']).toEqual({type:'pc_base_unit'})
    const pending=new Set(unmappedOrdinarySourceLootIds())
    for(const closed of ['fence_#00','pet_chick_#00','food_noodles_#00','spices_#00','chama_#00','chair_basic_#00','pc_#00','grenade_empty_#00','engine_#00','repair_kit_#00','watergun_1_#00','watergun_2_#00','water_can_1_#00','water_can_2_#00','water_can_3_#00','bplan_drop_#00'])expect(pending.has(closed),closed).toBe(false)
  })

  it('keeps still-unmapped ordinary ids visible instead of dropping them',()=>{
    const pending=new Set(unmappedOrdinarySourceLootIds())
    expect(pending.has('drug_#00')).toBe(true)
    expect(pending.has('jerrycan_#00')).toBe(true)
    expect(pending.has('bag_#00')).toBe(true)
  })
})
