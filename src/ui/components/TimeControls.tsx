import { ATTACK_HOUR, LAST_SAFE_HOUR, NOON_HOUR, canAdvanceToHour, formatGameHour } from '../../core/clock'
import type { GameState } from '../../core/types'

export function TimeControls({ game, onAdvanceOne, onAdvanceTarget }: {
  game: GameState
  onAdvanceOne: () => void
  onAdvanceTarget: (hour: number) => void
}) {
  const attack = game.clock.phase === 'attack'
  const canNoon = canAdvanceToHour(game.clock,NOON_HOUR)
  const canEleven = canAdvanceToHour(game.clock,LAST_SAFE_HOUR)
  const canMidnight = canAdvanceToHour(game.clock,ATTACK_HOUR)

  return <section className={`time-controls ${attack ? 'attack-phase' : ''}`} aria-label="Town clock controls">
    <div className="time-readout">
      <span>{attack ? 'Night attack' : `Day ${game.day}`}</span>
      <strong>{formatGameHour(game.clock.hour)}</strong>
      <small>{attack ? 'Normal citizen actions are locked until the attack concludes at 1:00 AM.' : 'Advancing time lets autonomous citizens finish the current hour before the clock moves.'}</small>
    </div>
    <div className="time-buttons">
      <button className={attack ? 'primary attack-advance' : 'primary'} onClick={onAdvanceOne}>
        <span>{attack ? 'Resolve attack' : '+1 hour'}</span>
        <small>{attack ? 'Advance to 1:00 AM' : `Then ${formatGameHour((game.clock.hour + 1) % 24)}`}</small>
      </button>
      <button disabled={!canNoon} onClick={() => onAdvanceTarget(NOON_HOUR)}><span>12 PM</span><small>Fast-forward to noon</small></button>
      <button disabled={!canEleven} onClick={() => onAdvanceTarget(LAST_SAFE_HOUR)}><span>11 PM</span><small>Final preparation hour</small></button>
      <button className="midnight-button" disabled={!canMidnight} onClick={() => onAdvanceTarget(ATTACK_HOUR)}><span>12 AM</span><small>Begin attack hour</small></button>
    </div>
  </section>
}
