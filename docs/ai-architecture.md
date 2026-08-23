# Autonomous AI architecture

Live2Nite's autonomous citizens use the same authoritative command/event rules as a human-controlled citizen. The AI layer decides intent and selects legal commands; it does not mutate gameplay state directly.

## Dependency direction

```text
core rules/state
      ^
      | legal actions + observations
      |
agents / planning
      |
      v
GameCommand
      |
      v
core validation -> GameEvent[] -> reducer -> GameState
```

Hourly execution belongs to `src/simulation`. `src/agents/runBotHour.ts` remains a compatibility re-export for older imports, but new orchestration code should import `src/simulation/runBotHour.ts`.

## Decision boundary

`AgentController` accepts an `AgentDecisionInput`. Direct `GameState` input remains supported for focused tests and compatibility, while simulation execution supplies an `AgentDecisionContext`.

The context currently contains:

- the authoritative state needed to request legal actions and execute core rules;
- an `AgentWorldKnowledge` view for strategic world reasoning.

New world-planning code should prefer the knowledge view rather than reading authoritative hidden zone data directly.

## World knowledge boundary

`WorldKnowledge.ts` is the seam between authoritative world truth and information available to autonomous planners.

Today it reproduces the current game model:

- undiscovered zones expose coordinates and discovery state only;
- zombie counts, search counts, and special sites remain hidden until discovery;
- discovered zones expose the current exact values.

The evolving-map work should extend this boundary with observation timestamps, stale zombie estimates, confidence, and observation source. Planners should not need to be rewritten when that happens.

Authoritative simulation truth and town knowledge are intentionally separate concepts:

```text
World truth
actual zombies / loot / sites
          |
          +--> core rules
          |
          v
AgentWorldKnowledge
observed / permitted information
          |
          v
route, mission, supply and rescue planning
```

## Tuning policy

Autonomous tuning constants live in `AiTuning.ts`. This includes town reserves, rescue AP floor, assignment rates, scouting targets, safety reserves, camping thresholds, return-hour staggering, and executor guards.

Gameplay research constants that belong to authoritative Die2Nite/Hordes mechanics should remain in `src/core`. `AiTuning` is only for Live2Nite autonomous decision policy.

## Planning responsibilities

- `TownNeeds.ts` — summarizes town resource pressure.
- `MissionOpportunities.ts` — discovers useful field/rescue opportunities and assigns priority/staffing demand.
- `AssignmentPolicy.ts` — town reserves, rescue reserve identities, candidate selection, mission construction, and feasibility acceptance.
- `TownMissionPlanner.ts` — coordinates opportunity staffing and scout assignment budgets.
- `ExpeditionPlanner.ts` — AP, task, return, camping, and loadout budget for an accepted mission.
- `RoutePlanner.ts` — deterministic routing based on agent-visible world knowledge.
- `SupplyPolicy.ts` — water, food, weapon and loot-slot policy.
- `MissionLifecycle.ts` — persisted mission phase transitions and return solvency.

This split is intentional. New mission families should add focused opportunity/lifecycle logic rather than expanding `TownMissionPlanner` into a universal behavior file.

## Executable-action responsibilities

`BasicBotController.ts` owns action priority and orchestration. Detailed action selection is split under `src/agents/actions`:

- `SurvivalActions.ts` — hydration and camping actions;
- `InventoryActions.ts` — loadout preparation, package sharing, refills and unloading;
- `FieldActions.ts` — return movement and weapon choice;
- `actionSelectors.ts` — common legal-command selectors.

The controller should remain readable as a priority list. New mechanics such as temporary control, coordinated extraction, or profession-specific actions should normally enter through a focused policy module.

## Group planning

Citizens still execute deterministic legal commands sequentially. Future group behavior should persist or derive group intent before individual execution rather than pretending commands happen simultaneously.

Examples include:

- extraction order from a fragile-control zone;
- rescue team roles;
- scout-first departure staging;
- route reconnaissance followed by a larger expedition.

The mission/assignment layer is the correct place for that shared intent.

## Compatibility and determinism

This architecture refactor is behavior-preserving:

- existing mission phases and persisted schema remain unchanged;
- existing controller tests can continue calling `decide(game, citizenId)` directly;
- simulation creates the formal decision context;
- no new randomness is introduced;
- deterministic seeds and command ordering remain unchanged.

`tests/agentArchitecture.test.ts` protects the hidden-world boundary and direct/context controller compatibility. Existing coordination, expedition, camping and multi-day regressions remain the behavioral safety net.

## Near-term extension path

The next World Beyond systems can now be added without another foundational rewrite:

1. persisted/shared zone observation records;
2. stale daily zombie intelligence;
3. nightly zombie evolution;
4. repeat route/target scouting;
5. predictive group zone control;
6. temporary-control escape grace;
7. coordinated rescue/extraction;
8. map population and intelligence freshness presentation;
9. strategic multi-day camping.

LLM-controlled citizens should use the same decision/context and legal-command boundaries rather than receiving a state-mutation API.
