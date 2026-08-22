import { it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { createInitialGame } from '../src/core/game'
import { zoneControl, zoneKey } from '../src/core/world'
import { advanceOneHour } from '../src/simulation/advanceTime'

it('trace rescue',()=>{const bots=new BasicBotController();let game=createInitialGame(123,4);game=executeCommand(game,getLegalActions(game,'c01').find(a=>a.type==='OPEN_GATE')!).state;game=executeCommand(game,getLegalActions(game,'c01').find(a=>a.type==='EXIT_TOWN')!).state;for(let i=0;i<2;i+=1)game=executeCommand(game,getLegalActions(game,'c01').find(a=>a.type==='MOVE'&&a.direction==='EAST')!).state;const key=zoneKey(2,0);game={...game,world:{...game.world,zones:{...game.world.zones,[key]:{...game.world.zones[key],zombies:3}}}};const before=game.events.length;game=advanceOneHour(game,bots,'c01');console.log('RESCUE TRACE',JSON.stringify({missions:game.botMissions,citizens:game.citizens.map(c=>({id:c.id,ap:c.ap,location:c.location})),events:game.events.slice(before),control:zoneControl(game,2,0)},null,2))})
