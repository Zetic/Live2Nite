import { randomInt } from './rng'

export const STARTING_WELL_MIN = 80
export const STARTING_WELL_MAX = 140

export function startingWellWater(seed: number): number {
  const isolatedSeed = ((seed >>> 0) ^ 0x9e3779b9) >>> 0 || 1
  return randomInt(isolatedSeed, STARTING_WELL_MIN, STARTING_WELL_MAX).value
}
