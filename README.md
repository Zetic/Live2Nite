# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The current target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current playable slice

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- verified 6 AP ordinary-citizen baseline
- open/close town gate for 1 AP
- seeded 14 × 13 World Beyond prototype map
- 1 AP cardinal movement
- original-style 2 human CP vs. 1 zombie CP zone control
- zero-AP manual searches
- 4-slot ordinary backpack
- shared town bank deposits and defensive bank objects
- shared Construction Sites with persistent AP progress
- Workshop project and raw-material processing
- Watchtower project
- bots use the same legal actions for scavenging, rescue, construction, and Workshop work
- citizens outside at nightly resolution die while camping is not yet implemented
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema migration
- full citizen roster and readable filtered event log
- GitHub Pages deployment workflow
- Vitest simulation tests

Historical mechanic notes live under [`docs/die2nite-reference`](docs/die2nite-reference). Procedural map generation, loot frequency, base defense, and the nightly attack curve remain explicit Live2Nite placeholders until their original behavior is researched and encoded.

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
