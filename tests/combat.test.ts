import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { runBotHour } from '../src/agents/runBotHour'
import { getLegalActions } from '../src/core/actions'
import { weaponDefinition } from '../src/core/combat'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { createItemInstance, NORMAL_SCAVENGE_LOOT_POOL } from '../src/core/items'
import type { GameCommand, GameState, ItemType } from '../src/core/types'
import { zoneControl, zoneKey } from '../src/core/world'

const bots = new BasicBotController()

function combatState(citizenId: string, zombies: number, items: ItemType[] = [], ap = 6): GameState {
  const game = createInitialGame(12345, 4)
  const key = zoneKey(1, 0)
  return {
    ...game,
    citizens: game.citizens.map((citizen) => citizen.id === citizenId
      ? {
          ...citizen,
          ap,
          location: { type: 'world', x: 1, y: 0 },
          inventory: items.map((type, index) => ({ id: `combat-${index}`, type })),
        }
      : citizen),
    world: {
      ...game.world,
      zones: {
        ...game.world.zones,
        [key]: { ...game.world.zones[key], discovered: true, zombies },
      },
    },
  }
}

function action<T extends GameCommand['type']>(game: GameState, citizenId: string, type: T): Extract<GameCommand,{type:T}> {
  const found = getLegalActions(game, citizenId).find((candidate) => candidate.type === type)
  if (!found) throw new Error(`Missing ${type}`)
  return found as Extract<GameCommand,{type:T}>
}

