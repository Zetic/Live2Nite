import { totalTownDefense } from '../core/defense'
import type { ConstructionId, DeathReason, GameEvent, GameState } from '../core/types'

export interface CitizenRecord {
  citizenId: string
  name: string
  alive: boolean
  deathReason: DeathReason | null
  deathDay: number | null
  searches: number
  lootFound: number
  itemsPickedUp: number
  itemsDropped: number
  bankDeposits: number
  bankWithdrawals: number
  zombieKills: number
  combatEncounters: number
  constructionAp: number
  workshopActions: number
  homeActions: number
  apSpent: number
  travelSteps: number
  furthestDistance: number
  missions: number
  campingAttempts: number
  campingSurvivals: number
}

export interface TownStats {
  currentDay: number
  nightsResolved: number
  terminalNight: number | null
  populationStart: number
  populationAlive: number
  populationDead: number
  townDefense: number
  wellWater: number
  completedProjectIds: ConstructionId[]
  zonesDiscovered: number
  specialSitesDiscovered: number
  searches: number
  normalSearches: number
  depletedSearches: number
  automaticSearches: number
  specialSiteSearches: number
  lootFound: number
  furthestDistance: number
  bankDeposits: number
  bankWithdrawals: number
  combatEncounters: number
  zombiesKilled: number
  weaponsBroken: number
  campingAttempts: number
  campingSurvivors: number
  campingDeaths: number
  constructionAp: number
  workshopConversions: number
  deathsByReason: Record<DeathReason, number>
  citizens: CitizenRecord[]
  leaders: {
    zombieKills: CitizenRecord | null
    searches: CitizenRecord | null
    bankDeposits: CitizenRecord | null
    constructionAp: CitizenRecord | null
    travelSteps: CitizenRecord | null
  }
}

function recordFor(records: Map<string, CitizenRecord>, event: GameEvent): CitizenRecord | null {
  if (!('citizenId' in event) || typeof event.citizenId !== 'string') return null
  return records.get(event.citizenId) ?? null
}

function leader(records: CitizenRecord[], value: (record: CitizenRecord) => number): CitizenRecord | null {
  let best: CitizenRecord | null = null
  let bestValue = 0
  for (const record of records) {
    const candidate = value(record)
    if (candidate > bestValue) {
      best = record
      bestValue = candidate
    }
  }
  return best
}

