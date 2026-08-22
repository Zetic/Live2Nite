# Camping and overnight expeditions

This note records the evidence boundary used by Live2Nite's first camping implementation. The reconstruction target remains the final English Die2Nite experience wherever surviving evidence is strong enough to support it.

## ORIGINAL_D2N_CONFIRMED / strongly supported

Surviving English documentation consistently supports the following broad mechanics:

- Camping is an **intentional Hide action**, not automatic protection for every citizen who happens to remain outside.
- The town-gate zone cannot be used as a campsite.
- A citizen can inspect a qualitative survival outlook before hiding.
- Hiding freezes/locks the camping survival chance at that moment; changing the zone afterward does not retroactively improve that hidden citizen's locked chance.
- Leaving the hideout makes normal activity possible again, but the citizen must hide again before the attack if they still intend to camp.
- A citizen can spend **1 AP** improving a campsite before hiding.
- Camping survival is influenced by the zone and the citizen's circumstances. Surviving sources explicitly identify zombies, distance from town, ruins/buildings or topology, other campers in the same zone, prior camping nights, improvements and equipment among the relevant inputs.
- Repeated nights outside become less favorable.
- Ordinary citizens could not make camping completely safe; surviving references describe an ordinary-citizen ceiling around **90%**.
- A successful camper remains outside after the night and begins the next playable day with refreshed daily AP rather than teleporting back to town.
- A successful camper is not automatically hidden for the next night and must prepare/hide again.

These points are represented as mechanics rather than merely flavor text.

## LIVE2NITE_ADAPTATION

The surviving sources do **not** expose a trustworthy final-English probability formula. Live2Nite therefore isolates its current numerical reconstruction in `src/core/camping.ts` instead of scattering camping constants through AI/UI code.

Current adaptation values include:

- base camping chance and all numeric bonuses/penalties;
- exact distance bonus curve;
- exact per-zombie and same-zone-camper penalties;
- exact special-site/topology bonuses;
- +5 percentage points per site improvement;
- exact repeated-camping penalty;
- qualitative-outlook thresholds;
- AI willingness thresholds (roughly 50% reachable viability and 65% preferred hiding target);
- bot policy that only considers intentional overnight missions for sufficiently distant targets and requires carried/planned water;
- current campsite deterioration of one improvement level per resolved night.

These values are gameplay tuning, not claimed recovered Die2Nite constants.

## UNKNOWN / conflicting surviving evidence

- The exact final-English camping probability equation.
- Exact probability wording/rounding behind the qualitative messages.
- Exact campsite-improvement persistence. One surviving source describes improvements deteriorating overnight while another describes them as being destroyed/reset. Live2Nite currently uses gradual one-level deterioration as an explicit adaptation until stronger final-English evidence is found.
- Exact effects and availability of every camping-specific item/equipment modifier.
- Exact hero/class modifiers and special camping bonuses across seasons.

## Deliberately deferred

The first Live2Nite camping slice does not yet attempt to reconstruct:

- tomb searching while camping;
- camping-specific consumable/defensive objects;
- Groundsheet/Festering Flesh or other specialist equipment behavior;
- class/hero camping modifiers;
- blueprint/reward mechanics tied to special camping locations;
- any post-camping scavenging bonus;
- the complete original camping message table.

These should be added only when their item/status systems exist and their final-English behavior has been researched separately.

## Live2Nite lifecycle

The current authoritative lifecycle is:

`normal outside activity -> improve site (optional) -> hide -> midnight camping roll -> success/failure`

On success:

`remain outside -> Day N+1 at 01:00 -> AP refresh -> no longer hidden -> continue mission or return`

On failure the citizen dies with `camping_failure`. A citizen who is outside but never hid still dies with `outside_at_night`; the two outcomes remain distinct in events, Night Report and Chronicle.

An accepted autonomous mission may persist across the day boundary. The mission uses the `camp` phase only when the planner intentionally selected an overnight route; camping is not an emergency loophole for a mission that already violated return safety.

## Sources consulted

- Die2Nite Wiki / Fandom, **Extreme camping** and related camping/expedition pages.
- Arqade, **How does camping work in Die2Nite?**
- Surviving English expedition/scout guidance describing distant-building camping and multi-day exploration.

Because surviving fan documentation mixes seasons and versions, source agreement is used for the broad mechanics above while conflicting numeric details remain adaptations or unknowns.
