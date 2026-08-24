import { describe, expect, it } from 'vitest'
import { CONSTRUCTION_CATALOG } from '../src/core/constructionCatalog'
import { createInitialGame } from '../src/core/game'
import {
  ACTIVE_CONSTRUCTION_UPGRADE_IDS,
  availableConstructionUpgradeProjects,
  canCitizenVoteForUpgrade,
  castAutonomousConstructionUpgradeVotes,
  castConstructionUpgradeVote,
  citizenUpgradeVote,
  constructionUpgradeLevel,
  constructionUpgradeVoteCounts,
  hasUpgradeProjectsFacility,
  pendingCompletedUpgradeProjects,
  resetConstructionUpgradeVotesForNewDay,
  resolveConstructionUpgradeVotesAtMidnight,
  upgradeVoteCountsVisible,
  workshopCreditedLabor,
} from '../src/core/constructionUpgrades'
import { totalTownDefense } from '../src/core/defense'
import type { ConstructionId, GameState } from '../src/core/types'
import { facilitySlots } from '../src/ui/navigation'

function complete(game:GameState,...ids:ConstructionId[]):GameState{
  const construction={...game.town.construction}
  for(const id of ids)construction[id]={...construction[id],discovered:true,completed:true}
  return{...game,town:{...game.town,construction}}
}
function hour(game:GameState,value:number):GameState{return{...game,clock:{hour:value,phase:'day'}}}

describe('Upgrade Projects facility and voting',()=>{
  it('appears as a facility once a completed source-upgrade project exists',()=>{
    const before=createInitialGame(101,4)
    expect(hasUpgradeProjectsFacility(before)).toBe(false)
    expect(facilitySlots(before).some((entry)=>entry?.id==='upgrade_projects')).toBe(false)
    const after=complete(before,'great_pit')
    expect(hasUpgradeProjectsFacility(after)).toBe(true)
    expect(facilitySlots(after).some((entry)=>entry?.id==='upgrade_projects')).toBe(true)
  })

  it('activates faithful tracks and leaves unsupported source tracks pending',()=>{
    expect(ACTIVE_CONSTRUCTION_UPGRADE_IDS).toEqual(expect.arrayContaining(['great_pit','upgradeable_wall','pump','workshop']))
    const unsupported=Object.values(CONSTRUCTION_CATALOG).find((entry)=>entry.hasUpgrade&&!ACTIVE_CONSTRUCTION_UPGRADE_IDS.includes(entry.id))
    expect(unsupported).toBeDefined()
    if(!unsupported)throw new Error('Expected at least one source upgrade track to remain pending')
    const game=complete(createInitialGame(102,4),unsupported.id)
    expect(pendingCompletedUpgradeProjects(game)).toContain(unsupported.id)
    expect(availableConstructionUpgradeProjects(game)).not.toContain(unsupported.id)
  })

  it('hides vote counts from a citizen until that citizen chooses',()=>{
    let game=complete(hour(createInitialGame(103,4),8),'great_pit')
    game=castAutonomousConstructionUpgradeVotes(game,'c01')
    expect(Object.values(constructionUpgradeVoteCounts(game)).reduce((sum,count)=>sum+(count??0),0)).toBeGreaterThan(0)
    expect(citizenUpgradeVote(game,'c01')).toBeNull()
    expect(upgradeVoteCountsVisible(game,'c01')).toBe(false)
    game=castConstructionUpgradeVote(game,'c01','great_pit')
    expect(citizenUpgradeVote(game,'c01')).toBe('great_pit')
    expect(upgradeVoteCountsVisible(game,'c01')).toBe(true)
  })

  it('allows one in-town vote per living citizen per day and locks the choice',()=>{
    let game=complete(createInitialGame(104,2),'great_pit','pump')
    expect(canCitizenVoteForUpgrade(game,'c01','great_pit')).toBe(true)
    game=castConstructionUpgradeVote(game,'c01','great_pit')
    expect(canCitizenVoteForUpgrade(game,'c01','pump')).toBe(false)
    const attemptedChange=castConstructionUpgradeVote(game,'c01','pump')
    expect(citizenUpgradeVote(attemptedChange,'c01')).toBe('great_pit')
    const outside={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c02'?{...citizen,location:{type:'world' as const,x:0,y:0}}:citizen)}
    expect(canCitizenVoteForUpgrade(outside,'c02','great_pit')).toBe(false)
  })
})

describe('daily upgrade resolution',()=>{
  it('applies Great Pit defense before the attack and records level 1',()=>{
    let game=complete(createInitialGame(201,2),'great_pit')
    const defenseBefore=totalTownDefense(game)
    game=castConstructionUpgradeVote(game,'c01','great_pit')
    game=resolveConstructionUpgradeVotesAtMidnight(game)
    expect(constructionUpgradeLevel(game,'great_pit')).toBe(1)
    expect(totalTownDefense(game)-defenseBefore).toBe(13)
  })

  it('applies the Pump one-time Well bonus',()=>{
    let game=complete(createInitialGame(202,2),'pump')
    const waterBefore=game.town.well.water
    game=castConstructionUpgradeVote(game,'c01','pump')
    game=resolveConstructionUpgradeVotesAtMidnight(game)
    expect(constructionUpgradeLevel(game,'pump')).toBe(1)
    expect(game.town.well.water).toBe(waterBefore+20)
  })

  it('implements the verified first Workshop vote as an 18 AP reduction on a 300 AP project',()=>{
    expect(workshopCreditedLabor(300,1)).toBe(18)
    let game=complete(createInitialGame(203,2),'workshop')
    const target=Object.entries(game.town.construction).find(([id,project])=>id!=='workshop'&&!project.completed)!
    const [targetId,targetProject]=target as [ConstructionId,GameState['town']['construction'][ConstructionId]]
    const before=targetProject.apContributed
    game=castConstructionUpgradeVote(game,'c01','workshop')
    game=resolveConstructionUpgradeVotesAtMidnight(game)
    expect(constructionUpgradeLevel(game,'workshop')).toBe(1)
    expect(game.town.construction[targetId].completed).toBe(false)
    expect(game.town.construction[targetId].apContributed).toBeGreaterThanOrEqual(before)
  })

  it('stops offering a project after level five',()=>{
    let game=complete(createInitialGame(204,2),'great_pit')
    for(let level=0;level<5;level+=1){
      game=castConstructionUpgradeVote(game,'c01','great_pit')
      game=resolveConstructionUpgradeVotesAtMidnight(game)
      game=resetConstructionUpgradeVotesForNewDay({...game,day:game.day+1})
    }
    expect(constructionUpgradeLevel(game,'great_pit')).toBe(5)
    expect(availableConstructionUpgradeProjects(game)).not.toContain('great_pit')
  })

  it('resolves a no-vote day without inventing an upgrade',()=>{
    const game=complete(createInitialGame(205,2),'great_pit')
    const resolved=resolveConstructionUpgradeVotesAtMidnight(game)
    expect(constructionUpgradeLevel(resolved,'great_pit')).toBe(0)
  })
})
