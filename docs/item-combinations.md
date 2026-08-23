# Portable item combinations

This document records the portable combination system introduced after the construction-economy pass.

## Sources

The implementation is based on two complementary references:

- MHWiki `Item combinations`, used for player-facing location/action behavior and availability notes.
- The generated MyHordes 5.1.1 recipe dataset pinned at `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`, especially `src/data/recipes.ts`, used for exact recipe relationships and the distinction between `Workshop` and `ManualAnywhere` recipes.

The MyHordes generated dataset is newer than the traditional Die2Nite behavior in some areas. Live2Nite intentionally keeps portable combinations as personal actions rather than moving them into the Workshop.

## Location rules

Portable combinations use exact `ItemInstance` objects.

- **At Home:** ingredients may come from the citizen's Rucksack and Home chest.
- **World Beyond:** ingredients must all be in the Rucksack.
- **Town Bank:** Bank items are never silently consumed by a portable combination. They must first be withdrawn into personal storage.

This preserves the normal command/event/reducer rule: `COMBINE_ITEMS -> ITEMS_COMBINED -> reducer`.

## Categories

### Combine / Assemble

Implemented source-backed combinations include:

- Copper Pipe + Convex Lens -> Telescope
- Wire Reel + Empty Oil Can + Broken Staff -> Guitar
- Tool Bag + Duct Tape + Handful of Nuts and Bolts + Twisted Plank -> Repair Kit
- Engine (incomplete) + Duct Tape + Handful of Nuts and Bolts + Wrought Iron + Compact Detonator + Human Bone -> Engine
- Wire Reel + Semtex + Handful of Nuts and Bolts + Duct Tape -> Claymore Mine
- Box of Matches + Rotting Log -> Torch
- Plastic Bag + Water Ration -> Water Bomb

Assembly actions create a new physical object. Ingredients are consumed by exact instance ID.

### Reload / Refill

Reloading changes the state of the existing object and preserves its ID.

- Water Pistol + Water Ration -> Water Pistol at 3 charges
- Water Cooler Bottle + Water Ration -> +1 stored ration, up to 3
- Battery Launcher 1-ITF + Battery -> loaded Battery Launcher

Using a charge-bearing weapon decrements its stored charges. Drinking from a Water Cooler Bottle decrements its stored ration count and leaves the empty bottle behind.

### Portable Repair

Traditional portable repair is modeled separately from the Workshop.

- Repair Kit + broken weapon -> repaired weapon, 1 AP; the same Repair Kit becomes damaged.
- Kwik-Fix + broken weapon -> repaired weapon, 1 AP; Kwik-Fix is consumed.

The current repair coverage includes Human Bone, Pathetic Penknife, Staff, Serrated Knife, and Machete.

A damaged Repair Kit is restored in the Workshop. That Workshop operation preserves the Repair Kit's exact item ID and changes its condition back to `intact`.

## Workshop boundary

The Workshop is intentionally limited to three categories:

1. **Transform** — low-quality/basic/advanced material processing.
2. **Dismantle** — salvage such as Broken Electronic Device and Mechanism.
3. **Repair** — operations that specifically require Workshop tooling, currently damaged Repair Kit restoration.

Telescope assembly and ordinary broken-weapon repair no longer appear in the Workshop.

## Deferred recipes

The MyHordes recipe dataset contains many additional portable recipes involving items or systems Live2Nite does not yet own: advanced firearm families, event objects, profession-specific recipes, poison/infection systems, uncommon food/drug chains, and specialist equipment.

Those recipes should be added when their inputs, outputs, acquisition paths, and gameplay effects are implemented. In particular, source recipes using Handful of Bullets are not enabled because MHWiki notes that bullets are not normally available to players.

The combination primitive is generic enough to add these incrementally without returning them to Workshop.
