# Citizen statuses and hydration

This note records the evidence used for Live2Nite's first persistent citizen-status system. The target remains the final English Die2Nite ruleset wherever surviving sources are specific enough to support it.

## Source classification

Primary surviving references used for this slice:

- Die2Nite Wiki — Statuses: https://die2nite.fandom.com/wiki/Statuses
- Die2Nite Wiki — Water Ration: https://die2nite.fandom.com/wiki/Water_Ration
- Die2Nite Wiki — Action Points: https://die2nite.fandom.com/wiki/Action_Points
- Die2Nite Wiki — Beginners' Welcome: https://die2nite.fandom.com/wiki/Beginners%27_Welcome

The Statuses and Water Ration pages provide the most direct mechanic descriptions. The Action Points page independently repeats the 11-step thirst/dehydration progression but calls those movement figures unconfirmed. Beginners' Welcome contains looser wording around nightly chances, so probability details remain an uncertainty rather than being silently invented.

## Implemented in schema v10

### Exhausted

`ORIGINAL_D2N_CONFIRMED`

A citizen at 0 AP is shown as Exhausted. The surviving status table says Exhausted prevents contact-weapon use and clears when at least 1 AP is recovered. Live2Nite derives this display status from current AP rather than persisting a duplicate flag.

### Satisfied food / satisfied water

`ORIGINAL_D2N_CONFIRMED`

Eating or using water as the day's AP refresh is represented in existing daily citizen state. These are exposed through the status UI as derived daily statuses and reset with the normal new-day daily state.

### Thirsty

`ORIGINAL_D2N_PROBABLE` for the exact 11-movement threshold; the status transition itself is confirmed.

Live2Nite makes a normally hydrated citizen Thirsty when either:

- they complete 11 desert movements since their last drink; or
- they reach midnight without having consumed water that day.

Each ordinary map movement currently costs 1 AP, so the surviving wording "walk 11 APs in the desert" maps directly to 11 movements in the current ruleset.

Drinking a Water Ration removes Thirsty. If the daily water AP refresh has not already been used, that drink also refreshes AP to the citizen's normal maximum. If the daily refresh was already used, water can still be consumed to treat a later Thirsty status without restoring AP.

### Dehydrated

`ORIGINAL_D2N_PROBABLE` for the exact second 11-movement threshold; treatment behavior is confirmed.

A Thirsty citizen becomes Dehydrated when either:

- they complete another 11 desert movements while Thirsty; or
- they survive midnight while still Thirsty.

Drinking while Dehydrated reduces the citizen to Thirsty but **does not restore AP**. A second treatment is therefore required to become normally hydrated again.

### Death from untreated dehydration

`ORIGINAL_D2N_CONFIRMED` for dehydration being fatal overnight; exact historical probability wording is disputed.

The surviving Statuses table states that a Dehydrated citizen dies after midnight. Some beginner-guide wording describes a chance of dehydration/death rather than a guaranteed transition. No reliable original probability has been recovered.

Live2Nite currently uses the deterministic interpretation:

- Dehydrated at attack resolution -> dehydration death.

This is intentionally documented rather than presented as a recovered original probability algorithm. If stronger final-English evidence establishes a probability, the night rule should be replaced without changing the status-state architecture.

## Desert movement accounting

Live2Nite persists `desertStepsToday` as part of citizen condition state. Drinking resets this travel debt to zero. Reaching a hydration threshold also starts the next stage's movement count from zero.

Entering town does not itself erase the count; hydration is reset by drinking or the nightly transition. This matches surviving community descriptions that the desert-movement count was cumulative rather than tied to one continuous expedition.

## AI behavior

`LIVE2NITE_ADAPTATION`

Autonomous citizens treat hydration as a survival constraint:

- a Thirsty or Dehydrated citizen prioritizes accessible water before ordinary town work;
- a citizen outside with a hydration warning and no carried water starts returning toward town when possible;
- expedition loadouts reserve water for a citizen with an active hydration condition even when the normal town Well-conservation policy would be cautious;
- water used to treat Dehydrated does not falsely count as six additional potential AP;
- one protected night-gate reserve is kept out of field missions so emergency rescue mobilization cannot consume every citizen capable of sealing the gate.

These are autonomous-town policies, not claims about original Die2Nite player behavior.

## UI reconstruction

`LIVE2NITE_ADAPTATION`, visually inspired by the original interface pattern.

The original game kept citizen condition visible in a compact status bar near the top of the interface. Live2Nite follows that information hierarchy without copying original artwork:

- controlled citizen identity and AP;
- a stable hydration slot;
- Exhausted / ready state;
- daily food and water-refresh indicators;
- warning/danger emphasis for Thirsty and Dehydrated.

The Citizens screen remains the detailed diagnostic surface, including hydration name, desert movement progress, and autonomous mission information.

## Deliberately deferred statuses

The generalized status boundary is intended to support later reconstruction, but PR #14 does not yet implement:

- Wounded / body-part wound effects;
- Infected;
- Terrorized;
- Healed;
- Drugged / Addicted;
- Drunk / Hangover;
- Clean and other achievement/social statuses;
- medical items and treatment chains beyond ordinary Water Rations.

Those should be researched and introduced as separate slices rather than approximated inside the hydration PR.
