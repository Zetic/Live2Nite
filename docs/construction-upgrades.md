# Daily construction upgrades

Live2Nite models the MyHordes daily building-upgrade vote as the town facility **Upgrade Projects**.

## Daily vote lifecycle

- The facility appears in the constructed-facility navigation row once the town has completed a construction with a source upgrade track.
- Every living citizen in town may cast **one** project vote during the day.
- A citizen's vote is final for that day and costs no AP or materials.
- Vote totals are deliberately hidden from a citizen until that citizen has chosen a project. This prevents the player from simply following the visible leader before committing.
- Autonomous citizens use the same one-vote restriction. Their choices are based on public town needs and their own deterministic preference; they do not inspect the current vote tally.
- At midnight, before the horde attack is resolved, the project with the most votes receives one upgrade level for free.
- If several projects are tied for the lead, the winner is selected using the town RNG.
- Votes are cleared for the next day.
- An upgrade track stops appearing as a voting candidate when it reaches level 5.

## Active upgrade tracks

The complete construction catalogue retains `hasUpgrade` for every source construction that supports daily upgrades, but this PR activates only tracks whose effect can be represented faithfully by current Live2Nite mechanics.

### Great Pit

Defense by level:

| Level | Defense |
| ---: | ---: |
| 0 | 10 |
| 1 | 23 |
| 2 | 44 |
| 3 | 76 |
| 4 | 109 |
| 5 | 160 |

### Evolutive Wall

Defense by level:

| Level | Defense |
| ---: | ---: |
| 0 | 55 |
| 1 | 85 |
| 2 | 120 |
| 3 | 170 |
| 4 | 235 |
| 5 | 315 |

### Pump

Each level immediately adds Well water once when that level is won:

| Level gained | Water added |
| ---: | ---: |
| 1 | 20 |
| 2 | 20 |
| 3 | 30 |
| 4 | 30 |
| 5 | 40 |

### Workshop

Current MyHordes behavior demonstrates that the first Workshop daily upgrade removes 18 AP from a 300 AP construction, i.e. a real 6% reduction. Live2Nite therefore applies a cumulative 6% base-cost reduction per level through the ordinary five-level track.

Internally this is represented as credited construction labor when the Workshop level is gained. That lets all existing construction consumers—player contribution, progress display, and autonomous town-work planning—observe the same reduced paid-AP requirement without maintaining a second construction-cost system. Credited labor can make a project ready to finish but never marks it completed by itself.

## Pending source upgrade tracks

Other completed source-upgrade constructions remain visible in a collapsed **Tracked upgrade projects awaiting mechanics** section. They are intentionally not votable yet.

Examples include tracks whose effects depend on systems such as Water Turret nightly water consumption, special night-search lighting, blueprint generation, dedicated Dump specialization behavior, or other mechanics not yet represented faithfully.

This follows the same catalogue rule used elsewhere in Live2Nite: source content may be represented completely while unsupported behavior remains WIP rather than receiving a placeholder effect.

## Identity boundary

Daily upgrade state references only Live2Nite semantic construction IDs. Upstream prototype/numeric IDs and implementation code are not used as runtime identities.
