# Live2Nite Development Instructions

## Development-stage save compatibility

Live2Nite is still in rapid pre-release development. Current-schema persistence correctness matters; backward compatibility with older development saves does not currently block a PR.

- New towns and saves written by the current schema must save and reload correctly.
- Stateful data such as item identity/state, citizen state, missions, coordination, and deterministic simulation state must survive a current-schema save/load cycle.
- A schema-breaking change may invalidate earlier development saves. It is acceptable to require the tester to start a new town after a schema bump.
- Do not delay a gameplay, architecture, content, or UI PR solely to make every historical schema migrate perfectly.
- Do not add elaborate backward-migration code unless it is cheap, directly needed for the current change, or explicitly requested.
- If an old save cannot be represented safely, prefer rejecting it clearly as incompatible rather than guessing or silently corrupting state.
- Existing migration code may remain when already implemented and well-tested, but maintaining historical migration completeness is not a merge requirement during this phase.
- A PR should not remain draft solely because backward migration coverage is incomplete.
- Revisit and tighten backward-save guarantees once Live2Nite reaches externally distributed releases or the project explicitly declares a compatibility baseline.

## Testing priority

PRs should prioritize, in order:

1. Current gameplay/architecture invariants and concrete bug regressions.
2. Current-schema persistence and deterministic behavior.
3. Focused pathological scenarios.
4. Simulation/economy telemetry, which remains diagnostic unless a metric has explicitly been promoted to a hard invariant.
5. Historical-schema migration only when required by the task.

Do not treat provisional balance metrics or backward migration completeness as blockers unless the project explicitly changes this policy.
