# Blueprint discovery

Live2Nite follows current MyHordes blueprint behavior while retaining Live2Nite-owned IDs and implementation.

## Construction-site discovery

MyHordes distinguishes a construction site being registered in town from that site being complete.

When a site is added, all of its rarity-0 children that require no blueprint are recursively registered as well. Live2Nite mirrors that behavior across the complete catalogue, including WIP entries. Completion does **not** reveal those sites; completion only satisfies the parent prerequisite for actually contributing work to descendants. A WIP site's implementation status can still prevent construction work.

## Blueprint grades

Live2Nite uses its own item IDs:

- `common_blueprint` -> construction tier 1
- `uncommon_blueprint` -> construction tier 2
- `rare_blueprint` -> construction tier 3
- `very_rare_blueprint` -> construction tier 4

Tier 0 is the no-blueprint class and is not the target of a Common Blueprint.

A blueprint can only be read in town. Reading consumes the item even if no eligible construction remains.

The candidate pool contains generic class 1-4 catalogue projects of the matching tier that are not already known and either have no parent or have a direct parent site already known to town. WIP projects remain candidates so implementation readiness does not distort source blueprint pools. One candidate is selected at random. The parent does **not** need to be complete for discovery. Construction work remains blocked until the required parent chain is complete and the selected project is implemented enough to be buildable.

If the selected site has tier-0 descendants, those no-blueprint descendants become known recursively with it, including catalogued WIP descendants.

## Worn Leather Bag

The source normal-scavenging manifest contains the blueprint satchel at weight 15. Live2Nite maps it to `worn_leather_bag`.

Opening the bag consumes it and produces exactly one blueprint using the source weights:

- Common: 50
- Uncommon: 35
- Rare: 10
- Very Rare: 5

The full current normal-zone loot table still fails closed until all ordinary source dependencies are represented, so this PR adds the correct item identity/opening behavior and source mapping without silently pruning the unresolved normal table.

## Ruin camping

Each generated Live2Nite special site tracks one blueprint opportunity. A successful camp can produce a blueprint only after the site is uncovered and only if that opportunity has not already been claimed.

The blueprint is placed on the zone floor rather than directly in the camper's rucksack.

Distance follows the current source calculation: rounded Euclidean distance from town.

- less than 10 km -> Uncommon Blueprint
- 10 km or farther -> Rare Blueprint

Live2Nite's current 14x13 world has a maximum rounded Euclidean distance below 10 km, so ordinary naturally generated sites currently exercise the Uncommon branch. The 10+ Rare rule is implemented and covered for future map growth; other source-faithful rare acquisition routes can also supply Rare plans.

Generic blueprint items only target classes 1-4. Current class-5 special/manual and class-6 dump-specialization constructions are catalogued separately and are not flattened into generic blueprint rarities.

## Specialized explorable-ruin blueprints

The current source catalogue also contains **nine specialized ruin blueprint variants** outside the four generic construction-blueprint items:

- Hotel Blueprint — Uncommon, Rare, Very Rare
- Bunker Blueprint — Uncommon, Rare, Very Rare
- Hospital Blueprint — Uncommon, Rare, Very Rare

Live2Nite records these as its own semantic WIP blueprint-family metadata. They are visible in the Construction Codex blueprint view and searchable there, but they are **not runtime items yet**, do not participate in the generic tier 1-4 candidate pools, and cannot alter construction discovery. The future explorable-ruin pass must implement their acquisition routing and dedicated unlock pools before those behaviors become active.
