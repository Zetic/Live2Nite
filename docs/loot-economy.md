# Loot economy, openables, and ruins

Part 2 replaces Live2Nite's adapted loot arrays with source-backed MyHordes acquisition systems. The implementation follows dependency closure rather than pruning source entries to the subset of items that already happen to exist.

## Source policy

Primary behavioral authority is the current Eternaltwin/MyHordes source and release line. Structured data is cross-checked against:

- `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`
- generated from MyHordes 5.1.1

Before Part 2 is marked review-ready, differences against the current MyHordes v5.1.2/master line must be audited and material differences documented here.

Weights copied from MyHordes are fidelity data. Part 2 does not tune those values to compensate for Live2Nite's formerly incomplete item catalogue.

## Dependency closure

A normally obtainable source entry is not removed because Live2Nite does not yet implement its result.

For example:

`Large Metal Chest -> Chainsaw Part -> Chainsaw assembly -> charged/empty state -> combat use -> break/repair/reload -> AI valuation`

All normal links required to make that chain meaningful belong to Part 2.

A source condition is different from a missing dependency. Seasonal event items, profession-only paths, hero-only actions, shaman systems, and similar explicitly gated content remain gated until their corresponding source system exists. They must not be made normal loot merely to make a table look complete.

## Loot layers

MyHordes data is represented as separate acquisition layers:

1. normal-zone weighted search table;
2. depleted-zone weighted search table;
3. ruin definitions with source spawn chance, empty chance, distance band, camping data, and weighted drops;
4. item-level openables with their own weighted outputs and opening rules.

These layers share the deterministic `WeightedLootTable` resolver but remain separate definitions.

## Openable model

Openables use exact `ItemInstance` identity and emit `OPENABLE_RESOLVED` through the normal command/event/reducer pipeline.

Supported model requirements include:

- consume-on-open containers;
- stateful containers with remaining contents;
- source item opener requirements;
- AP-costed attempts;
- probabilistic failed opening attempts that preserve the container;
- deterministic weighted outputs;
- capacity validation before an action is offered.

### Resource Pack

MyHordes has 3-, 2-, and 1-content resource-pack item forms. Live2Nite represents these as one physical `resource_pack` item with `ItemState.contents`.

Opening produces either a Twisted Plank (`WOOD2`) or Wrought Iron (`METAL`). A retained pack keeps the same item ID and decrements `contents`; the final opening consumes it.

### Toolbox

Pinned MyHordes output weights:

| Output | Weight |
| --- | ---: |
| Pharmaceutical Products | 25 |
| Semtex / explosive | 19 |
| Handful of Nuts and Bolts / mechanical parts | 17 |
| Kwik-Fix / repair supply | 13 |
| Copper Pipe | 13 |
| Battery | 12 |

The generated source metadata lists Toolbox openers including Chair, PC, Adjustable Spanner, Cutter, Human Bone, CUTCUT, Small Knife, Chain, Knife, Staff, Can Opener, Screwdriver, Swiss Knife, and Hurling Stick. Human Bone and Staff are already implemented and therefore immediately provide legitimate opening paths; the remaining ordinary source tools are dependencies of the full normal-loot graph.

The opener is not consumed by the MyHordes open action.

## Activation policy

A source table is activated when its ordinary dependency graph is mechanically meaningful. This is sequencing, not balance tuning and not permission to delete source entries.

The depleted table is already closed (`WOOD_BAD` 20 / `METAL_BAD` 12), because Rotting Log and Scrap Metal both have Workshop processing paths.

The full normal-zone table is activated only after its ordinary entries and downstream mechanics are implemented. During development, focused tests may inject newly implemented items directly before their complete acquisition layer is switched on.

## Ruins

The current adapted `specialSites` model is transitional. Part 2 replaces it with actual MyHordes ruins rather than mapping generic Live2Nite categories onto approximate source loot.

The eventual authoritative ruin definition carries at minimum:

- source ruin identity and display name;
- spawn chance;
- empty chance;
- minimum/maximum distance from town;
- explorable flag;
- camping base value and spots;
- exact weighted drop table.

Existing examples in the source include Citizen's Home, Scottish Smith's Superstore, Once-inhabited Cave, Old Hydraulic Pump, Old Bicycle Hire Shop, Deserted Freight Yard, Old Field Hospital, Old Aerodrome, Old Police Station, Nuclear Bunker, Motorway Services, Wrecked Cars, Home Depot, Construction Site Shelter, Dark Woods, Collapsed Mineshaft, Collapsed Quarry, and many others.

## AI expectation

Bots evaluate closed containers as potential loot, but opening remains an ordinary legal action:

- open immediately when legal and useful;
- unload enough items first when a retained container needs output space;
- carry/bank a gated container if the required opener is unavailable;
- never bypass AP/tool/capacity requirements;
- preserve room for mission-critical supplies and return loot.

AI weights may express strategy, but they must not modify source loot probabilities.
