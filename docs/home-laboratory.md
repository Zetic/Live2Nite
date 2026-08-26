# Home Laboratory

Live2Nite models the current MyHordes Home Laboratory as a personal home improvement rather than a generic Hero ability. The implementation uses Live2Nite semantic IDs and event/RNG infrastructure; upstream implementation code and numeric IDs are not copied.

## Home improvement progression

| Level | AP to build | Required item | Twinoid chance | Base experiments/day |
| --- | ---: | --- | ---: | ---: |
| 1 | 6 AP | Old Washing Machine ×1 | 25% | 1 |
| 2 | 4 AP | Electronic Component ×1 | 50% | 1 |
| 3 | 4 AP | Copper Pipe ×1 | 75% | 1 |
| 4 | 6 AP | Engine ×1 | 100% | 4 |

A Laboratory experiment costs **0 AP** and consumes **2 Pharmaceutical Products** from the citizen's rucksack/Home Chest. The experiment always consumes the two inputs and one daily use.

A successful experiment creates **Twinoid 500mg**. On failure, one lesser pharmaceutical result is selected deterministically from the current source-backed pool:

- Anabolic Steroids
- Valium Shot
- Unlabelled Drug
- Hydratone 100mg
- Water Purifying Tablets

The success roll and failure-output roll use the normal persisted Live2Nite RNG state. Replaying the same state and command therefore produces the same result.

## Central Laboratory

The town **Central Laboratory** is a Workshop-branch construction. It costs 20 AP and:

- Handful of Nuts and Bolts ×1
- Pharmaceutical Products ×4
- Patchwork Beam ×5
- Metal Support ×5
- Bag of Damp Grass ×2
- Convex Lens ×1
- Old Washing Machine ×1

Once completed it adds **5 Home Laboratory experiments per citizen per day**. This changes the daily limits to 6 / 6 / 6 / 9 for Home Laboratory levels 1–4. It does not alter the Twinoid success percentage and does not add a fabricated defensive effect.

## Pharmaceutical results

**Twinoid 500mg** counts as a drug and restores AP toward 8. **Hydratone 100mg** counts as a drug and treats Thirsty/Dehydrated through the existing hydration rules. **Unlabelled Drug** uses its deterministic weighted random effect table and can restore AP, cause Terrorized, cause Addiction with AP restoration, or have no effect.

**Water Purifying Tablets** exist as the current Home Laboratory output/component, but water-purification gameplay is intentionally not invented in this PR. They have no drug-use action until their separate source-backed purification mechanic is implemented.

## Player UI and bots

The Home → Works row shows the installed Laboratory level, current Twinoid chance, experiments used/available today, Pharmaceutical Product requirement, and Central Laboratory bonus. The experiment action is kept inside the compact Home Works UI rather than adding another large navigation destination.

Basic bots use the same legal `USE_HOME_LAB` command as human citizens. Late in the day, after urgent defense/home priorities, a bot may build an available Laboratory level and use an available 0 AP experiment. It does not spend Pharmaceutical Products on this discretionary action while town defense is in critical/shortfall pressure.

## Persistence and event model

Daily Laboratory usage is derived from `HOME_LAB_USED` events for the current day rather than a second mutable counter. Each event records the Laboratory level, success chance, result, consumed item IDs, output storage, and post-roll RNG state. The normal event reducer consumes both Pharmaceutical Products and creates exactly one output item.
