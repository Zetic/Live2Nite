# Explorable ruin interiors

Live2Nite treats the current MyHordes implementation as the behavioral reference for Abandoned Hotel, Abandoned Hospital, and Abandoned Bunker exploration while retaining Live2Nite-owned state, identifiers, generation code, and UI.

## Source baseline

The current MyHordes rules configure explorable ruins with:

- 15 rooms/doors distributed across 2 floors;
- at least 5 rooms on each floor;
- a 13 × 13 interior-space envelope;
- 10 initial interior zombies and a source daily-growth setting of 5;
- 5 minutes of normal exploration oxygen;
- a 30-second entry grace window;
- 15–24 second oxygen penalties for stairs and escape actions.

Current source entry behavior also requires an explorable ruin, one AP, a citizen who is not wounded or terrorized, usable control of the exterior zone, no active escort group, no other active explorer, and no prior exploration of that ruin by the citizen during the same day. Live2Nite implements the rules that correspond to systems currently present in the project.

The public `eternaltwin/myhordes/myhordes` GitLab repository remains the target source line. Detailed controller/configuration checks for this pass were cross-checked through a current public GitHub mirror because GitLab blob retrieval was unreliable during development.

## Live2Nite interior model

Each generated explorable ruin receives persistent interior state the first time it is entered. The layout is deterministic from the Live2Nite town seed, exterior coordinates, and semantic ruin ID.

The topology follows the current source constraints without copying the upstream generator:

- entrance at interior coordinate `0,0,0`;
- two connected floors;
- 15 room doors total with at least five on each floor;
- Hotel and Hospital extend to an upper floor;
- Bunker extends to a basement floor;
- connected corridors and a stair transition;
- persistent room/corridor discovery and fog state;
- persistent interior zombie placement;
- one active explorer per ruin.

The current upstream exploration controller references lazy interior generation while the corresponding generator is in transition in the inspected source snapshot. Live2Nite therefore does **not** claim exact maze-layout parity. Its deterministic topology generator is an adaptation constrained by verified current MyHordes configuration and interaction rules.

## Exploration lifecycle

Entering costs 1 AP and begins a five-minute oxygen budget plus a 30-second grace window. Unused grace is removed when the explorer first moves. Normal corridor/room movement consumes real elapsed time; it does not invent an AP or fixed oxygen-per-step cost.

Interior zombies block ordinary corridor movement. Preparing an escape permits movement past the threat and removes 15–24 seconds from the oxygen deadline. Stairs similarly remove 15–24 seconds. The explorer can leave normally only after returning to the entrance.

When oxygen expires, the exploration ends, the ruin's active-explorer lock is released, and the citizen is wounded while being forced back outside, matching the current source failure consequence represented by Live2Nite's status model.

Explorable Hotel/Hospital/Bunker sites no longer expose the legacy exterior `SEARCH_SPECIAL_SITE` shortcut. Their existing source-weighted loot and specialized blueprint rolls remain staged on the ruin state for later room-loot integration, so autonomous or direct command paths cannot bypass the interior.

## Deliberate boundaries for this pass

This PR focuses on a complete navigable interior loop rather than deep loot implementation. The following source mechanics remain explicit follow-up work:

- collector/profession-specific 7:30 oxygen, because Live2Nite does not yet have the corresponding profession system;
- locked/keyed room-door mechanics and room imprints;
- rich room loot and interior floor inventories;
- dropping non-essential carried items into the current room after oxygen failure;
- full interior weapon/action handling;
- source daily interior-zombie growth;
- source-specific room content and event modifiers.

Rooms are therefore traversable in this pass rather than being made permanently inaccessible behind key mechanics that do not yet exist. Existing specialized Hotel/Bunker/Hospital blueprint and source-loot data from the ruin catalogue remain intact for later room-loot integration.
