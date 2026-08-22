# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The current target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current prototype

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- verified 6 AP ordinary-citizen baseline
- open/close town gate for 1 AP
- seeded 14 × 13 World Beyond prototype map
- 1 AP cardinal movement
- original-style 2 human CP vs. 1 zombie CP zone control
- zero-AP manual searches
- 4-slot ordinary backpack
- shared town bank deposits
- citizens outside at nightly resolution die while camping is not yet implemented
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema-version handling
- GitHub Pages deployment workflow
- Vitest simulation tests

Some map generation, loot, defense, and nightly attack values are still explicitly prototype values rather than historical Die2Nite constants. See [`docs/die2nite-reference/pr2-world-loop.md`](docs/die2nite-reference/pr2-world-loop.md).

## Development

```bash
npm install
npm run dev
```

Tests and production build:

```bash
npm test
npm run build
```

## Architecture

See [`docs/architecture.md`](docs/architecture.md).
