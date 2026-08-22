# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers and small planning helpers. Controllers select normal game commands and never mutate state directly.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only. Top-level gameplay domains are presented as separate screens rather than one continuously growing dashboard.

## Core domains

- `actions.ts`: legal-action generation for every controller.
- `commands.ts`: command validation and event production.
- `events.ts`: authoritative event reduction into game state.
- `game.ts`: initial game creation plus the public day/night entry point.
- `night.ts`: isolated horde-strength generation, Watchtower estimates, breach distribution, and home survival.
- `defense.ts`: shared town-defense aggregation, including defensive objects stored in living citizens' homes.
- `combat.ts`: deterministic zombie-combat rules and weapon definitions.
- `world.ts`: map generation, coordinates, zone control, and normal/depleted search state.
- `items.ts`: item definitions, starter packages, consumable/defense metadata, weapon catalog entries, and normal/depleted scavenging pools.
- `home.ts`: home levels, personal defense, storage, and daily citizen-use state.
- `well.ts`: deterministic starting-well generation.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random number generation.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller. React, traditional bots, future LLM-assisted bots, and future remote humans all operate through the same legal commands. No controller directly mutates AP, inventory, homes, the well, map, bank, construction, gate, zombie counts, or other simulation state.

The current legal surface includes personal storage transfers, container opening, bank deposits/withdrawals, well withdrawal, food/water consumption, the Camp Bed -> Tent home upgrade, gate operations, movement, normal/depleted search, pickup, bare-handed combat, carried-weapon combat, construction labor, and Workshop processing.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events reduce into the next `GameState` and append to event history.

Random outcomes are selected from stored deterministic RNG state and recorded in events. Container contents, depleted-search outcomes, bare-handed attacks, and weapon kill counts therefore replay from the recorded event instead of being rerolled by the reducer.

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

Night resolution is isolated in `night.ts` instead of expanding `game.ts` into another rules hub.

1. Citizens still outside die before the town attack while camping is deferred.
2. The nightly horde strength is generated from an isolated seed derived from town seed + day, so opening a package or performing a depleted search cannot silently change tonight's attack.
3. Closed-gate town defense blocks zombies one-for-one. An open gate still nullifies shared town defense.
4. Any zombies that get through are assigned uniformly at random across surviving citizens in town. Repeating that assignment for every zombie reproduces the documented binomial per-citizen distribution.
5. A citizen survives when zombies assigned to their home are less than or equal to their personal defense. Otherwise they die from a home breach.

The first ten horde ranges are anchored to surviving English Die2Nite sample data. Later-day growth and the exact Watchtower uncertainty envelope remain isolated adaptations until the original algorithms are reconstructed more precisely.

## Personal vs shared defense

The existing `town.defense` value remains the shared defense accumulated by the current bootstrap town, Bank defensive objects, and defensive construction bonuses. Defensive items stored at Home contribute their documented reduced home value to both personal protection and the attack-time shared defense calculation.

Structural home defense is currently personal only. The exact original contribution of housing levels to the shared town-defense display is not treated as settled in this slice.

## Facility navigation

The generic Town screen is removed. The persistent shell exposes Home, The Well, The Bank, Construction Sites, World Beyond, Citizens, and Chronicle.

Operational built sites register additional destinations from game state. Workshop and Watchtower now both follow this pattern: their navigation entries appear only after their respective construction projects are complete.

The gate belongs to the World Beyond travel flow. Returning to town leaves the player on the World Beyond screen so the open gate remains visible and can be closed before night.

## Search phases

World zones distinguish normal search history from depleted search history:

- normal search consumes the zone's finite `searchesRemaining` and pre-generated useful loot;
- once `searchesRemaining` reaches zero, the zone is depleted;
- depleted searching uses the stored simulation RNG and a separate low-grade pool (currently Rotting Logs / Scrap Metal);
- each citizen currently gets one depleted search per zone, tracked separately from normal searching.

The exact depleted-search cadence and loot weights remain placeholder rules pending deeper historical reconstruction. Water Bomb is currently an uncommon normal-pool result so combat can be exercised before special-zone/item-table reconstruction; its exact frequency is not claimed as historical.

## Temporary citizen-control testing hook

PR #8 adds a React-local `controlledCitizenId` so the Citizens screen can temporarily operate any living citizen during development.

This is intentionally **not** authoritative game state and is not a permanent gameplay/controller model:

- selecting another citizen does not change `Citizen.controller`;
- selection is not persisted into the save schema;
- all actions still go through `getLegalActions` and `executeCommand` for the selected citizen;
- Home, Well, Bank, World Beyond, inventory, AP, and map presentation are rendered for the selected citizen;
- `runBotPhase` accepts an optional excluded citizen id so a selected `basic-bot` is not also acted by automation during the same testing turn;
- selecting another survivor after the controlled citizen dies lets testing continue without changing actual death state.

This hook should be removable from `App` / `CitizenRoster` / the optional bot-phase exclusion without altering the core command or citizen-controller architecture.

## Agent organization

`BasicBotController` handles high-level sequencing while town-specific work is delegated to `townWork.ts`. Bots use the same search, Bank, construction, Workshop, home-upgrade, gate, movement, rescue, and combat commands as the human-controlled citizen. Trapped bots currently prefer a carried implemented weapon before waiting for rescue; they deliberately do not spam low-probability bare-handed attacks.

Once the Watchtower is built, the traditional town-work layer can use its estimate to prioritize the basic Tent upgrade when the estimated minimum exceeds current town defense.

## Determinism

Simulation randomness is generated from stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

Starting well water and nightly horde resolution use isolated deterministic seeds derived from the town seed. Runtime depleted searches, container outcomes, and combat outcomes advance the main RNG state through recorded events.

## Persistence versions

Save data remains schema version 5. PR #8 adds a new item type and event/command types but no new required fields on stored citizen/town/world records. Existing v5 saves remain valid, and the temporary `controlledCitizenId` is UI state rather than save data.

## Event history

The UI presents a filtered readable Chronicle while preserving the complete raw event stream. Combat is included as a normal recorded world event. Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current: `React -> local game core -> IndexedDB`

Future: `React -> network commands -> authoritative server using game core -> database`
