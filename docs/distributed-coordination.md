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

Field missions remain individual claims. The planner first handles rescue, baseline scouting and known useful opportunities. If the town is resource-starved and field coverage remains thin, additional citizens with at least 4 AP can independently volunteer for exploration before the fallback cutoff.

Resource starvation prefers unknown frontier targets rather than endlessly refreshing nearby stale zones. A citizen is not sent merely to burn AP if the return budget is unsafe; all normal expedition feasibility and return-solvency rules still apply.

Nearby depleted zones also become legitimate low-risk construction-salvage missions. They can produce Rotting Logs/Scrap Metal for Workshop conversion even after ordinary search is exhausted.

## Late-day AP dumping

AP is perishable daily labor, but zeroing AP is not an absolute objective. During the earlier day, uncommitted citizens may remain available for field volunteering. From the configured late-day threshold onward, citizens without missions can use legal town work as an AP sink while still respecting any gate AP reservation.

Current town sinks include construction, Workshop conversion and home reinforcement. Future Watchtower/forum/facility actions can extend this without changing the coordination model.

## Future forum integration

The current commitment structure is intentionally small. A future forum/chat system can render or generate the same underlying ideas:

- "I'll close the gate";
- "I'll be backup";
- "I'm putting AP into the wall";
- "I'm scouting east";
- "We need planks";
- "I'm heading to the pharmacy".

Human-created posts can later participate in the same public coordination state instead of bots depending on a separate NPC-only planner.
