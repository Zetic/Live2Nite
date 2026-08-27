# Garbage Dump

Live2Nite models the Garbage Dump as an irreversible town facility that converts selected Bank items into **temporary defense for the current night**.

## Core action

Once the Garbage Dump is complete, a living citizen in town may destroy an eligible item directly from the shared Bank.

- each destruction normally costs **1 AP**;
- the exact Bank item is permanently removed;
- a defensive object contributes **4** temporary defense before improvements;
- supported weapons, food, wood, metal, and animals contribute **1** temporary defense before improvements;
- Dump defense is counted in the normal town-defense calculation for that day's attack;
- the bonus is event/day-derived and therefore does not carry into the following day.

The facility UI always displays the exact defense value before the item is destroyed.

## Category improvements

The six class-6 Dump specialization constructions are kept separate from the generic Common / Uncommon / Rare / Very Rare blueprint ladder.

| Specialization | Additional defense per matching item |
| --- | ---: |
| Defence Dump | +2 |
| Weapons Dump | +5 |
| Food Dump | +3 |
| Wood Dump | +1 |
| Metal Dump | +1 |
| Animal Dump | +6 |

**Dump Upgrade** adds another **+1** to every eligible item, after the category-specific bonus.

Examples:

- Defensive object with no improvements: 4
- Defensive object + Defence Dump: 6
- Defensive object + Defence Dump + Dump Upgrade: 7
- Weapon + Weapons Dump + Dump Upgrade: 7
- Animal + Animal Dump + Dump Upgrade: 8

## Item classification

Eligibility follows Live2Nite runtime behavior rather than a copied upstream numeric item list.

- defensive objects use the existing defense capability and must provide actual Bank defense;
- weapons use the runtime weapon capability;
- food uses the runtime food-consumable definition;
- current wood coverage is Rotting Log and Twisted Plank;
- current metal coverage is Scrap Metal and Wrought Iron;
- runtime animals use the shared animal capability: Chicken, Stinking Pig, Giant Rat, Guard Dog, Fat Cat, and Huge Snake.

Water Rations are not treated as food for the Dump. Broken weapons are not treated as weapons unless their runtime item definition itself supports the weapon capability.

Source-only animal rows do not become Dump objects merely by existing in the source catalogue. The six ordinary pet identities above are eligible because they are now real Live2Nite runtime items.

## Trestle dependency and gameplay

Trestle is a complete Live2Nite item mapped to the pinned source identity `trestle_#00`.

Its runtime coverage includes:

- source `heavy` metadata, so it obeys the one-cumbersome-item carrying rule;
- +1 Bank defense and +1 Home defense;
- defensive/decoration/component capabilities;
- Garbage Dump defensive-object classification;
- ordinary source-loot mapping at the source table's weight 8, ready for the full normal-zone table when the remaining unrelated source-item dependencies are complete;
- exact currently represented source ruin rows: Home Depot (8), Construction Site Shelter (10), PI-KEYA Furniture (10), Disused Car Park (8), Abandoned Construction Site (15), and Blocked Road (5);
- outside installation for **1 AP**, consuming the exact carried Trestle and adding **+9 permanent campsite improvement points**, capped at 50;
- backward-compatible campsite storage: existing schema-19 `campImprovements` values remain +5-point legacy steps while current zones may retain an exact improvement level for non-multiple-of-five effects;
- **15 Night Watch defense** as IKEA-family equipment, with the Trestle destroyed when the Watch actually uses it;
- the Swedish Workshop furniture specialist bonus, which raises its Watch contribution by 30% to 19 after integer flooring.

The current source item status is therefore **Implemented**.

Flatpacked Furniture is also a known source route to furniture, but no output probability table is invented in this PR because its exact current output weights have not been recovered. Trestle already has verified active acquisition routes without relying on that unresolved table.

## Organized Dump

Organized Dump is fully buildable. Its current construction bill is:

- 20 AP;
- 2 Handfuls of Nuts and Bolts;
- 1 Unshaped Concrete Block;
- 5 Patchwork Beams;
- 10 Metal Supports;
- 2 Trestles.

When completed, Garbage Dump destruction actions cost **0 AP**.

## Construction and blueprint boundaries

The Garbage Dump uses its current construction catalogue identity and current-source economy. Historical wiki values are useful for validating the interaction rules but do not replace the current catalogue's AP/material data.

The six Dump specializations remain blueprint class 6: **Dump specialization**. They are deliberately not injected into the generic class 1–4 blueprint pool. This PR implements their runtime effects without inventing a new acquisition route.

Dump Upgrade remains an ordinary class-4 construction. Organized Dump remains an ordinary class-3 construction and passes the normal buildability/material checks because Trestle has a verified runtime and acquisition path.

## Autonomous citizens

Bots do not automatically destroy shared Bank items in this pass. Dumping is irreversible communal-resource destruction, and the existing autonomous planning system does not yet provide a sufficiently strong reservation/consensus rule for deciding when shared food, weapons, animals, or construction resources should be sacrificed.

Trestle field use is resource-aware. Autonomous campers preserve carried Trestles while Organized Dump still requires them; once that dependency is satisfied, a low-AP camper may consume a spare Trestle for the stronger +9 campsite improvement when needed.
