# Stateful item economy

Schema v16 makes physical item instances the authoritative currency of the item economy. This is the foundation for expanding Live2Nite toward the much larger Hordes / Die2Nite / MyHordes object catalog without repeatedly rebuilding storage, recipes, UI, AI, and persistence whenever an item gains charges, condition, contamination, or another persistent state.

## Core invariant

Every physical object is an `ItemInstance`:

```ts
interface ItemInstance {
  id: string
  type: ItemType
  state?: ItemState
}
```

The Bank, rucksack, Home chest, and World Beyond ground all store item instances. Moving an object between those locations moves the same logical object. A Bank withdrawal must not destroy an abstract count and manufacture a replacement object.

For an ordinary deposit/withdraw cycle:

- item ID is unchanged;
- normalized persistent state is unchanged;
- `nextItemId` is unchanged;
- only the owning storage collection changes.

New/generated objects are created through `createItemInstance`.

## Canonical item catalog

`src/core/itemCatalog.ts` owns the stable item ID vocabulary and common state/display types. `ItemType` is derived from that catalog instead of being maintained as a separate hand-written union.

`src/core/items.ts` owns gameplay definitions and capabilities such as:

- display category;
- Bank/Home defense;
- consumability;
- container/openable behavior;
- weapon/breakage behavior;
- persistent state schema and default state.

Adding an item ID to the catalog does **not** automatically make that object spawn in the World Beyond, starter packages, special sites, or construction output. Catalog presence and gameplay availability are intentionally separate decisions.

That distinction allows the architecture to be extended and tested with representative objects before their historical drop rates, recipes, or exact mechanics are reconstructed.

## Persistent state

The initial v16 state vocabulary supports the families needed for the next catalog expansion:

- `charges` — ammunition, water, uses, or other finite capacity;
- `condition` — intact/damaged/broken-style equipment state;
- `contamination` — clean, poisoned, infected;
- `assembly` — future disassembled/partial/assembled object chains.

Definitions determine which state fields are meaningful for an item. `normalizeItemState` supplies defaults and clamps bounded values. Examples in the representative catalog include:

- Water Pistol — charge-bearing equipment;
- Water Cooler Bottle — charge-bearing and contamination-capable;
- Repair Kit — condition-bearing equipment;
- food and Water Ration — contamination-capable consumables.

A static construction resource such as Sheet Metal does not need artificial state merely because the state system exists.

## Bank storage and stacking

`TownState.bank` is an `ItemInstance[]`.

Core systems use helpers in `src/core/bank.ts` rather than indexing the Bank as a numeric record:

- `bankCount`
- `bankHas`
- `firstBankItem`
- `removeBankItems`
- `removeBankItemById`
- `stackBankItems`

The UI may visually stack interchangeable objects, but stacking is a **derived presentation**. Objects stack only when their item type and normalized persistent state match.

For example, these are separate Bank stacks:

```text
Water Pistol · 3/3 charges [2]
Water Pistol · 1/3 charges [1]
Water Pistol · 0/3 charges [1]
```

The authoritative Bank still contains four individual objects with four IDs.

## Commands and events

Bank transfers preserve the command/event invariant:

`GameCommand -> legal-action validation -> GameEvent[] -> reducer -> GameState`

`WITHDRAW_BANK_ITEM` addresses an exact `itemId`. The command resolves that object from the Bank and emits `ITEM_WITHDRAWN`; the reducer removes the same ID and adds the same instance to the citizen inventory.

Deposits work in the opposite direction through `DEPOSIT_ITEM` / `ITEM_DEPOSITED`.

Construction and Workshop operations may consume objects by type/count when the recipe itself does not care which equivalent instance is used. Stateful recipes should instead use explicit state-aware requirements.

## Generalized recipe requirements

`src/core/itemRecipes.ts` provides reusable recipe primitives for future transform/combine/assemble/repair/reload/dismantle/open/purify/cook systems.

A requirement may constrain both type and state:

```ts
{
  type: 'water_pistol',
  count: 1,
  state: { charges: 0 },
}
```

This is intentionally different from simply requiring one Water Pistol. The helpers can count and select only matching instances, allowing future mechanics such as:

- reload only an empty or partially empty weapon;
- repair only damaged equipment;
- purify contaminated water;
- assemble only objects in the expected assembly state;
- consume multiple exact component families without flattening their state.

The existing Workshop recipes remain compatible with the simple type/count path until their underlying mechanics require richer state.

## AI boundary

Autonomous citizens still act through the same legal commands as the human-controlled citizen. AI planning may derive aggregate stock counts from item instances, but it must not bypass object identity when selecting a withdrawal.

Current planning uses Bank helpers for construction stock, food, weapons, water, Home material reserves, and Workshop availability. A selected loadout withdrawal resolves to one exact legal Bank item.

As richer item mechanics become active, AI valuation can inspect capabilities/state without changing the storage model. For example, a loaded Water Pistol and an empty Water Pistol can eventually receive different field value while remaining the same item type.

## Development save compatibility

Current-schema persistence is a hard requirement: a v16 town must save/reload with item IDs and persistent state intact.

Live2Nite is still in rapid development, so backward compatibility with older development schemas is not a PR blocker. A schema-breaking change may require starting a new town. Existing v15 -> v16 migration code remains because it is already implemented and tested, but future work should not be delayed solely to preserve every historical development save. See `instructions.md` for the project-wide policy.

The existing v15 -> v16 migration materializes count-based Bank entries as unique instances, normalizes representable legacy objects, and protects generated-ID uniqueness. That behavior is useful compatibility, not a promise that all future schema versions will receive equivalent backward migrations during this phase.

## Historical-source discipline

The architecture is broader than the currently verified historical data. Historical claims should continue to distinguish:

1. **ORIGINAL / RECOVERED** — directly supported by surviving Die2Nite/Hordes material;
2. **REGIONAL / VERSION-SPECIFIC** — supported for a particular version or language/region;
3. **MYHORDES_CURRENT** — supported by current MyHordes behavior/data;
4. **LIVE2NITE_ADAPTATION** — a deliberate reconstruction or design choice.

A representative object in the v16 catalog is not a claim that its final Live2Nite recipe, drop rate, charge count, or effect is historically exact.

## Catalog expansion roadmap

The next catalog passes can build on v16 without another storage rewrite. Suggested order:

1. **Resources and materials** — beams, supports, sheet fragments, nuts/bolts, chains, metal structures, defensive furniture and construction components.
2. **Containers and openables** — boxes, bags, cases and deterministic/weighted contents.
3. **Food/water/status objects** — contamination, poisoning/infection hooks, purification and cooking.
4. **Weapons and ammunition** — charges, reloads, breakage/condition, repair paths and compatible ammunition families.
5. **Transform/assembly recipes** — state-aware Workshop and anywhere/home recipes.
6. **Special/role/quest objects** — only after the status/profession/social systems that give them meaning exist.

For each batch, catalog definition, spawn source, recipe/effect, UI affordance, AI value, persistence, and focused tests should land together. Avoid adding hundreds of inert spawnable objects merely to match a wiki list.

## Regression requirements

The v16 item economy should keep focused tests for:

- canonical default state and bounded-state normalization;
- type+state Bank stacking;
- exact Bank deposit/withdraw identity preservation;
- state-constrained requirement matching;
- current-schema item identity/state persistence;
- existing construction, Workshop, defense, AI and multi-day simulations.

Legacy migration tests may remain when useful, but backward migration completeness is not a hard development-stage invariant. Economy/survival benchmark values remain telemetry while progression is still under construction; object identity, command legality, current-schema persistence, and deterministic behavior are the hard item-economy invariants.
