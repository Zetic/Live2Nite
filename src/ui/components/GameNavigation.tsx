import type { GameState } from '../../core/types'
import { availableScreens, type GameScreen } from '../navigation'

export function GameNavigation({ game, screen, outside, onChange }: {
  game: GameState
  screen: GameScreen
  outside: boolean
  onChange: (screen: GameScreen) => void
}) {
  return <nav className="game-nav" aria-label="Game screens">
    {availableScreens(game).map((entry) => {
      const disabled = outside && entry.townOnly
      return <button
        type="button"
        key={entry.id}
        className={screen === entry.id ? 'active' : ''}
        disabled={disabled}
        onClick={() => onChange(entry.id)}
      >
        <strong>{entry.label}</strong>
        <small>{disabled ? 'Return to town' : entry.short}</small>
      </button>
    })}
  </nav>
}
