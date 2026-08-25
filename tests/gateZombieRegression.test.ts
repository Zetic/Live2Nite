import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { gateBackupCitizenId, gatePrimaryCitizenId } from '../src/agents/coordination/TownCoordination'
import { gateAutoCloseAtHour } from '../src/core/construction'
import { createInitialGame } from '../src/core/game'
import { advanceOneHour } from '../src/simulation/advanceTime'

const bots=new BasicBotController()

describe('gate safety with source-calibrated zombie routes',()=>{
  for(const seed of [3101,4202,5303,6404])it(`keeps the gate sealed for seed ${seed} across the first three attacks`,()=>{
    let game=createInitialGame(seed,40)
    for(let night=1;night<=3;night+=1){
      const trace:string[]=[]
      while(game.clock.hour!==0){
        const beforeEvents=game.events.length
        const hour=game.clock.hour
        game=advanceOneHour(game,bots,'c01')
        if(seed===3101&&night===2){
          const gateEvents=game.events.slice(beforeEvents).filter((event)=>event.type==='GATE_SET')
          const primary=gatePrimaryCitizenId(game)
          const backup=gateBackupCitizenId(game)
          const p=primary?game.citizens.find((citizen)=>citizen.id===primary):null
          const b=backup?game.citizens.find((citizen)=>citizen.id===backup):null
          const outside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world').map((citizen)=>citizen.id)
          trace.push(`h${hour}->${game.clock.hour} gate=${game.town.gateOpen?'O':'C'} auto23=${gateAutoCloseAtHour(game,23)?'Y':'N'} p=${primary??'-'}:${p?.ap??'-'} b=${backup??'-'}:${b?.ap??'-'} out=${outside.join(',')||'-'} gateEvents=${gateEvents.map((event)=>`${event.open?'O':'C'}:${event.citizenId}`).join(',')||'-'}`)
        }
      }
      const townBots=game.citizens.filter((citizen)=>citizen.alive&&citizen.controller==='basic-bot'&&citizen.location.type==='town')
      const outside=game.citizens.filter((citizen)=>citizen.alive&&citizen.location.type==='world')
      const completed=Object.values(game.town.construction).filter((project)=>project.completed).map((project)=>project.id)
      expect(game.town.gateOpen,`seed ${seed} night ${night}; town bots=${townBots.length}; AP=${townBots.map((citizen)=>citizen.ap).join(',')}; outside=${outside.map((citizen)=>citizen.id).join(',')}; completed=${completed.join(',')}; trace=${trace.join(' || ')}`).toBe(false)
      game=advanceOneHour(game,bots,'c01')
    }
  },60_000)
})
