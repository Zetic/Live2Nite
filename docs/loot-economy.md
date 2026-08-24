# Loot/openable foundation

PR #29 establishes reusable source-backed loot and openable infrastructure plus a first mechanically complete MyHordes item pass. It deliberately does **not** activate the complete MyHordes normal-zone table or replace the current ruin runtime.

## Source policy

Primary behavioral authority is the current Eternaltwin/MyHordes source/release line.

Structured source data in this branch is cross-checked against:

- `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`;
- generated from MyHordes 5.1.1.

At finalization, implemented/activated mechanics are checked against the current public MyHordes release line. The full manifests may contain future dependencies; their presence does not make those items obtainable in PR #29.

Source weights are fidelity data. Live2Nite does not rebalance copied MyHordes weights simply to fit the current partial item catalogue.

## Current-source audit — 2026-08-23

The merge audit was repeated against the current public MyHordes line rather than assuming the pinned 5.1.1 export was still current.

- Current public release: **v5.1.2** (`42f53fa5`, 2026-07-20).
- Current master inspected during the audit: **`c05060df`**.
- `ItemGroupDataService.php` still contains the same depleted table (`wood_bad_#00` 20 / `metal_bad_#00` 12) and the same normal-source weights used by the manifest for the items represented by this PR.
- Resource Pack actions still use the 3 → 2 → 1 morph chain, require room for intermediate outputs, and consume the final pack.
- Can still uses the source can-opener requirement and deterministic open-can morph.
- Toolbox and Food Box still consume the container and use their distinct source opener requirement families; the current Workshop recipe table still carries the Toolbox weights `12/17/13/13/25/19` and Food Box weights `8/11/7/13/8`.
- `grenade_empty_#00` still maps to the fillable Plastic Bag path. Filling consumes one water item and morphs it to the Water Bomb state.
- Water Bomb still consumes itself and uses `zone_kill_2_4`; Live2Nite therefore uses **2–4 kills**, not the older adapted 1–5 range.
- Water Pistol still fills directly to the three-charge state; successive attacks morph 3 → 2 → 1 → empty and kill one zombie per shot.
- Water Cooler Bottle states still refill one step at a time: empty → 1 → 2 → 3, consuming one water item per refill.
- Radio Cassette Player still consumes one Battery and morphs to the powered radio state.
- Ektorp-Gluten Chair still has 50% break / 50% one-zombie kill groups. PC Base Unit still has 50% break and a guaranteed one-zombie kill.
- Current recipes still confirm Sheet Metal (bits) → Sheet Metal, Quality Log → Twisted Plank, Chinese Noodles + Strong Spices + Water → spicy noodles, Damaged Hacksaw + Kwik-Fix + Nuts & Bolts → Hacksaw, and the Repair Kit/Engine assembly chains represented in this pass.

One intentional approximation remains documented: the current Staff fixture still contains the malformed/ambiguous `60/60` break group inherited from the source data. Live2Nite keeps that weapon marked `confidence: 'approximate'` rather than inventing a falsely exact source percentage.

Technician/hero/event alternatives referenced by the current fixtures remain gated because those systems are outside this PR's activated scope.

## Merge boundary

The dependency-closure rule applies to **activated acquisition paths**, not recursively to every source ID recorded in a manifest.

For PR #29:

- anything made obtainable by this PR must have the mechanics required to make it meaningful;
- manifest-only entries may remain unresolved while their acquisition layer is inactive;
- seasonal, hero, profession, event and other conditional source paths remain gated rather than being promoted to ordinary loot;
- future PRs can close additional dependency clusters before activating the corresponding full source table.

This keeps the source manifests useful as an auditable dependency map without forcing unrelated drug, equipment, pet, firearm, inventory-extension and ruin systems into one pull request.

## Landed foundation

### Weighted loot

`WeightedLootTable` and `rollWeightedLoot` provide a deterministic shared resolver for source-backed weighted outcomes.

The complete normal-zone source manifest and the initial ruin manifest are reference/dependency data in this PR. The normal table has a fail-closed readiness gate so unresolved ordinary source IDs cannot be silently discarded during activation.

