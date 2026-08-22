import type { GameState } from '../../core/types'
import { zoneKey } from '../../core/world'

export function WorldMap({ game }: { game: GameState }) {
  const player=game.citizens[0]
  const rows=[]
  for(let y=game.world.maxY;y>=game.world.minY;y-=1){
    const cells=[]
    for(let x=game.world.minX;x<=game.world.maxX;x+=1){
      const zone=game.world.zones[zoneKey(x,y)]
      const isPlayer=player.location.type==='world'&&player.location.x===x&&player.location.y===y
      const isTown=x===0&&y===0
      let label='?'; if(zone.discovered)label=String(zone.zombies);if(isTown)label='T';if(isPlayer)label='@'
      cells.push(<span key={zoneKey(x,y)} className={`map-cell ${zone.discovered?'known':''} ${isTown?'town':''} ${isPlayer?'player':''}`} title={zone.discovered?`[${x},${y}] · ${zone.zombies} zombies`:`[${x},${y}] · unexplored`}>{label}</span>)
    }
    rows.push(<div className="map-row" key={y}>{cells}</div>)
  }
  return <div className="world-map">{rows}</div>
}
