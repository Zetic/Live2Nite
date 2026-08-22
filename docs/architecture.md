# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers and planning helpers. Controllers select normal game commands and never mutate state directly.
- `src/agents/planning`: town-needs, route, expedition, loadout, water, and storage-policy evaluation.
- `src/simulation`: orchestration that advances simulation time while invoking controllers through ordinary commands.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only.

## Core domains

- `actions.ts`: legal-action generation for every controller.
- `commands.ts`: command validation, timestamping, and event production.
- `events.ts`: authoritative event reduction into game state.
- `clock.ts`: persistent hour/phase definitions and forward-time helpers.
- `game.ts`: initial game creation.
- `night.ts`: horde strength, Watchtower estimates, breaches, home survival, and attack-hour conclusion.
- `defense.ts`: shared town-defense aggregation.
- `combat.ts`: deterministic zombie-combat rules and weapon definitions.
- `world.ts`: map generation, coordinates, zone control, ordinary/depleted scavenging, and deterministic special-site placement.
- `specialSites.ts`: special-site identities, map codes, descriptions, and location-specific loot pools.
- `items.ts`: item definitions, starter packages, consumable/defense metadata, weapon catalog entries, and ordinary scavenging pools.
- `home.ts`: home levels, personal defense, storage, and daily citizen-use state.
- `well.ts`: deterministic starting-well generation.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random number generation.

`src/simulation/advanceTime.ts` owns the single-player clock lifecycle. React requests a time advance; it does not loop bots or mutate the clock itself.

## Clock and hourly simulation

The persistent clock is a Live2Nite simulation adaptation used to make autonomous citizens evolve throughout the day without changing the AP economy.

A new day begins at **01:00**. Normal citizen actions remain available through **23:00**. **00:00–01:00** is the nightly attack phase.

The central ordering invariant is:

1. The human performs any desired commands during the current hour. Commands do not move the clock.
2. The human requests a time advance.
3. `runBotHour` gives every uncontrolled autonomous citizen its planning/action opportunity for the **current** hour.
4. Only after those citizens finish is `TIME_ADVANCED` emitted and the clock moved to the next hour.

Therefore `23:00 -> 00:00` gives bots their full final 23:00 opportunity before midnight. A citizen four tiles from town with four AP can legally spend all four AP moving home in that one hourly tick. The clock is a planning cadence, **not another action-point system**.

`advanceToHour` repeats this operation for every intermediate hour. Time shortcuts are forward-only and fast-forward stops at midnight so the attack phase is visible.

During `clock.phase === 'attack'`, `getLegalActions` returns no normal citizen commands. Advancing 00:00 by one hour resolves the attack, records casualties, increments the day, resets AP/daily-use flags, and starts the next day at 01:00.

## World Beyond search layers

A World Beyond zone can now expose three independent resource channels:

1. **ordinary search** — finite useful finds represented by `searchesRemaining` and `searchedBy`;
2. **depleted search** — low-grade Rotting Log / Scrap Metal feedstock, tracked separately per citizen;
3. **special-site search** — a location-specific ruin loot source, independent from the ordinary zone searches.

Special sites begin `buried`. Citizens with zone control can spend 1 AP per excavation action. Progress is shared by all citizens in that zone. Once `excavationProgress >= excavationRequired`, the site becomes `accessible`; once its generated special loot is exhausted, it becomes `depleted`.

The current map receives 12 special sites from an **isolated deterministic seed** derived from the town seed. This placement does not advance the ordinary world-generation RNG or runtime RNG. Schema-v6 saves gain the same sites during v7 migration without rerolling already-generated ordinary zones.

The six initial site types are Construction Site, Wrecked Cars, Pharmacy, Supermarket, Dark Woods, and Police Station. Exact site count, excavation requirements, and current loot weights are Live2Nite adaptations; see `docs/die2nite-reference/world-beyond-2.md`.

## Expedition planning

PR #10 changes the bot model from “pick the next useful command” toward “choose a purpose, target and resource budget, then execute legal commands toward it.”

The planning stack is deliberately separated from `BasicBotController`:

