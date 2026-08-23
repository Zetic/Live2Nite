import type { GameState } from '../../core/types'
import { PRIMARY_SCREENS, facilitySlots, type GameScreen, type ScreenDefinition } from '../navigation'

function NavButton({entry,screen,outside,onChange}:{entry:ScreenDefinition;screen:GameScreen;outside:boolean;onChange:(screen:GameScreen)=>void}){
  const disabled=outside&&entry.townOnly
  return <button type="button" className={screen===entry.id?'active':''} disabled={disabled} onClick={()=>onChange(entry.id)}>
    <strong>{entry.label}</strong>
    <small>{disabled?'Return to town':entry.short}</small>
  </button>
}

export function GameNavigation({ game, screen, outside, onChange }: {
  game: GameState
  screen: GameScreen
  outside: boolean
  onChange: (screen: GameScreen) => void
}) {
  const facilities=facilitySlots(game)
  return <nav className="game-nav" aria-label="Game screens">
    <div className="game-nav-row game-nav-primary">
      {PRIMARY_SCREENS.map((entry)=><NavButton key={entry.id} entry={entry} screen={screen} outside={outside} onChange={onChange}/>)}
    </div>
    <div className="game-nav-row game-nav-facilities" aria-label="Constructed facilities">
      {facilities.map((entry,index)=>entry
        ? <NavButton key={entry.id} entry={entry} screen={screen} outside={outside} onChange={onChange}/>
        : <span key={`facility-slot-${index}`} className="game-nav-placeholder" aria-label="Empty facility slot"><small>Facility slot</small></span>)}
    </div>
  </nav>
}
