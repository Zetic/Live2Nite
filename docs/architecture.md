# Architecture

Live2Nite starts as a single-player browser game but keeps simulation rules independent from React so the same core can later move behind an authoritative multiplayer server.

## Boundaries

- `src/core`: authoritative rules and persisted gameplay state. No React, DOM, network, IndexedDB, or local-storage dependencies.
- `src/agents`: citizen controllers and deterministic decision helpers. Controllers select legal commands; they never directly mutate gameplay state.
- `src/agents/coordination`: public, forum-like citizen commitments and volunteering rules.
- `src/agents/planning`: town needs, mission opportunities, routes, expedition budgets, supply policy, camping intent, defense strategy, and return safety.
- `src/simulation`: orchestration between the persistent clock and autonomous controllers.
- `src/persistence`: save/load adapters. IndexedDB is the current implementation.
- `src/ui`: React presentation, human input, and removable diagnostics.

## Command/event invariant

Gameplay follows:

`GameCommand -> legal-action validation -> GameEvent[] -> reducer -> GameState`

The controlled citizen and bots use the same commands and reducers. React does not directly alter AP, inventory, item state, status, camping, Well water, construction, homes, zombies, gate state, or time.

Simulation-owned mission and coordination changes are also explicit events so save/replay history stays inspectable.

## Core domains

- `actions.ts`: common legal-action surface.
- `commands.ts`: validation and gameplay-event production.
- `events.ts`: authoritative event reduction.
- `clock.ts`: day/attack time model.
- `game.ts`: initial state creation.
- `status.ts`: hydration progression and treatment.
- `camping.ts`: camping outlook and deterministic survival.
- `night.ts`: camping/outside resolution, horde attack, home survival, hydration, construction effects, World Beyond evolution, and day rollover.
- `construction.ts`: data-driven construction catalog, prerequisites, effects, and baseline priority scoring.
- `defense.ts`: derived town/home defense aggregation.
- `world.ts`: map generation, movement, zone control, scavenging, campsite state, and special-site placement.
- `worldEvolution.ts`: deterministic nightly zombie evolution.
- `itemCatalog.ts`: stable item identifiers plus common state/display vocabulary.
- `items.ts`: item capabilities, state normalization, display metadata, and canonical item construction.
- `bank.ts`: item-instance Bank queries, exact removal, aggregate counts, and derived state-aware stacks.
- `itemRecipes.ts`: generalized type/state requirement matching for future transformations.
- `home.ts`, `well.ts`, `workshop.ts`, `combat.ts`: their respective gameplay domains.

## Clock and hourly simulation

A day begins at **01:00**. Normal actions remain available through **23:00**. **00:00–01:00** is the visible attack phase.

Hourly ordering is:

1. The controlled citizen acts in the current hour.
2. The player advances time.
3. `runBotHour` performs the uncontrolled citizens' current-hour coordination and decisions.
4. `TIME_ADVANCED` moves the clock.

The clock is a planning cadence, not a one-action-per-hour rule. If a citizen can safely perform several actions with remaining AP, the bot may do so within one simulation hour. Town work that represents one bounded commitment, including a construction contribution, personal-home improvement, or strategic material withdrawal, ends that citizen's town-work step for the hour so the bot cannot consume an entire shared stockpile in one decision loop.

## Status and camping lineage

Schema v10 introduced persisted hydration condition state. Schema v11 added persistent citizen camping history and per-zone campsite preparation.

Hydration is part of planning rather than UI decoration. Bots can treat Thirsty/Dehydrated conditions, distinguish treatment water from AP-restoring water, and return toward town when hydration safety deteriorates.

Camping remains intentional mission state rather than an automatic bailout. Accepted missions persist whether they were planned as same-day or overnight; a same-day mission cannot silently become a camping mission merely because it overspent.

Exact camping coefficients remain a `LIVE2NITE_ADAPTATION`; see `docs/die2nite-reference/camping.md`.

## World intelligence and control

Schema v12 separates authoritative zombie truth from shared town observations.

`WorldZone.zombies` is authoritative core truth. AI routing/planning and the strategic map consume `WorldState.intel` through the World Knowledge boundary instead of reading hidden zombie changes directly.

Zombie observations store observed count and observation day/hour. Freshness is derived as fresh, stale, or unknown. Nightly zombie evolution changes truth without rewriting yesterday's reports, making repeat reconnaissance useful.

Zone control exposes decision states around the historical control equation:

- `secure` — controlled with departure margin;
- `fragile` — controlled but one departure would lose control;
- `temporary` — actual control was lost but a citizen-specific extraction window remains;
- `trapped` — no actual or temporary control.

