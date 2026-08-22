# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers. Controllers select normal game commands and never mutate state directly.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only.

## Command and event flow

1. A human or bot selects a `GameCommand`.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events are reduced into the next `GameState` and appended to the event log.

This allows future remote humans and LLM-assisted bots to use exactly the same legal action surface.

## Determinism

Simulation randomness is generated from the stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state and legal candidate actions, then return an intent/command. The game core will validate that command normally. API keys must never be shipped in the GitHub Pages client; provider calls will require a backend/proxy when introduced.

## Multiplayer migration

Current:

`React -> local game core -> IndexedDB`

Future:

`React -> network commands -> authoritative server using game core -> database`

The UI and controllers should therefore avoid directly changing state.
