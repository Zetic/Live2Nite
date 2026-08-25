import { describe, expect, it } from 'vitest'
import { eventCitizenId, filterChronicleEvents } from '../src/ui/chronicle'
import { isHighlightEvent } from '../src/ui/eventText'
import type { GameEvent } from '../src/core/types'

const item={id:'home-event-item',type:'twisted_plank' as const}

function deposited(spotted:boolean):GameEvent{return{type:'HOME_ITEM_DEPOSITED',day:1,citizenId:'c01',targetCitizenId:'c02',item,spotted,rngStateAfter:123}}
function stolen(spotted:boolean):GameEvent{return{type:'HOME_ITEM_STOLEN',day:1,citizenId:'c01',targetCitizenId:'c02',item,spotted,rngStateAfter:123}}
function intrusion(alarmed:boolean):GameEvent{return{type:'HOME_INTRUSION_ATTEMPTED',day:1,citizenId:'c01',targetCitizenId:'c02',success:true,alarmed}}

describe('home Chronicle identity privacy',()=>{
  it('does not attribute an unspotted deposit to the actor or highlight it',()=>{
    const event=deposited(false)
    expect(eventCitizenId(event)).toBeNull()
    expect(isHighlightEvent(event)).toBe(false)
    expect(filterChronicleEvents([event],{mode:'all',day:null,citizenId:'c01',categories:[]})).toEqual([])
  })

  it('attributes and highlights a spotted deposit',()=>{
    const event=deposited(true)
    expect(eventCitizenId(event)).toBe('c01')
    expect(isHighlightEvent(event)).toBe(true)
    expect(filterChronicleEvents([event],{mode:'highlights',day:null,citizenId:'c01',categories:[]})).toEqual([event])
  })

  it('only exposes the actor of a theft when the theft identified them',()=>{
    expect(eventCitizenId(stolen(false))).toBeNull()
    expect(eventCitizenId(stolen(true))).toBe('c01')
  })

  it('only exposes the actor of an intrusion when an Alarm identifies them',()=>{
    expect(eventCitizenId(intrusion(false))).toBeNull()
    expect(eventCitizenId(intrusion(true))).toBe('c01')
  })

  it('keeps always-identified pillage attributable',()=>{
    const event:GameEvent={type:'HOME_ITEM_PILLAGED',day:1,citizenId:'c01',targetCitizenId:'c02',item,spotted:true}
    expect(eventCitizenId(event)).toBe('c01')
    expect(isHighlightEvent(event)).toBe(true)
  })
})
