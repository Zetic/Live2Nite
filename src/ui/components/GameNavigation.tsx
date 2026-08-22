export type GameScreen = 'town' | 'home' | 'world' | 'citizens' | 'chronicle'

const SCREENS: Array<{ id: GameScreen; label: string; short: string }> = [
  { id: 'town', label: 'Town', short: 'Shared operations' },
  { id: 'home', label: 'Home', short: 'Private storage' },
  { id: 'world', label: 'World Beyond', short: 'Expeditions' },
  { id: 'citizens', label: 'Citizens', short: 'Population' },
  { id: 'chronicle', label: 'Chronicle', short: 'Town history' },
]

export function GameNavigation({ screen, outside, onChange }: {
  screen: GameScreen
  outside: boolean
  onChange: (screen: GameScreen) => void
}) {
  return <nav className="game-nav" aria-label="Game screens">
    {SCREENS.map((entry) => {
      const disabled = outside && (entry.id === 'town' || entry.id === 'home')
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
