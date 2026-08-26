# Complete construction catalogue

Live2Nite now carries a complete reference catalogue for the current MyHordes construction set while keeping runtime identity and implementation entirely Live2Nite-owned.

The numeric catalogue is transcribed from the pinned generated v5.1.1-era fixture snapshot. That pin was revalidated against the current source line for this pass: v5.1.1 → v5.1.2 contains no building/catalogue-file changes, and v5.1.2 → current master changes only ruin exploration. No newer construction-tree delta is therefore being omitted.

## Catalogue boundary

The catalogue contains **166 constructions** across seven source branches:

| Branch | Constructions |
| --- | ---: |
| Defensive Wall | 37 |
| Pump | 33 |
| Portal Lock | 7 |
| Workshop | 20 |
| Foundations | 28 |
| Watchtower | 25 |
| Soul Purifying Source | 16 |

Blueprint/unlock classes:

| Class | Meaning | Count |
| --- | --- | ---: |
| 0 | No generic blueprint | 53 |
| 1 | Common Blueprint | 41 |
| 2 | Uncommon Blueprint | 17 |
| 3 | Rare Blueprint | 35 |
| 4 | Very Rare Blueprint | 13 |
| 5 | Special/manual | 1 |
| 6 | Dump specialization | 6 |

The repository stores Live2Nite semantic construction IDs, English source names/descriptions, source hierarchy, sibling order, blueprint class, AP, material display names/amounts, defense, temporary lifecycle and whether a source upgrade track exists.

Upstream numeric/prototype IDs and upstream implementation code are deliberately not retained.

## Implementation status

Every catalogue entry has one of three statuses.

Current catalogue status: **80 Implemented / 24 Partial / 62 WIP**.

### Implemented

The source-backed construction behavior represented by the current Live2Nite model is active.

### Partial

Live2Nite already has meaningful gameplay behavior for the construction, but at least one source mechanic still requires a fidelity pass. Partial constructions remain buildable.

### WIP

The source construction and its metadata are represented, but the mechanic or one of its required dependency systems is not implemented. WIP entries are deliberately **not buildable**.

WIP is separate from discovery:

- class-0 WIP sites are still registered through the normal no-blueprint tree;
- class 1-4 WIP sites remain valid generic blueprint candidates;
- discovering a WIP site exposes it in Construction Sites;
- no AP or materials can be contributed until the implementation status is promoted.

Class-6 Dump specializations remain a separate non-generic acquisition class. Their Garbage Dump effects are implemented, but they are not injected into the class 1-4 generic blueprint pool.

This preserves the current source blueprint candidate pools without inventing placeholder effects or allowing players to spend resources into inert buildings.

## Source material costs

The Construction Codex shows source material names and amounts even when the corresponding Live2Nite item/dependency path is not implemented yet. Runtime construction resources remain authoritative only for buildable projects.

This distinction lets a WIP record be mechanically safe while still retaining the data needed for its future implementation.

## Construction Codex

The Codex includes a Constructions section with two views.

### Construction branches

The full parent/child tree is grouped under the seven branch roots. Each detail page shows:

- branch and parent/children;
- implementation status;
- source description;
- blueprint class;
- AP;
- source material cost;
- defense;
- temporary/permanent lifecycle;
- source upgrade-track flag;
- acquisition note.

### Blueprint unlocks

Shows generic blueprint projects grouped by Common, Uncommon, Rare and Very Rare, plus a separate special/non-generic construction section.

The blueprint view also represents the **nine active specialized explorable-ruin blueprint variants**: Hotel, Bunker, and Hospital families at Uncommon, Rare, and Exceptional tiers. Their source ruin tables use weights **800 / 400 / 200** respectively. Each specialized plan retains its family+tier state and, when read, selects only from the exact prospective construction pool assigned to that family and tier. These plans are not injected into the generic construction blueprint pool.

The Codex displays the source drop weight and candidate-pool size for each specialized plan. Individual construction entries within those pools still retain their own Implemented/Partial/WIP status; discovering a WIP construction through a specialized plan does not make the WIP construction buildable.

The Codex is intentionally complete even when the current town has not discovered a project. Construction Sites remains the town-state view; the Codex is the reference/implementation view.

## Garbage Dump boundary

The Garbage Dump, Dump Upgrade, Organized Dump, and all six class-6 category specialization effects are active. Organized Dump is now normally buildable because Trestle has a runtime identity and exact source ruin acquisition paths; its completed effect reduces Garbage Dump actions from 1 AP to 0 AP. See `docs/garbage-dump.md` for the interaction and Trestle dependency details.

## Legacy cleanup

The historical Live2Nite-only `improved_drill` construction had no current source equivalent and is removed from the canonical construction identity set. Save normalization ignores that stale key while retaining all valid construction progress.

The existing semantic IDs `gutters` and `locked_cemetery` are retained for save stability but are reconciled to their current-source equivalents in the catalogue.
