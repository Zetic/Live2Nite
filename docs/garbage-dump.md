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
- current runtime animal coverage is Chicken.

Water Rations are not treated as food for the Dump. Broken weapons are not treated as weapons unless their runtime item definition itself supports the weapon capability.

Additional source animals or material identities should be added only when their actual Live2Nite runtime items are implemented. Source-only Codex rows are not enough to make an object destructible.

## Organized Dump

The Organized Dump source effect is implemented: when the construction is complete, the Dump action cost becomes **0 AP**.

The construction itself remains WIP and is not normally buildable yet because its current source material bill requires **Trestles**, and Live2Nite does not yet have a verified runtime identity/acquisition path for that material. No substitute resource or fabricated acquisition path is introduced here.

Debug/fixture completion can exercise the zero-AP mechanic for regression coverage without making the unresolved construction normally playable.

## Construction and blueprint boundaries

The Garbage Dump uses its current construction catalogue identity and current-source economy. Historical wiki values are useful for validating the interaction rules but do not replace the current catalogue's AP/material data.

The six Dump specializations remain blueprint class 6: **Dump specialization**. They are deliberately not injected into the generic class 1–4 blueprint pool. This PR implements their runtime effects without inventing a new acquisition route.

Dump Upgrade remains an ordinary class-4 construction. Organized Dump remains class 3 but fails closed at the buildability layer until its Trestle dependency is represented.

## Autonomous citizens

Bots do not automatically destroy Bank items in this pass. Dumping is irreversible communal-resource destruction, and the existing autonomous planning system does not yet provide a sufficiently strong reservation/consensus rule for deciding when shared food, weapons, or construction resources should be sacrificed.

Bots can continue to gather and deposit resources normally; a future AI pass can add dumping once resource reservations and late-night defense tradeoffs are modeled explicitly.
