export interface RandomResult {
  state: number
  value: number
}

export function nextRandom(state: number): RandomResult {
  let x = state | 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  const nextState = x >>> 0 || 0x6d2b79f5
  return { state: nextState, value: nextState / 0x100000000 }
}

export function randomInt(state: number, min: number, max: number): RandomResult {
  const result = nextRandom(state)
  const value = Math.floor(result.value * (max - min + 1)) + min
  return { state: result.state, value }
}