- `TownNeeds.ts` identifies the first incomplete project, missing construction resources, Bank food/weapon pressure, survivor count, and well water per survivor.
- `ExpeditionPlanner.ts` derives a purpose, target, AP requirement, expected task cost, return cost, target risk, loadout, water policy and approximate return hour.
- `RoutePlanner.ts` supplies lightweight deterministic route selection across the small map. Known dangerous zones receive higher costs; unknown zones remain traversable without revealing their hidden contents.
- `SupplyPolicy.ts` decides whether water/food/weapon capacity is justified and reserves rucksack slots for loot.
- `BasicBotController.ts` executes the derived plan exclusively through legal `GameCommand`s.

Expedition plans are **derived rather than persisted**. This keeps authoritative save state limited to facts about the world/citizens while allowing the same planner to power both AI decisions and the temporary Citizens-screen diagnostics.

### Town-driven purposes

Current expedition purposes are:

- `gather_construction`
- `gather_food`
- `gather_medical`
- `gather_weapons`
- `explore`
- `rescue`

Rescue overrides normal planning. Otherwise missing construction materials are currently the strongest town need, followed by low shared food, low shared weapons, then general exploration.

A known discovered special site matching the need is preferred. If no matching site is known, the citizen chooses a deeper fresh/undepleted target and pushes the frontier. This is intentional: before the Workshop exists, bots should not endlessly comb depleted near-town tiles for Rotting Logs/Scrap Metal that cannot solve the Workshop bootstrap shortage.

### Long-range targets and path continuity

Citizens receive deterministic preferred exploration radii and broad directional biases derived from citizen id. Congestion around other citizens penalizes a candidate, spreading expeditions instead of sending all bots down the same corridor.

A target may be several unknown tiles away. Moving through an unknown tile reveals only that tile; it does not reveal future contents. Intermediate newly discovered undepleted zones do not automatically replace the deeper target. The destination remains attractive until the citizen reaches/searches it or a higher-priority need overrides the plan.

### AP budgets and refills

AP remains the only ordinary action budget. The planner estimates:

`travel out + expected task AP + return travel + gate cost`

and compares that with current AP plus eligible once-per-day AP refills. Food/water still refill to the citizen's normal maximum; they do not add clock hours.

Bots delay consumption until near exhaustion so a ration is not wasted at 5/6 AP. A long expedition may therefore spend the base AP bar, drink near 0 AP, continue, later eat near 0 AP, and still return during the same game day.

### Well conservation

The current Live2Nite water policy uses well rations per living citizen:

- `normal`: more than 2.0
- `cautious`: 1.0–2.0
- `critical`: below 1.0

This policy controls **new Well withdrawals for expeditions**, not thirst survival (thirst/status consequences are still deferred). Existing private/Bank water can still be considered. Critical Well water is reserved for rescue-level use; cautious water is restricted to rescues and selected high-value construction expeditions.

These bands are gameplay heuristics, not recovered Die2Nite rules, and are isolated in `SupplyPolicy.ts` for later replacement.

### Rucksack/loadout tradeoffs

The planner considers Food, Water Ration and Water Bomb as possible expedition supplies while reserving at least one ordinary rucksack slot for findings. A dangerous target can justify a weapon; a long target can justify a refill; a short safe trip remains light.

The Bank is therefore both an unloading destination and an expedition outfitter. Bots can withdraw shared food/water/weapons when a plan justifies them instead of carrying everything available.

## Starter packages and storage behavior

Starter packages now participate in autonomous preparation rather than remaining inert at Home.

- A Doggy Bag may stay unopened, be opened because a long expedition needs food, or be opened/shared by a community-oriented bot.
- A Welcome Pack may remain private or be opened by a community-oriented bot so its component can be moved toward the shared Bank.
- Unused construction/raw/misc/defense finds are normally shared through the Bank.
- Consumables/weapons can be returned to Home or Bank depending on a deterministic temporary `community` / `balanced` / `hoarder` policy.

These storage dispositions are intentionally simple deterministic heuristics, not permanent personality design. They create observable differences now and provide a replaceable seam for richer personalities/LLM cognition later.

## Hourly bot execution

`runBotHour.ts` currently classifies each autonomous citizen into one short-lived objective:

- `expedition`
- `rescue`
- `return_home`
- `town_work`
- `fight`
- `idle`