export function computeTownStats(game: GameState): TownStats {
  const records = new Map<string, CitizenRecord>(game.citizens.map((citizen) => [citizen.id, {
    citizenId: citizen.id,
    name: citizen.name,
    alive: citizen.alive,
    deathReason: null,
    deathDay: null,
    searches: 0,
    lootFound: 0,
    itemsPickedUp: 0,
    itemsDropped: 0,
    bankDeposits: 0,
    bankWithdrawals: 0,
    zombieKills: 0,
    combatEncounters: 0,
    constructionAp: 0,
    workshopActions: 0,
    homeActions: 0,
    apSpent: 0,
    travelSteps: 0,
    furthestDistance: 0,
    missions: 0,
    campingAttempts: 0,
    campingSurvivals: 0,
  }]))

  let nightsResolved = 0
  let terminalNight: number | null = null
  let normalSearches = 0
  let depletedSearches = 0
  let automaticSearches = 0
  let specialSiteSearches = 0
  let lootFound = 0
  let furthestDistance = 0
  let bankDeposits = 0
  let bankWithdrawals = 0
  let combatEncounters = 0
  let zombiesKilled = 0
  let weaponsBroken = 0
  let campingAttempts = 0
  let campingSurvivors = 0
  let campingDeaths = 0
  let constructionAp = 0
  let workshopConversions = 0
  const deathsByReason: Record<DeathReason, number> = {
    outside_at_night: 0,
    camping_failure: 0,
    home_breach: 0,
    corpse_attack: 0,
    dehydration: 0,
    infection: 0,
    drug_withdrawal: 0,
  }

  for (const event of game.events) {
    const record = recordFor(records, event)
    switch (event.type) {
      case 'AP_SPENT':
        if(record)record.apSpent+=event.amount
        break
      case 'ZONE_SEARCHED':
        if (event.mode === 'normal') normalSearches += 1
        else depletedSearches += 1
        if (event.automatic) automaticSearches += 1
        if (event.item) {
          lootFound += 1
          if (record) record.lootFound += 1
        }
        if (record) record.searches += 1
        break
      case 'SPECIAL_SITE_SEARCHED':
        specialSiteSearches += 1
        if (event.item) {
          lootFound += 1
          if (record) record.lootFound += 1
        }
        if (record) record.searches += 1
        break
      case 'ITEM_PICKED_UP':
        if(record)record.itemsPickedUp+=1
        break
      case 'ITEM_DROPPED':
        if(record)record.itemsDropped+=1
        break
      case 'CITIZEN_LOCATION_CHANGED':
        if (event.location.type === 'world') {
          const distance = Math.abs(event.location.x) + Math.abs(event.location.y)
          furthestDistance = Math.max(furthestDistance, distance)
          if (record) record.furthestDistance = Math.max(record.furthestDistance, distance)
        }
        if (event.desertStep && record) record.travelSteps += 1
        break
      case 'ITEM_DEPOSITED':
        bankDeposits += 1
        if (record) record.bankDeposits += 1
        break
      case 'ITEM_WITHDRAWN':
        bankWithdrawals += 1
        if(record)record.bankWithdrawals+=1
        break
      case 'COMBAT_RESOLVED':
        combatEncounters += 1
        zombiesKilled += event.kills
        if (event.brokenInto) weaponsBroken += 1
        if (record) {
          record.combatEncounters += 1
          record.zombieKills += event.kills
        }
        break
      case 'CONSTRUCTION_AP_CONTRIBUTED':
        constructionAp += event.amount
        if (record) record.constructionAp += event.amount
        break
      case 'WORKSHOP_CONVERTED':
        workshopConversions += 1
        if(record)record.workshopActions+=1
        break
      case 'HOME_UPGRADED':
      case 'HOME_IMPROVEMENT_BUILT':
        if(record)record.homeActions+=1
        break
      case 'BOT_MISSION_ASSIGNED':
        if (record) record.missions += 1
        break
      case 'CAMPING_RESOLVED':
        campingAttempts += 1
        if (event.survived) campingSurvivors += 1
        else campingDeaths += 1
        if (record) {
          record.campingAttempts += 1
          if (event.survived) record.campingSurvivals += 1
        }
        break
      case 'CITIZEN_DIED':
        deathsByReason[event.reason] += 1
        if (record) {
          record.deathReason = event.reason
          record.deathDay = event.day
        }
        break
      case 'NIGHT_RESOLVED':
        nightsResolved += 1
        terminalNight = event.day
        break
    }
  }

  const citizenRecords = [...records.values()]
  const populationAlive = game.citizens.filter((citizen) => citizen.alive).length
  const completedProjectIds = (Object.keys(game.town.construction) as ConstructionId[]).filter((id) => game.town.construction[id].completed)
  const zones = Object.values(game.world.zones)

  return {
    currentDay: game.day,
    nightsResolved,
    terminalNight: populationAlive === 0 ? terminalNight : null,
    populationStart: game.citizens.length,
    populationAlive,
    populationDead: game.citizens.length - populationAlive,
    townDefense: totalTownDefense(game),
    wellWater: game.town.well.water,
    completedProjectIds,
    zonesDiscovered: zones.filter((zone) => zone.discovered).length,
    specialSitesDiscovered: zones.filter((zone) => zone.discovered && zone.specialSite).length,
    searches: normalSearches + depletedSearches + specialSiteSearches,
    normalSearches,
    depletedSearches,
    automaticSearches,
    specialSiteSearches,
    lootFound,
    furthestDistance,
    bankDeposits,
    bankWithdrawals,
    combatEncounters,
    zombiesKilled,
    weaponsBroken,
    campingAttempts,
    campingSurvivors,
    campingDeaths,
    constructionAp,
    workshopConversions,
    deathsByReason,
    citizens: citizenRecords,
    leaders: {
      zombieKills: leader(citizenRecords, (record) => record.zombieKills),
      searches: leader(citizenRecords, (record) => record.searches),
      bankDeposits: leader(citizenRecords, (record) => record.bankDeposits),
      constructionAp: leader(citizenRecords, (record) => record.constructionAp),
      travelSteps: leader(citizenRecords, (record) => record.travelSteps),
    },
  }
}