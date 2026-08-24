# Complete item catalogue

Live2Nite carries a complete reference catalogue for the pinned current-MyHordes item/state registry while keeping runtime identity and implementation Live2Nite-owned.

## Source baseline

The catalogue is generated from `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`, which was generated from the MyHordes 5.1.1 data set and remains the latest published generated registry snapshot as of this pass. The public MyHordes v5.1.2 release line remains the behavioral reference.

The source registry contains **383 item/state entries**:

| Category | Count |
| --- | ---: |
| Miscellaneous | 139 |
| Food | 59 |
| Armoury | 55 |
| Furniture | 47 |
| Containers and boxes | 27 |
| Resources | 25 |
| Pharmacy | 19 |
| Defences | 12 |

No upstream numeric item IDs are stored. `ItemSourceCatalogEntry.id` is a Live2Nite semantic catalogue identity. `sourceRef` exists only as an external parity/audit key and must never be used as gameplay identity.

## Runtime boundary

The source catalogue and runtime item registry are deliberately separate.

- **Implemented** — the source entry maps to an active Live2Nite runtime item/state with its currently required gameplay behavior represented.
- **Partial** — a runtime identity exists, but some source behavior or dependent mechanic remains incomplete.
- **WIP** — the source entry is catalogue/reference metadata only and has no active runtime identity.

WIP catalogue entries do not become loot, container outputs, construction resources, consumables, weapons, or recipes merely because they are visible in the Codex. Acquisition systems continue to fail closed on unresolved source items.

Live2Nite-only runtime state variants, such as dedicated broken-item identities, remain valid runtime data. The Codex may show them as supplemental runtime entries without counting them as additional MyHordes source catalogue records.

## Source-name reconciliation

This pass also corrects several stale aliases uncovered by comparing the existing mappings with the generated source registry. In particular:

- `rustine_#00` is **Duct Tape**; **Kwik-fix** is `repair_one_#00`.
- `chama_#00` is **Dried Marshmallows** and remains WIP.
- `ryebag_#00` is **Bag of Damp Grass**.
- `poison_part_#00` is **Corrosive Liquid**; Live2Nite keeps its existing semantic ID `poison_gland` for save/code stability while correcting the display name.

These corrections do not copy upstream numerical IDs or implementation code.
