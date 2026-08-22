# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The current target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current playable slice

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- verified 6 AP ordinary-citizen baseline
- Camp Bed home for every citizen with 4-slot private chest storage
- Citizen's Welcome Pack + Doggy Bag starter supplies
- seeded town well with original-English-style 80–140 starting rations
- one well ration per citizen per day
- separate once-per-day food and water AP refreshes
- open/close town gate for 1 AP
- seeded 14 × 13 World Beyond prototype map
- 1 AP cardinal movement
- original-style 2 human CP vs. 1 zombie CP zone control
- zero-AP manual searches
- 4-slot ordinary rucksack
- shared town bank deposits and withdrawals, including defensive bank objects
- shared Construction Sites with persistent AP progress
- Workshop project and raw-material processing
- Watchtower project
- bots use the same legal actions for scavenging, rescue, construction, and Workshop work
- citizens outside at nightly resolution die while camping is not yet implemented
- screen-based Town / Home / World Beyond / Citizens / Chronicle UI
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema migration
- GitHub Pages deployment workflow
- Vitest simulation tests

Historical mechanic notes live under [`docs/die2nite-reference`](docs/die2nite-reference). Procedural map generation, exact loot frequency, base defense, nightly attack progression, complete starter-package distributions, thirst, and home upgrades remain explicit deferred areas until their original behavior is researched and encoded.

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
