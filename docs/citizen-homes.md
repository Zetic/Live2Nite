# Citizen homes, works, theft, and pillaging

## Scope

This pass brings the ordinary-citizen Home system toward the MyHordes/Hordes rules already represented by the project's source-reference data. Hero-only and Chaos-mode overrides are deliberately excluded.

The implementation keeps Live2Nite semantic IDs and event-sourced state. Source items that do not yet have a real Live2Nite runtime/acquisition mechanic are shown as explicit blockers rather than replaced with convenient substitute materials.

## Structural progression

The mature home progression remains:

| Level | Home | Defense | AP |
| ---: | --- | ---: | ---: |
| 0 | Camp Bed | 0 | — |
| 1 | Tent | 1 | 2 |
| 2 | Hovel | 4 | 4 |
| 3 | Shack | 9 | 5 |
| 4 | House | 16 | 6 |
| 5 | Fenced House | 25 | 6 |
| 6 | Fortified Shelter | 36 | 7 |
| 7 | Bunker | 49 | 7 |
| 8 | Castle | 64 | 8 |

Only mapped source requirements can be consumed. Tiers containing an unmodeled source dependency remain visible and fail closed. Fenced House and higher structural tiers protect the home from ordinary foreign-home deposits, intrusion and theft. The Lock home work supplies equivalent protection before that structural threshold.

## Home works

The Home UI lists the full ordinary-facing work set used by this pass:

- Reinforcements — implemented; uses the existing `wire_mesh` mapping for source `fence_#00`.
- Fence — defensive effect represented, but its missing source structural input keeps construction blocked.
- More Storage — implemented.
- Rudimentary Alarm — implemented; intrusion attempts identify the intruder, and theft from an alarmed home is always identified.
- Large Curtain — implemented; living chest contents are hidden until a successful intrusion.
- Lock — ordinary foreign-home deposits, intrusion and theft are blocked, but construction remains blocked until the Padlock and Chain item has a real runtime mechanic.
- Siesta — implemented through the currently representable levels; one daily attempt, 33% / 66% / 99% success, +2 AP on success. It cannot be attempted at full AP. The Mattress-dependent level remains blocked until Mattress is modeled.
- Kitchen — catalogued but WIP; cooking is not invented before its subsystem exists.
- Laboratory — catalogued but WIP; production actions are not invented before its subsystem exists.

## Visiting homes

A living citizen's unattended and unprotected home supports:

- one discreet item deposit into available chest space;
- ordinary theft while the resident is outside town;
- Curtain-based hidden chest contents and an intrusion step;
- 10% identification chance for a deposit;
- 50% identification chance for ordinary theft;
- Alarm-forced identification of theft and alarmed intrusion attempts.

Deposit, theft and pillage share one foreign-home item transfer allowance per citizen per day outside Chaos. The allowance is consumed by whichever of those three actions succeeds first that day.

Fenced House and higher structural tiers, or the Lock work, block ordinary deposits, intrusion and theft. A resident who is currently in town also blocks ordinary deposit/theft access.

Event text remains anonymous when the actor is not identified. When a deposit or theft spotting roll succeeds, or an Alarm guarantees identification, the actor is named in the home register/chronicle text.

## Pillaging dead citizens

Pillaging is not implemented as an alias for living theft. A dead citizen's remaining Home Chest can be pillaged, but pillage uses the same daily foreign-home transfer allowance as deposit and theft. Pillage is always identified. Corpse disposal remains a separate action and does not erase the dead citizen's chest contents.

## AI behavior

Bots may continue normal personal home progression and defensive work when legal. They do not withdraw communal Bank materials toward a structural tier that is blocked by an unmodeled source requirement. This prevents personal hoarding for an impossible upgrade while preserving communal construction priorities.

## Deferred behavior

The following are deliberately deferred rather than approximated:

- Hero profession/access exceptions;
- Chaos-mode theft/pillage overrides;
- Kitchen cooking recipes and effects;
- Laboratory production actions;
- unmodeled source items required by blocked structural/work levels.
