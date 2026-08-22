import { specialSiteCode, specialSiteName } from '../../core/specialSites'
import type { GameState } from '../../core/types'
import { zoneKey } from '../../core/world'

export function WorldMap({game,citizenId}:{game:GameState;citizenId:string}){
  const player=game.citizens.find((citizen)=>citizen.id===citizenId)??game.citizens[0];const rows=[]
  for(let y=game.world.maxY;y>=game.world.minY;y-=1){const cells=[];for(let x=game.world.minX;x<=game.world.maxX;x+=1){const zone=game.world.zones[zoneKey(x,y)];const isPlayer=player.location.type==='world'&&player.location.x===x&&player.location.y===y;const isTown=x===0&&y===0;const site=zone.discovered?zone.specialSite:undefined
      let label='?';if(zone.discovered)label=site?specialSiteCode(site.type):String(zone.zombies);if(isTown)label='T';if(isPlayer)label='@'
      const title=zone.discovered?`[${x},${y}] · ${zone.zombies} zombies${site?` · ${specialSiteName(site.type)} · ${site.status}`:''}`:`[${x},${y}] · unexplored`
      cells.push(<span key={zoneKey(x,y)} className={`map-cell ${zone.discovered?'known':''} ${site?'special-site-cell':''} ${isTown?'town':''} ${isPlayer?'player':''}`} title={title}>{label}</span>)}rows.push(<div className="map-row" key={y}>{cells}</div>)}
  return <div className="world-map">{rows}</div>
}
