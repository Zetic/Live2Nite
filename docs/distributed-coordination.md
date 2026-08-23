# Distributed citizen coordination

Live2Nite does not use a hidden town overseer that assigns a shared AP pool. Autonomous citizens coordinate from information that an ordinary player could reasonably know plus structured public commitments that stand in for forum/chat communication until those social systems exist.

## Information boundary

A bot may use:

- public town state: time, gate state, living/in-town/outside citizens, Bank, Well, construction progress, defense and completed facilities;
- World Knowledge: discovered geography and freshness-aware zombie observations, never authoritative hidden zombie truth;
- public commitments posted by other citizens;
- active `botMissions`, which function as visible field claims such as "I am scouting east" or "I am gathering at the supermarket";
- its own AP, inventory, hydration, location and risk/return budget.

A bot does **not** receive a hidden globally optimized work assignment or a town-wide AP budget.

## Schema v14 coordination state

`GameState.coordination.commitments` stores short-lived public intentions that are not already represented by a field mission.

Current commitment kinds:

- `gate_primary` — citizen volunteers to remain capable of closing the gate and reserves 1 AP;
- `gate_backup` — second citizen independently volunteers as backup and also reserves 1 AP;
- `construction` — one-hour claim to contribute to a specific currently buildable project.

Commitments are explicit simulation events:

- `COORDINATION_COMMITMENT_POSTED`;
- `COORDINATION_COMMITMENT_CLEARED`.

They expire, disappear when the citizen dies, and reset at day rollover. Completing a construction clears remaining claims for that project.

The coordination pass is deterministic for replay, but its semantics are sequential public volunteering: each candidate sees commitments already posted and only volunteers while the public need remains uncovered.

## Gate duty

Before true automatic closing exists, citizens attempt to maintain one primary closer and one backup. Both remain eligible for useful town work but protect 1 AP. They are excluded from ordinary field volunteering while their commitment is active.

At 23:00 the simulation prefers the primary, then backup, then any other legal town citizen. This allows failure/recovery behavior without a permanently hard-coded gatekeeper. The basic Portal Lock still needs manual closers because it prevents reopening but does not close an already-open gate. Manual commitments disappear only when a completed effect such as the Automatic Piston Lock actually auto-closes the gate.

## Construction saturation

A buildable project no longer makes every town citizen ineligible for the World Beyond.

Citizens publicly volunteer for one construction AP at a time. Desired volunteer coverage is derived from public project progress and defensive urgency. Once the job is saturated for the hour, later citizens remain free to take field work.

This specifically removes the previous deadlock:

`some construction is legal -> every citizen has immediate town work -> no field candidates -> no fresh intel/resources -> no field missions`.

## Field volunteering and AP utilization

AP is a perishable personal resource. A citizen does not need a hidden overseer to know that carrying 6 unused AP toward midnight while few people are outside is wasteful.

Field missions remain individual public claims. The planner first handles rescue, baseline scouting and known useful opportunities. On later days, citizens with substantial remaining AP can independently volunteer when the publicly visible field population is thin. Resource-starved towns tolerate more volunteers because missing construction materials are themselves a public reason to leave town.

The generic hidden town reserve is intentionally small; explicit primary/backup gate commitments provide the important human-like coverage. Day 1 retains a staged opening, while later days allow a larger field presence without sending everybody out in one batch. Per-hour assignment limits, mission claims and individual route feasibility continue to prevent a mass gate flood.

Unknown frontier expansion is preferred while reachable territory remains. Stale recon remains useful when no suitable frontier target exists. A citizen is never sent merely to burn AP if the same-day return budget is unsafe; normal expedition feasibility and return-solvency rules still apply.

Nearby depleted zones are also legitimate low-risk construction-salvage missions. They can produce Rotting Logs/Scrap Metal for Workshop conversion even after ordinary search is exhausted.

## Consumable AP discipline

Food and water are stored future AP, so autonomous citizens treat them as more valuable than current AP that will disappear at midnight.

The default ordering is:

`spend safe current AP -> consume refill when AP is low -> spend refreshed AP`.

Ordinary Thirst does not override that ordering. A Thirsty citizen may carry water on an expedition and remain eligible for field volunteering, then drink after current AP has been spent. Dehydration remains an immediate survival exception and is treated as soon as water is available.

Late in the day, a Thirsty citizen with no remaining productive AP sink may finally treat before the attack even if the refill cannot be used efficiently. That is a survival fallback, not normal economic behavior.

This policy applies only to autonomous decision-making. The legal action surface still permits a human player to consume a ration whenever the game rules allow it.

## Late-day AP dumping

Earlier in the day, citizens preserve flexibility for scouting, rescue and newly discovered opportunities. Town AP sinks become increasingly attractive as the field-dispatch window closes.

Once the configured aggressive late window begins, a citizen with legal safe town work can perform repeated work in the same hour down to a genuine reserved-AP floor rather than spending one AP and carrying the rest into midnight. A gate volunteer still preserves the AP promised by their public commitment.

Current town sinks include construction, Workshop conversion and home reinforcement. Future Watchtower/forum/facility actions can extend this without changing the coordination model.

## Diagnostics

Multi-day simulation telemetry reports unused bot AP and the number of full-AP bots at midnight in addition to survival, Well, camping and gate metrics. Those AP values remain balance telemetry while the economy is evolving, but focused regressions gate known pathological behavior such as consuming water at full AP solely to clear ordinary Thirst.

## Future forum integration

The current commitment structure is intentionally small. A future forum/chat system can render or generate the same underlying ideas:

- "I'll close the gate";
- "I'll be backup";
- "I'm putting AP into the wall";
- "I'm scouting east";
- "We need planks";
- "I'm heading to the pharmacy".

Human-created posts can later participate in the same public coordination state instead of bots depending on a separate NPC-only planner.
