import { describe, expect, it } from 'vitest'
import { createInitialGame } from '../src/core/game'
import type { ReplenishmentEvent } from '../src/core/scavenging'
import type { GameEvent } from '../src/core/types'
import { describeEvent } from '../src/ui/eventText'

describe('Scavenger replenishment event text',()=>{
  it('credits the Small Shovel instead of the Search Tower for a Spade replenishment',()=>{
    const game=createInitialGame(1210,1)
    const event:ReplenishmentEvent={type:'ZONE_REPLENISHED',day:1,hour:13,zoneKey:'1,0',loot:'twisted_plank',source:'scavenger_spade',citizenId:'c01'}
    const text=describeEvent(event,game)
    expect(text).toContain(game.citizens[0].name)
    expect(text).toContain('Small Shovel')
    expect(text).not.toContain('Search Tower')
  })

  it('keeps legacy/source-less replenishment wording for the Search Tower path',()=>{
    const game=createInitialGame(1211,1)
    const event:GameEvent={type:'ZONE_REPLENISHED',day:1,hour:0,zoneKey:'2,0',loot:'wrought_iron'}
    expect(describeEvent(event,game)).toContain('Search Tower')
  })
})
