# Construction fidelity

Live2Nite treats current MyHordes as a behavioral reference, not as an identifier or code source.

## Identity boundary

Construction definitions use Live2Nite-owned semantic IDs such as `wall_upgrade`, `timber_armour`, and `portal_lock`. Upstream prototype IDs, fixture keys, and implementation code are intentionally not stored in the runtime catalog.

Reference data is translated into Live2Nite concepts:

- parent relationship
- plan/blueprint tier
- AP and material requirements
- base defense
- maximum condition
- breakability
- temporary/permanent lifecycle
- simple verified completion effects

## Discovery and completion are separate

Schema v19 gives each construction project both a `discovered` state and a `completed` state.

At town creation, playable rarity-0 projects are registered recursively from their rarity-0 roots, matching the source behavior that adds no-blueprint descendants with their parent sites. Completing a parent does not discover a site; it only makes already-known descendants buildable. Blueprint tiers 1-4 remain hidden until a matching blueprint reveals one eligible site.

This prevents late-game projects from appearing on Day 1 merely because their definitions exist in the catalog.

## Durability foundation

Completed buildings now carry condition (`hp`) and source-backed maximum condition metadata. Breakable construction defense scales with remaining condition. The current pass establishes the state model; attack damage and repair actions remain a later fidelity step.

## Activation rule

A construction should become player-reachable only when these four areas are verified well enough to support it:

1. cost
2. parent/unlock path
3. lifecycle
4. gameplay effect

A source-known project can remain in the catalog but be marked non-playable until a required dependent mechanic exists. This is preferred over inventing a placeholder effect.

## Current pass boundary

Construction Fidelity I established the construction metadata and durability foundation. The blueprint pass corrects the discovery model to current behavior and adds consumable tiered plans; see `docs/blueprints.md`.

Some utility systems remain partial, including full building damage/repair, upgrade levels, complete Searchtower behavior, soul mechanics, and specialized construction effects. Those should be implemented from their current behavior before the related project is promoted to full parity.