### Depleted zones

The depleted-zone table is active and source-backed:

| Output | Weight |
| --- | ---: |
| Rotting Log | 20 |
| Scrap Metal | 12 |

Both outputs have Workshop conversion paths, so this acquisition layer is mechanically closed.

### Openables

Openables use exact `ItemInstance` identity and emit `OPENABLE_RESOLVED` through the command/event/reducer pipeline.

The model supports:

- consume-on-open containers;
- stateful containers with remaining contents;
- source opener requirements;
- deterministic morphs;
- AP-costed/probabilistic attempts when required by a definition;
- output-capacity validation.

Source-backed definitions currently included in this pass are Resource Pack, Doggy Bag, Can, Food Box and Toolbox. Containers that still depend on larger mechanic clusters remain future work rather than being partially activated.

### Resource Pack

MyHordes 3-, 2- and 1-content pack forms are represented as one physical `resource_pack` item with `ItemState.contents`.

Each opening produces either a Twisted Plank or Wrought Iron. If contents remain, the same item ID is retained and its contents decrement; the final opening consumes the pack.

### Toolbox

Current source weights:

| Output | Weight |
| --- | ---: |
| Pharmaceutical Products | 25 |
| Semtex | 19 |
| Handful of Nuts and Bolts | 17 |
| Kwik-Fix | 13 |
| Copper Pipe | 13 |
| Battery | 12 |

The ordinary source opener family represented by Live2Nite is enforced and opening does not consume the opener. Hurling Stick remains event-gated.

The ordinary opener/tool items introduced in this pass are real breakable weapons where source behavior is represented, with Repair Kit / Kwik-Fix restoration paths rather than inert keys.

### Can

The closed Can uses the source main-opener family and deterministically morphs into Open Can while preserving physical identity semantics. The opener is not consumed by opening.

### Doggy Bag and Food Box

Their source output tables are represented by the generic openable engine. Food Box normal acquisition remains gated because not every downstream food/status dependency belongs to this PR.

### Plastic Bag and Water Bomb

`grenade_empty_#00` is the source Plastic Bag, distinct from `bag_#00` (Manbag). Plastic Bag + Water Ration creates a Water Bomb.

Current MyHordes combat behavior represented by Live2Nite for Water Bomb is a single-use, 0-AP action requiring positive AP that kills **2–4 zombies**.

### Chair, PC and Radio

The Ektorp-Gluten Chair and PC Base Unit are source-valid container openers and breakable weapons with their source-backed repair paths. Radio Cassette Player (off) can consume a Battery through the portable combination to become the existing working radio identity.

## Intentionally deferred activation

The following are explicit follow-up work and do not block PR #29:

- closing every ordinary normal-loot source ID;
- Manbag / expanded rucksack capacity;
- medicine, drug, addiction and broader status mechanics;
- ghoul/Human Flesh behavior;
- Citizen Welcome Pack migration and Shoe mechanics;
- Metal Chest, XL Chest, Safe, Decoration Box and other remaining containers;
- replacing `NORMAL_SCAVENGE_LOOT_POOL` with the complete MyHordes normal table;
- replacing transitional `SPECIAL_SITES` with the full MyHordes ruin runtime;
- ruin-only item dependencies, firearms, pets and other unrelated source systems.

## Ruin manifest

The MyHordes ruin manifest added by this PR is reference data for a later focused ruin implementation. It records source identity, spawn chance, empty chance, distance band, camping values and raw weighted drops without forcing those unresolved drops into the current runtime.

The existing `SPECIAL_SITES` runtime therefore remains transitional by design in PR #29.

## AI expectation

For the items and openables actually active in this pass, bots use the ordinary legal-action layer and must not bypass tool, AP, capacity or item-state requirements. AI strategic values may affect decisions but never source loot probabilities.

## Follow-up activation rule

A later PR may activate a complete source acquisition layer only when that layer's ordinary dependency graph is mechanically ready. Until then, the fail-closed mapping/readiness infrastructure prevents accidental partial activation.
