import { createAgentWorldKnowledge } from '../../agents/WorldKnowledge'
import { itemName } from '../../core/items'
import { specialSiteCode, specialSiteName } from '../../core/specialSites'
import type { GameState, ItemType } from '../../core/types'
import { citizensInZone, zoneControlState, zoneKey } from '../../core/world'
import '../worldMap.css'

function stackedGroundLabel(items:readonly {type:ItemType}[]):string{
  const counts=new Map<ItemType,number>()
  for(const item of items)counts.set(item.type,(counts.get(item.type)??0)+1)
  return [...counts.entries()].map(([type,count])=>`${itemName(type)}${count>1?` [${count}]`:''}`).join(', ')
}

export function WorldMap({game,citizenId}:{game:GameState;citizenId:string}){
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0]
  const knowledge=createAgentWorldKnowledge(game)
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
      const siteLabel=site?specialSiteCode(site.type):null
      const humanLabel=humanCount>0?`H${humanCount}`:''
      const zombieLabel=isTown?'T':!known?.discovered||known.zombies===null?'Z?':known.freshness==='fresh'?`Z${known.zombies}`:`Z~${known.zombies}`
      const depleted=zone.discovered&&zone.searchesRemaining===0
      const titleParts=[`[${x},${y}]`]
      if(!zone.discovered)titleParts.push('unexplored')
      else {
        if(known?.zombies===null||known?.zombies===undefined)titleParts.push('zombie count unknown')
        else if(known.freshness==='fresh')titleParts.push(`${known.zombies} zombies observed today${known.lastObservedHour!==null?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`)
        else titleParts.push(`stale report: ${known.zombies} zombies last observed on Day ${known.lastObservedDay??'?'}${known.lastObservedHour!==null?` at ${String(known.lastObservedHour).padStart(2,'0')}:00`:''}`)
        titleParts.push(depleted?'search: depleted':'search: available')
        titleParts.push(zone.groundItems.length?`ground: ${stackedGroundLabel(zone.groundItems)}`:'ground: empty')
      }
      if(humanCount>0)titleParts.push(`${humanCount} citizen${humanCount===1?'':'s'} here: ${people.map((citizen)=>citizen.name).join(', ')}`)
      if(controlState)titleParts.push(`control: ${controlState}`)
      if(site)titleParts.push(`${specialSiteName(site.type)} · ${site.status}`)
      if(rescueInbound)titleParts.push('rescue mission inbound/active')
      cells.push(
        <span
          key={zoneKey(x,y)}
          className={`map-cell ${zone.discovered?'known':''} ${known?.freshness==='stale'?'intel-stale':''} ${site?'special-site-cell':''} ${isTown?'town':''} ${isPlayer?'player':''} ${depleted?'depleted':''} ${controlState?`control-${controlState}`:''} ${rescueInbound?'rescue-active':''}`}
          title={titleParts.join(' · ')}
        >
          <span className="map-cell-top">{humanLabel||(siteLabel??(isTown?'T':''))}</span>
          <span className="map-cell-bottom">{zombieLabel}</span>
          {siteLabel&&humanCount>0&&<span className="map-site-marker">{siteLabel}</span>}
          {rescueInbound&&<span className="map-rescue-marker">R</span>}
          {depleted&&!isTown&&<span className="map-depleted-marker">D</span>}
        </span>,
      )
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <><div className="world-map">{rows}</div><div className="map-key"><span>H# citizens</span><span>Z# fresh zombies</span><span>Z~# stale report</span><span>Z? unknown</span><span>D depleted</span><span>R rescue</span></div></>
}
