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
- `night.ts`: camping/outside resolution, horde strength, Watchtower estimates, breaches, home survival, hydration resolution, World Beyond evolution, and day rollover.
- `defense.ts`: town/home defense aggregation.
- `combat.ts`: deterministic zombie combat and weapon definitions.
- `world.ts`: map generation, movement, zone control, scavenging, campsite state, and deterministic special-site placement.
- `worldEvolution.ts`: deterministic nightly World Beyond zombie evolution.
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

## World intelligence and control

Schema v12 separates authoritative zombie truth from shared town observations.

`WorldZone.zombies` remains authoritative core truth. AI routing/planning and the strategic map consume `WorldState.intel` through the World Knowledge boundary instead of reading hidden zombie changes directly.

Zombie observations store:

```text
observedZombies
lastObservedDay
lastObservedHour
```

Freshness is derived as fresh, stale, or unknown. Nightly evolution changes authoritative zombie populations without rewriting yesterday's observations, so repeat reconnaissance becomes useful while geographical/site/depletion knowledge remains persistent.

Zone control now exposes decision states around the existing historical control equation:

- `secure` — controlled with departure margin;
- `fragile` — controlled, but one departure would lose control;
- `temporary` — actual control lost while a citizen-specific extraction window remains;
- `trapped` — no actual or temporary control.

Temporary control is an extraction permission, not full zone ownership: movement/emergency actions remain possible, while ordinary scavenging and special-site work do not.

See `docs/world-intelligence-control.md` for the detailed schema-v12 boundary and rescue/extraction rules.

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

- `scout` — reveal routes, zombie counts, resources, and special sites, including repeat reconnaissance of stale known territory;
- `gatherer` — exploit known productive destinations;
- `excavator` — clear known buried sites;
- `rescue` — restore control and extract trapped citizens/responders;
- `combat` — reserved for increasingly explicit hostile-site missions.

Current isolated AI tuning values:

- minimum general town reserve: roughly 15% of living basic bots, never fewer than three;
- new ordinary field assignments: up to roughly 20% of living bots per hour;
- early poorly known maps target four active scouts, generally paired;
- mature maps retain a smaller repeat-recon scout presence;
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

Scouts keep a larger safety reserve than known-resource gatherers. Emergency rescue assignments now budget both the route to the casualty and the extraction/return leg rather than accepting on outbound reach alone.

## Rescue semantics

A rescue is not complete merely because a rescuer briefly enters the trapped zone. The protected citizen is given an extraction opportunity, responders reason about whether departures will break control, and responder missions remain active until they return to town.

If a departure causes actual control loss, remaining citizens can receive the schema-v12 temporary-control extraction window. Rescue combat is control-aware: bots can reduce the threat only as far as needed to make extraction viable rather than automatically trying to clear every zombie.

If a rescue needs more citizens than the two field-capable dedicated responders, the planner can use other available town citizens rather than dispatching the night gate reserve.

## World Beyond search layers

A zone can expose three independent resource channels:

1. ordinary search — useful finite finds;
2. depleted search — Rotting Log / Scrap Metal feedstock;
3. special-site search — location-specific ruin loot.

Ordinary citizens can also receive automatic searches after remaining on a productive zone for the reconstructed two-hour cadence. Hidden citizens are excluded from automatic search because hiding locks ordinary field activity. Trapped or temporary-control citizens cannot continue ordinary productive searching merely because they still have an extraction window.

Special sites begin buried. Excavation progress is shared. The current map has 12 deterministic sites from six initial identities; exact count, placement, excavation requirements, and loot weights are explicit adaptations.

## Mission and supply planning stack

- `TownNeeds.ts`: construction/resource/Well pressure.
- `TownMissionPlanner.ts`: creates and staffs a limited mission set and persists same-day vs overnight intent.
- `ExpeditionPlanner.ts`: route, task, return, overnight, loadout, and feasibility for an accepted mission.
- `MissionLifecycle.ts`: phase changes, camp transition, and return-solvency enforcement.
- `RoutePlanner.ts`: deterministic routing over shared town knowledge, with stale-intel penalties and repeat-recon targets.
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
11. authoritative World Beyond zombie populations evolve without rewriting old town observations;
12. `DAY_STARTED` refreshes AP/daily-use state and preserves only missions belonging to living citizens who remain outside.

A successful mission in `camp` becomes `operate` on the next day when the camper is already at the mission target, otherwise it becomes `outbound`. Same-day missions carried by citizens who died outside are removed with the citizen death event.

## UI boundary

The compact controlled-citizen status HUD is React presentation over authoritative state. It does not own a second condition, camping, intelligence, or control model.

The World Beyond map displays shared town knowledge rather than hidden authoritative zombie truth. It exposes live citizen counts and freshness-aware zombie reports (`H#`, `Z#`, `Z~#`, `Z?`), plus control state and active rescue markers. The controlled citizen is represented by a tile highlight instead of replacing the zone information.

The detailed current-zone panel can display authoritative local zombie information because the controlled citizen is physically present and therefore observing that zone.

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

Save schema is **v12**. Schema 2–11 saves migrate forward. Legacy citizens receive default hydration/camping state, legacy zones receive zero campsite improvements, and v12 migration initializes shared zombie observations from the state a legacy save legitimately knew at migration time. Existing world/town/clock/construction progress is otherwise preserved.

Camping survival uses an isolated deterministic seed derived from town seed, day, and citizen so adding unrelated random calls elsewhere does not silently change overnight camping outcomes. World zombie evolution is likewise deterministic from persisted town/world inputs.

New `ITEM_CONSUMED` events record whether the use actually restored AP. Historical events missing that field migrate as AP-restoring consumption, matching the pre-v10 behavior.

## Regression strategy

Tests are separated conceptually by what they protect:

1. **Hard rule/architecture invariants** — command legality, AP/accounting, persistence migration, deterministic output, hidden-information boundaries, zone-control semantics, temporary-control restrictions, gate-reserve behavior, rescue extraction, and other concrete bug regressions. These are CI merge gates.
2. **Focused pathological scenarios** — known failures such as the mass-departure seed or a rescuer becoming the replacement trapped citizen. These remain CI merge gates even while overall balance is unfinished.
3. **Economy/survival simulation benchmarks** — Day-1 economy and multi-day town metrics such as Workshop frequency, survivor count, dehydration deaths, Well level, defense, and outside-at-midnight population. During early development these are diagnostic telemetry, not exact balance gates.

Balance benchmarks still execute on every test run and print deterministic summaries so large changes can be noticed and investigated. They intentionally do not fail solely because an incomplete progression/defense/camping/profession/social system changes a provisional survival or economy target.

Structural accounting inside benchmarks remains strict where appropriate: for example, gate-reserve discipline and camping outcome accounting are still asserted because those are invariants rather than balance targets.

As the major game systems stabilize, selected benchmark metrics can be promoted into explicit acceptance thresholds with documented baselines.

## Future status and camping families

The status boundary is intentionally prepared for later historically researched systems such as Wounded, Infected, Terrorized, Healed, Drugged/Addicted, and alcohol effects. Camping-specific equipment, hero/class modifiers, tomb searching, and additional camping rewards should likewise be added as dedicated researched slices rather than speculative flags.

## Future LLM integration

An LLM may eventually influence strategy, social intent, risk tolerance, mission preference, or willingness to accept an overnight assignment. It will not mutate state or bypass legal commands or the World Knowledge boundary. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current:

`React -> local simulation/core/controllers -> IndexedDB`

Future:

`React -> network commands/time -> authoritative server using the same core/controllers -> database`
