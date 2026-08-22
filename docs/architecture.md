# Architecture

Live2Nite starts as a single-player browser game but keeps simulation rules independent from React so the same core can later move behind an authoritative multiplayer server.

## Boundaries

- `src/core`: authoritative rules and persisted gameplay state. No React, DOM, network, IndexedDB, or local-storage dependencies.
- `src/agents`: citizen controllers and deterministic planning helpers. Controllers select legal commands; they never directly mutate gameplay state.
- `src/agents/planning`: town needs, mission coordination, routes, expedition budgets, supply policy, and return safety.
- `src/simulation`: orchestration between the persistent clock and autonomous controllers.
- `src/persistence`: save/load adapters. IndexedDB is the current implementation.
- `src/ui`: React presentation, human input, and removable testing diagnostics.

## Core domains

- `actions.ts`: common legal-action surface for humans and autonomous controllers.
- `commands.ts`: command validation and gameplay-event production.
- `events.ts`: authoritative event reduction into state.
- `clock.ts`: persistent hour/phase definitions and forward-time helpers.
- `game.ts`: initial state creation.
- `status.ts`: citizen-condition definitions and hydration progression/treatment rules.
- `night.ts`: horde strength, Watchtower estimates, outside deaths, breaches, home survival, hydration resolution, and day rollover.
- `defense.ts`: town/home defense aggregation.
- `combat.ts`: deterministic zombie combat and weapon definitions.
- `world.ts`: map generation, movement, zone control, scavenging, and deterministic special-site placement.
- `specialSites.ts`: special-site identities and location-specific loot.
- `items.ts`: item metadata, starter packages, consumables, defense objects, weapons, and scavenging pools.
- `home.ts`: home levels, personal defense, storage, and daily-use state.
- `well.ts`: starting-well generation.
- `construction.ts`: construction catalog, prerequisites, effects, and priority scoring.
- `workshop.ts`: Workshop transformations and current repair recipes.
- `rng.ts`: deterministic random-number generation.

## Command/event invariant

Gameplay follows:

`GameCommand -> legal-action validation -> GameEvent[] -> reducer -> GameState`

The same command/event path is used by the controlled citizen and bots. React does not directly alter AP, inventories, citizen status, Well water, map state, zombies, construction, gate state, or the clock.

Simulation-owned mission-assignment and mission-phase changes are also explicit events so persistence/replay remain inspectable.

## Clock and hourly simulation

A day begins at **01:00**. Normal actions remain available through **23:00**. **00:00–01:00** is the visible attack phase.

The ordering invariant is:

1. The controlled citizen issues any commands desired in the current hour.
2. The player requests a time advance.
3. `runBotHour` lets uncontrolled bots finish their current-hour decisions.
4. `TIME_ADVANCED` moves the clock.

AP remains the action budget. The clock is a planning cadence, not a one-action-per-hour system. A citizen four tiles out with four AP can move all four tiles during the 23:00 bot window before midnight.

`advanceToHour` repeats every intermediate hourly simulation tick rather than teleporting.

## Citizen status state

Schema v10 adds persisted `Citizen.status`:

```text
hydration: normal | thirsty | dehydrated
desertStepsToday: number
```

Only condition state that must survive commands/time is persisted. Statuses that are already derivable are not duplicated:

- `Exhausted` derives from `ap === 0`;
- satisfied-food derives from `daily.ate`;
- satisfied-water derives from `daily.drank`.

The first implemented condition family is hydration:

- 11 desert movements while normally hydrated -> `thirsty`;
- another 11 while Thirsty -> `dehydrated`;
- reaching midnight without drinking while normal -> `thirsty`;
- surviving midnight while already Thirsty -> `dehydrated`;
- remaining Dehydrated through midnight -> dehydration death in the current reconstruction;
- drinking while Thirsty -> normal hydration;
- drinking while Dehydrated -> Thirsty and **does not restore AP**.

A citizen may therefore consume water for treatment even after the once-per-day water AP refresh has already been used. The event explicitly records `restoresAp` so treatment and AP restoration cannot be conflated.

See `docs/die2nite-reference/status-hydration.md` for evidence/confidence boundaries.

## Status-aware AI

Hydration is part of planning rather than a UI-only flag.

`SupplyPolicy`:

- reserves water for an active hydration condition;
- allows urgent treatment to override normal expedition Well-conservation policy;
- does not count Dehydrated treatment water as six potential AP.

`BasicBotController`:

- drinks accessible water before ordinary work when Thirsty/Dehydrated;
- may withdraw Bank water or take a Well ration for treatment;
- returns toward town when outside with a hydration warning and no carried water, unless zombie control prevents movement.

This is deterministic Live2Nite autonomous behavior, not a claim about an original Die2Nite bot system.

## Coordinated town missions

The mission layer prevents every citizen independently deciding to solve the same town need.

Current field roles:

- `scout` — reveal routes, zombie counts, resources, and special sites;
- `gatherer` — exploit known productive destinations;
- `excavator` — clear known buried sites;
- `rescue` — restore control around trapped citizens;
- `combat` — reserved for increasingly explicit hostile-site missions.

