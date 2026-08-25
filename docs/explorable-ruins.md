# Explorable ruin interiors

Live2Nite treats the current MyHordes implementation as the behavioral reference for Abandoned Hotel, Abandoned Hospital, and Abandoned Bunker exploration while retaining Live2Nite-owned state, identifiers, generation code, and UI.

## Source baseline

The current MyHordes rules configure explorable ruins with:

- 15 rooms/doors distributed across 2 floors;
- at least 5 rooms on each floor;
- a 13 × 13 interior-space envelope;
- room-lock distance threshold 10;
- room item fillrate 7;
- 10 initial interior zombies and a source daily-growth setting of 5;
- 5 minutes of normal exploration oxygen;
- a 30-second entry grace window;
- 15–24 second oxygen penalties for stairs and escape actions.

Current source entry behavior also requires an explorable ruin, one AP, a citizen who is not wounded or terrorized, usable control of the exterior zone, no active escort group, no other active explorer, and no prior exploration of that ruin by the citizen during the same day. Live2Nite implements the rules that correspond to systems currently present in the project.

The current MyHordes exploration controller also exposes ordinary item actions and item combinations through the same generic action/recipe handlers used elsewhere. Live2Nite mirrors that architecture instead of maintaining a second set of interior weapon/item rules.

The public `eternaltwin/myhordes/myhordes` GitLab repository remains the target source line. Live2Nite uses its own semantic runtime identities and implementation code rather than upstream numeric/prototype IDs.

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

The current upstream exploration controller references lazy interior generation while its exact room prototypes and maze generation remain separate from Live2Nite. Live2Nite therefore does **not** claim exact maze-layout parity. Its deterministic topology generator is an adaptation constrained by verified current MyHordes configuration and interaction rules.

## Exploration lifecycle

Entering costs 1 AP and begins a five-minute oxygen budget plus a 30-second grace window. Unused grace is removed when the explorer first moves. Normal corridor/room movement consumes real elapsed time; it does not invent an AP or fixed oxygen-per-step cost.

Interior zombies block ordinary corridor movement. Preparing an escape permits movement past the threat and removes 15–24 seconds from the oxygen deadline. Stairs similarly remove 15–24 seconds. The explorer can leave normally only after returning to the entrance.

When oxygen expires, the exploration ends, the ruin's active-explorer lock is released, and the citizen is wounded while being forced back outside. Current MyHordes also drops non-essential carried items onto the current interior floor. Live2Nite now persists that failure inventory on the exact interior cell so it can be recovered later. Live2Nite does not yet model a separate essential-item category, so all currently implemented carried items are treated as droppable.

## Shared carried-item actions

While an explorer is active, Live2Nite exposes supported **rucksack** actions through the same action system used outside the ruin:

- eating and drinking;
- opening supported carried containers;
- supported direct item effects such as medical/drug actions;
- portable combinations, reloads, refills and repairs that are already valid outside town;
- carried weapon actions.

The ruin layer does not duplicate AP costs, item consumption, charge handling, breakage, status restrictions, recipe rules, or weapon RNG. Those remain owned by the existing action/command resolvers.

Construction blueprints remain town-only because their existing action already requires being inside town. Interior floor loot also remains on the explicit Take/Drop path: an explorer picks an item up before using its ordinary carried-item action. This keeps Live2Nite's current inventory model clear while matching the source controller's carried-inventory action model.

Bare-handed fighting is deliberately **not** exposed in an explorable ruin. Current MyHordes exposes its generic item-action/recipe pipeline from the exploration controller, while the dedicated barehand attack route belongs to the overworld controller.

Using an ordinary item does not invent a separate fixed oxygen charge. The real-time exploration clock simply continues running while the action is taken. Ruin-specific actions such as stairs and Flee retain their explicit oxygen penalties.

## Interior weapon targeting

Weapon behavior is shared with overworld combat; only the zombie target changes.

For an interior weapon action, Live2Nite temporarily presents the **current corridor cell's zombie count** to the existing weapon/action resolver. The resolver therefore remains authoritative for:

- kill chance and kill range;
- item consumption;
- charge expenditure;
- break chance and broken-item morphs;
- AP/status requirements;
- RNG progression.

After resolution, only the resulting carried-item/RNG changes and actual kills are committed to the interior. Projection-only exterior zombie, control and intelligence changes are discarded.

Kills persist on the exact interior cell. If every zombie there is killed, the ordinary movement block disappears immediately. If zombies remain, movement stays blocked and the explorer may attack again or use the existing ruin-specific Flee action. Flee remains the non-combat alternative and retains its 15–24 second oxygen penalty.

## Room searching and loot

Room searching is part of the interior loop instead of using the old exterior `SEARCH_SPECIAL_SITE` shortcut.

- The current source `item_fillrate` is 7. Live2Nite deterministically selects seven of the fifteen rooms as stocked for its own generated topology.
- A room can be searched once. Searching costs no AP; the real-time oxygen clock continues to run.
- A stocked room rolls once against that ruin's complete current source-weighted drop table.
- Unsupported/WIP source outcomes fail closed and yield no usable item instead of redistributing their probability to implemented items.
- Supported finds are placed directly in the explorer's rucksack when capacity permits.
- If the rucksack is full, the item remains on that interior floor position and persists.
- Explorers may deliberately drop carried items on the interior floor and pick persistent floor items back up while capacity permits.

Specialized Hotel/Bunker/Hospital plans are real room-search outcomes. Their source references are translated into Live2Nite semantic blueprint items carrying the corrected family/tier metadata from the current 6 Uncommon / 10 Rare / 5 Exceptional pools. The source rarity weights remain 800 / 400 / 200.

## Locked rooms and keys

The current MyHordes `room_config.lock` value is a **distance threshold of 10**, not a count of locked rooms or a percentage. Live2Nite computes shortest corridor/stair distance from the entrance and locks rooms at or beyond that threshold.

MyHordes associates locked room prototypes with specific key items. Live2Nite does not copy those prototype identities, so qualifying rooms deterministically receive one of the three current source key families using semantic runtime items:

- Magnetic Key;
- Bump Key;
- Bottle Opener (the source classic-key family).

The matching key must be in the explorer's rucksack. Unlocking the room consumes that key, matching the current source controller behavior. The unlocked state persists. Key blanks/imprints are deliberately deferred because their source alternatives depend on profession/item systems Live2Nite does not yet model.

## Deliberate boundaries after shared-action integration

The following source mechanics remain explicit follow-up work:

- collector/profession-specific 7:30 oxygen;
- key imprints/blanks and profession-specific lock alternatives;
- source daily interior-zombie growth;
- source-specific room content/event modifiers and heroics;
- a complete essential-item classification for oxygen-failure retention.

Explorable Hotel/Hospital/Bunker sites do not expose the legacy exterior `SEARCH_SPECIAL_SITE` shortcut, so direct or autonomous command paths cannot bypass the interior gameplay loop.
