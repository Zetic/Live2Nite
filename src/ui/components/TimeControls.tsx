import { ATTACK_HOUR, canAdvanceToHour, formatGameHour } from '../../core/clock'
import type { GameState } from '../../core/types'

export function TimeControls({ game, onAdvanceOne, onAdvanceTarget, onRefresh, onToggleGod, godActive, onNewTown, refreshDisabled=false }: {
  game: GameState
  onAdvanceOne: () => void
  onAdvanceTarget: (hour: number) => void
  onRefresh: () => void
  onToggleGod: () => void
  godActive: boolean
  onNewTown: () => void
  refreshDisabled?: boolean
}) {
  const attack=game.clock.phase==='attack'
  const canEndDay=!attack&&canAdvanceToHour(game.clock,ATTACK_HOUR)
  return <div className="debug-control-dock">
    <section className={`time-controls ${attack?'attack-phase':''}`} aria-label="Debug controls">
      <div className="time-readout"><span>{attack?'Debug · attack':`Debug · day ${game.day}`}</span><strong>{formatGameHour(game.clock.hour)}</strong></div>
      <div className="time-buttons">
        <button type="button" disabled={refreshDisabled} onClick={onRefresh} title="Restore the controlled citizen to maximum AP and Hydrated">Refresh</button>
        <button type="button" disabled={refreshDisabled} aria-pressed={godActive} onClick={onToggleGod} title="Toggle God debug status: infinite AP, condition immunity, and movement through zombie-controlled zones">{godActive?'God ON':'God'}</button>
        <button type="button" className={attack?'attack-advance':''} onClick={onAdvanceOne} title={attack?'Resolve the attack and advance one hour':'Advance one hour'}>+1h</button>
        <button type="button" className="end-day-button" disabled={!canEndDay} onClick={()=>onAdvanceTarget(ATTACK_HOUR)} title="Advance to the nightly attack">End day</button>
      </div>
    </section>
    <button type="button" className="debug-new-town secondary" onClick={onNewTown} title="Discard this local town and generate a fresh one">New Town</button>
  </div>
}
