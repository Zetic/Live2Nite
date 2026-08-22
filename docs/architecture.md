# Architecture

Live2Nite starts as a single-player browser game but keeps simulation rules independent from React so the same core can later move behind an authoritative multiplayer server.

## Boundaries

- `src/core`: authoritative game rules and persisted state. No React, DOM, network, or browser-persistence dependencies.
- `src/agents`: citizen controllers and AI planning helpers. Controllers select ordinary legal game commands and never directly mutate gameplay state.
- `src/agents/planning`: town-needs, mission coordination, route, expedition, loadout, water/storage policy, and return-safety evaluation.
- `src/simulation`: orchestration that advances simulation time while invoking controllers.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation, testing diagnostics, and human input only.

## Core domains

- `actions.ts`: legal-action generation for every controller.
- `commands.ts`: command validation, timestamping, and gameplay-event production.
- `events.ts`: authoritative event reduction into game state, including persisted bot-mission lifecycle events.
- `clock.ts`: persistent hour/phase definitions and forward-time helpers.
- `game.ts`: initial game creation.
- `night.ts`: horde strength, Watchtower estimates, breaches, home survival, and attack-hour conclusion.
- `defense.ts`: shared town-defense aggregation.
- `combat.ts`: deterministic zombie-combat rules and weapon definitions.
- `world.ts`: map generation, coordinates, zone control, ordinary/depleted scavenging, and deterministic special-site placement.
- `specialSites.ts`: special-site identities, descriptions, map codes, and location-specific loot pools.
- `items.ts`: item definitions, starter packages, consumable/defense metadata, weapon entries, and ordinary scavenging pools.
- `home.ts`: home levels, personal defense, storage, and daily citizen-use state.
- `well.ts`: deterministic starting-well generation.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random-number generation.

`src/simulation/advanceTime.ts` owns the single-player clock lifecycle. React requests a time advance; it never loops bots or mutates the clock itself.

## Clock and hourly simulation

A new playable day begins at **01:00**. Normal actions remain available through **23:00**. **00:00–01:00** is the nightly attack phase.

The ordering invariant is:

1. The controlled citizen performs any desired commands during the current hour. Commands do not move the clock.
2. The player requests a time advance.
3. `runBotHour` lets uncontrolled autonomous citizens finish their activity for the **current** hour.
4. Only then is `TIME_ADVANCED` emitted and the clock moved forward.

Therefore `23:00 -> 00:00` gives bots their complete final 23:00 opportunity. A citizen four tiles away with four AP can spend all four AP returning in that one hourly tick. The clock is a planning cadence, not a second action economy.

`advanceToHour` repeats this exact operation for every intermediate hour. Time shortcuts are forward-only and fast-forward stops at midnight so the attack phase remains visible.

## Coordinated town missions

PR #11 adds a coordination layer above individual bot command selection. The important design rule is:

> Not every citizen independently solves the town's global problem. The town creates a limited set of useful field missions, and citizens are assigned to those missions while others remain available in town.

`TownMissionPlanner.ts` evaluates current world knowledge, trapped citizens, construction shortages, known fresh zones, useful special sites, current staffing, time of day, and citizens already committed to field work.

Current field roles are:

- `scout` — reveal routes, zombie counts, fresh zones, and special sites;
- `gatherer` — exploit known resource destinations;
- `excavator` — contribute AP to known buried special sites;
- `rescue` — reinforce a trapped citizen;
- `combat` — reserved as a mission role for explicit hostile-site clearing as the weapon system expands.

A bot with no field assignment remains a reserve/town citizen rather than automatically inventing an expedition. It may perform ready construction/Workshop/home work or starter-package/storage housekeeping.

Current coordination values are intentionally isolated Live2Nite AI heuristics:

- roughly 30% of living basic bots are protected as an uncommitted reserve;
- new field assignments are capped at roughly 15% of living bots per hour;
- a poorly known early map begins with a small scout cohort (currently four), then later missions can be generated from the knowledge those scouts reveal;
- new scouting winds down as the map becomes known and late-day departures are suppressed.

These values are tuning policy, not fundamental game rules or reconstructed Die2Nite mechanics.

## Persisted mission lifecycle

Unlike PR #10's fully derived per-decision expedition target, an accepted field mission is now authoritative state because continuity across hours matters to survival.

`GameState.botMissions[citizenId]` stores a `BotMissionAssignment` with role, purpose, target, reason, return deadline, safety reserve, emergency flag, and current phase.

The normal lifecycle is:

`prepare -> outbound -> operate -> return -> unload -> complete`

This prevents target thrashing. A citizen who reaches and searches a destination does not immediately invent another outward trip on the next hour; the same mission transitions to `return`, reaches town, unloads, and is then cleared before another assignment can be accepted.

Mission assignment/phase/clear changes are explicit `GameEvent`s and reduce through the same authoritative event pipeline as gameplay commands.

## Return-solvency invariant

The production failure after PR #10 showed that planning a feasible round trip at departure was not enough: citizens could spend their return capacity on later outward decisions.

Ordinary field missions now continuously calculate:

`usable remaining AP = current AP + unused carried food refill + unused carried water refill`

against:

`required return AP = safe route home + mission safety reserve`

When usable capacity reaches the required return threshold, the mission transitions to `return` immediately. A full rucksack and the citizen's scheduled evening deadline also force the return phase.

