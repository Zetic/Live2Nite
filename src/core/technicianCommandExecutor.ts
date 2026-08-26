import { CONSTRUCTION_AP_COST, getLegalActions } from './actions'
import { executeCommand, InvalidCommandError, type CommandResult } from './commands'
import { CONSTRUCTIONS } from './construction'
import { applyEvents } from './events'
import {
  TECHNICIAN_REPAIR_CP_COST,
  applyTechnicianEventMeta,
  isTechnicianRepairCommand,
  resolveTechnicianRepair,
  technicianPayment,
  technicianWorkbenchCost,
  workbenchOutput,
  type TechnicianCombinationEvent,
  type TechnicianConstructionEvent,
  type TechnicianWorkshopEvent,
} from './technician'
import type { GameCommand, GameEvent, GameState } from './types'
import { WORKSHOP_RECIPES, resolveWorkshopRecipeOutput, workshopRecipeApCost, workshopRecipeInputItemIds } from './workshop'

function commandMatches(left:GameCommand,right:GameCommand):boolean{
  if(left.type!==right.type||left.citizenId!==right.citizenId)return false
  if(left.type==='CONTRIBUTE_CONSTRUCTION'&&right.type==='CONTRIBUTE_CONSTRUCTION')return left.projectId===right.projectId
  if(left.type==='WORKSHOP_CONVERT'&&right.type==='WORKSHOP_CONVERT')return left.recipeId===right.recipeId&&workbenchOutput(left)===workbenchOutput(right)
  if(left.type==='COMBINE_ITEMS'&&right.type==='COMBINE_ITEMS')return left.recipeId===right.recipeId&&left.itemIds.length===right.itemIds.length&&left.itemIds.every((id,index)=>id===right.itemIds[index])
  return false
}
function requireTechnicianLegal(state:GameState,command:GameCommand):void{
  if(!getLegalActions(state,command.citizenId).some((candidate)=>commandMatches(candidate,command)))throw new InvalidCommandError(`Illegal ${command.type} action for ${command.citizenId}`)
}
function finish(state:GameState,events:GameEvent[]):CommandResult{
  const stamped=events.map((event)=>({...event,hour:state.clock.hour})) as GameEvent[]
  let next=applyEvents(state,stamped)
  for(const event of stamped)next=applyTechnicianEventMeta(next,event)
  return{state:next,events:stamped}
}

/**
 * Technician is the only profession that changes the payment currency of otherwise-generic
 * construction and Workshop commands. Keep those overrides here so every non-Technician
 * command continues through the established command engine unchanged.
 */
export function executeCommandWithTechnician(state:GameState,command:GameCommand):CommandResult{
  const citizen=state.citizens.find((candidate)=>candidate.id===command.citizenId)
  if(!citizen)return executeCommand(state,command)

  if(command.type==='CONTRIBUTE_CONSTRUCTION'){
    requireTechnicianLegal(state,command)
    const definition=CONSTRUCTIONS[command.projectId],project=state.town.construction[command.projectId]
    const amount=Math.min(CONSTRUCTION_AP_COST,definition.apCost-project.apContributed)
    const payment=technicianPayment(citizen,amount)
    const events:GameEvent[]=[]
    if(payment.ap>0)events.push({type:'AP_SPENT',day:state.day,citizenId:citizen.id,amount:payment.ap})
    events.push({type:'CONSTRUCTION_AP_CONTRIBUTED',day:state.day,citizenId:citizen.id,projectId:command.projectId,amount,technicianPointsSpent:payment.cp} as TechnicianConstructionEvent)
    if(project.apContributed+amount>=definition.apCost)events.push({type:'CONSTRUCTION_COMPLETED',day:state.day,citizenId:citizen.id,projectId:command.projectId,consumed:definition.resources,defenseBonus:0})
    return finish(state,events)
  }

  if(command.type==='WORKSHOP_CONVERT'){
    requireTechnicianLegal(state,command)
    const recipe=WORKSHOP_RECIPES[command.recipeId]
    const selected=workbenchOutput(command)
    const ordinaryCost=workshopRecipeApCost(state,command.recipeId,citizen.id)
    const cost=selected?technicianWorkbenchCost(citizen,ordinaryCost):ordinaryCost
    const payment=technicianPayment(citizen,cost)
    const inputItemIds=workshopRecipeInputItemIds(state,command.recipeId)
    const normal=selected?null:resolveWorkshopRecipeOutput(state.rngState,command.recipeId)
    const chosen=selected?recipe.outcomes?.find((outcome)=>outcome.output===selected):null
    if(selected&&!chosen)throw new InvalidCommandError(`${selected} is not a selectable output for ${command.recipeId}`)
    const events:GameEvent[]=[]
    if(payment.ap>0)events.push({type:'AP_SPENT',day:state.day,citizenId:citizen.id,amount:payment.ap})
    events.push({
      type:'WORKSHOP_CONVERTED',day:state.day,citizenId:citizen.id,recipeId:command.recipeId,input:recipe.input,inputCount:recipe.inputCount,inputItemIds,
      output:chosen?.output??normal!.output,outputCount:chosen?.outputCount??normal!.outputCount,
      outputState:selected?undefined:normal!.outputState,preserveInputId:selected?undefined:normal!.preserveInputId,rngStateAfter:selected?undefined:normal!.rngStateAfter,
      technicianPointsSpent:payment.cp,technicianWorkbenchUsed:Boolean(selected),workbenchOutput:selected??undefined,
    } as TechnicianWorkshopEvent)
    return finish(state,events)
  }

  if(command.type==='COMBINE_ITEMS'&&isTechnicianRepairCommand(citizen,command)){
    requireTechnicianLegal(state,command)
    const resolved=resolveTechnicianRepair(citizen,command)
    return finish(state,[{
      type:'ITEMS_COMBINED',day:state.day,citizenId:citizen.id,recipeId:command.recipeId,consumedItemIds:resolved.consumedItemIds,outputs:resolved.outputs,createdCount:resolved.createdCount,
      technicianPointsSpent:TECHNICIAN_REPAIR_CP_COST,technicianWrenchRepair:true,
    } as TechnicianCombinationEvent])
  }

  return executeCommand(state,command)
}
