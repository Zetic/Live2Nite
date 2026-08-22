# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers. Controllers select normal game commands and never mutate state directly.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller.

- React renders legal actions as player controls.
- Traditional bots select from the same actions.
- Future LLM-assisted bots will receive a curated subset of the same actions.
- Future multiplayer clients will submit the same command shapes to an authoritative server.

No controller is allowed to mutate AP, inventory, map, bank, gate, or other simulation state directly.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events are reduced into the next `GameState` and appended to the event log.

The World Beyond slice already uses this path for gate operations, movement, search, item pickup, item deposit, and nightly deaths.

## Determinism

Simulation randomness is generated from the stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

The initial World Beyond map is generated from the town seed. Procedural distribution values remain prototype placeholders until their original Die2Nite equivalents are verified.

## Persistence versions

Save data is schema-versioned. PR #2 advances the save schema to version 2 because citizens now have locations/inventories and towns include a generated world. The IndexedDB adapter discards incompatible prototype saves rather than attempting to load structurally invalid state.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, and legal candidate actions, then return an intent/command. The game core will validate that command normally. API keys must never be shipped in the GitHub Pages client; provider calls will require a backend/proxy when introduced.

## Multiplayer migration

Current:

`React -> local game core -> IndexedDB`

Future:

`React -> network commands -> authoritative server using game core -> database`

The UI and controllers should therefore avoid directly changing state.
