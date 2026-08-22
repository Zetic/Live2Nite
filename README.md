# Live2Nite

Live2Nite is an experimental, text-forward survival town game inspired by asynchronous social survival games. The current target is a single-player browser simulation with one human-controlled citizen and bot-filled citizen slots. The architecture is intended to support hybrid traditional/LLM bot decision-making and multiplayer later without replacing the core game rules.

## Current playable slice

- React + Vite + TypeScript
- 40 citizen slots: 1 human, 39 basic bots
- temporary per-citizen **Control** switcher for testing simulated citizens directly
- persistent town clock; playable days run from 1:00 AM to midnight
- forward-only time controls for +1 hour, noon, 11 PM, and midnight
- every skipped hour is simulated rather than teleported over
- autonomous citizens finish the current hour before the clock advances
- AP remains the action budget: hourly AI planning does **not** limit citizens to one movement or one action per hour
- 23:00 is the final normal planning window, allowing late rescues and full AP-dump returns before midnight
- 00:00–01:00 is a visible attack phase; normal actions lock until the attack resolves at 1:00 AM
- timestamped Chronicle events
- verified 6 AP ordinary-citizen baseline
- Camp Bed home for every citizen with 4-slot private chest storage
- documented 2 AP Camp Bed -> Tent upgrade with +1 personal defense
- defensive objects can protect the Bank or be kept at Home for reduced personal/town defense value
- Citizen's Welcome Pack + Doggy Bag starter supplies
- seeded town well with original-English-style 80–140 starting rations
- one well ration per citizen per day
- separate once-per-day food and water AP refreshes
- bot water-conservation policy reacts to rations available per living citizen
- bots can open starter packages, keep supplies at Home, share them through the Bank, and withdraw expedition gear
- expedition loadouts budget food/water/weapon slots against space reserved for loot
- bots can use food/water refills to plan expeditions beyond the range of a single 6 AP bar
- town construction shortages drive targeted frontier/resource expeditions
- route planning spreads citizens across longer-range targets instead of repeatedly hugging the gate
- open/close town gate for 1 AP from the World Beyond screen
- seeded 14 × 13 World Beyond prototype map
- 12 deterministic special sites per generated map
- six initial site identities: Construction Site, Wrecked Cars, Pharmacy, Supermarket, Dark Woods, and Police Station
- buried special sites accept shared excavation AP before their location-specific loot can be searched
- special-site search remains independent from ordinary undepleted/depleted zone scavenging
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
- shared Bank deposits and withdrawals, including defensive bank objects, weapons, food, and expedition supplies
- shared Construction Sites with persistent AP progress
- Workshop project with post-construction facility navigation and material processing
- Watchtower project with a post-construction horde-estimate screen
- facility-based Home / Well / Bank / Construction / Workshop / Watchtower / World Beyond / Citizens / Chronicle UI
- nightly breaches distribute zombies across surviving citizens; personal home defense decides who survives
- outside citizens still die when the midnight attack resolves while camping is not yet implemented
- bots use the same legal actions for scavenging, special-site excavation/search, supply preparation, rescue, construction, Workshop work, home upgrades, combat, and late-day returns
- Citizens testing screen exposes each bot's derived expedition purpose, target, AP budget, loadout, water policy, and return window
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema migration
- GitHub Pages deployment workflow
- Vitest simulation tests

Historical mechanic notes live under [`docs/die2nite-reference`](docs/die2nite-reference). The first ten nightly attack ranges are anchored to surviving English Die2Nite sample data. Special-zone identities and their narrow location-oriented loot roles are historically grounded, while Live2Nite's exact site count, current excavation requirements, loot weights, and single-player expedition-planning heuristics remain explicit adaptations. Exact horde RNG, Watchtower error distribution, later-day attack progression, broader special-zone catalog, the full construction tree, thirst/statuses, higher home upgrades, broader weapon catalog, durability/reloads/ammunition, wounds, and other advanced combat interactions remain reconstruction/deferred areas.

The clock/fast-forward and autonomous expedition-planning systems are **Live2Nite single-player simulation interfaces**, not claims that the original browser game used player-controlled hourly ticks or these AI heuristics. They exist so autonomous citizens can evolve over a day while preserving the original-style AP economy: actions do not themselves consume clock hours.

The citizen-control switcher and AI-plan readout are development aids rather than permanent game mechanics. They are kept out of authoritative save state and are expected to be removed once direct multi-citizen testing is no longer useful.

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
