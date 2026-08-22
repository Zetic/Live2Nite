import { bankDefenseFor } from './items'
import { zoneKey } from './world'
import type { GameEvent, GameState } from './types'

function reduceSingleEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'AP_SPENT':
      return {
        ...state,
        citizens: state.citizens.map((citizen) =>
          citizen.id === event.citizenId
            ? { ...citizen, ap: Math.max(0, citizen.ap - event.amount) }
            : citizen,
        ),
      }

    case 'GATE_SET':
      return { ...state, town: { ...state.town, gateOpen: event.open } }

    case 'CITIZEN_LOCATION_CHANGED':
      return {
        ...state,
        citizens: state.citizens.map((citizen) =>
          citizen.id === event.citizenId ? { ...citizen, location: event.location } : citizen,
        ),
      }

    case 'ZONE_DISCOVERED': {
      const zone = state.world.zones[event.zoneKey]
      if (!zone || zone.discovered) return state
      return {
        ...state,
        world: {
          ...state.world,
          zones: { ...state.world.zones, [event.zoneKey]: { ...zone, discovered: true } },
        },
      }
    }

    case 'ZONE_SEARCHED': {
      const zone = state.world.zones[event.zoneKey]
      if (!zone) return state
      return {
        ...state,
        nextItemId: event.item ? state.nextItemId + 1 : state.nextItemId,
        world: {
          ...state.world,
          zones: {
            ...state.world.zones,
            [event.zoneKey]: {
              ...zone,
              searchesRemaining: Math.max(0, zone.searchesRemaining - 1),
              searchedBy: [...zone.searchedBy, event.citizenId],
              hiddenLoot: zone.hiddenLoot.slice(1),
              groundItems: event.item ? [...zone.groundItems, event.item] : zone.groundItems,
            },
          },
        },
      }
    }

    case 'ITEM_PICKED_UP': {
      const zone = state.world.zones[event.zoneKey]
      if (!zone) return state
      return {
        ...state,
        citizens: state.citizens.map((citizen) =>
          citizen.id === event.citizenId
            ? { ...citizen, inventory: [...citizen.inventory, event.item] }
            : citizen,
        ),
        world: {
          ...state.world,
          zones: {
            ...state.world.zones,
            [event.zoneKey]: {
              ...zone,
              groundItems: zone.groundItems.filter((item) => item.id !== event.item.id),
            },
          },
        },
      }
    }

    case 'ITEM_DEPOSITED': {
      const currentCount = state.town.bank[event.item.type] ?? 0
      return {
        ...state,
        citizens: state.citizens.map((citizen) =>
          citizen.id === event.citizenId
            ? { ...citizen, inventory: citizen.inventory.filter((item) => item.id !== event.item.id) }
            : citizen,
        ),
        town: {
          ...state.town,
          defense: state.town.defense + bankDefenseFor(event.item.type),
          bank: { ...state.town.bank, [event.item.type]: currentCount + 1 },
        },
      }
    }

    case 'CITIZEN_DIED':
      return {
        ...state,
        citizens: state.citizens.map((citizen) =>
          citizen.id === event.citizenId ? { ...citizen, alive: false, ap: 0 } : citizen,
        ),
      }

    case 'NIGHT_RESOLVED':
      return { ...state, lastNight: event.report }

    case 'DAY_STARTED':
      return {
        ...state,
        day: event.day,
        citizens: state.citizens.map((citizen) => ({
          ...citizen,
          ap: citizen.alive ? citizen.maxAp : 0,
        })),
      }
  }
}

export function applyEvents(state: GameState, events: GameEvent[]): GameState {
  const nextState = events.reduce(reduceSingleEvent, state)
  return { ...nextState, events: [...state.events, ...events] }
}

export function currentZoneKey(state: GameState, citizenId: string): string | null {
  const citizen = state.citizens.find((candidate) => candidate.id === citizenId)
  if (!citizen || citizen.location.type !== 'world') return null
  return zoneKey(citizen.location.x, citizen.location.y)
}
