import { ATTACK_HOUR, canAdvanceToHour, formatGameHour } from '../../core/clock'
import type { GameState } from '../../core/types'

export function TimeControls({ game, onAdvanceOne, onAdvanceTarget }: {
  game: GameState
  onAdvanceOne: () => void
  onAdvanceTarget: (hour: number) => void
}) {
  const attack=game.clock.phase==='attack'
  const canEndDay=!attack&&canAdvanceToHour(game.clock,ATTACK_HOUR)
  return <section className={`time-controls ${attack?'attack-phase':''}`} aria-label="Town clock controls">
    <div className="time-readout"><span>{attack?'Attack hour':`Day ${game.day}`}</span><strong>{formatGameHour(game.clock.hour)}</strong></div>
    <div className="time-buttons">
      <button type="button" className={attack?'attack-advance':''} onClick={onAdvanceOne} title={attack?'Resolve the attack and advance one hour':'Advance one hour'}>+1 hour</button>
      <button type="button" className="end-day-button" disabled={!canEndDay} onClick={()=>onAdvanceTarget(ATTACK_HOUR)} title="Advance to the nightly attack">End day</button>
    </div>
  </section>
}
