import { specialSiteCode, specialSiteName } from '../../core/specialSites'
import type { GameState } from '../../core/types'
import { citizensInZone, zoneControlState, zoneKey } from '../../core/world'
import { createAgentWorldKnowledge } from '../../agents/WorldKnowledge'
import '../worldMap.css'

function intelLabel(game:GameState,x:number,y:number):string{
  const known=createAgentWorldKnowledge(game).zone(x,y)
  if(!known?.discovered)return'Z?'
  if(known.zombies===null)return'Z?'
  if(known.freshness==='fresh')return`Z${known.zombies}`
  return`Z~${known.zombies}`
}

function intelDescription(game:GameState,x:number,y:number):string{
  const known=createAgentWorldKnowledge(game).zone(x,y)
  if(!known?.discovered)return'no zombie intelligence'
  if(known.zombies===null)return'zombie count unknown'
  if(known.freshness==='fresh')return`${known.zombies} zombies observed today${known.lastObservedHour!==null?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`
  return`stale report: ${known.zombies} zombies last observed on Day ${known.lastObservedDay??'?'}${known.lastObservedHour!==null?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`
}

export function WorldMap({game,citizenId}:{game:GameState;citizenId:string}){
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
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
      const known=createAgentWorldKnowledge(game).zone(x,y)
      const siteLabel=site?specialSiteCode(site.type):null
      const humanLabel=humanCount>0?`H${humanCount}`:''
      const zombieLabel=isTown?'T':intelLabel(game,x,y)
      const titleParts=[`[${x},${y}]`]
      if(!zone.discovered)titleParts.push('unexplored')
      else titleParts.push(intelDescription(game,x,y))
      if(humanCount>0)titleParts.push(`${humanCount} citizen${humanCount===1?'':'s'} here: ${people.map((citizen)=>citizen.name).join(', ')}`)
      if(controlState)titleParts.push(`control: ${controlState}`)
      if(site)titleParts.push(`${specialSiteName(site.type)} · ${site.status}`)
      if(rescueInbound)titleParts.push('rescue mission inbound/active')
      cells.push(
        <span
          key={zoneKey(x,y)}
          className={`map-cell ${zone.discovered?'known':''} ${known?.freshness==='stale'?'intel-stale':''} ${site?'special-site-cell':''} ${isTown?'town':''} ${isPlayer?'player':''} ${controlState?`control-${controlState}`:''} ${rescueInbound?'rescue-active':''}`}
          title={titleParts.join(' · ')}
        >
          <span className="map-cell-top">{humanLabel||(siteLabel??(isTown?'T':''))}</span>
          <span className="map-cell-bottom">{zombieLabel}</span>
          {siteLabel&&humanCount>0&&<span className="map-site-marker">{siteLabel}</span>}
          {rescueInbound&&<span className="map-rescue-marker">R</span>}
        </span>,
      )
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <><div className="world-map">{rows}</div><div className="map-key"><span>H# citizens</span><span>Z# fresh zombies</span><span>Z~# stale report</span><span>Z? unknown</span><span>R rescue</span></div></>
}