Only **carried, currently usable** refill items count while outside. Food, water, starter packages, Bank stock, and Well water still sitting in town cannot make an already-outside citizen appear solvent.

Scout missions currently use a larger reserve than ordinary known-resource trips because unknown travel carries more uncertainty. Emergency rescue missions are allowed to accept more risk and do not use the ordinary safe-round-trip acceptance rule.

## Rescue semantics

A rescue is not complete merely because another citizen briefly enters the trapped zone. The rescuer must create a usable player-action window.

A rescue mission therefore remains in `operate` while the protected citizen is still in the rescue zone. The rescuer holds position instead of immediately returning during the same hourly simulation tick. Once the protected citizen leaves the zone (or dies), the rescue mission may transition to return. A late emergency deadline can still force the rescuer to retreat.

This preserves the clock contract: after the player advances one hour to request help, a successful rescuer can still be present when control returns to the player.

## World Beyond search layers

A zone can expose three independent resource channels:

1. **ordinary search** — finite useful finds represented by `searchesRemaining` and `searchedBy`;
2. **depleted search** — low-grade Rotting Log / Scrap Metal feedstock, tracked separately per citizen;
3. **special-site search** — location-specific ruin loot independent from ordinary zone searching.

Special sites begin buried. Citizens with zone control can spend 1 AP per excavation action, with progress shared between contributors. An uncovered site becomes `accessible`; once its special loot is exhausted it becomes `depleted`.

The map currently receives 12 special sites from an isolated deterministic seed. The six initial types are Construction Site, Wrecked Cars, Pharmacy, Supermarket, Dark Woods, and Police Station. Exact counts, excavation requirements, and loot weights remain explicit Live2Nite adaptations; see `docs/die2nite-reference/world-beyond-2.md`.

## Mission and supply planning

The planning stack is separated from `BasicBotController`:

- `TownNeeds.ts` evaluates incomplete projects, missing materials, Bank food/weapon pressure, survivors, and Well water per survivor.
- `TownMissionPlanner.ts` turns town/world information into limited staffed missions.
- `ExpeditionPlanner.ts` evaluates one accepted mission's route, task cost, return cost, loadout, and feasibility.
- `MissionLifecycle.ts` owns phase transitions and return solvency.
- `RoutePlanner.ts` supplies deterministic path selection and avoids known dangerous routes where possible without revealing unknown-zone contents.
- `SupplyPolicy.ts` decides whether food/water/weapons justify rucksack space and controls Well conservation.
- `BasicBotController.ts` executes the active mission exclusively through legal `GameCommand`s.

AP remains the only ordinary action budget. Food/water refill to the normal maximum rather than adding clock hours, and bots delay consumption until near exhaustion so refill value is not wasted.

The current Well policy is:

- `normal`: more than 2.0 rations per living citizen;
- `cautious`: 1.0–2.0;
- `critical`: below 1.0.

These bands control new expedition withdrawals, not thirst survival, and are isolated tuning heuristics.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` remains the common action surface for React, bots, future LLM-assisted agents, and future remote humans. Controllers never directly mutate AP, inventory, homes, the Well, map, Bank, construction, gate, zombies, clock time, or special-site state.

Town mission assignment/phase state is different: it is simulation orchestration rather than a citizen gameplay command, but it is still represented by authoritative events and reduced through `events.ts` so persistence/replay remain explicit.

## Night resolution

Night resolution remains isolated in `night.ts`:

1. 23:00 autonomous activity finishes before midnight.
2. 00:00 is an explicit attack phase.
3. Advancing to 01:00 resolves outside deaths, horde strength, shared defense, and home-defense outcomes.
4. Citizens still outside die while camping remains deferred.
5. A closed gate applies shared defense; an open gate nullifies it.
6. Breaching zombies are distributed across surviving citizens in town.
7. Personal home defense determines survival.
8. `DAY_STARTED` resets AP/daily state and clears stale field missions for the new day.

## Temporary testing tools

The React-local `controlledCitizenId` lets the Citizens screen temporarily operate any living citizen. It is not persisted and does not change `Citizen.controller`.

The Citizens screen also exposes AI diagnostics: assigned role, mission phase, target, reason, loadout/AP budget, return-safety requirement and margin, water/storage policy, and explicit `RESERVE` state for unassigned bots. The display reads the same authoritative mission state and planning helpers used by automation.

The diagnostics are temporary development UI. Active mission assignments themselves are persisted because they affect multi-hour simulation behavior.

## Determinism and persistence

`Math.random()` should not be used inside the game core. A seed plus the same ordered commands and time advances should reproduce the same simulation result.

Save data is schema version **8**. The new persisted field is `botMissions`. Schema 2–7 saves migrate forward with an empty mission board while preserving citizen, town, clock, world, construction, Well, special-site, and event progress. `DAY_STARTED` clears unfinished missions so assignments are reconsidered for the new day.

Historical events may lack an hour; new command/time/night/mission events remain timestamped. The temporary controlled-citizen selection is not persisted.

## Future LLM integration

LLM providers will sit behind an agent adapter. A model can eventually influence mission preference, risk tolerance, social choices, supply sharing, or whether to accept an offered assignment, while authoritative rules and legal commands remain deterministic and validated by the game core. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current: `React -> simulation advance -> local game core/controllers -> IndexedDB`

Future: `React -> network commands/time -> authoritative server using game core/controllers -> database`
