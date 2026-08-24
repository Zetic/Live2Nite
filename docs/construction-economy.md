# Construction economy fidelity pass

This document records the source and adaptation rules for the construction-resource pass introduced after schema v16.

## Pinned reference

Current MyHordes construction values were transcribed from the generated MyHordes 5.1.1 building dataset at:

- `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`
- generated `src/data/buildings.ts`
- generated `src/data/recipes.ts`
- generated `src/data/itemDrops.ts`

The generated dataset was cross-checked against the current Eternaltwin/MyHordes source/release line during the August 23, 2026 implementation pass. The exact pinned commit is retained so future MyHordes balance changes do not silently rewrite Live2Nite history.

## Source policy

Only clear direct equivalents receive the `MYHORDES_CURRENT` construction-cost overlay. A project that is a Live2Nite reconstruction/adaptation keeps its previous source identity instead of being forced onto a vaguely similar modern building.

`src/core/constructionEconomy.ts` is the numeric snapshot. `src/core/constructionCurrent.ts` applies that snapshot to direct-equivalent projects at runtime while preserving the older catalog as historical context.

Representative corrected values include:

| Live2Nite project | Current MyHordes reference | AP | Materials |
| --- | --- | ---: | --- |
| Defensive Wall | Defensive Wall | 25 | 8 Twisted Planks, 4 Wrought Iron |
| Advanced Ramparts | Wall Upgrade V2 | 40 | 2 Nuts & Bolts, 5 Patchwork Beams, 5 Metal Supports |
| Pump | Pump | 25 | 8 Wrought Iron, 1 Copper Pipe |
| Workshop | Workshop | 25 | 10 Twisted Planks, 8 Wrought Iron |
| Watchtower | Watchtower | 15 | 3 Twisted Planks, 1 Patchwork Beam, 1 Wrought Iron |
| Search Tower | Searchtower | 30 | Electronic Component, 3 Patchwork Beams, Metal Support, Table, Telescope, 2 Laser Diodes |
| Mechanical Pump | Mechanical Pump / Derrick | 86 | 5 Twisted Planks, 10 Patchwork Beams, 15 Metal Supports, Copper Pipe |
| The Big Rebuild | The Big Rebuild | 300 | 20 Twisted Planks, 20 Wrought Iron, 5 Concrete Blocks, 10 Patchwork Beams, 10 Metal Supports |
| False Town | False Town | 400 | 15 Nuts & Bolts, 20 Twisted Planks, 20 Wrought Iron, 20 Patchwork Beams, 20 Metal Supports |

## Resource tiers

The construction economy now distinguishes:

1. low-quality salvage: Rotting Log, Scrap Metal;
2. basic processed materials: Twisted Plank, Wrought Iron;
3. advanced processed materials: Patchwork Beam, Metal Support;
4. structural supplies: Sheet Metal, Wire Reel, Duct Tape, Copper Pipe, Nuts & Bolts;
5. technical/rare supplies: Electronic Component, Compact Detonator, Laser Diode, Convex Lens, Semtex and related components;
6. specialist inputs used by individual projects, such as Table, Grain Sack, Wire Mesh, Working Radio and Guitar.

The normal desert remains weighted toward basic materials. Advanced/specialist supplies are rarer and are concentrated in appropriate special sites so construction progression depends on exploration rather than a single generic material stream.

## Workshop processing

The Workshop is intentionally limited to material transformation, salvage dismantling, and Workshop-specific repair.

Implemented structural transformations:

- Rotting Log -> Twisted Plank
- Scrap Metal -> Wrought Iron
- Twisted Plank <-> Patchwork Beam
- Wrought Iron <-> Metal Support

Implemented salvage dismantling:

- Broken Electronic Device -> weighted construction-relevant electronic/mechanical output
- Mechanism -> weighted Wrought Iron / Nuts & Bolts / Copper Pipe / Scrap Metal output

Implemented Workshop repair:

- Damaged Repair Kit -> intact Repair Kit

Random Workshop outputs are resolved in the command layer from `GameState.rngState`. The emitted `WORKSHOP_CONVERTED` event carries the exact input item IDs, resolved output, and post-roll RNG state so reducers preserve deterministic replay and item identity where required.

## Portable construction combinations

Multi-item assembly is not owned by the Workshop. Traditional personal combinations are implemented through `COMBINE_ITEMS` and may use Rucksack + Home chest while at Home, or the Rucksack only while outside.

Construction dependencies currently include:

- Copper Pipe + Convex Lens -> Telescope
- Wire Reel + Empty Oil Can + Broken Staff -> Guitar

Telescope therefore does not spawn directly as generic loot and no longer appears in the Workshop table. See `docs/item-combinations.md` for the broader combination/reload/repair system.

## AI expectations

Bots treat the active construction materials and combination components as real town resources. Directly missing materials receive high loot value. Town work can process low-quality salvage into basic materials, promote basics into advanced beams/supports, use legal portable construction combinations when the required personal items are available, and dismantle technical salvage when an active construction is blocked on those outputs.

This does not introduce a hidden town-wide production planner. Citizens still select legal commands from public town state and existing construction priorities.

## Scope boundaries

This pass intentionally does not implement every MyHordes item or every recipe. Items are activated when they support an owned gameplay loop and have legitimate acquisition/use paths.

Profession-only, social, shaman, status-heavy, event-only and quest systems remain deferred until their owning gameplay systems exist.


## Construction Fidelity I

The current-cost overlay is now paired with `src/core/constructionFidelity.ts`, which records source-verified lifecycle metadata in Live2Nite terms. The runtime does not retain upstream prototype IDs or fixture keys.

For active early construction, cost data is no longer sufficient by itself. A project also needs a verified parent/unlock path, temporary/permanent lifecycle, and an implemented gameplay effect before it is made playable.

Schema v19 separates **known sites** from **completed buildings**. Playable rarity-0/no-blueprint descendants are registered recursively with their parent sites. Completion gates construction work; it does not discover sites. Blueprint tiers 1-4 are revealed one eligible project at a time by consumable construction blueprints.

Representative corrections in this pass include the early armour wall variants, the Pump/Vaporiser branch, Watchtower/Cannon Mounds, Defensive Wall/Emergency Supplies, Foundations and Portal Lock costs, and the Soul Purifying Source as a root project.
