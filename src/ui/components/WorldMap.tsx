import { createAgentWorldKnowledge } from '../../agents/WorldKnowledge'
import { itemName } from '../../core/items'
import { isScout, scoutLevel, scoutsLairComplete } from '../../core/scout'
import { specialSiteCode, specialSiteName } from '../../core/specialSites'
import type { GameState, ItemType, ZoneIntelFreshness } from '../../core/types'
import { citizensInZone, zoneControlState, zoneKey } from '../../core/world'
import '../worldMap.css'

export type MapZombieBand='unknown'|'clear'|'low'|'medium'|'high'
export function mapZombieBand(zombies:number|null|undefined):MapZombieBand{
  if(zombies===null||zombies===undefined)return'unknown'
  if(zombies===0)return'clear'
  if(zombies<=2)return'low'
  if(zombies<=4)return'medium'
  return'high'
}

/** Ordinary never-seen zones suppress horde information; legal Scout/Platform projections are handled separately. */
export function mapZombieBandForIntel(discovered:boolean,zombies:number|null|undefined):MapZombieBand{return discovered?mapZombieBand(zombies):'unknown'}
export function mapIntelClass(discovered:boolean,freshness:ZoneIntelFreshness):string{
  if(freshness==='fresh')return'intel-current'
  if(!discovered)return'intel-unknown'
  if(freshness==='stale')return'intel-stale'
  return'intel-visited-unknown'
}
function mapEstimateLabel(zombies:number|null|undefined):string{if(zombies===0)return'0';if(zombies===2)return'1–2';if(zombies===4)return'3–4';return'5+'}

function stackedGroundLabel(items:readonly {type:ItemType}[]):string{
  const counts=new Map<ItemType,number>()
  for(const item of items)counts.set(item.type,(counts.get(item.type)??0)+1)
  return [...counts.entries()].map(([type,count])=>`${itemName(type)}${count>1?` [${count}]`:''}`).join(', ')
}

function peopleDots(count:number){if(count<=0)return null;return <span className="map-people" aria-label={`${count} citizen${count===1?'':'s'} here`}>{Array.from({length:count},(_,index)=><i className="map-person-dot" key={index}/>)}</span>}