An objective may execute multiple commands in one hour. The internal iteration cap is only an infinite-loop safeguard and has no gameplay meaning.

Return pressure remains a deterministic Live2Nite policy: basic bots begin favoring home between roughly 18:00 and 21:00, staggered by citizen id. By 23:00, outside bots prioritize returning and may spend their full remaining AP. Feasible rescues can still happen late when AP/refill capacity permits.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for React, traditional bots, future LLM-assisted bots, and future remote humans. No controller directly mutates AP, inventory, homes, the Well, map, Bank, construction, gate, zombies, special-site state, clock time, or other authoritative simulation state.

The legal surface includes storage transfers, container opening, Bank deposits/withdrawals, Well withdrawal, food/water consumption, home upgrade, gate operations, movement, ordinary/depleted search, special-site excavation/search, pickup, combat, construction labor, and Workshop processing.

## Command and event flow

1. A human or bot requests a legal `GameCommand`.
2. The core validates it against authoritative state.
3. A valid command emits timestamped `GameEvent` records using the current hour.
4. Events reduce into the next `GameState` and append to event history.

Special-site excavation/search use the same event pipeline as every other gameplay action. Random outcomes are selected outside reducers and stored in events/state so replay remains deterministic.

## Zombie combat

Combat is a first-class World Beyond domain rather than a UI-side zombie decrement.

- combat commands are exposed only for living citizens outside in zones containing zombies;
- ordinary implemented weapons require positive AP but do not themselves spend AP;
- bare-handed combat spends 1 AP;
- the first fully implemented weapon is the single-use Water Bomb;
- combat reduces zone zombies, so control/movement legality updates naturally.

Stateful breakable/reloadable weapons remain deferred until item instances can represent ammunition, charges, or durability cleanly.

## Night resolution

Night resolution remains isolated in `night.ts`.

1. 23:00 autonomous activity finishes before midnight.
2. 00:00 is an explicit attack phase.
3. Advancing to 01:00 resolves outside deaths, horde strength, shared defense, and home-defense outcomes.
4. Citizens still outside die while camping remains deferred.
5. A closed gate applies shared defense; an open gate nullifies it.
6. Breaching zombies are distributed across surviving citizens in town.
7. Personal home defense determines survival.
8. `DAY_STARTED` resets daily state at 01:00.

The first ten horde ranges are anchored to surviving English Die2Nite sample data. Later-day growth and exact Watchtower uncertainty remain isolated adaptations.

## Temporary testing tools

The React-local `controlledCitizenId` lets the Citizens screen temporarily operate any living citizen. It is not persisted and does not change `Citizen.controller`.

PR #10 also shows the **derived AI plan** on each basic-bot citizen card: purpose, reason, target, AP budget, potential refill capacity, loadout, reserved loot slots, water policy, storage disposition, and return hour. This diagnostic readout calls the same planner used by the bot; it is not a second AI state store.

Both the control switcher and plan readout are development tools intended to remain removable without changing core citizen/controller state.

## Determinism

`Math.random()` should not be used inside the game core. A seed plus the same ordered commands and time advances should reproduce the same simulation result.

Starting well water, special-site placement/loot, and nightly horde resolution use isolated deterministic seeds where independence matters. Runtime depleted searches, container outcomes, and combat outcomes advance recorded RNG state.

## Persistence versions

Save data is schema version **7**. Schema 2–6 saves migrate forward while preserving citizen, town, clock, ordinary world, construction, Well and event progress. V6 worlds receive deterministic special-site state derived from their existing town seed.

Historical events are allowed to lack an hour; new command/time/night events remain timestamped. The temporary controlled citizen and derived expedition plans are not persisted.

## Event history

The Chronicle displays day + hour for timestamped events. Special-site discovery/excavation/search are World Beyond events. Highlights suppress repetitive clock/movement/AP bookkeeping while All Events preserves the complete simulation trace.

Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, current time, town needs, derived world knowledge, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

The expedition planner creates a useful future boundary: expensive cognition can influence **purpose, target, risk tolerance, supply use and sharing behavior** without being invoked for every primitive movement command.

## Multiplayer migration

Current: `React -> simulation advance -> local game core/controllers -> IndexedDB`

Future: `React -> network commands/time -> authoritative server using game core/controllers -> database`
