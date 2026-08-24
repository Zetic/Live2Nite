import { describe, expect, it } from 'vitest'
import { mapZombieBand, mapZombieBandForIntel } from '../src/ui/components/WorldMap'

describe('World Beyond map visual bands',()=>{
  it('maps exact zombie intel to the agreed color bands',()=>{
    expect(mapZombieBand(null)).toBe('unknown')
    expect(mapZombieBand(undefined)).toBe('unknown')
    expect(mapZombieBand(0)).toBe('clear')
    expect(mapZombieBand(1)).toBe('low')
    expect(mapZombieBand(2)).toBe('low')
    expect(mapZombieBand(3)).toBe('medium')
    expect(mapZombieBand(4)).toBe('medium')
    expect(mapZombieBand(5)).toBe('high')
    expect(mapZombieBand(12)).toBe('high')
  })

  it('never reveals a horde band for an undiscovered zone',()=>{
    expect(mapZombieBandForIntel(false,0)).toBe('unknown')
    expect(mapZombieBandForIntel(false,2)).toBe('unknown')
    expect(mapZombieBandForIntel(false,5)).toBe('unknown')
    expect(mapZombieBandForIntel(false,99)).toBe('unknown')
    expect(mapZombieBandForIntel(true,0)).toBe('clear')
    expect(mapZombieBandForIntel(true,5)).toBe('high')
  })
})
