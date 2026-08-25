import { describe, expect, it } from 'vitest'
import { getLegalActions } from '../src/core/actions'
import { executeCommand } from '../src/core/commands'
import { CONSTRUCTION_CATALOG } from '../src/core/constructionCatalog'
import { EXPLORABLE_BLUEPRINT_POOLS, EXPLORABLE_BLUEPRINT_SOURCE_WEIGHTS, explorableBlueprintEligibleProjects } from '../src/core/explorableBlueprints'
import { createInitialGame } from '../src/core/game'
import { RUIN_IDS } from '../src/core/ruinIds'
import { RUIN_SOURCE_DROPS, ruinSourceDrops } from '../src/core/ruinLoot'
import type { ConstructionId, GameState, ItemInstance, WorldZone } from '../src/core/types'
import { zoneKey } from '../src/core/world'
import { migrateStoredGame } from '../src/persistence/IndexedDbGameRepository'

function withExplorableHospital(game:GameState):GameState{
  const x=1,y=0,key=zoneKey(x,y),base=game.world.zones[key]
  const zone:WorldZone={
    ...base,x,y,discovered:true,zombies:0,groundItems:[],
    specialSite:{
      type:'abandoned_hospital',
      status:'accessible',excavationRequired:0,excavationProgress:0,
      hiddenLoot:['uncommon_blueprint'],searchedBy:[],blueprintFound:false,
    },
  }
  return{...game,world:{...game.world,zones:{...game.world.zones,[key]:zone}},citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'world' as const,x,y},inventory:[]}:citizen)}
}

function withOnlySpecializedCandidate(game:GameState,target:ConstructionId):GameState{
  const pool=EXPLORABLE_BLUEPRINT_POOLS.hospital_uncommon
  const construction={...game.town.construction}
  for(const id of pool){
    const parentId=CONSTRUCTION_CATALOG[id].parentId
    if(parentId)construction[parentId]={...construction[parentId],discovered:true}
    construction[id]={...construction[id],discovered:id!==target}
  }
  return{...game,town:{...game.town,construction}}
}

