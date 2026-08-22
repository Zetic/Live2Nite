# Architecture

Live2Nite starts as a single-player browser game but keeps the simulation independent from React so the same core can later move behind a multiplayer server.

## Boundaries

- `src/core`: authoritative game rules. No React, DOM, network, or browser persistence dependencies.
- `src/agents`: citizen controllers and small planning helpers. Controllers select normal game commands and never mutate state directly.
- `src/persistence`: save/load adapters. IndexedDB is the first implementation.
- `src/ui`: React presentation and human input only. Larger views are split into components instead of accumulating in `App.tsx`.

## Core domains

- `actions.ts`: legal-action generation for every controller.
- `commands.ts`: command validation and event production.
- `events.ts`: authoritative event reduction into game state.
- `game.ts`: game creation and day/night lifecycle.
- `world.ts`: map generation, coordinates, and zone control.
- `items.ts`: item definitions and scavenging pool.
- `construction.ts`: construction catalog and material requirements.
- `workshop.ts`: Workshop recipes and processing rules.
- `rng.ts`: deterministic random number generation.

## Legal-action boundary

`getLegalActions(gameState, citizenId)` is the common action surface for every controller. React, traditional bots, future LLM-assisted bots, and future remote humans all operate through the same legal commands. No controller directly mutates AP, inventory, map, bank, construction, gate, or other simulation state.

## Command and event flow

1. A human or bot requests a `GameCommand` returned by the legal-action layer.
2. The core validates the command against authoritative state.
3. A valid command emits `GameEvent` records.
4. Events reduce into the next `GameState` and append to event history.

The current slice uses this path for gate operations, movement, search, pickup/deposit, construction labor, Workshop processing, rescue behavior, and nightly deaths.

## Agent organization

`BasicBotController` handles high-level sequencing while town-specific work is delegated to `townWork.ts`. This keeps rescue/exploration behavior from becoming coupled to Workshop and construction strategy. Future utility scoring and LLM-assisted planning can sit above the same legal-action API.

## Determinism

Simulation randomness is generated from the stored seed/RNG state. `Math.random()` should not be used inside the game core. A seed plus the same ordered commands should reproduce the same simulation result.

## Persistence versions

Save data is schema-versioned. Schema version 3 adds construction state. The IndexedDB adapter migrates version-2 World Beyond saves forward by preserving existing town/world/citizen state and adding fresh construction-site state.

## Event history

The UI presents a filtered readable log while preserving the complete raw event stream. Long term, current state, recent UI events, and persistent historical events should be separated so long-running towns do not carry an indefinitely growing array in every save.

## Future LLM integration

LLM providers will sit behind an agent adapter. The model will receive curated state, relevant memories, personality context, and legal candidate actions, then return an intent/command. The game core validates that command normally. API keys must never be shipped in the GitHub Pages client.

## Multiplayer migration

Current: `React -> local game core -> IndexedDB`

Future: `React -> network commands -> authoritative server using game core -> database`
