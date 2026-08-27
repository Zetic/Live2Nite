# Catapult

Live2Nite's Catapult is reconstructed from the current MyHordes v5.1.2 Catapult controller/action tables rather than the older Die2Nite-era random-operator behavior.

## Facility flow

The built Catapult exposes a dedicated town facility screen. The operator:

1. selects a supported item from their **personal rucksack**;
2. selects a valid World Beyond coordinate other than town `[0,0]`;
3. fires the item;
4. pays the shot AP cost;
5. resolves accuracy before the payload effect;
6. applies the landing transformation and any remote zombie effect;
7. records the shot in the Catapult Register.

The Bank is not fired directly. A payload must first be carried by the operator. Broken stateful items are rejected, matching the current source controller.

## Cost and accuracy

| State | AP | Miss chance |
| --- | ---: | ---: |
| Catapult | 4 | 25% |
| Upgraded Catapult | 2 | 5% |

A miss selects one valid cardinally adjacent zone. The payload then resolves against that actual impact zone, so area damage is centered on the scattered coordinate.

The implementation follows the source controller's valid-coordinate model rather than adding a separate Catapult range statistic. Town itself cannot be targeted.

## Operator boundary

Current MyHordes makes `Catapultist` a voted town role. Live2Nite does not yet have the generic town-role election framework, so the base Catapult remains **Partial** even though its firing mechanics are active.

Until that framework exists:

- the sole ordinary human citizen is the provisional operator;
- autonomous citizens cannot seize/use the Catapult;
- no obsolete hero/activity/random operator-selection algorithm is recreated;
- when the governance system lands, this provisional selector should be replaced by the elected role without changing firing mechanics.

## Payload model

Payload behavior is data-driven by runtime item type. Each supported payload defines:

- landing result: intact, broken, debris, scrap, mouldy remains, or destroyed;
- optional broken replacement runtime item;
- optional zombie damage tier;
- optional blast footprint;
- optional Small Trebuchet requirement.

Damage tiers are current-source values:

| Tier | Total zombies killed |
| --- | ---: |
| Ridiculous | 0–3 |
| Low | 4–10 |
| High | 11–20 |
| Important | 21–30 |

The random kill total is capped by zombies actually present in the footprint. Kills are distributed across still-populated affected zones using the same ordered/repeated allocation shape as the current source processor and permanently reduce their World Beyond zombie counts.

Footprints:

- `zone`: impact zone only;
- `cross`: impact zone + four cardinal neighbors;
- `square3x3`: impact zone + all eight surrounding zones.

The kill range is **total across the footprint**, never per zone.

## Runtime-covered payloads

The table below lists the source-verified effects currently expressible with existing Live2Nite runtime identities.

| Payload | Landing | Zombie effect |
| --- | --- | --- |
| Water Ration, Rotting Log, Scrap Metal, Twisted Plank, Wrought Iron and supported small supplies | intact | none |
| Mechanism | Scrap Metal | none |
| Radio Cassette Player (off) | Scrap Metal | none |
| Telescope | Scrap Metal | none |
| Convex Lens | debris result | none |
| Working Radio | debris result | none |
| Staff | Broken Staff | none |
| Ordinary source food represented by Mouldy Ham Sandwich / Vegetable / Blue Apple / Meaty Bone / steak / prepared meal families | mouldy-remains result | none |
| Quality Log | destroyed | 4–10, zone |
| Unshaped Concrete Block | destroyed | 0–3, zone |
| Patchwork Beam / Metal Support | debris result | 0–3, zone |
| Human Bone / Pathetic Penknife / Serrated Knife / supported small repairable tools | broken equivalent | 0–3, zone |
| Machete | Broken Machete | 4–10, zone |
| Torch | debris result | 0–3, zone |
| Old Door / Järpen Table / Trestle / Sheet Metal | debris result | 4–10, cross |
| Engine | Scrap Metal | 4–10, cross |
| PC Base Unit | Broken PC Base Unit | 4–10, cross |
| Water Bomb | destroyed | 4–10, cross |
| Sheet Metal (parts) | destroyed | 4–10, 3×3 |
| Exploding Grapefruit | destroyed | 11–20, 3×3 |
| Claymore Mine | destroyed | 21–30, 3×3 |
| Chicken | destroyed | 0–3, zone; Small Trebuchet required |

Unsupported source items remain absent rather than being assigned guessed effects.

## Small Trebuchet

Small Trebuchet is implemented as the source Catapult gate for animal/pet payloads. A Chicken is currently the only Live2Nite runtime animal with a source-verified Catapult profile. Attempting to launch it before Small Trebuchet is complete is rejected.

## Impact-remains boundary

Current MyHordes has generic debris/remains and mouldy-remains outputs used by several Catapult impacts. Live2Nite does not yet have canonical runtime identities for those exact source outputs. For those profiles:

- the Catapult Register records the correct `debris` or `moldy` outcome;
- the source item is consumed;
- the correct zombie damage still resolves;
- no unrelated substitute item is spawned.

This deliberately fails closed rather than silently changing source remains into Scrap Metal or a different food item.

The Season 19 **Ball of Debris** recipe (three generic debris objects + Duct Tape) is therefore intentionally deferred until generic debris becomes a proper runtime item. Its source Catapult effect is already known: destruction on impact with 11–20 total kills over a 3×3 footprint.

## Map intelligence

The Catapult targeting grid never reads hidden raw zombie counts. Zone tooltips use the same `WorldKnowledge` layer as autonomous planning and the ordinary World Beyond map, preserving unknown, estimated, stale and exact intelligence boundaries. Firing still changes the true persistent zone population; it does not magically refresh unrelated reconnaissance.

## Automation boundary

Basic bots do not autonomously fire the Catapult in this pass. Current MyHordes gates firing behind a voted operator, and Catapult shots irreversibly consume shared strategic items. Bot use should be added only after town-role voting exists and the town planner can value expedition supply requests versus ammunition/resource preservation.

## Regression coverage

`tests/catapult.test.tsx` covers:

- construction statuses;
- provisional operator gating;
- base/upgraded AP and scatter values;
- intact remote supply delivery;
- cardinal miss behavior;
- persistent 3×3 Exploding Grapefruit and Claymore bombardment;
- Trestle cross damage;
- source impact transformations;
- Small Trebuchet animal gating;
- town-target rejection;
- facility navigation and rendering.