Temporary control permits extraction/emergency behavior, not productive scavenging. Rescue missions budget both arrival and extraction/return and remain active until responders return to town.

See `docs/world-intelligence-control.md`.

## Construction and town progression

Schema v13 expanded construction into a broad data-driven tree.

Construction definitions own category, prerequisites, AP/material requirements, source/confidence metadata, temporary lifecycle, optional facility identity, and structured effects. Other systems query generic effects rather than checking dozens of construction IDs.

Supported effect families include derived town defense, Bank/home-defense contribution, Well water/access, Workshop AP discounts, Watchtower forecasting, Search Tower replenishment, camping support, gate locking/auto-close, daily production, and terrain revelation.

The 40-point `town.defense` field is bootstrap/static defense. Effective defense is derived from that base plus Bank objects, eligible home defense, completed projects, multipliers, and temporary defenses.

See `docs/die2nite-reference/construction-expansion.md`.

## Distributed citizen coordination

Schema v14 replaces the old hidden fixed gate/rescue citizen allocation with public commitments and individual volunteering.

There is deliberately **no shared town AP pool and no hidden overseer**. Each citizen decides from information that an ordinary player could reasonably know:

- public Bank, Well, construction, gate, defense, time, and citizen-location state;
- freshness-aware World Knowledge;
- active field claims (`botMissions`);
- public coordination commitments;
- that citizen's own AP, supplies, status, route and risk budget.

`GameState.coordination.commitments` currently represents forum-like intentions for:

- a primary citizen volunteering to preserve 1 AP for the gate;
- a backup citizen volunteering to preserve 1 AP for the gate;
- short-lived construction claims so a buildable project does not make every citizen a town worker.

Commitments are explicit `COORDINATION_COMMITMENT_POSTED` / `COORDINATION_COMMITMENT_CLEARED` events. Citizens can spend AP above a gate commitment's reserved floor. A simple Portal Lock still requires a closer because it only prevents reopening; true automatic closing removes the need for manual gate volunteers.

Construction uses saturation rather than universal eligibility: a bounded number of citizens volunteer for current labor, while later citizens remain free to seek field work. Late in the day, otherwise-unassigned citizens may use legal town work as an AP sink because daily AP is perishable.

If a later-day town is resource-starved and field coverage is thin, citizens with sufficient AP can independently volunteer for additional exploration. Day 1 retains the staged scout opening rather than immediately flooding the gate.

Nearby low-risk depleted zones are valid construction-salvage missions because Rotting Logs and Scrap Metal remain useful Workshop feedstock.

See `docs/distributed-coordination.md`.

## Home progression and threat-aware defense

Schema v15 expands the citizen home from the initial Camp Bed/Tent slice into persistent structural progression and supported Home Improvements.

The structural path is:

`Camp Bed -> Tent -> Hovel -> Shack -> House -> Fenced House -> Fortified Shelter -> Bunker -> Castle`

A citizen may perform at most one structural home upgrade per day. Home upgrades and Home Improvements consume that citizen's personally held materials through normal legal commands/events rather than silently consuming the shared Bank. Where Live2Nite does not yet contain the mature historical material type, the definition records an explicit adapted substitution rather than pretending the replacement is historically exact.

Personal home defense and shared town defense are deliberately different quantities:

- structural home defense and supported defensive Home Improvements protect the resident during a breach;
- defensive objects stored in the private home chest protect that resident but do **not** become shared town defense merely by being private property;
- eligible home defense contributes 40% to the town by default and 80% after Circular Quarters, using the construction effect layer.

`src/agents/planning/TownDefenseStrategy.ts` provides the public threat model used by autonomous citizens. It may use only information an ordinary citizen could reasonably know:

- a built Watchtower's visible estimate range; or
- the previous public Night Report as a conservative historical planning anchor when no Watchtower estimate exists.

It never calls the deterministic upcoming attack-strength function. The exact attack remains authoritative night-resolution truth.

Defense pressure is classified as `comfortable`, `uncertain`, `shortfall`, or `critical`. That pressure can alter construction volunteering and individual town work, including prioritizing defensive projects, emergency temporary defense, or personal home reinforcement. Citizens may withdraw a Home-upgrade material from the Bank only when it is surplus to the current communal strategic priority.

An open gate is normal during daytime expeditions and therefore is not itself treated as a defense emergency. A still-open gate becomes critical only in the late pre-attack window; gate volunteers remain responsible for sealing it.

Strategic construction ranking computes the public defense assessment once per decision/pass and scores each candidate once. This prevents the broader construction catalog from turning hourly bot simulation into repeated nested full-tree rescoring.

