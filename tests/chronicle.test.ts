import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../src/core/types'
import { availableChronicleDays, chronicleCategory, eventCitizenId, filterChronicleEvents } from '../src/ui/chronicle'

const events: GameEvent[] = [
  { type: 'DAY_STARTED', day: 1, hour: 1 },
  { type: 'ITEM_DEPOSITED', day: 1, hour: 4, citizenId: 'c01', item: { id: 'i1', type: 'twisted_plank' } },
  { type: 'COMBAT_RESOLVED', day: 2, hour: 7, citizenId: 'c02', zoneKey: '1,1', method: 'fists', kills: 2, item: null, consumed: false, rngStateAfter: 22 },
  { type: 'AP_SPENT', day: 2, hour: 7, citizenId: 'c02', amount: 1 },
  { type: 'CITIZEN_DIED', day: 2, hour: 0, citizenId: 'c02', reason: 'outside_at_night' },
]

describe('Chronicle event metadata', () => {
  it('maps authoritative events to player-facing categories', () => {
    expect(chronicleCategory(events[0])).toBe('night')
    expect(chronicleCategory(events[1])).toBe('bank')
    expect(chronicleCategory(events[2])).toBe('combat')
    expect(chronicleCategory(events[3])).toBe('system')
    expect(chronicleCategory(events[4])).toBe('survival')
  })

  it('attributes only citizen-owned events to citizen filters', () => {
    expect(eventCitizenId(events[0])).toBeNull()
    expect(eventCitizenId(events[1])).toBe('c01')
    expect(eventCitizenId(events[2])).toBe('c02')
  })

  it('derives available days newest first', () => {
    expect(availableChronicleDays(events)).toEqual([2, 1])
  })
})

describe('Chronicle filtering', () => {
  it('combines day, citizen, and multi-category filters', () => {
    const filtered = filterChronicleEvents(events, {
      mode: 'all',
      day: 2,
      citizenId: 'c02',
      categories: ['combat', 'survival'],
    })
    expect(filtered.map((event) => event.type)).toEqual(['COMBAT_RESOLVED', 'CITIZEN_DIED'])
  })

  it('keeps the existing highlights policy while applying other filters', () => {
    const filtered = filterChronicleEvents(events, {
      mode: 'highlights',
      day: 2,
      citizenId: 'c02',
      categories: [],
    })
    expect(filtered.map((event) => event.type)).toEqual(['COMBAT_RESOLVED', 'CITIZEN_DIED'])
  })

  it('treats an empty category selection as all categories', () => {
    const filtered = filterChronicleEvents(events, {
      mode: 'all',
      day: 1,
      citizenId: null,
      categories: [],
    })
    expect(filtered.map((event) => event.type)).toEqual(['DAY_STARTED', 'ITEM_DEPOSITED'])
  })
})
