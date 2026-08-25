# Zombie population and daily growth

## Current MyHordes source baseline

This pass uses the public `eternaltwin/myhordes/myhordes` default rules as the configuration baseline. The current default rules expose:

- map size: 25–27 with margin 0.25;
- population: 40;
- `map_params.free_spawn_zones.count`: 3;
- `map_params.free_spawn_zones.min_dist`: 0;
- one explorable ruin;
- explorable ruin zombies: **10 initial** and **5 daily**;
- `massive_respawn_threshold`: **50**;
- `massive_respawn_factor`: **0.5**.

The exact current server-side formula that turns distance/map-generation state into each Day-1 exterior zone's zombie count was not recoverable from a stable public source path during this audit. Live2Nite therefore does **not** claim exact generator parity and does not copy upstream generator code or IDs.

## Live2Nite World Beyond projection

Live2Nite currently uses a much smaller 14×13 test map. Day-1 zombie density is projected onto Manhattan distance (the same distance citizens pay in AP):

| AP distance from town | Day-1 zombies |
| --- | --- |
| 1 | 0 |
| 2 | 0–1 |
| 3 | 0–2 |
| 4–5 | 0–3 |
| 6–7 | 1–4 |
| 8–9 | 1–5 |
| 10+ | 2–6 |

The profile is deterministic by town seed. The immediate approaches are deliberately clear so a new town is not surrounded by control-blocking zones before citizens can establish scouting routes.

Nightly natural growth is also distance-biased. It no longer uses neighbor-pressure diffusion, so one dense pocket cannot cascade through the starter area. Cleared zones at distance 1–2 do not immediately refill; farther empty zones can slowly repopulate and existing populations can grow gradually.

If the total exterior population drops below the source-calibrated 50% threshold, Live2Nite restores 50% of the deficit toward the deterministic Day-1 baseline. This emergency repopulation excludes the first two travel rings and fills farther zones first. This is a Live2Nite adaptation of the exposed 50 / 0.5 source settings, not a claim about an unrecovered upstream implementation detail.

## Explorable ruins

The source totals are used exactly:

- initial population: **10**;
- daily growth: **+5**.

Live2Nite's cross-corridor topology has roughly forty navigable non-entrance corridor cells. Uniformly scattering ten independent zombies made the ruin feel mostly empty, so the ten source zombies are concentrated into up to five deeper deterministic threat pockets. The total is unchanged.

Once an interior exists, every day rollover adds exactly five zombies. Growth is stored on the persistent interior; it does not regenerate the maze. Killed zombies therefore remain dead except for the explicit +5 daily additions. Searched rooms, unlocked doors, room stock state, and floor item caches are retained.

The daily rollover also clears stale active-explorer reservations and deactivates an interrupted exploration session. This prevents a death or abandoned session from permanently locking the ruin to one citizen.

Legacy interiors without lifecycle metadata receive one normal +5 increment on their next rollover rather than receiving a large retroactive catch-up in a single night.

## Deferred source-fidelity work

Oxygen failure still needs a complete source-essential item classification before Live2Nite can retain essential carried items while dropping only non-essential items. Current MyHordes explicitly preserves essential items on oxygen failure, but Live2Nite does not yet have a sufficiently audited essential-item catalogue to label those items safely.
