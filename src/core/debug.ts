import { CONSTRUCTIONS, completionWaterBonus, revealsAllTerrain } from './construction'
import { CONSTRUCTION_CATALOG } from './constructionCatalog'
import { DEBUG_GOD_AP, clearGodProtectedStatus, enforceGodCitizen, enforceGodMode, isGodCitizen, type DebugGodCitizen } from './debugGod'
import { createItemInstance } from './items'
import type { ConstructionId, Direction, GameState, ItemType } from './types'
import { getZone, moveCoordinates, zoneKey } from './world'

/** Development-only state repair used by the compact debug controls. */
export function debugRefreshCitizen(game:GameState,citizenId:string):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive)return game
  return enforceGodMode({
    ...game,
    citizens:game.citizens.map((candidate)=>candidate.id===citizenId?{
      ...candidate,
      ap:candidate.maxAp,
      status:{...candidate.status,hydration:'normal' as const,desertStepsToday:0},
    }:candidate),
  })
}

/** Toggle the controlled citizen's debug-only God state. */
export function debugToggleGod(game:GameState,citizenId:string):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive)return game
  return{
    ...game,
    citizens:game.citizens.map((candidate)=>{
      if(candidate.id!==citizenId)return candidate
      const debugCitizen=candidate as DebugGodCitizen
      if(isGodCitizen(candidate)){
        const baseMax=debugCitizen.debugGodBaseMaxAp??(candidate.maxAp===DEBUG_GOD_AP?6:candidate.maxAp)
        return{
          ...candidate,
          debugGod:false,
          debugGodBaseMaxAp:baseMax,
          maxAp:baseMax,
          ap:baseMax,
          status:clearGodProtectedStatus(candidate.status),
        } as DebugGodCitizen
      }
      return enforceGodCitizen({
        ...candidate,
        debugGod:true,
        debugGodBaseMaxAp:candidate.maxAp,
      } as DebugGodCitizen)
    }),
  }
}

/** Spawn a runtime item directly into a living citizen's rucksack, bypassing capacity and acquisition rules. */
export function debugSummonItem(game:GameState,citizenId:string,type:ItemType):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive)return game
  const item=createItemInstance(`i${String(game.nextItemId).padStart(6,'0')}`,type)
  return enforceGodMode({
    ...game,
    nextItemId:game.nextItemId+1,
    citizens:game.citizens.map((candidate)=>candidate.id===citizenId?{...candidate,inventory:[...candidate.inventory,item]}:candidate),
  })
}

/** Debug-only movement escape hatch for God citizens in zombie-controlled zones. */
export function debugGodMove(game:GameState,citizenId:string,direction:Direction):GameState{
  const citizen=game.citizens.find((candidate)=>candidate.id===citizenId)
  if(!citizen?.alive||!isGodCitizen(citizen)||citizen.location.type!=='world'||game.clock.phase!=='day')return game
  const target=moveCoordinates(citizen.location.x,citizen.location.y,direction)
  const targetZone=getZone(game.world,target.x,target.y)
  if(!targetZone)return game
  const key=zoneKey(target.x,target.y)
  return enforceGodMode({
    ...game,
    citizens:game.citizens.map((candidate)=>candidate.id===citizenId?{
      ...candidate,
      location:{type:'world' as const,x:target.x,y:target.y},
      temporaryControl:null,
      relativeControl:null,
      camping:{...candidate.camping,hidden:false,survivalChance:null,hiddenDay:null},
    }:candidate),
    world:{
      ...game.world,
      zones:{...game.world.zones,[key]:{...targetZone,discovered:true}},
      intel:{...game.world.intel,[key]:{observedZombies:targetZone.zombies,lastObservedDay:game.day,lastObservedHour:game.clock.hour}},
    },
  })
}

function constructionBuildOrder(projectId:ConstructionId):ConstructionId[]{
  const ordered:ConstructionId[]=[]
  const seen=new Set<ConstructionId>()
  const visit=(id:ConstructionId):void=>{
    if(seen.has(id))return
    seen.add(id)
    const dependencies=new Set<ConstructionId>(CONSTRUCTIONS[id].prerequisites)
    const parentId=CONSTRUCTION_CATALOG[id].parentId
    if(parentId)dependencies.add(parentId)
    for(const prerequisite of dependencies)visit(prerequisite)
    ordered.push(id)
  }
  visit(projectId)
  return ordered
}

/** Instantly completes a construction and its full prerequisite/parent chain without spending AP or materials. */
export function debugInstantBuild(game:GameState,projectId:ConstructionId):GameState{
  const ordered=constructionBuildOrder(projectId)
  const newlyBuilt=ordered.filter((id)=>!game.town.construction[id].completed)
  if(!newlyBuilt.length)return game
  const construction={...game.town.construction}
  for(const id of ordered){
    const project=construction[id]
    construction[id]={...project,discovered:true,apContributed:CONSTRUCTIONS[id].apCost,completed:true}
  }
  const newlyBuiltSet=new Set(newlyBuilt)
  const waterBonus=newlyBuilt.reduce((sum,id)=>sum+completionWaterBonus(id),0)
  const revealTerrain=newlyBuilt.some((id)=>revealsAllTerrain(id))
  const zones=revealTerrain?Object.fromEntries(Object.entries(game.world.zones).map(([key,zone])=>[key,{...zone,discovered:true}])):game.world.zones
  return enforceGodMode({
    ...game,
    coordination:{commitments:game.coordination.commitments.filter((commitment)=>!commitment.projectId||!newlyBuiltSet.has(commitment.projectId))},
    town:{
      ...game.town,
      well:{water:game.town.well.water+waterBonus},
      construction,
    },
    world:zones===game.world.zones?game.world:{...game.world,zones},
  })
}
