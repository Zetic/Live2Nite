# Architecture

Live2Nite starts as a single-player browser game but keeps simulation rules independent from React so the same core can later move behind an authoritative multiplayer server.

## Boundaries

- `src/core`: authoritative rules and persisted gameplay state. No React, DOM, network, IndexedDB, or local-storage dependencies.
- `src/agents`: citizen controllers and deterministic planning helpers. Controllers select legal commands; they never directly mutate gameplay state.
- `src/agents/planning`: town needs, mission coordination, routes, expedition budgets, supply policy, camping intent, and return safety.
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
- `camping.ts`: camping outlook, reconstructed survival probability, deterministic overnight roll, and campsite constants.
- `night.ts`: camping/outside resolution, horde strength, Watchtower estimates, breaches, home survival, hydration resolution, and day rollover.
- `defense.ts`: town/home defense aggregation.
- `combat.ts`: deterministic zombie combat and weapon definitions.
- `world.ts`: map generation, movement, zone control, scavenging, campsite state, and deterministic special-site placement.
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

The same command/event path is used by the controlled citizen and bots. React does not directly alter AP, inventories, citizen status, camping state, Well water, map state, zombies, construction, gate state, or the clock.

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

Schema v10 introduced persisted `Citizen.status`:

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

## Camping state and lifecycle

Schema v11 adds persisted citizen camping history and per-zone campsite preparation.

Citizen state:

```text
hidden: boolean
survivalChance: number | null
hiddenDay: number | null
nightsSurvived: number
lastSurvivedDay: number | null
```

Zone state:

```text
campImprovements: number
```

Authoritative camping lifecycle:

`outside activity -> improve camp (optional, 1 AP each) -> hide -> midnight roll -> survive/fail`

Rules enforced by the core:

- the town-gate tile cannot be used as a campsite;
- hiding locks the current survival chance and blocks ordinary actions until `LEAVE_HIDEOUT`;
- unhidden citizens still outside at night die as `outside_at_night`;
- failed campers die as `camping_failure`;
- successful campers remain at the same World Beyond coordinate;
- `DAY_STARTED` refreshes AP and clears the hidden flag, so another night requires another Hide action;
- successful camping increments persistent camping history;
- current campsite improvements decay by one level after a resolved night.

The factors used by `camping.ts` follow surviving English evidence, but the exact coefficients are a `LIVE2NITE_ADAPTATION`. See `docs/die2nite-reference/camping.md` for the historical boundary.

## Status-aware AI

Hydration is part of planning rather than a UI-only flag.

`SupplyPolicy`:

- reserves water for an active hydration condition;
- allows urgent treatment to override normal expedition Well-conservation policy;
- does not count Dehydrated treatment water as six potential AP;
- can deliberately provision water for an accepted overnight expedition.

`BasicBotController`:

- drinks accessible water before ordinary work when Thirsty/Dehydrated;
- may withdraw Bank water or take a Well ration for treatment;
- returns toward town when outside with a hydration warning and no carried water, unless zombie control prevents movement;
- on a mission in `camp`, improves the site toward the AI camping threshold and then hides.

Water already consumed during the expedition counts as overnight hydration security. A bot does not lose a deliberate camping plan merely because it drank the ration it packed to extend its outbound AP budget.

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

Same-day lifecycle:

`prepare -> outbound -> operate -> return -> unload -> complete`

Intentional overnight lifecycle adds:

`prepare -> outbound -> operate -> camp -> [night] -> operate/outbound -> return -> unload -> complete`

Citizens keep the same target until completion/abort. Searching a destination no longer causes immediate target thrashing into another outward expedition.

### Stable overnight intent

`allowsCamping` only marks a non-emergency mission as eligible to be considered for camping. At assignment time, `ExpeditionPlanner` compares the full same-day round trip with the one-way/task camping budget. `TownMissionPlanner` then persists the result as `overnightPlanned`.

That decision is intentionally stable:

- `overnightPlanned: false` missions remain same-day missions even if they later overspend or encounter trouble;
- `overnightPlanned: true` missions retain their camping intent across later hourly recalculations;
- emergency rescue assignments always persist `overnightPlanned: false`;
- schema migrations normalize older active missions to same-day behavior rather than silently converting them into camping missions.

This prevents camping from becoming an automatic bailout for broken return planning.

## Return-solvency invariant

Ordinary same-day missions continuously compare:

`usable remaining AP = current AP + actually usable carried refill capacity`

against:

`required return AP = safe route home + mission safety reserve`

When the return reserve is reached, the mission transitions to `return` immediately. Only supplies the citizen can actually access while outside count toward solvency.

Intentional overnight missions are evaluated differently at dispatch: they must be unable to make the safe same-day round trip while still being able to cover their one-way/task budget and overnight hydration requirement. Their accepted camping intent is persisted rather than rediscovered after AP has been spent.

Scouts keep a larger safety reserve than known-resource gatherers. Emergency rescue missions may accept more risk but never intentionally camp.

## Rescue semantics

A rescue is not complete merely because a rescuer briefly enters the trapped zone. A rescue mission remains in `operate` while the protected citizen is still there so the player receives a real action window with restored human control.

