import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { createInitialGame } from '../src/core/game'
import { advanceOneHour, advanceToHour } from '../src/simulation/advanceTime'

const bots=new BasicBotController()

describe('gate safety with source-calibrated zombie routes',()=>{
  for(const seed of [3101,4202,5303,6404])it(`keeps the gate sealed for seed ${seed} across the first three attacks`,()=>{
    let game=createInitialGame(seed,40)
    for(let night=1;night<=3;night+=1){
      game=advanceToHour(game,0,bots,'c01')
      const townBots=game.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot'&&citizen.location.type==='town')
      const outside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world')
      const recentGateEvents=game.events.filter((event)=>event.type==='GATE_SET'&&event.day===game.day&&event.hour>=22)
      expect(game.town.gateOpen,`seed ${seed} night ${night}; town bots=${townBots.length}; AP=${townBots.map((citizen)=>citizen.ap).join(',')}; outside=${outside.map((citizen)=>citizen.id).join(',')}; gate events=${recentGateEvents.map((event)=>`${event.hour}:${event.open?'open':'closed'}:${event.citizenId}`).join('|')}`).toBe(false)
      game=advanceOneHour(game,bots,'c01')
    }
  },60_000)
})
