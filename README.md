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
- 23:00 is the final normal planning window; 00:00–01:00 is a visible attack phase
- timestamped Chronicle events
- verified 6 AP ordinary-citizen baseline
- compact always-visible controlled-citizen AP/status HUD plus detailed Citizen diagnostics
- persisted hydration state with **Hydrated -> Thirsty -> Dehydrated** progression
- 11 desert movements per hydration stage in the current reconstruction
- nightly thirst/dehydration progression and dehydration death
- Water Rations remove Thirsty; Dehydrated -> Thirsty treatment does not restore AP
- Exhausted and daily food/water status indicators derived from existing AP/daily state
- bots prioritize hydration treatment and account for hydration when planning expedition water
- Camp Bed home for every citizen with 4-slot private chest storage
- documented 2 AP Camp Bed -> Tent upgrade with +1 personal defense
- defensive objects can protect the Bank or be kept at Home for reduced personal/town defense value
- Citizen's Welcome Pack + Doggy Bag starter supplies
- seeded town well with original-English-style 80–140 starting rations
- Pump construction can expand current water access
- separate once-per-day food and water AP refreshes
- bot water-conservation policy reacts to rations available per living citizen
- bots can open starter packages, keep supplies at Home, share them through the Bank, and withdraw expedition gear
- coordinated town mission board prevents every citizen independently becoming a scout
- a small scout cohort creates route/zombie/resource knowledge before later gather/excavation missions are staffed
- new field assignments are staggered across hours
- three protected reserve citizens support emergency response; one is kept off field missions as a final night-gate reserve
- field missions persist through `prepare -> outbound -> operate -> return -> unload`
- ordinary expeditions continuously reserve enough carried AP/refill capacity for a safe trip home
- rescue missions can deliberately accept additional risk and rescuers hold the rescue zone long enough for the trapped citizen to leave
- town construction shortages drive targeted frontier/resource expeditions
- route planning spreads citizens across longer-range targets instead of repeatedly hugging the gate
- open/close town gate for 1 AP from the World Beyond screen
- seeded 14 × 13 World Beyond prototype map
- 12 deterministic special sites per generated map
- six initial site identities: Construction Site, Wrecked Cars, Pharmacy, Supermarket, Dark Woods, and Police Station
- buried special sites accept shared excavation AP before their location-specific loot can be searched
- special-site search remains independent from ordinary undepleted/depleted zone scavenging
- zero-AP manual search plus ordinary two-hour automatic searches while remaining on a productive zone
- separate undepleted and depleted scavenging phases
- depleted-zone Rotting Log / Scrap Metal feedstock
- Construction Kits and construction-ready Workshop materials available from early scavenging
- 4-slot ordinary rucksack
- shared Bank deposits and withdrawals, including defensive objects, weapons, food, and expedition supplies
- original-style 2 human CP vs. 1 zombie CP zone control
- zombie combat can reduce control and free a trapped citizen immediately
- bare-handed combat plus Human Bone, Pathetic Penknife, Staff, Serrated Knife, Machete, and Water Bomb weapon tiers
- breakable field weapons produce broken items for the current Workshop repair prototype
- shared Construction Sites with persistent AP progress
- current construction catalog: Workshop, Watchtower, Pump, Wall Upgrade V1, Portal Lock, and Search Tower
- Workshop material processing and current repair recipes
- Watchtower horde-estimate screen
- Search Tower nightly depleted-zone replenishment prototype
- facility-based Home / Well / Bank / Construction / Workshop / Watchtower / World Beyond / Citizens / Chronicle UI
- nightly breaches distribute zombies across surviving citizens; personal home defense decides who survives
- outside citizens still die when the midnight attack resolves while camping is not yet implemented
- bots use the same legal actions for scavenging, excavation/search, supply preparation, rescue, construction, Workshop work, home upgrades, combat, hydration treatment, and late-day returns
- command/event-driven game core
- legal-action API shared by humans and bots
- seeded deterministic simulation
- IndexedDB autosave with schema migration
- GitHub Pages deployment workflow
- Vitest simulation and multi-seed economy/survival regression tests

Historical mechanic notes live under [`docs/die2nite-reference`](docs/die2nite-reference). The first ten nightly attack ranges are anchored to surviving English Die2Nite sample data. Special-zone identities, the broad early combat model, two-hour ordinary autosearch, and the current hydration chain have surviving English references. Live2Nite's exact special-site count, current excavation requirements, loot weights, mission staffing, reserve policies, safety margins, water-conservation bands, several construction costs/effects, weapon break probabilities, and autonomous expedition heuristics remain explicit adaptations.

Hydration/status evidence and unresolved wording conflicts are recorded in [`docs/die2nite-reference/status-hydration.md`](docs/die2nite-reference/status-hydration.md). Later wound/infection/terror/addiction statuses, higher home upgrades, broader weapon/reload/ammunition systems, camping, a larger special-zone catalog, and the deeper construction tree remain deferred reconstruction areas.

The clock/fast-forward and autonomous mission-planning systems are **Live2Nite single-player simulation interfaces**, not claims that the original browser game used player-controlled hourly ticks or these AI heuristics. They exist so autonomous citizens can evolve over a day while preserving the original-style AP economy: actions do not themselves consume clock hours.

The citizen-control switcher and AI mission readout are development aids rather than permanent game mechanics. Control selection is kept out of authoritative save state. Active bot mission assignments and citizen hydration state are persisted because they affect multi-hour and multi-day gameplay.

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