If a rescue needs more citizens than the two field-capable dedicated responders, the planner can use other available town citizens rather than dispatching the night gate reserve.

## World Beyond search layers

A zone can expose three independent resource channels:

1. ordinary search — useful finite finds;
2. depleted search — Rotting Log / Scrap Metal feedstock;
3. special-site search — location-specific ruin loot.

Ordinary citizens can also receive automatic searches after remaining on a productive zone for the reconstructed two-hour cadence. Hidden citizens are excluded from automatic search because hiding locks ordinary field activity.

Special sites begin buried. Excavation progress is shared. The current map has 12 deterministic sites from six initial identities; exact count, placement, excavation requirements, and loot weights are explicit adaptations.

## Mission and supply planning stack

- `TownNeeds.ts`: construction/resource/Well pressure.
- `TownMissionPlanner.ts`: creates and staffs a limited mission set and persists same-day vs overnight intent.
- `ExpeditionPlanner.ts`: route, task, return, overnight, loadout, and feasibility for an accepted mission.
- `MissionLifecycle.ts`: phase changes, camp transition, and return-solvency enforcement.
- `RoutePlanner.ts`: deterministic routing that avoids known risk without revealing unknown-zone contents.
- `SupplyPolicy.ts`: food/water/weapon slot decisions and Well conservation.
- `BasicBotController.ts`: chooses executable legal commands.

The non-emergency Well conservation bands remain Live2Nite tuning values:

- normal: >2 rations per living citizen;
- cautious: 1–2;
- critical: <1.

Hydration treatment can override those expedition-economics bands because it is a direct survival need. Intentional overnight missions may also take water under normal/cautious policy; critical towns still refuse non-rescue overnight Well spending.

## Night resolution

The attack conclusion remains isolated in `night.ts`:

1. bots complete the 23:00 window;
2. time enters 00:00 attack phase;
3. outside citizens are resolved: unhidden citizens die; hidden citizens receive deterministic camping rolls;
4. attack strength and effective shared defense are resolved using the surviving in-town population;
5. breaching zombies are distributed across surviving in-town citizens;
6. personal home defense determines home-breach survival;
7. surviving citizens, including successful campers, resolve hydration progression and untreated Dehydrated deaths;
8. the Night Report records horde/home/outside/camping/dehydration outcomes;
9. Search Tower replenishment is resolved;
10. campsite improvements decay;
11. `DAY_STARTED` refreshes AP/daily-use state and preserves only missions belonging to living citizens who remain outside.

A successful mission in `camp` becomes `operate` on the next day when the camper is already at the mission target, otherwise it becomes `outbound`. Same-day missions carried by citizens who died outside are removed with the citizen death event.

## UI boundary

The compact controlled-citizen status HUD is React presentation over authoritative state. It does not own a second condition or camping model.

The top HUD exposes immediate AP/condition information. The World Beyond screen exposes:

- qualitative camping outlook as the primary player-facing risk message;
- the exact Live2Nite percentage as a secondary reconstructed estimate;
- campsite improvement level;
- Improve / Hide / Leave Hideout actions.

The Citizens screen remains the deeper testing surface for:

- hydration and desert-step progress;
- mission role/phase/target;
- AP/loadout budget;
- same-day vs overnight plan;
- return margin;
- water/storage policy;
- reserve state.

`controlledCitizenId` remains React-local and does not change the persisted controller type.

## Determinism and persistence

Core rules should not use scattered `Math.random()`. A seed plus the same ordered commands/time advances should reproduce the same result.

Save schema is **v11**. Schema 2–10 saves migrate forward. Legacy citizens receive default hydration/camping state, legacy zones receive zero campsite improvements, and pre-v11 active missions are normalized as same-day missions with no implicit camping intent. Existing world/town/clock/construction progress is otherwise preserved.

Camping survival uses an isolated deterministic seed derived from town seed, day, and citizen so adding unrelated random calls elsewhere does not silently change overnight camping outcomes.

New `ITEM_CONSUMED` events record whether the use actually restored AP. Historical events missing that field migrate as AP-restoring consumption, matching the pre-v10 behavior.

## Regression strategy

The test suite now contains three levels of simulation protection:

- focused unit/behavior tests for individual commands and camping rules;
- the existing 12-seed Day-1 economy/survival benchmark;
- a multi-day benchmark that runs several 40-citizen towns through three complete nights and checks gate discipline, dehydration safety, population survival, outside-at-midnight pressure, and camping accounting.

The multi-day benchmark does not require bots to camp during the first three days. Conservative AI should prefer safe same-day work while nearby missions remain viable; dedicated camping tests exercise intentional overnight dispatch separately.

## Future status and camping families

The status boundary is intentionally prepared for later historically researched systems such as Wounded, Infected, Terrorized, Healed, Drugged/Addicted, and alcohol effects. Camping-specific equipment, hero/class modifiers, tomb searching, and additional camping rewards should likewise be added as dedicated researched slices rather than speculative flags.

## Future LLM integration

An LLM may eventually influence strategy, social intent, risk tolerance, mission preference, or willingness to accept an overnight assignment. It will not mutate state or bypass legal commands. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current:

`React -> local simulation/core/controllers -> IndexedDB`

Future:

`React -> network commands/time -> authoritative server using the same core/controllers -> database`
