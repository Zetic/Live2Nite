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

Hotel, Bunker, and Hospital each use three specialized plan tiers: Uncommon, Rare, and Exceptional. Live2Nite stores the family/tier on its own generic runtime blueprint item state rather than copying upstream numeric item or building IDs.

Current MyHordes source weights remain:

- Uncommon: 800
- Rare: 400
- Exceptional: 200

The default current MyHordes `explorable_ruin_params.plan_limits.lists` configuration defines **6 Uncommon / 10 Rare / 5 Exceptional** construction candidates for each explorable family. Live2Nite maps those source entries to semantic construction IDs in `EXPLORABLE_BLUEPRINT_POOLS` and regression-tests the complete lists.

Reading a specialized plan in town selects only from its matching family/tier pool, excludes already discovered projects, and requires the direct parent to be known when a candidate has one. The Hotel/Hospital/Bunker exterior no longer exposes the old one-click special-site search; plan items remain staged in explorable-ruin loot until room-loot integration consumes that data.

## Debug Codex controls

The Codex contains temporary development controls that intentionally bypass normal acquisition/build rules:

- **Summon** on an item state creates its active Live2Nite runtime item directly in the controlled citizen's rucksack. Source-only/WIP states without a runtime identity cannot be summoned.
- **Instant Build** on a construction completes that construction and every prerequisite recursively without spending AP or Bank materials. Completion-only world/Well effects are applied once for projects that were not already complete.

These controls are test tooling and are not part of MyHordes gameplay fidelity.
