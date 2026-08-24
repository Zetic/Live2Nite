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

Schema v18 gives each construction project both a `discovered` state and a `completed` state.

At town creation, only playable common root projects are known. Completing a common project reveals its playable common direct children. Higher blueprint tiers remain hidden until the World Beyond blueprint acquisition flow is implemented.

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

Construction Fidelity I concentrates on the early/common town tree and establishes the discovery model that the blueprint pass will consume. Advanced projects with verified metadata may already have a blueprint tier recorded, but they are not discovered automatically.

Some utility systems remain partial, including full building damage/repair, upgrade levels, complete Searchtower behavior, soul mechanics, and specialized construction effects. Those should be implemented from their current behavior before the related project is promoted to full parity.
