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
- `game.ts`: game creation and day/night lifecycle.
- `world.ts`: map generation, coordinates, zone control, and normal/depleted search state.
- `items.ts`: item definitions, starter packages, consumable metadata, and normal/depleted scavenging pools.
- `home.ts`: base Camp Bed storage and daily citizen-use state.
- `well.ts`: deterministic starting-well generation.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random number generation.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller. React, traditional bots, future LLM-assisted bots, and future remote humans all operate through the same legal commands. No controller directly mutates AP, inventory, homes, the well, map, bank, construction, gate, or other simulation state.

The current legal surface includes personal storage transfers, container opening, bank deposits/withdrawals, well withdrawal, food/water consumption, gate operations, movement, normal/depleted search, pickup, construction labor, and Workshop processing.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events reduce into the next `GameState` and append to event history.

Container contents and depleted-search outcomes are selected by the command layer from stored RNG state, then recorded in events so the reducer remains deterministic and replayable.

## Personal vs shared storage

The simulation distinguishes three storage contexts:

- rucksack: the citizen's carried inventory and the only personal items available outside;
- home chest: private town storage associated with that citizen;
- town bank: shared storage used by construction and available to all citizens.

Bank entries are currently represented as counts rather than individual instances. Withdrawing one bank item creates a new deterministic item instance and removes any bank-defense contribution that item provided.

## Facility navigation

The generic Town screen has been removed. The persistent shell exposes distinct destinations for Home, The Well, The Bank, Construction Sites, World Beyond, Citizens, and Chronicle.

Operational built sites register additional destinations from game state. The Workshop is the first dynamic facility: its navigation entry appears only after `town.construction.workshop.completed` becomes true. Future operational buildings such as the Watchtower can follow the same pattern without expanding a generic Town dashboard.

The gate belongs to the World Beyond travel flow. Returning to town leaves the player on the World Beyond screen so the open gate remains visible and can be closed before night.

## Search phases

World zones distinguish normal search history from depleted search history:

- normal search consumes the zone's finite `searchesRemaining` and pre-generated useful loot;
- once `searchesRemaining` reaches zero, the zone is depleted;
- depleted searching uses the stored simulation RNG and a separate low-grade pool (currently Rotting Logs / Scrap Metal);
- each citizen currently gets one depleted search per zone, tracked separately from normal searching.

The exact depleted-search cadence and loot weights remain placeholder rules pending deeper historical reconstruction.

## Agent organization

`BasicBotController` handles high-level sequencing while town-specific work is delegated to `townWork.ts`. Bots use the same search, Bank, construction, Workshop, gate, movement, and rescue commands as the human player.

## Determinism

Simulation randomness is generated from stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

Starting well water uses an isolated deterministic seed derived from the town seed so the well does not perturb initial World Beyond generation. Runtime depleted searches advance the main RNG state through recorded events.

## Persistence versions

Save data is schema-versioned. Schema version 5 adds depleted-search history to zones and search-mode metadata to new search events. The IndexedDB adapter migrates schema-2 through schema-4 saves forward, preserves existing world/town/citizen progress, adds depleted-search tracking, and normalizes undiscovered legacy normal-loot entries so low-grade Workshop feedstock no longer appears as new undepleted loot.

## Event history

The UI presents a filtered readable Chronicle while preserving the complete raw event stream. Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current: `React -> local game core -> IndexedDB`

Future: `React -> network commands -> authoritative server using game core -> database`
