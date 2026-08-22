# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The current target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current playable slice

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- temporary per-citizen **Control** switcher for testing simulated citizens directly
- verified 6 AP ordinary-citizen baseline
- Camp Bed home for every citizen with 4-slot private chest storage
- documented 2 AP Camp Bed -> Tent upgrade with +1 personal defense
- defensive objects can protect the Bank or be kept at Home for reduced personal/town defense value
- Citizen's Welcome Pack + Doggy Bag starter supplies
- seeded town well with original-English-style 80–140 starting rations
- one well ration per citizen per day
- separate once-per-day food and water AP refreshes
- open/close town gate for 1 AP from the World Beyond screen
- seeded 14 × 13 World Beyond prototype map
- 1 AP cardinal movement
- original-style 2 human CP vs. 1 zombie CP zone control
- zombie combat can reduce control and free a trapped citizen immediately
- 1 AP low-chance bare-handed zombie combat
- single-use Water Bomb weapon with deterministic 1–5 zombie kills and 0 AP use while not exhausted
- zero-AP manual searches
- separate undepleted and depleted scavenging phases
- depleted-zone Rotting Log / Scrap Metal feedstock
- construction-ready Workshop materials and occasional Water Bombs available from undepleted scavenging
- 4-slot ordinary rucksack
- shared Bank deposits and withdrawals, including defensive bank objects and weapons
- shared Construction Sites with persistent AP progress
- Workshop project with post-construction facility navigation and material processing
- Watchtower project with a post-construction horde-estimate screen
- facility-based Home / Well / Bank / Construction / Workshop / Watchtower / World Beyond / Citizens / Chronicle UI
- nightly breaches distribute zombies across surviving citizens; personal home defense decides who survives
- outside citizens still die at nightly resolution while camping is not yet implemented
- bots use the same legal actions for scavenging, rescue, construction, Workshop work, home upgrades, and carried-weapon combat
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema migration
- GitHub Pages deployment workflow
- Vitest simulation tests

Historical mechanic notes live under [`docs/die2nite-reference`](docs/die2nite-reference). The first ten nightly attack ranges are anchored to surviving English Die2Nite sample data. Exact horde RNG, Watchtower error distribution, later-day attack progression, procedural map generation, exact loot frequency, special zones, the full construction tree, thirst/statuses, higher home upgrades, the broader weapon catalog, durability/reloads/ammunition, wounds, and other advanced combat interactions remain explicit reconstruction/deferred areas.

The citizen-control switcher is a development aid rather than a permanent game mechanic. It is kept out of authoritative save state and is expected to be removed once direct multi-citizen testing is no longer useful.

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
