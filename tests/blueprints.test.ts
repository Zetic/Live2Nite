import { describe, expect, it } from 'vitest'
import { BasicBotController } from '../src/agents/BasicBotController'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTION_ORDER, blueprintEligibleProjects, constructionBlueprintTier, constructionUnlocked } from '../src/core/construction'
import { createInitialGame, resolveNight } from '../src/core/game'
import { createItemInstance } from '../src/core/items'
import type { ConstructionId, GameState, ItemType, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'

function withBlueprint(game:GameState,type:Extract<ItemType,'common_blueprint'|'uncommon_blueprint'|'rare_blueprint'|'very_rare_blueprint'>):GameState{
  const item=createItemInstance('test-blueprint',type)
  return{...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[item]}:citizen)}
}
function readBlueprint(game:GameState){
  const command=getLegalActions(game,'c01').find((action)=>action.type==='READ_BLUEPRINT')
  expect(command).toBeTruthy()
  return executeCommand(game,command!)
}
function markTierKnown(game:GameState,tier:number,except:ConstructionId[]=[]):GameState{
  const excluded=new Set(except)
  const construction={...game.town.construction}
  for(const id of CONSTRUCTION_ORDER)if(constructionBlueprintTier(id)===tier&&!excluded.has(id))construction[id]={...construction[id],discovered:true}
  return{...game,town:{...game.town,construction}}
}
function campAtSyntheticRuin(game:GameState,x:number,y:number,options:{buried?:boolean;blueprintFound?:boolean;survivalChance?:number}={}):GameState{
  const template=Object.values(game.world.zones).find((zone)=>zone.specialSite)
  if(!template?.specialSite)throw new Error('Expected generated special site')
  const key=zoneKey(x,y)
  const zone:WorldZone={
    ...(game.world.zones[key]??template),
    x,y,discovered:true,zombies:0,groundItems:[],campImprovements:0,
    specialSite:{...template.specialSite,status:options.buried?'buried':'accessible',excavationProgress:template.specialSite.excavationRequired,hiddenLoot:[],searchedBy:[],blueprintFound:options.blueprintFound??false},
  }
  return{
    ...game,
    clock:{hour:0,phase:'attack'},
    world:{...game.world,zones:{...game.world.zones,[key]:zone}},
    citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x,y},camping:{...citizen.camping,hidden:true,hiddenDay:game.day,survivalChance:options.survivalChance??100}}:citizen),
  }
}

