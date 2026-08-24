import { describe, expect, it } from 'vitest'
import { INITIAL_MYHORDES_RUIN_KEYS, MYHORDES_511_INITIAL_RUINS } from '../src/core/myhordesRuinManifest'

describe('pinned MyHordes ruin replacements',()=>{
  it('pins the six exact source ruins replacing the current adapted site roles',()=>{
    expect(INITIAL_MYHORDES_RUIN_KEYS).toEqual([
      'construction_site_shelter','wrecked_cars','old_field_hospital','scottish_smiths_superstore','dark_woods','old_police_station',
    ])
  })

  it('keeps exact source placement and camping metadata',()=>{
    expect(MYHORDES_511_INITIAL_RUINS.construction_site_shelter).toMatchObject({spawnChance:475,emptyChance:0.05,km:{min:6,max:9},camping:{baseValue:10,spots:1}})
    expect(MYHORDES_511_INITIAL_RUINS.wrecked_cars).toMatchObject({spawnChance:304,emptyChance:0.1,km:{min:3,max:6},camping:{baseValue:10,spots:2}})
    expect(MYHORDES_511_INITIAL_RUINS.old_field_hospital).toMatchObject({spawnChance:205,emptyChance:0.1,km:{min:16,max:19},camping:{baseValue:10,spots:4}})
    expect(MYHORDES_511_INITIAL_RUINS.scottish_smiths_superstore).toMatchObject({spawnChance:686,emptyChance:0.05,km:{min:6,max:9},camping:{baseValue:10,spots:3}})
    expect(MYHORDES_511_INITIAL_RUINS.dark_woods).toMatchObject({spawnChance:70,emptyChance:0,km:{min:2,max:5},camping:{baseValue:10,spots:2}})
    expect(MYHORDES_511_INITIAL_RUINS.old_police_station).toMatchObject({spawnChance:640,emptyChance:0.1,km:{min:6,max:9},camping:{baseValue:30,spots:4}})
  })

  it('keeps representative exact weighted drops instead of adapted site loot',()=>{
    const weights=(key:keyof typeof MYHORDES_511_INITIAL_RUINS)=>new Map(MYHORDES_511_INITIAL_RUINS[key].drops.map((drop)=>[drop.sourceItemId,drop.weight]))
    expect(weights('construction_site_shelter').get('metal_beam_#00')).toBe(10)
    expect(weights('construction_site_shelter').get('rsc_pack_2_#00')).toBe(8)
    expect(weights('wrecked_cars').get('metal_#00')).toBe(31)
    expect(weights('wrecked_cars').get('chest_citizen_#00')).toBe(19)
    expect(weights('old_field_hospital').get('drug_random_#00')).toBe(30)
    expect(weights('scottish_smiths_superstore').get('chest_citizen_#00')).toBe(25)
    expect(weights('dark_woods').get('wood_bad_#00')).toBe(62)
    expect(weights('dark_woods').get('chest_citizen_#00')).toBe(38)
    expect(weights('old_police_station').get('taser_empty_#00')).toBe(7)
    expect(weights('old_police_station').get('watergun_opt_part_#00')).toBe(5)
  })

  it('retains raw source item ids so unfinished dependencies stay visible',()=>{
    const allDrops=INITIAL_MYHORDES_RUIN_KEYS.flatMap((key)=>MYHORDES_511_INITIAL_RUINS[key].drops.map((drop)=>drop.sourceItemId))
    expect(allDrops).toContain('saw_tool_part_#00')
    expect(allDrops).toContain('jerrycan_#00')
    expect(allDrops).toContain('drug_random_#00')
    expect(allDrops).toContain('gun_#00')
  })
})
