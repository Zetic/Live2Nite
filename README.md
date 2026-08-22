# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The first development target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current prototype

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- 12 AP per citizen per day
- command/event-driven game core
- seeded deterministic nightly resolution
- IndexedDB autosave
- GitHub Pages deployment workflow
- Vitest core simulation tests

The current mechanics are intentionally placeholders. The first milestone validates the project boundaries rather than reproducing the complete Die2Nite ruleset.

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
