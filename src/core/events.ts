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

    case 'DEFENSE_CHANGED':
      return {
        ...state,
        town: { ...state.town, defense: Math.max(0, state.town.defense + event.amount) },
      }

    case 'WATER_CHANGED':
      return {
        ...state,
        town: { ...state.town, water: Math.max(0, state.town.water + event.amount) },
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
