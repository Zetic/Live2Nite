import type { ItemActionEffect } from './itemEffects'

export type WorldStatusActionId='flee_zombies'
export interface WorldStatusActionDefinition{
  id:WorldStatusActionId
  label:string
  detail:string
  effects:readonly ItemActionEffect[]
  source:'MYHORDES_CURRENT'
}

export const WORLD_STATUS_ACTIONS:Record<WorldStatusActionId,WorldStatusActionDefinition>={
  flee_zombies:{
    id:'flee_zombies',
    label:'Flee from Zombies',
    detail:'While trapped by zombie control, accept a guaranteed random body-part wound to gain personal relative control and escape the zone. Productive actions stay blocked until real control returns.',
    effects:[{type:'inflict_wound'}],
    source:'MYHORDES_CURRENT',
  },
}
