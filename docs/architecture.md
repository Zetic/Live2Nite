# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers and hourly objective/planning helpers. Controllers select normal game commands and never mutate state directly.
- `src/simulation`: orchestration that advances simulation time while invoking controllers through ordinary commands.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only. Top-level gameplay domains are presented as separate screens rather than one continuously growing dashboard.

## Core domains

- `actions.ts`: legal-action generation for every controller.
- `commands.ts`: command validation, timestamping, and event production.
- `events.ts`: authoritative event reduction into game state.
- `clock.ts`: persistent hour/phase definitions and forward-time helpers.
- `game.ts`: initial game creation.
- `night.ts`: isolated horde-strength generation, Watchtower estimates, breach distribution, home survival, and attack-hour conclusion.
- `defense.ts`: shared town-defense aggregation, including defensive objects stored in living citizens' homes.
- `combat.ts`: deterministic zombie-combat rules and weapon definitions.
- `world.ts`: map generation, coordinates, zone control, and normal/depleted search state.
- `items.ts`: item definitions, starter packages, consumable/defense metadata, weapon catalog entries, and normal/depleted scavenging pools.
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

`advanceToHour` repeatedly performs this exact single-hour operation for every intermediate hour. A jump from 09:00 to 12:00 runs 09:00, 10:00, and 11:00 autonomous ticks before arriving at noon. It never teleports over simulation time.

Time shortcuts are forward-only within the current town day. A past target is rejected instead of being interpreted as tomorrow. Fast-forward deliberately stops at midnight so the attack phase is visible.

During `clock.phase === 'attack'`, `getLegalActions` returns no normal citizen commands. Advancing 00:00 by one hour resolves the attack through `night.ts`, records casualties, increments the day, resets AP/daily-use flags, and starts the new day at 01:00.

## Hourly bot planning

`BasicBotController` still chooses concrete legal commands, while `runBotHour.ts` gives each citizen a short-lived hourly objective such as:

- `scavenge`
- `rescue`
- `return_home`
- `town_work`
- `fight`
- `idle`

An objective may execute multiple commands in one hour. The internal iteration cap is only an infinite-loop safeguard and has no gameplay meaning.

Return pressure is currently a deterministic Live2Nite policy rather than a recovered original rule: basic bots begin favoring home between roughly 18:00 and 21:00, staggered by citizen id. By 23:00, remaining outside bots prioritize returning and may spend their full remaining AP. Feasible rescues can still happen late when the rescuer has enough AP to help and return.

This objective layer is intentionally a stepping stone toward richer personality/utility/LLM planning later. It already separates the question “what is my goal this hour?” from “which legal command advances that goal?”

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller. React, traditional bots, future LLM-assisted bots, and future remote humans all operate through the same legal commands. No controller directly mutates AP, inventory, homes, the well, map, bank, construction, gate, zombie counts, clock time, or other simulation state.

The current legal surface includes personal storage transfers, container opening, bank deposits/withdrawals, well withdrawal, food/water consumption, the Camp Bed -> Tent home upgrade, gate operations, movement, normal/depleted search, pickup, bare-handed combat, carried-weapon combat, construction labor, and Workshop processing.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits timestamped `GameEvent` records using the current game hour.
4. Events reduce into the next `GameState` and append to event history.

Random outcomes are selected from stored deterministic RNG state and recorded in events. Container contents, depleted-search outcomes, bare-handed attacks, and weapon kill counts therefore replay from the recorded event instead of being rerolled by the reducer.

`TIME_ADVANCED` is also an event, so clock movement remains explicit in the simulation trace. Legacy events without an hour remain readable after save migration.

## Zombie combat

Combat is a first-class World Beyond domain rather than a UI-side zombie decrement.

- combat commands are exposed only for living citizens outside in a zone containing zombies;
- ordinary implemented weapons require positive AP but do not spend AP themselves;
- bare-handed combat spends 1 AP;
- weapon definitions and kill ranges live in `combat.ts`;
- the first fully implemented weapon is the single-use Water Bomb;
- `COMBAT_RESOLVED` records citizen, zone, method, kills, item consumption, and post-roll RNG state;
- the reducer removes killed zombies and consumed weapons;
- zone control then updates naturally from the new zombie count, so combat can immediately make movement legal.

Stateful breakable/reloadable weapons are deferred until item instances can represent ammunition, charges, or durability cleanly.

## Night resolution

Night resolution is isolated in `night.ts`.