## Stateful item economy

Schema v16 changes shared storage from anonymous per-type Bank counts to authoritative `ItemInstance[]` objects and introduces the persistent item-state vocabulary needed for the larger object catalog.

The same object identity model now applies to the Bank, rucksack, Home chest, and World Beyond ground. A deposit/withdraw transfer moves the exact object and does not consume a generated item ID. The UI may derive visual stacks, but objects stack only when both item type and normalized state match.

Initial state families cover charges, condition, contamination, and future assembly state. The catalog can therefore describe a Water Pistol with three charges, another with one charge, and an empty one without inventing three unrelated item types.

`ItemType` is derived from the canonical catalog. Adding an item to that catalog does not automatically place it into loot tables or make it historically confirmed; spawn availability, recipes, AI use, and historical confidence remain separate concerns.

Construction and other simple type/count consumers use aggregate Bank helpers. Exact withdrawals and stateful recipes select concrete instances. `itemRecipes.ts` supports state-constrained requirements such as an empty charge-bearing item or damaged equipment.

See `docs/item-economy.md`.

## Citizen home visits and corpse lifecycle

Schema v19 adds source-backed dead-citizen body state without treating a citizen corpse as an `ItemInstance`.

When a citizen dies while located in town, their home is marked `holdsBody = true`; carried items are transferred into the home chest and the dead citizen remains the identity attached to the body. Deaths outside town do not create a home corpse. This is intentionally separate from MyHordes item `cadaver_#00` (Traveller's Corpse), which belongs to the item/loot/food system.

A living in-town citizen can visit another citizen's home. If the owner is dead and the body is present, two current source-backed disposal actions are legal:

- drag the body outside town for **2 AP**;
- destroy the body with **1 Water Ration** from the visitor's rucksack or home chest.

Undisposed bodies enter the internal corpse-attack stage before the ordinary horde breach. Current MyHordes behavior is reconstructed as a roughly 66% citizen-attack branch while Well water remains and an otherwise water-loss branch that removes up to 20 rations; with an empty Well the corpse attacks a citizen. A successful internal citizen attack kills the target directly rather than testing personal home defense. Each corpse that completes an internal attack is marked so it does not repeatedly attack on later nights.

Cooking via Kremato-Cue, torch burning/fertilizer, Ghoul corpse devouring, and the broader foreign-home social/action surface are intentionally deferred until their dependencies are represented.

## Coordinated field missions

Active field roles are:

- `scout` — frontier exploration or repeat reconnaissance;
- `gatherer` — normal or depleted-zone resource work;
- `excavator` — clear known buried sites;
- `rescue` — restore control and extract citizens/responders;
- `combat` — explicit hostile-site work.

`botMissions[citizenId]` is persisted because intent across hours affects survival. A field mission doubles as a public claim: other citizens can see that somebody is already scouting or gathering at a target.

Typical lifecycle:

`prepare -> outbound -> operate -> return -> unload -> complete`

Intentional overnight missions add `camp` and resume on the following day.

The planner limits simultaneous field activity using visible population/claim saturation and per-hour volunteering, while every accepted citizen still has to pass their own expedition feasibility and return-solvency checks.

## Return-solvency invariant

Ordinary same-day missions compare:

`usable remaining AP = current AP + actually usable carried refill capacity`

against:

`required return AP = safe route home + safety reserve`

When the return reserve is reached, the citizen returns. Supplies only count if they are actually accessible and usable. Rescue includes the extraction leg. Overnight missions are accepted only when their one-way/task/camping budget is viable.

## World Beyond search layers

A zone exposes independent resource channels:

1. ordinary finite search;
2. depleted salvage for low-grade Workshop feedstock;
3. special-site excavation/search.

Automatic searches can occur after remaining on a productive zone for the reconstructed cadence. Hidden, trapped, or temporary-control citizens cannot continue ordinary productive work.

## Night resolution

The attack conclusion remains isolated in `night.ts`:

1. bots finish the 23:00 window;
2. time enters attack phase;
3. unhidden outside citizens and prepared campers resolve;
4. unresolved in-town corpses resolve their one-time internal reanimation attack;
5. horde strength and effective shared defense resolve;
6. breaches are distributed to in-town citizens;
7. personal home defense resolves home survival;
8. hydration/status progression and deaths resolve;
9. the Night Report is recorded;
10. construction/search/campsite overnight effects resolve;
11. authoritative World Beyond zombies evolve;
12. `DAY_STARTED` refreshes AP/daily-use state and clears day-scoped coordination commitments.

## UI boundary

The World Beyond map displays shared town knowledge, not hidden zombie truth. The detailed current-zone view can display authoritative local information because the controlled citizen is physically observing that zone.

Town Records is the first permanent navigation destination and the default screen. Its default **Town Bulletin** tab exposes public coordination and defense planning in one place: defense outlook/source, strategic construction need, gate volunteers, construction intentions, and active field claims. Chronicle and Statistics remain sibling Town Records tabs. There is no separate Communications screen in this slice.

The controlled citizen's Home screen separates **Inventory & Actions**, **Building Upgrades**, and **Home Improvements**. From Citizens, an in-town controlled citizen may also visit another citizen's home. Foreign-home visits are deliberately narrow in schema v19: basic home state is visible and a present corpse can be disposed of, while theft, complaints, descriptions, recycling, and other social-home actions remain separate future mechanics.

The Bank screen derives visual stacks from authoritative objects. State-bearing objects with different normalized state remain separate stacks and withdrawals resolve to one exact legal item ID.

The Citizens screen defaults to a dense fixed-height **Overview** table for scanning the whole town: citizen, primary status, location, AP, rucksack occupancy, home level, assignment, and Home/Control actions. The existing card-heavy diagnostics remain available under **Details** for status, mission phase, AP/loadout budget, return margin, and reserve state.

## Determinism and persistence

Core rules do not use scattered `Math.random()`. A seed plus the same ordered commands/time advances should reproduce the same result.

Save schema is **v19**. Current-schema save/load correctness is a hard requirement: v19 item identity/state, construction discovery/condition, ruin blueprint state, citizen/home corpse state, missions, coordination, and deterministic simulation state must survive persistence.

Older development saves are **not** guaranteed to migrate forward during this rapid-development phase. Schema-breaking changes may require starting a new town, and backward migration completeness must not delay otherwise-correct gameplay or architecture work. See `instructions.md` for the project policy.

The current schema retains the existing legacy normalization paths and includes construction-catalog normalization so stale development-only construction keys do not survive into the canonical v19 state. Legacy Bank count maps are still materialized as unique normalized item instances, and generated IDs remain protected from collisions. That compatibility is useful but is not a promise that every future development schema will receive a complete migration path.

Camping survival and World Beyond evolution use isolated deterministic seeds so unrelated random calls do not silently alter their outcomes.

## Regression strategy

Tests are separated conceptually by what they protect:

1. **Hard rule/architecture invariants** — command legality, AP/accounting, current-schema persistence, determinism, information boundaries, item identity/state, Bank transfer semantics, home material accounting, control/extraction, gate coverage, and concrete bug regressions. These gate CI.
2. **Focused pathological scenarios** — known failures such as mass departure or rescue trap transfer, plus focused home/defense-information and stateful-item regressions. These gate CI.
3. **Economy/survival simulation benchmarks** — Workshop frequency, survivor count, dehydration, Well level, defense, searches and outside-at-midnight population. During early development these are diagnostic telemetry, not exact balance gates.
4. **Historical-schema migrations** — useful compatibility when cheap or already implemented, but not a merge blocker unless a task explicitly requires it.

Benchmarks still run deterministically on every test run so large shifts remain visible. Selected metrics can become hard thresholds later when the surrounding progression, defense, camping, profession and social systems stabilize.

## Future forum and social integration

The v14 commitment model remains the public-coordination substrate under schema v19 and is intentionally compatible with a later real forum/chat system. Human or bot posts can eventually produce the same public intentions: "I'll close the gate", "I'll be backup", "I'm working on the wall", "we need planks", or "I'm scouting east".

Future personality/social systems may affect whether citizens communicate, volunteer, keep commitments, hoard, or accept risk. They must not bypass legal commands, private-resource ownership, exact item ownership, or the World Knowledge/public-defense boundaries.

## Multiplayer migration

Current:

`React -> local simulation/core/controllers -> IndexedDB`

Future:

`React -> network commands/time -> authoritative server using the same core/controllers -> database`


## Construction discovery and condition

Construction state distinguishes a site being **known**, its **implementation readiness**, and the building being **completed**. Generic rarity-0/no-blueprint descendants are registered recursively with their parent sites, including WIP catalogue entries. Tiered blueprint items reveal one random eligible class 1-4 site whose direct parent is already known; WIP status does not remove a site from that candidate pool, but it prevents AP/material spending. The Construction Codex exposes all 166 current constructions independently of town discovery. Completed buildings also track condition so source-backed defense can scale with damage in later attack/repair work. See `docs/construction-fidelity.md`, `docs/blueprints.md`, and `docs/construction-catalog.md`.
