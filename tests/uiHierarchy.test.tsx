import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { createInitialGame } from '../src/core/game'
import type { GameEvent } from '../src/core/types'
import { CitizenStatusBar } from '../src/ui/components/CitizenStatusBar'
import { registerEntryTone } from '../src/ui/components/ContextRegister'
import { TownBulletin } from '../src/ui/components/TownBulletin'
import { WellView } from '../src/ui/components/WellView'

describe('compact player HUD',()=>{
  it('shows the rucksack while omitting inactive placeholder statuses',()=>{
    const game=createInitialGame(7201,2,'scout')
    const markup=renderToStaticMarkup(<CitizenStatusBar citizen={game.citizens[0]}/>)
    expect(markup).toContain('Rucksack')
    expect(markup).toContain('Town Uniform')
    expect(markup).toContain('Camouflage Suit')
    expect(markup).toContain('Statuses')
    expect(markup).not.toContain('Hydrated')
    expect(markup).not.toContain('Ready')
    expect(markup).not.toContain('Food unused')
    expect(markup).not.toContain('Water unused')
    expect(markup).not.toContain('Town Uniform · locked')
    expect(markup).not.toContain('Profession Item · locked')
  })

  it('renders only statuses the citizen actually has',()=>{
    const game=createInitialGame(7202,1,'survivalist')
    const base=game.citizens[0]
    const citizen={...base,ap:0,daily:{...base.daily,ate:true},status:{...base.status,hydration:'thirsty' as const,wound:'leg' as const}}
    const markup=renderToStaticMarkup(<CitizenStatusBar citizen={citizen}/>)
    expect(markup).toContain('Exhausted')
    expect(markup).toContain('Fed')
    expect(markup).toContain('Thirsty')
    expect(markup).toContain('Wounded · Leg')
    expect(markup).not.toContain('Refreshed')
  })
})

describe('town UI hierarchy',()=>{
  it('places the former persistent town overview values in the Town Bulletin',()=>{
    const game=createInitialGame(7203,3,'guardian')
    const markup=renderToStaticMarkup(<TownBulletin game={game}/>)
    for(const label of ['Population','Outside','Well water','Town defense','Gate'])expect(markup).toContain(label)
  })

  it('keeps the Well focused on reserve amount and water handling',()=>{
    const game=createInitialGame(7204,1,'technician')
    const markup=renderToStaticMarkup(<WellView game={game} citizenId="c01" legalActions={getLegalActions(game,'c01')} act={()=>{}}/>)
    expect(markup).toContain('Take ration')
    expect(markup).toContain('Water Rations')
    expect(markup).not.toContain('Water refresh')
    expect(markup).not.toContain('Rucksack')
    expect(markup).not.toContain('Well withdrawals reset')
  })

  it('marks Bank withdrawals and only extra Well withdrawals suspicious',()=>{
    const withdrawn={type:'ITEM_WITHDRAWN',day:1,hour:2,citizenId:'c01',item:{id:'test-withdraw',type:'battery'}} as GameEvent
    const deposited={type:'ITEM_DEPOSITED',day:1,hour:2,citizenId:'c01',item:{id:'test-deposit',type:'battery'}} as GameEvent
    const normalWater={type:'WATER_TAKEN',day:1,hour:2,citizenId:'c01',item:{id:'water-1',type:'water_ration'},extra:false} as GameEvent
    const extraWater={type:'WATER_TAKEN',day:1,hour:2,citizenId:'c01',item:{id:'water-2',type:'water_ration'},extra:true} as GameEvent
    expect(registerEntryTone(withdrawn)).toBe('suspicious')
    expect(registerEntryTone(deposited)).toBeNull()
    expect(registerEntryTone(normalWater)).toBeNull()
    expect(registerEntryTone(extraWater)).toBe('suspicious')
  })
})