export function WorldMap({game,citizenId}:{game:GameState;citizenId:string}){
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const knowledge=createAgentWorldKnowledge(game,player.id)
  // Current MyHordes uses Crow's Nest to expose accumulated Scout markings. Live2Nite
  // does not decay zones from current to past discovery, so markings expose Scout Level
  // only; they deliberately do not refresh stale zombie observations.
  const showScoutMarkings=isScout(player)&&scoutsLairComplete(game)
  const rows=[]
  for(let y=game.world.maxY;y>=game.world.minY;y-=1){
    const cells=[]
    for(let x=game.world.minX;x<=game.world.maxX;x+=1){
      const zone=game.world.zones[zoneKey(x,y)]
      const people=citizensInZone(game,x,y)
      const humanCount=people.length
      const isPlayer=player.location.type==='world'&&player.location.x===x&&player.location.y===y
      const isTown=x===0&&y===0
      const site=zone.discovered?zone.specialSite:undefined
      const rescueInbound=Object.values(game.botMissions).some((mission)=>mission.role==='rescue'&&mission.target.x===x&&mission.target.y===y&&mission.phase!=='unload')
      const controlState=humanCount>0?zoneControlState(game,x,y,isPlayer?player.id:undefined):null
      const known=knowledge.zone(x,y)
      const scoutEstimate=known?.zombieIntel==='scout_estimate'
      const mapEstimate=known?.zombieIntel==='map_estimate'
      const unseenExactMapObservation=!zone.discovered&&known?.zombieIntel==='observed'&&known.zombies!==null
      const siteLabel=site?specialSiteCode(site.type):null
      const zombieBand=known&&known.zombieIntel!=='none'?mapZombieBand(known.zombies):mapZombieBandForIntel(zone.discovered,known?.zombies)
      const intelClass=mapIntelClass(zone.discovered,known?.freshness??'unknown')
      const depleted=zone.discovered&&zone.searchesRemaining===0
      const marking=showScoutMarkings&&zone.discovered?scoutLevel(zone):0
      const titleParts=[`[${x},${y}]`]
      if(scoutEstimate)titleParts.push(`Scout estimate: ~${known?.zombies??0} zombie${known?.zombies===1?'':'s'}`)
      else if(mapEstimate&&known?.freshness==='fresh')titleParts.push(`Observation Platform estimate: ${mapEstimateLabel(known?.zombies)} zombies`)
      else if(mapEstimate)titleParts.push(`last known Observation Platform estimate: ${mapEstimateLabel(known?.zombies)} zombies · Day ${known?.lastObservedDay??'?'}`)
      else if(unseenExactMapObservation&&known?.freshness==='fresh')titleParts.push(`Upgraded Map observation: ${known.zombies} zombies`)
      else if(unseenExactMapObservation)titleParts.push(`last known Upgraded Map observation: ${known.zombies} zombies · Day ${known.lastObservedDay??'?'}`)
      else if(!zone.discovered)titleParts.push('unexplored · zombie count unknown')
      else if(known?.zombies===null||known?.zombies===undefined)titleParts.push('visited · zombie count unknown')
      else if(known.freshness==='fresh')titleParts.push(`${known.zombies} zombies observed today${known.lastObservedHour!==null?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`)
      else titleParts.push(`last known: ${known.zombies} zombies · Day ${known.lastObservedDay??'?'}${known.lastObservedHour!==null&&known.lastObservedHour>=0?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`)
      if(zone.discovered){
        titleParts.push(depleted?'search: depleted':'search: available')
        titleParts.push(zone.groundItems.length?`ground: ${stackedGroundLabel(zone.groundItems)}`:'ground: empty')
      }
      if(marking>0)titleParts.push(`Scout marking: level ${marking}`)
      if(humanCount>0)titleParts.push(`${humanCount} citizen${humanCount===1?'':'s'} here: ${people.map((citizen)=>citizen.name).join(', ')}`)
      if(controlState)titleParts.push(`control: ${controlState}`)
      if(site)titleParts.push(`${specialSiteName(site.type)} · ${site.status}`)
      if(rescueInbound)titleParts.push('rescue mission inbound/active')
      cells.push(
        <span key={zoneKey(x,y)} className={`map-cell zombies-${zombieBand} ${intelClass} ${site?'special-site-cell':''} ${isTown?'town':''} ${isPlayer?'player':''} ${depleted?'depleted':''} ${controlState?`control-${controlState}`:''} ${rescueInbound?'rescue-active':''}`} title={titleParts.join(' · ')}>
          {isTown&&<span className="map-town-marker">T</span>}
          {siteLabel&&<span className="map-site-marker">{siteLabel}</span>}
          {peopleDots(humanCount)}
          {rescueInbound&&<span className="map-rescue-marker">R</span>}
          {depleted&&!isTown&&<span className="map-depleted-marker">D</span>}
          {marking>0&&<span className="map-scout-marker">S{marking}</span>}
        </span>,
      )
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <>
    <div className="world-map">{rows}</div>
    <div className="map-key" aria-label="World map legend">
      <span><i className="map-key-swatch zombies-clear"/>0 zombies</span>
      <span><i className="map-key-swatch zombies-low"/>1–2</span>
      <span><i className="map-key-swatch zombies-medium"/>3–4</span>
      <span><i className="map-key-swatch zombies-high"/>5+</span>
      <span><i className="map-key-swatch intel-unknown"/>unknown</span>
      <span><i className="map-key-swatch intel-stale"/>intel lost</span>
      <span><i className="map-person-dot"/>citizen</span>
      <span><b>D</b> depleted</span>
      {showScoutMarkings&&<span><b>S#</b> Scout Level</span>}
    </div>
  </>
}
