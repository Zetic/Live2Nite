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
- `world.ts`: map generation, coordinates, zone control, and normal/depleted search state.
- `items.ts`: item definitions, starter packages, consumable metadata, defense metadata, and normal/depleted scavenging pools.
- `home.ts`: home levels, personal defense, storage, and daily citizen-use state.
- `well.ts`: deterministic starting-well generation.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random number generation.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller. React, traditional bots, future LLM-assisted bots, and future remote humans all operate through the same legal commands. No controller directly mutates AP, inventory, homes, the well, map, bank, construction, gate, or other simulation state.

The current legal surface includes personal storage transfers, container opening, bank deposits/withdrawals, well withdrawal, food/water consumption, the Camp Bed -> Tent home upgrade, gate operations, movement, normal/depleted search, pickup, construction labor, and Workshop processing.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events reduce into the next `GameState` and append to event history.

Container contents and depleted-search outcomes are selected by the command layer from stored RNG state, then recorded in events so the reducer remains deterministic and replayable.

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

The exact depleted-search cadence and loot weights remain placeholder rules pending deeper historical reconstruction.

## Agent organization

`BasicBotController` handles high-level sequencing while town-specific work is delegated to `townWork.ts`. Bots use the same search, Bank, construction, Workshop, home-upgrade, gate, movement, and rescue commands as the human player. Once the Watchtower is built, the traditional town-work layer can use its estimate to prioritize the basic Tent upgrade when the estimated minimum exceeds current town defense.

## Determinism

Simulation randomness is generated from stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

Starting well water and nightly horde resolution use isolated deterministic seeds derived from the town seed. Runtime depleted searches and container outcomes advance the main RNG state through recorded events.

## Persistence versions

Save data remains schema version 5 because PR #7 adds backward-compatible enum/event/report extensions rather than requiring a destructive state migration. Existing v5 saves and older saves already migrated to v5 remain loadable; older `NightReport` records simply lack the new optional breach-detail fields.

## Event history

The UI presents a filtered readable Chronicle while preserving the complete raw event stream. Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current: `React -> local game core -> IndexedDB`

Future: `React -> network commands -> authoritative server using game core -> database`
