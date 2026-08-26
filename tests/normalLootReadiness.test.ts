import { describe, expect, it } from 'vitest'
import { buildMyHordesNormalZoneLoot, myHordesNormalLootReady, unresolvedMyHordesNormalLootIds } from '../src/core/scavengeLoot'

describe('normal MyHordes loot activation gate',()=>{
  it('fails closed while ordinary source dependencies remain unresolved',()=>{
    const unresolved=unresolvedMyHordesNormalLootIds()
    expect(myHordesNormalLootReady()).toBe(false)
    expect(unresolved).toContain('drug_#00')
    expect(unresolved).not.toContain('jerrycan_#00')
    expect(unresolved).toContain('bag_#00')
    expect(unresolved).toContain('chama_#00')
    expect(unresolved).not.toContain('grenade_empty_#00')
    expect(unresolved).not.toContain('water_can_3_#00')
    expect(()=>buildMyHordesNormalZoneLoot()).toThrow(/not dependency-complete/)
  })
})
