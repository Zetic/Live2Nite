# Complete item catalogue

Live2Nite carries a complete reference catalogue for the pinned current-MyHordes item/state registry while keeping runtime identity and implementation Live2Nite-owned.

## Source baseline

The catalogue is generated from `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`, which was generated from the MyHordes 5.1.1 data set and remains the latest published generated registry snapshot used by this project. The public MyHordes v5.1.2 release line remains the behavioral reference.

The source registry contains **383 item/state entries** across the original source categories: 139 Miscellaneous, 59 Food, 55 Armoury, 47 Furniture, 27 Containers and boxes, 25 Resources, 19 Pharmacy, and 12 Defences.

No upstream numeric item IDs are stored. `ItemSourceCatalogEntry.id` is a Live2Nite semantic catalogue identity. `sourceRef` exists only as an external parity/audit key and must never be used as gameplay identity.

## Item families and states

The source registry is a list of item **states**, not a player-facing list of conceptual items. The Codex therefore preserves all 383 source records but groups state transitions into one Live2Nite-owned item family.

Examples include:

- Water Pistol — empty / 1 shot / 2 shots / 3 shots;
- Can — closed / open;
- Repair Kit — intact / damaged;
- Battery Launcher — empty / loaded;
- Radio Cassette Player — unpowered / powered;
- stateful Construction Kits and Water Cooler Bottles.

Runtime-only states such as dedicated broken-weapon identities join their matching family instead of creating duplicate top-level Codex rows. Blueprint rarity variants remain separate conceptual items: rarity is not treated as a mutable state.

## Source category versus Codex category

MyHordes source categories are retained on each source-state record for parity, but they are **not** used directly as Live2Nite Codex tabs. The source taxonomy contains gameplay-awkward placements such as Doggy Bag and Food Parcel under Food and Bag of Cement under Miscellaneous.

The player-facing Codex instead classifies item families by their primary gameplay role:

- Resources
- Food & Drink
- Pharmacy
- Armoury
- Tools & Equipment
- Containers
- Defences
- Furniture
- Blueprints
- Documents
- Creatures
- Miscellaneous

This intentionally places openable Doggy Bags, Cans and Food Parcels under **Containers**, Bag of Cement under **Resources**, and pets/animals under **Creatures** while still displaying the original MyHordes source category in state-level game data.

## Runtime boundary

- **Implemented** — the source state maps to an active Live2Nite runtime item/state with its currently required gameplay behavior represented.
- **Partial** — a runtime identity exists, but some source behavior or dependent mechanic remains incomplete.
- **WIP** — the source state is catalogue/reference metadata only and has no active runtime identity.

WIP catalogue states do not become loot, container outputs, construction resources, consumables, weapons, or recipes merely because they are visible in the Codex. Acquisition systems continue to fail closed on unresolved source items.

## Derived relationships

Codex relationships continue to be derived from runtime definitions rather than duplicated metadata. Construction uses display the complete material bill and AP cost; portable combinations display all inputs and their output; Workshop transformations display full input/output context. This lets a resource page explain the other materials involved instead of only saying how many units of the selected item are used.

## Source-name reconciliation

The catalogue pass also corrected stale aliases found by comparing existing mappings with the generated source registry:

- `rustine_#00` is **Duct Tape**; **Kwik-fix** is `repair_one_#00`.
- `chama_#00` is **Dried Marshmallows** and remains WIP.
- `ryebag_#00` is **Bag of Damp Grass**.
- `poison_part_#00` is **Corrosive Liquid**; Live2Nite keeps the semantic ID `poison_gland` for save/code stability while correcting the display name.

These mappings do not copy upstream numerical IDs or implementation code.