Current isolated AI tuning values:

- minimum general town reserve: roughly 15% of living basic bots, never fewer than three;
- new ordinary field assignments: up to roughly 20% of living bots per hour;
- early poorly known maps target four active scouts, generally paired;
- three citizens form the dedicated emergency reserve;
- one of those three is a **night gate reserve** and is excluded from all field missions;
- dedicated reserves can help town work while preserving the 4 AP floor established by PR #13 unless they accept an emergency assignment.

The gate reserve is a Live2Nite safety policy added after a deterministic benchmark showed that simultaneous rescue missions could consume every bot capable of paying the final 1 AP gate-closing cost.

## Persisted mission lifecycle

Accepted field assignments live in `GameState.botMissions[citizenId]` because continuity across hours affects survival.

Normal lifecycle:

`prepare -> outbound -> operate -> return -> unload -> complete`

Citizens keep the same target until completion/abort. Searching a destination no longer causes immediate target thrashing into another outward expedition.

## Return-solvency invariant

Ordinary missions continuously compare:

`usable remaining AP = current AP + actually usable carried refill capacity`

against:

`required return AP = safe route home + mission safety reserve`

When the return reserve is reached, the mission transitions to `return` immediately. Only supplies the citizen can actually access while outside count toward solvency.

Scouts keep a larger safety reserve than known-resource gatherers. Emergency rescue missions may accept more risk.

## Rescue semantics

A rescue is not complete merely because a rescuer briefly enters the trapped zone. A rescue mission remains in `operate` while the protected citizen is still there so the player receives a real action window with restored human control.

If a rescue needs more citizens than the two field-capable dedicated responders, the planner can use other available town citizens rather than dispatching the night gate reserve.

## World Beyond search layers

A zone can expose three independent resource channels:

1. ordinary search — useful finite finds;
2. depleted search — Rotting Log / Scrap Metal feedstock;
3. special-site search — location-specific ruin loot.

Ordinary citizens can also receive automatic searches after remaining on a productive zone for the reconstructed two-hour cadence.

Special sites begin buried. Excavation progress is shared. The current map has 12 deterministic sites from six initial identities; exact count, placement, excavation requirements, and loot weights are explicit adaptations.

## Mission and supply planning stack

- `TownNeeds.ts`: construction/resource/Well pressure.
- `TownMissionPlanner.ts`: creates and staffs a limited mission set.
- `ExpeditionPlanner.ts`: route, task, return, loadout, and feasibility for an accepted mission.
- `MissionLifecycle.ts`: phase changes and return-solvency enforcement.
- `RoutePlanner.ts`: deterministic routing that avoids known risk without revealing unknown-zone contents.
- `SupplyPolicy.ts`: food/water/weapon slot decisions and Well conservation.
- `BasicBotController.ts`: chooses executable legal commands.

The non-emergency Well conservation bands remain Live2Nite tuning values:

- normal: >2 rations per living citizen;
- cautious: 1–2;
- critical: <1.

Hydration treatment can override those expedition-economics bands because it is now a direct survival need.

## Night resolution

The attack conclusion remains isolated in `night.ts`:

1. bots complete the 23:00 window;
2. time enters 00:00 attack phase;
3. citizens still outside die while camping remains deferred;
4. attack strength and effective shared defense are resolved;
5. breaching zombies are distributed across surviving in-town citizens;
6. personal home defense determines home-breach survival;
7. surviving citizen hydration progresses and untreated Dehydrated citizens die;
8. the Night Report records horde/home/outside/dehydration outcomes;
9. Search Tower replenishment is resolved;
10. `DAY_STARTED` refreshes AP/daily-use state and clears stale missions.

## UI boundary

The compact controlled-citizen status HUD is React presentation over authoritative state. It does not own a second condition model.

The top HUD exposes immediate AP/condition information. The Citizens screen remains the deeper testing surface for:

- hydration and desert-step progress;
- mission role/phase/target;
- AP/loadout budget;
- return margin;
- water/storage policy;
- reserve state.

`controlledCitizenId` remains React-local and does not change the persisted controller type.

## Determinism and persistence

Core rules should not use scattered `Math.random()`. A seed plus the same ordered commands/time advances should reproduce the same result.

Save schema is **v10**. Schema 2–9 saves migrate forward. Legacy citizens receive a normal hydration state with zero desert travel debt; existing world/town/clock/construction/mission progress is preserved.

New `ITEM_CONSUMED` events record whether the use actually restored AP. Historical events missing that field migrate as AP-restoring consumption, matching the pre-v10 behavior.

## Future status families

The status boundary is intentionally prepared for later historically researched systems such as Wounded, Infected, Terrorized, Healed, Drugged/Addicted, and alcohol effects. They should be added as dedicated gameplay slices rather than speculative flags.

## Future LLM integration

An LLM may eventually influence strategy, social intent, risk tolerance, or mission preference. It will not mutate state or bypass legal commands. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current:

`React -> local simulation/core/controllers -> IndexedDB`

Future:

`React -> network commands/time -> authoritative server using the same core/controllers -> database`
