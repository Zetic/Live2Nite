import { describe, expect, it } from 'vitest'
import { ITEM_TYPE_IDS } from '../src/core/itemCatalog'
import { EXPLORABLE_RUIN_IDS, RUIN_IDS } from '../src/core/ruinIds'
import { ORDINARY_RUIN_IDS, RUIN_CATALOG, isExplorableRuin, playableRuinLootPool } from '../src/core/ruinCatalog'
import { createWorld, sourceEquivalentRuinKm, SPECIAL_SITE_COUNT } from '../src/core/world'

describe('complete MyHordes ruin catalogue',()=>{
  it('accounts for 65 gameplay ruins: 62 non-explorable and 3 explorable',()=>{
    expect(RUIN_IDS).toHaveLength(65)
    expect(new Set(RUIN_IDS).size).toBe(65)
    expect(EXPLORABLE_RUIN_IDS).toEqual(['abandoned_bunker','abandoned_hotel','abandoned_hospital'])
    expect(RUIN_IDS.filter((id)=>!isExplorableRuin(id))).toHaveLength(62)
    expect(ORDINARY_RUIN_IDS).toHaveLength(61)
    expect(RUIN_CATALOG.strange_barn.availability).toBe('conditional')
    expect(RUIN_IDS).not.toContain('buried_building' as never)
  })

  it('retains representative source placement and camping metadata',()=>{
    expect(RUIN_CATALOG.citizens_home).toMatchObject({spawnChance:686,emptyChance:.25,campingBase:10,campingSpots:2,sourceKm:{min:1,max:4}})
    expect(RUIN_CATALOG.old_police_station).toMatchObject({spawnChance:640,campingBase:30,campingSpots:4,sourceKm:{min:6,max:9}})
    expect(RUIN_CATALOG.indian_burial_ground).toMatchObject({spawnChance:181,campingBase:-50,campingSpots:-1})
    expect(RUIN_CATALOG.abandoned_bunker).toMatchObject({spawnChance:0,emptyChance:1,explorable:true,family:'bunker'})
    expect(RUIN_CATALOG.strange_barn).toMatchObject({spawnChance:0,availability:'conditional',sourceKm:{min:21,max:27}})
  })

  it('fails closed when a source ruin profile references items not implemented at runtime',()=>{
    const runtime=new Set<string>(ITEM_TYPE_IDS)
    for(const id of RUIN_IDS)for(const item of playableRuinLootPool(id))expect(runtime.has(item)).toBe(true)
  })
})

describe('ruin map generation',()=>{
  it('keeps twelve ruin slots with one dedicated explorable ruin and source-valid ordinary distance bands',()=>{
    for(const seed of [1,2,3,44,91,551]){
      const {world}=createWorld(seed)
      const sites=Object.values(world.zones).filter((zone)=>zone.specialSite)
      expect(sites).toHaveLength(SPECIAL_SITE_COUNT)
      const explorable=sites.filter((zone)=>EXPLORABLE_RUIN_IDS.includes(zone.specialSite!.type as never))
      expect(explorable).toHaveLength(1)
      expect(explorable[0]!.specialSite).toMatchObject({status:'accessible',excavationRequired:0})
      expect(sites.some((zone)=>zone.specialSite!.type==='strange_barn')).toBe(false)
      for(const zone of sites){
        const id=zone.specialSite!.type as keyof typeof RUIN_CATALOG
        expect(RUIN_CATALOG[id]).toBeDefined()
        if(EXPLORABLE_RUIN_IDS.includes(id as never))continue
        const km=sourceEquivalentRuinKm(zone.x,zone.y)
        const band=RUIN_CATALOG[id].sourceKm
        expect(km).toBeGreaterThanOrEqual(band.min)
        expect(km).toBeLessThanOrEqual(band.max)
        expect(zone.specialSite!.status).toBe('buried')
        expect(zone.specialSite!.excavationRequired).toBeGreaterThanOrEqual(3)
        expect(zone.specialSite!.excavationRequired).toBeLessThanOrEqual(7)
      }
    }
  })
})