describe('construction blueprints',()=>{
  it('maps the four carried blueprint grades to construction tiers 1 through 4',()=>{
    const mapping=[
      ['common_blueprint',1],
      ['uncommon_blueprint',2],
      ['rare_blueprint',3],
      ['very_rare_blueprint',4],
    ] as const
    for(const[type,tier]of mapping){
      let game=withBlueprint(createInitialGame(3700+tier,1),type)
      const before=CONSTRUCTION_ORDER.filter((id)=>game.town.construction[id].discovered)
      const result=readBlueprint(game)
      const read=result.events.find((event)=>event.type==='BLUEPRINT_READ')
      expect(read?.projectId).not.toBeNull()
      expect(read?.projectId&&constructionBlueprintTier(read.projectId)).toBe(tier)
      const after=CONSTRUCTION_ORDER.filter((id)=>result.state.town.construction[id].discovered)
      expect(after.length).toBeGreaterThan(before.length)
    }
  })

  it('reveals exactly one random eligible project from the requested tier',()=>{
    let game=withBlueprint(createInitialGame(3710,1),'common_blueprint')
    const candidates=blueprintEligibleProjects(game,1)
    expect(candidates.length).toBeGreaterThan(1)
    const result=readBlueprint(game)
    const selected=result.events.find((event)=>event.type==='BLUEPRINT_READ')?.projectId
    expect(selected).toBeTruthy()
    expect(candidates).toContain(selected)
    const newlyKnown=candidates.filter((id)=>result.state.town.construction[id].discovered)
    expect(newlyKnown).toEqual([selected])
    expect(result.state.citizens[0].inventory.some((item)=>item.type==='common_blueprint')).toBe(false)
  })

  it('allows a known but unfinished parent site to make its blueprint child eligible, while still blocking work',()=>{
    let game=createInitialGame(3711,1)
    game=markTierKnown(game,1,['bastion'])
    expect(game.town.construction.wall_upgrade.discovered).toBe(true)
    expect(game.town.construction.wall_upgrade.completed).toBe(false)
    expect(blueprintEligibleProjects(game,1)).toEqual(['bastion'])
    game=withBlueprint(game,'common_blueprint')
    game=readBlueprint(game).state
    expect(game.town.construction.bastion.discovered).toBe(true)
    expect(constructionUnlocked(game,'bastion')).toBe(false)
    game={...game,town:{...game.town,construction:{...game.town.construction,wall_upgrade:{...game.town.construction.wall_upgrade,completed:true,hp:25}}}}
    expect(constructionUnlocked(game,'bastion')).toBe(true)
  })

  it('consumes a blueprint even when no eligible project remains',()=>{
    let game=markTierKnown(createInitialGame(3712,1),1)
    game=withBlueprint(game,'common_blueprint')
    const result=readBlueprint(game)
    expect(result.events.find((event)=>event.type==='BLUEPRINT_READ')).toMatchObject({projectId:null})
    expect(result.state.citizens[0].inventory).toHaveLength(0)
  })

  it('cannot read a blueprint outside town',()=>{
    let game=withBlueprint(createInitialGame(3713,1),'common_blueprint')
    game={...game,citizens:game.citizens.map((citizen)=>({...citizen,location:{type:'world' as const,x:1,y:0}}))}
    expect(getLegalActions(game,'c01').some((action)=>action.type==='READ_BLUEPRINT')).toBe(false)
  })

  it('drops an Uncommon blueprint on the ruin floor after a successful camp under 10 km',()=>{
    let game=campAtSyntheticRuin(createInitialGame(3720,1),6,6)
    const key=zoneKey(6,6)
    game=resolveNight(game)
    expect(game.world.zones[key].specialSite?.blueprintFound).toBe(true)
    expect(game.world.zones[key].groundItems.map((item)=>item.type)).toContain('uncommon_blueprint')
    expect(game.events.some((event)=>event.type==='CAMPING_BLUEPRINT_DROPPED'&&event.distanceKm===8)).toBe(true)
  })

  it('uses rounded Euclidean distance and drops a Rare blueprint at 10 km or farther',()=>{
    let game=campAtSyntheticRuin(createInitialGame(3721,1),10,0)
    const key=zoneKey(10,0)
    game=resolveNight(game)
    expect(game.world.zones[key].groundItems.map((item)=>item.type)).toContain('rare_blueprint')
    expect(game.events.some((event)=>event.type==='CAMPING_BLUEPRINT_DROPPED'&&event.distanceKm===10)).toBe(true)
  })

  it('does not award a ruin blueprint when buried, when camping fails, or after it was already found',()=>{
    for(const setup of [
      {seed:3722,buried:true,survivalChance:100,blueprintFound:false},
      {seed:3723,buried:false,survivalChance:0,blueprintFound:false},
      {seed:3724,buried:false,survivalChance:100,blueprintFound:true},
    ]){
      let game=campAtSyntheticRuin(createInitialGame(setup.seed,1),6,0,setup)
      game=resolveNight(game)
      expect(game.events.some((event)=>event.type==='CAMPING_BLUEPRINT_DROPPED')).toBe(false)
    }
  })

  it('has town bots study a recovered blueprint before ordinary unloading',()=>{
    const bot=new BasicBotController()
    const game=withBlueprint(createInitialGame(3730,2),'common_blueprint')
    expect(bot.decide(game,'c01')?.type).toBe('READ_BLUEPRINT')
  })
})