describe('World Beyond combat', () => {
  it('makes a Water Bomb a rare normal-zone weapon find', () => {
    expect(NORMAL_SCAVENGE_LOOT_POOL).toContain('water_bomb')
  })

  it('pins current MyHordes combat values for ordinary box-opening tools',()=>{
    const expected:Partial<Record<ItemType,[number,number,number,ItemType]>>={
      human_bone:[100,1,80,'broken_human_bone'],
      pathetic_penknife:[15,1,45,'broken_pathetic_penknife'],
      serrated_knife:[100,1,33,'broken_serrated_knife'],
      machete:[100,2,25,'broken_machete'],
      adjustable_spanner:[33,1,20,'broken_adjustable_spanner'],
      screwdriver:[20,1,40,'broken_screwdriver'],
      swiss_army_knife:[15,1,50,'broken_swiss_army_knife'],
      box_cutter:[60,1,70,'broken_box_cutter'],
      chain:[50,1,25,'broken_chain'],
      can_opener:[50,1,100,'broken_can_opener'],
      ektorp_gluten_chair:[50,1,50,'broken_ektorp_gluten_chair'],
      pc_base_unit:[100,1,50,'broken_pc_base_unit'],
    }
    for(const [type,[killChance,maxKills,breakChance,brokenType]] of Object.entries(expected) as Array<[ItemType,[number,number,number,ItemType]]>){
      const definition=weaponDefinition(type)
      expect(definition?.confidence,`${type} confidence`).toBe('confirmed')
      expect(definition?.killChancePercent,`${type} kill chance`).toBe(killChance)
      expect(definition?.maxKills,`${type} max kills`).toBe(maxKills)
      expect(definition?.breakChancePercent,`${type} break chance`).toBe(breakChance)
      expect(definition?.brokenType,`${type} broken type`).toBe(brokenType)
      expect(definition?.apCost,`${type} AP`).toBe(0)
      expect(definition?.requiresPositiveAp,`${type} exhausted restriction`).toBe(true)
    }
    expect(weaponDefinition('staff')?.confidence).toBe('approximate')
  })

  it('always breaks a Can Opener when it is used as a weapon',()=>{
    let game=combatState('c01',3,['can_opener'])
    game=executeCommand(game,action(game,'c01','USE_WEAPON')).state
    const opener=game.citizens[0].inventory.find((item)=>item.id==='combat-0')
    expect(opener?.type).toBe('broken_can_opener')
    expect(game.events.some((event)=>event.type==='COMBAT_RESOLVED'&&event.method==='can_opener'&&event.brokenInto==='broken_can_opener')).toBe(true)
  })

  it('uses a Water Bomb for 0 AP, consumes it, and kills between 1 and 5 zombies', () => {
    let game = combatState('c01', 5, ['water_bomb'])
    const beforeAp = game.citizens[0].ap
    game = executeCommand(game, action(game, 'c01', 'USE_WEAPON')).state
    const remaining = game.world.zones[zoneKey(1,0)].zombies
    expect(game.citizens[0].ap).toBe(beforeAp)
    expect(game.citizens[0].inventory).toHaveLength(0)
    expect(remaining).toBeGreaterThanOrEqual(0)
    expect(remaining).toBeLessThanOrEqual(4)
    expect(game.events.some((event) => event.type === 'COMBAT_RESOLVED' && event.method === 'water_bomb' && event.kills >= 1 && event.kills <= 5)).toBe(true)
  })

  it('depletes Water Pistol charges in place and disables the empty weapon',()=>{
    let game=combatState('c01',3)
    const pistol=createItemInstance('charged-pistol','water_pistol',{charges:2})
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[pistol]}:citizen)}
    const beforeAp=game.citizens[0].ap
    let use=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_WEAPON'&&candidate.itemId==='charged-pistol')
    expect(use).toBeTruthy()
    game=executeCommand(game,use!).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='charged-pistol')?.state?.charges).toBe(1)
    expect(game.citizens[0].ap).toBe(beforeAp)
    use=getLegalActions(game,'c01').find((candidate)=>candidate.type==='USE_WEAPON'&&candidate.itemId==='charged-pistol')
    expect(use).toBeTruthy()
    game=executeCommand(game,use!).state
    expect(game.citizens[0].inventory.find((item)=>item.id==='charged-pistol')?.state?.charges).toBe(0)
    expect(getLegalActions(game,'c01').some((candidate)=>candidate.type==='USE_WEAPON'&&candidate.itemId==='charged-pistol')).toBe(false)
  })

  it('does not allow ordinary weapon use while exhausted', () => {
    const game = combatState('c01', 3, ['water_bomb'], 0)
    const legal = getLegalActions(game, 'c01')
    expect(legal.some((candidate) => candidate.type === 'USE_WEAPON')).toBe(false)
    expect(legal.some((candidate) => candidate.type === 'ATTACK_BAREHANDED')).toBe(false)
  })

  it('charges 1 AP for bare-handed combat and records a deterministic 0-or-1 kill result', () => {
    const initial = combatState('c01', 3)
    const first = executeCommand(initial, action(initial, 'c01', 'ATTACK_BAREHANDED')).state
    const second = executeCommand(combatState('c01', 3), action(combatState('c01', 3), 'c01', 'ATTACK_BAREHANDED')).state
    const firstRemaining = first.world.zones[zoneKey(1,0)].zombies
    const secondRemaining = second.world.zones[zoneKey(1,0)].zombies
    expect(first.citizens[0].ap).toBe(5)
    expect([2,3]).toContain(firstRemaining)
    expect(secondRemaining).toBe(firstRemaining)
  })

  it('immediately restores movement when combat removes enough zombie control', () => {
    let game = combatState('c01', 3, ['water_bomb'])
    expect(zoneControl(game,1,0).trapped).toBe(true)
    game = executeCommand(game, action(game, 'c01', 'USE_WEAPON')).state
    expect(zoneControl(game,1,0).trapped).toBe(false)
    expect(getLegalActions(game,'c01').some((candidate) => candidate.type === 'MOVE')).toBe(true)
  })

  it('lets a trapped basic bot use a carried weapon instead of waiting helplessly', () => {
    const game = combatState('c02', 3, ['water_bomb'])
    const decision = bots.decide(game,'c02')
    expect(decision?.type).toBe('USE_WEAPON')
  })
})

describe('Temporary citizen control testing hook', () => {
  it('excludes the controlled basic-bot citizen from autonomous hourly activity', () => {
    const initial = createInitialGame(789,4)
    const controlledBefore = initial.citizens.find((citizen)=>citizen.id==='c02')!
    const game = runBotHour(initial,bots,'c02')
    const controlledAfter = game.citizens.find((citizen)=>citizen.id==='c02')!
    expect(controlledAfter.ap).toBe(controlledBefore.ap)
    expect(controlledAfter.location).toEqual(controlledBefore.location)
    expect(controlledAfter.inventory).toEqual(controlledBefore.inventory)
    expect(controlledAfter.home).toEqual(controlledBefore.home)
  })
})