describe('exact ruin loot and explorable ruins',()=>{
  it('has an exact weighted source table for every gameplay ruin',()=>{
    expect(Object.keys(RUIN_SOURCE_DROPS)).toHaveLength(RUIN_IDS.length)
    for(const id of RUIN_IDS)expect(ruinSourceDrops(id).length).toBeGreaterThan(0)
    expect(ruinSourceDrops('old_hydraulic_pump')).toEqual(expect.arrayContaining([
      {sourceRef:'jerrycan_#00',weight:60},
      {sourceRef:'oilcan_#00',weight:6},
    ]))
    expect(ruinSourceDrops('old_police_station')).toContainEqual({sourceRef:'drug_hero_#00',weight:10})
  })

  it('keeps the source 800/400/200 specialized blueprint weighting in all explorable families',()=>{
    expect(EXPLORABLE_BLUEPRINT_SOURCE_WEIGHTS).toEqual({uncommon:800,rare:400,exceptional:200})
    expect(ruinSourceDrops('abandoned_hotel')).toEqual(expect.arrayContaining([
      {sourceRef:'hbplan_u_#00',weight:800},{sourceRef:'hbplan_r_#00',weight:400},{sourceRef:'hbplan_e_#00',weight:200},
    ]))
    expect(ruinSourceDrops('abandoned_bunker')).toEqual(expect.arrayContaining([
      {sourceRef:'bbplan_u_#00',weight:800},{sourceRef:'bbplan_r_#00',weight:400},{sourceRef:'bbplan_e_#00',weight:200},
    ]))
    expect(ruinSourceDrops('abandoned_hospital')).toEqual(expect.arrayContaining([
      {sourceRef:'mbplan_u_#00',weight:800},{sourceRef:'mbplan_r_#00',weight:400},{sourceRef:'mbplan_e_#00',weight:200},
    ]))
  })

  it('matches the current MyHordes default 6/10/5 specialized construction lists',()=>{
    expect(EXPLORABLE_BLUEPRINT_POOLS).toEqual({
      hotel_uncommon:['ravaged_pumpkins','urban_plan','defensive_supports','perforator','concrete_wall','eden_project'],
      hotel_rare:['faucet','outer_world_apple_tree','scarecrow_fields','swedish_workshop','grand_relocation','labyrinth','tamer_s_trap_system','third_layer','scavenger_s_gallery','spring_coffins'],
      hotel_exceptional:['water_detector','blue_gold_thermal_baths','buzzard_s_wonder_wheel','cinema','pool'],
      bunker_uncommon:['divining_rocket','mist_spray','grapeboom','small_trebuchet','cremato_cue','fortified_homes'],
      bunker_rare:['water_turrets','grenade_launcher','pigsty','guard_tower','manual_grinder','underground_city','air_strike','technicians_workbench','upgradeable_wall','spring_coffins'],
      bunker_exceptional:['pool','giant_sandcastle','reactor','ministry_of_slavery','giant_brd'],
      hospital_uncommon:['second_layer','eden_project','henhouse','defensive_supports','hammam','screaming_saws'],
      hospital_rare:['fertilizer','vita_mines','scouts_lair','gutters','false_town','organized_dump','infirmary','nature_area_of_the_survivalists','automatic_sprinklers','spring_coffins'],
      hospital_exceptional:['no_holes_barred','crow_statue','giant_brd','dump_upgrade','hot_air_balloon'],
    })
  })

  it('does not expose the legacy one-click special-site search for an explorable ruin',()=>{
    const game=withExplorableHospital(createInitialGame(4401,1))
    expect(getLegalActions(game,'c01').some((action)=>action.type==='SEARCH_SPECIAL_SITE')).toBe(false)
    expect(game.world.zones[zoneKey(1,0)].specialSite?.hiddenLoot).toEqual(['uncommon_blueprint'])
  })

  it('reads a specialized plan only against its explicit prospective construction pool',()=>{
    const target:ConstructionId='hammam'
    let game=withOnlySpecializedCandidate(createInitialGame(4402,1),target)
    expect(explorableBlueprintEligibleProjects(game,'hospital','uncommon')).toEqual([target])
    const item:ItemInstance={id:'special-plan',type:'uncommon_blueprint',state:{blueprintFamily:'hospital',blueprintTier:'uncommon'}}
    game={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,location:{type:'town' as const},inventory:[item]}:citizen)}
    const read=getLegalActions(game,'c01').find((action)=>action.type==='READ_BLUEPRINT')
    expect(read).toBeTruthy()
    const result=executeCommand(game,read!)
    expect(result.events.find((event)=>event.type==='BLUEPRINT_READ')).toMatchObject({projectId:target})
    expect(result.state.town.construction[target].discovered).toBe(true)
    expect(result.state.citizens.find((citizen)=>citizen.id==='c01')?.inventory).toHaveLength(0)
  })

  it('preserves specialized blueprint family and tier through schema-19 save migration',()=>{
    const item:ItemInstance={id:'persisted-plan',type:'rare_blueprint',state:{blueprintFamily:'bunker',blueprintTier:'rare'}}
    const game=createInitialGame(4403,1)
    const stored={...game,citizens:game.citizens.map((citizen)=>citizen.id==='c01'?{...citizen,inventory:[item]}:citizen)}
    const migrated=migrateStoredGame(JSON.parse(JSON.stringify(stored)) as Record<string,unknown>)
    expect(migrated).not.toBeNull()
    expect(migrated?.citizens.find((citizen)=>citizen.id==='c01')?.inventory[0]).toMatchObject({
      type:'rare_blueprint',state:{blueprintFamily:'bunker',blueprintTier:'rare'},
    })
  })
})
