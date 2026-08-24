# Blueprint discovery

Live2Nite follows current MyHordes blueprint behavior while retaining Live2Nite-owned IDs and implementation.

## Construction-site discovery

MyHordes distinguishes a construction site being registered in town from that site being complete.

When a site is added, all of its rarity-0 children that require no blueprint are recursively registered as well. Live2Nite mirrors that behavior: the playable no-blueprint tree is visible from the beginning where it is connected through no-blueprint parents. Completion does **not** reveal those sites; completion only satisfies the prerequisite for actually contributing work to descendants.

## Blueprint grades

Live2Nite uses its own item IDs:

- `common_blueprint` -> construction tier 1
- `uncommon_blueprint` -> construction tier 2
- `rare_blueprint` -> construction tier 3
- `very_rare_blueprint` -> construction tier 4

Tier 0 is the no-blueprint class and is not the target of a Common Blueprint.

A blueprint can only be read in town. Reading consumes the item even if no eligible construction remains.

The candidate pool contains playable projects of the matching tier that are not already known and either have no parent or have a direct parent site already known to town. One candidate is selected at random. The parent does **not** need to be complete for discovery. Construction work remains blocked until the required parent chain is complete.

If the selected site has playable tier-0 descendants, those no-blueprint descendants become known recursively with it.

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

Specialized hotel, bunker, and hospital blueprint pools belong to the explorable-ruin pass and are not flattened into the generic blueprint system.
