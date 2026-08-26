import { weaponDefinition } from '../../core/combat'
import type { Citizen, Direction, GameCommand, GameState } from '../../core/types'
import { citizensInZone, departureWouldLoseControl } from '../../core/world'
import { citizenNumber } from '../AgentIdentity'
import { nextDirectionToward } from '../planning/RoutePlanner'
import { itemAction, pick } from './actionSelectors'

export function stepTowardTown(state: GameState, citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  if (citizen.location.type !== 'world') return null
  if (citizen.location.x === 0 && citizen.location.y === 0) return pick(actions, 'ENTER_TOWN')
  const direction = nextDirectionToward(state, { x: citizen.location.x, y: citizen.location.y }, { x: 0, y: 0 },citizen.id)
  return direction
    ? actions.find((action) => action.type === 'MOVE' && action.direction === direction) ?? null
    : null
}

export function bestWeaponAction(citizen: Citizen, actions: GameCommand[]): GameCommand | null {
  const options = citizen.inventory
    .map((item) => ({ item, definition: weaponDefinition(item.type) }))
    .filter((candidate) => candidate.definition)
    .sort((a, b) =>
      (b.definition!.killChancePercent * b.definition!.maxKills)
      - (a.definition!.killChancePercent * a.definition!.maxKills))

  for (const option of options) {
    const action = itemAction(actions, 'USE_WEAPON', option.item.id)
    if (action) return action
  }
  return null
}

function vulnerability(citizen:Citizen):number{
  const hydration=citizen.status.hydration==='dehydrated'?0:citizen.status.hydration==='thirsty'?1:2
  return hydration*100+citizen.ap*10+citizenNumber(citizen.id)
}

export function shouldLeadFragileDeparture(state:GameState,citizen:Citizen):boolean{
  if(citizen.location.type!=='world'||!departureWouldLoseControl(state,citizen.id))return false
  const residents=citizensInZone(state,citizen.location.x,citizen.location.y)
  // Autonomous citizens never deliberately create a grace-only state around a human
  // who has already yielded control to the hourly simulation.
  if(citizen.controller==='basic-bot'&&residents.some((resident)=>resident.controller==='human'&&resident.id!==citizen.id))return false
  const ranked=[...residents].sort((a,b)=>{
    const aRescue=state.botMissions[a.id]?.role==='rescue'?1:0
    const bRescue=state.botMissions[b.id]?.role==='rescue'?1:0
    return aRescue-bRescue||vulnerability(a)-vulnerability(b)
  })
  return ranked[0]?.id===citizen.id
}

export function controlAwareMove(
  state:GameState,
  citizen:Citizen,
  actions:GameCommand[],
  direction:Direction,
  allowGraceDeparture:boolean,
):GameCommand|null{
  const move=actions.find((action)=>action.type==='MOVE'&&action.direction===direction)??null
  if(!move)return null
  if(!departureWouldLoseControl(state,citizen.id))return move
  const weapon=bestWeaponAction(citizen,actions)
  if(weapon)return weapon
  return allowGraceDeparture&&shouldLeadFragileDeparture(state,citizen)?move:null
}

export function controlAwareStepTowardTown(state:GameState,citizen:Citizen,actions:GameCommand[]):GameCommand|null{
  if(citizen.location.type!=='world')return null
  if(citizen.location.x===0&&citizen.location.y===0)return pick(actions,'ENTER_TOWN')
  const direction=nextDirectionToward(state,{x:citizen.location.x,y:citizen.location.y},{x:0,y:0},citizen.id)
  return direction?controlAwareMove(state,citizen,actions,direction,true):null
}