1. The normal day reaches midnight only after the full 23:00 autonomous window completes.
2. 00:00 is represented as an explicit attack phase; normal actions are locked during that phase.
3. Advancing to 01:00 resolves citizens still outside, the horde, shared defense, and home-defense outcomes.
4. Citizens still outside die before the town attack while camping is deferred.
5. Closed-gate town defense blocks zombies one-for-one. An open gate nullifies shared town defense.
6. Any zombies that get through are assigned uniformly at random across surviving citizens in town.
7. A citizen survives when zombies assigned to their home are less than or equal to personal defense; otherwise they die from a home breach.
8. `DAY_STARTED` then moves the simulation to 01:00 of the next day and refreshes daily AP/use state.

The first ten horde ranges are anchored to surviving English Die2Nite sample data. Later-day growth and the exact Watchtower uncertainty envelope remain isolated adaptations until the original algorithms are reconstructed more precisely.

## Personal vs shared defense

The existing `town.defense` value remains the shared defense accumulated by the current bootstrap town, Bank defensive objects, and defensive construction bonuses. Defensive items stored at Home contribute their documented reduced home value to both personal protection and the attack-time shared defense calculation.

Structural home defense is currently personal only. The exact original contribution of housing levels to the shared town-defense display is not treated as settled in this slice.

## Facility navigation

The generic Town screen is removed. The persistent shell exposes Home, The Well, The Bank, Construction Sites, World Beyond, Citizens, and Chronicle.

Operational built sites register additional destinations from game state. Workshop and Watchtower both follow this pattern: their navigation entries appear only after their respective construction projects are complete.

The gate belongs to the World Beyond travel flow. Returning to town leaves the player on the World Beyond screen so the open gate remains visible and can be closed before midnight.

## Search phases

World zones distinguish normal search history from depleted search history:

- normal search consumes the zone's finite `searchesRemaining` and pre-generated useful loot;
- once `searchesRemaining` reaches zero, the zone is depleted;
- depleted searching uses the stored simulation RNG and a separate low-grade pool (currently Rotting Logs / Scrap Metal);
- each citizen currently gets one depleted search per zone, tracked separately from normal searching.

The exact depleted-search cadence and loot weights remain placeholder rules pending deeper historical reconstruction. Water Bomb is currently an uncommon normal-pool result so combat can be exercised before special-zone/item-table reconstruction; its exact frequency is not claimed as historical.

## Temporary citizen-control testing hook

The React-local `controlledCitizenId` lets the Citizens screen temporarily operate any living citizen during development.

This is intentionally **not** authoritative game state and is not a permanent gameplay/controller model:

- selecting another citizen does not change `Citizen.controller`;
- selection is not persisted into the save schema;
- all actions still go through `getLegalActions` and `executeCommand` for the selected citizen;
- Home, Well, Bank, World Beyond, inventory, AP, and map presentation are rendered for the selected citizen;
- `runBotHour` receives the selected id and excludes that citizen from autonomous activity;
- selecting another survivor after the controlled citizen dies lets testing continue without changing actual death state.

This hook should remain removable without altering core citizen/controller state.

## Agent organization

`BasicBotController` chooses concrete actions, `runBotHour.ts` owns hourly objective execution, and town-specific work is delegated to `townWork.ts`. Bots use the same search, Bank, construction, Workshop, home-upgrade, gate, movement, rescue, and combat commands as the controlled citizen.

The former all-at-once `runBotPhase` lifecycle has been removed. Autonomous activity now occurs only through clock advancement.

## Determinism

Simulation randomness is generated from stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands and time advances should reproduce the same simulation result.

Starting well water and nightly horde resolution use isolated deterministic seeds derived from the town seed. Runtime depleted searches, container outcomes, and combat outcomes advance the main RNG state through recorded events.

## Persistence versions

Save data is schema version **6**. The new required persisted field is `clock`. Schema 2–5 saves migrate forward at 01:00 of their existing current day while preserving citizen, town, world, construction, Well, and event progress. Existing historical events are allowed to lack an hour; new command/time/night events are timestamped.

The temporary `controlledCitizenId` remains React state and is not persisted.

## Event history

The Chronicle displays day + hour for timestamped events. Highlights suppress repetitive clock/movement/AP bookkeeping while All Events preserves the complete trace, including `TIME_ADVANCED` records. Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, current time, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

The hourly objective layer provides a natural future boundary for expensive cognition: a model can reconsider goals at selected clock ticks without being invoked for every primitive movement command.

## Multiplayer migration

Current: `React -> simulation advance -> local game core/controllers -> IndexedDB`

Future: `React -> network commands/time -> authoritative server using game core/controllers -> database`
