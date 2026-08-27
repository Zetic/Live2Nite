# MyHordes item implementation tracker

This is the developer-side item tracker for Live2Nite. It is deliberately separate from the in-game Codex.

The **Codex is built only from Live2Nite's real `ITEMS` definitions**. Adding an upstream item to this document does not create runtime data and does not make the item appear in-game.

## Update rule

When an item is implemented or materially changed:

1. Add/update the real Live2Nite `ItemType` and `ITEMS` definition.
2. Add the actual mechanic in the appropriate gameplay system.
3. Add/update its explicit MyHordes source-ID mapping where known.
4. Update this document.
5. Do not add a second Codex-specific item list; the Codex updates from item code automatically.

## Source baseline

The broad upstream registry is tracked against `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`, generated from MyHordes 5.1.1. Its `ItemId` enum contains **383 upstream item/state IDs** and is the baseline registry for source-sync work.

Current behavioral audits use the public MyHordes v5.1.2 release line (`42f53fa5`, 2026-07-20). When the upstream item registry changes, update this tracker in a focused source-sync pass instead of inserting source-only entries into runtime code.

Status in this document is intentionally more nuanced than "an `ItemType` exists": source variants can map to one stateful Live2Nite item, and a mapped item can still have mechanics deferred to another PR.

## Source-linked identities already represented

These source IDs currently have explicit high-confidence Live2Nite identities in the item/loot work. Stateful variants intentionally share a Live2Nite `ItemType`.

| MyHordes source ID | Live2Nite identity |
| --- | --- |
| `water_#00` | `water_ration` |
| `wood_bad_#00` | `rotten_log` |
| `metal_bad_#00` | `scrap_metal` |
| `wood2_#00` | `twisted_plank` |
| `metal_#00` | `wrought_iron` |
| `wood_beam_#00` | `patchwork_beam` |
| `metal_beam_#00` | `metal_support` |
| `wood_log_#00` | `quality_log` |
| `plate_raw_#00` | `sheet_metal_bits` |
| `plate_#00` | `sheet_metal` |
| `pile_#00` | `battery` |
| `pharma_#00` | `pharmaceutical_products` |
| `meca_parts_#00` | `nuts_and_bolts` |
| `rustine_#00` | `duct_tape` |
| `repair_one_#00` | `kwik_fix` |
| `explo_#00` | `semtex` |
| `tube_#00` | `copper_pipe` |
| `electro_#00` | `electronic_component` |
| `engine_part_#00` | `engine_incomplete` |
| `engine_#00` | `engine` |
| `courroie_#00` | `belt` |
| `deto_#00` | `compact_detonator` |
| `fence_#00` | `wire_mesh` |
| `rsc_pack_2_#00` / `rsc_pack_3_#00` | `resource_pack` + contents state |
| `staff_#00` | `staff` |
| `wrench_#00` | `adjustable_spanner` |
| `screw_#00` | `screwdriver` |
| `swiss_knife_#00` | `swiss_army_knife` |
| `cutter_#00` | `box_cutter` |
| `can_opener_#00` | `can_opener` |
| `knife_#00` | `serrated_knife` |
| `cutcut_#00` | `machete` |
| `small_knife_#00` | `pathetic_penknife` |
| `chain_#00` | `chain` |
| `bone_#00` | `human_bone` |
| `chair_basic_#00` | `ektorp_gluten_chair` |
| `pc_#00` | `pc_base_unit` |
| `saw_tool_#00` | `saw_tool` |
| `saw_tool_part_#00` | `saw_tool_part` |
| `repair_kit_part_raw_#00` | `tool_bag` |
| `repair_kit_#00` | `repair_kit` |
| `grenade_empty_#00` | `plastic_bag` |
| `grenade_#00` | `water_bomb` |
| `watergun_empty_#00` / `watergun_1_#00` / `watergun_2_#00` | `water_pistol` + charges state |
| `pilegun_empty_#00` | `battery_launcher` + charges state |
| `water_can_empty_#00` / `water_can_1_#00` / `water_can_2_#00` / `water_can_3_#00` | `water_cooler_bottle` + charges state |
| `food_bag_#00` | `doggy_bag` |
| `food_sandw_#00` | `food` |
| `food_noodles_#00` | `chinese_noodles` |
| `food_noodles_hot_#00` | `spicy_chinese_noodles` |
| `spices_#00` | `strong_spices` |
| `can_#00` / `can_open_#00` | `can` / `open_can` |
| `undef_#00` | `unspecified_meat` (Implemented Butcher output; ordinary food, 2 Watch) |
| `meat_#00` | `tasty_looking_steak` |
| `vegetable_#00` | `vegetable` |
| `hmeat_#00` | `human_flesh` |
| `pet_chick_#00` | `chicken` (Partial animal ecosystem) |
| `pet_pig_#00` | `stinking_pig` (Partial; heavy) |
| `pet_rat_#00` | `giant_rat` (Partial) |
| `pet_dog_#00` | `guard_dog` (Partial) |
| `pet_cat_#00` | `fat_cat` (Partial; 5 decoration points in source metadata) |
| `pet_snake_#00` | `huge_snake` (Partial; heavy) |
| `bone_meat_#00` | `meaty_bone` |
| `poison_part_#00` | `poison_gland` (semantic ID; displays as Corrosive Liquid) |
| `ryebag_#00` | `bag_of_damp_grass` |
| `door_#00` | `old_door` |
| `concrete_#00` | `bag_of_cement` |
| `table_#00` | `table` |
| `trestle_#00` | `trestle` (Implemented: heavy defense furniture, verified acquisition, +9 outside install, and 15-point IKEA Night Watch behavior) |
| `lights_#00` | `box_of_matches` |
| `wire_#00` | `wire_reel` |
| `oilcan_#00` | `empty_oil_can` |
| `lens_#00` | `convex_lens` |
| `diode_#00` | `laser_diode` |
| `bquies_#00` | `earplugs` |
| `claymo_#00` | `claymore` |
| `guitar_#00` | `guitar` |
| `torch_#00` | `torch` |
| `radio_off_#00` / `radio_on_#00` | `radio_cassette_player_off` / `working_radio` |
| `chest_#00` | `metal_chest` |
| `chest_tools_#00` | `toolbox` |
| `chest_citizen_#00` | `citizen_welcome_pack` |
| `chest_xl_#00` | `xl_chest` |
| `chest_food_#00` | `food_box` |
| `electro_box_#00` | `broken_electronic_device` |
| `deco_box_#00` | `decoration_box` |
| `mecanism_#00` | `mechanism` |
| `safe_#00` | `safe` |
| `bandage_#00` | `bandage` |
| `disinfect_#00` | `paracetoid` |
| `drug_#00` | `anabolic_steroids` |
| `xanax_#00` | `valium_shot` |
| `vodka_#00` | `vodka_marinostov` |
| `rhum_#00` | `wake_the_dead` |
| `sport_elec_empty_#00` / `sport_elec_#00` | `ems_system_empty` / `ems_system_charged` |

### Animal foundation coverage

The six ordinary source pets are real Live2Nite inventory objects: Chicken, Stinking Pig, Giant Rat, Guard Dog, Fat Cat, and Huge Snake. Their current-source `heavy` metadata feeds the shared cumbersome-item system, so Stinking Pig and Huge Snake are cumbersome without adding animal-specific carry rules. Fat Cat retains its source 5-decoration-point metadata in the current source catalogue.

All six use their source Night Watch values (8 / 25 / 12 / 25 / 12 / 25), are destroyed by their source Night Watch action when used, can receive the Pet Shop 30% Watch multiplier, classify through Animal Dump, and use the Small Trebuchet animal payload path. Existing ruin source tables become playable for these identities. The ordinary normal-loot source mappings are also present for Chicken, Pig, Rat, Cat, and Snake; Guard Dog has no ordinary normal-loot row in the pinned table. The full normal-zone source table remains fail-closed until unrelated unresolved source IDs are implemented.

### Butcher coverage

Butcher is now buildable from the current source bill: **40 AP, 9 Twisted Planks, and 4 Wrought Iron**. Its source slaughter actions have no AP-spend effect, require the citizen to be inside town with Butcher complete, consume the selected animal, and deterministically generate meat:

| Animal | Source slaughter action | Output |
| --- | --- | --- |
| Chicken | `slaughter_2x` | 2 × Unspecified Meat (`undef_#00`) |
| Giant Rat | `slaughter_2x` | 2 × Unspecified Meat |
| Stinking Pig | `slaughter_4x` | 4 × Unspecified Meat |
| Fat Cat | `slaughter_2xs` | 2 × Tasty-looking Steak (`meat_#00`) |
| Guard Dog | `slaughter_2xs` | 2 × Tasty-looking Steak |
| Huge Snake | `slaughter_4xs` | 4 × Tasty-looking Steak |

`undef_#00` is represented separately as **Unspecified Meat** rather than being collapsed into another food. It follows its source ordinary 6-AP food quality and 2-point destructive Night Watch behavior. Kitchen eligibility is not assumed because the recovered source slaughter/eating data does not establish a Kitchen action for this item.

The animals themselves remain **Partial** because their broader ecosystem still has unresolved production/acquisition effects—not because Butcher is missing.

### Tamer's Trap System boundary

The source construction is a town building, not a deployable zone trap. Its source description says it uses food to lure animals into town and provides training that makes them more effective in combat. The construction remains WIP because the exact spawn cadence/pool and combat modifier have not yet been extracted. No overnight placement/collection mechanic is invented.

### Trestle coverage

`trestle_#00` is no longer an unresolved ordinary-loot dependency. Live2Nite models it as a heavy/cumbersome defensive furniture item with +1 Bank defense and +1 Home defense. It is mapped in the source normal-loot table and resolves from the exact source ruin rows already represented by Live2Nite: Home Depot, Construction Site Shelter, PI-KEYA Furniture, Disused Car Park, Abandoned Construction Site, and Blocked Road. Two Trestles are required by the now-buildable Organized Dump.

The source outside action costs 1 AP, consumes the exact carried Trestle, and adds +9 permanent campsite improvement points up to the 50-point source cap. The campsite representation remains compatible with older schema-19 saves by interpreting legacy `campImprovements` values as +5-point steps while retaining an exact level for current non-multiple-of-five effects.

The source registry's 15 Watch points are active as IKEA-family Night Watch equipment. A Trestle is destroyed when the Watch actually uses it, and the Swedish Workshop furniture specialist bonus raises its contribution by 30% (15 to 19 after integer flooring). The current Trestle implementation status is therefore **Implemented**. Flatpacked Furniture remains a known source route, but its exact current output weights are not guessed because verified normal and ruin acquisition already provide an active runtime path.

## Ordinary normal-loot backlog

Source-name audit correction: `chama_#00` is **Dried Marshmallows** and remains WIP; it is not Bag of Damp Grass.

These source IDs remain unresolved in the current ordinary normal-loot dependency pass. This is a development backlog for future source-item passes; entries leave this list only when their active runtime mechanic and mapping are represented.

- [ ] `jerrycan_#00`
- [ ] `gun_#00`
- [ ] `big_pgun_part_#00`
- [ ] `iphone_#00`
- [ ] `drug_hero_#00`
- [ ] `drug_random_#00`
- [ ] `water_cleaner_#00`
- [ ] `beta_drug_bad_#00`
- [ ] `chama_#00`
- [ ] `cadaver_#00`
- [ ] `food_armag_#00`
- [ ] `wood_plate_part_#00`
- [ ] `lock_#00`
- [ ] `home_def_#00`
- [ ] `car_door_part_#00`
- [ ] `bag_#00` — Manbag; needs carry-extension mechanics
- [ ] `cart_part_#00`
- [ ] `bed_#00`
- [ ] `lamp_#00`
- [ ] `music_part_#00`
- [ ] `vibr_empty_#00`
- [ ] `cyanure_#00`
- [ ] `coffee_machine_part_#00`
- [ ] `tagger_#00`
- [ ] `digger_#00`
- [ ] `game_box_#00`
- [ ] `chair_#00`
- [ ] `powder_#00`
- [ ] `machine_1_#00`
- [ ] `machine_2_#00`
- [ ] `machine_3_#00`
- [ ] `home_box_#00`
- [ ] `home_box_xl_#00`
- [ ] `cigs_#00`
- [ ] `pilegun_upkit_#00`
- [ ] `money_#00`
- [ ] `sheet_#00`
- [ ] `out_def_#00`
- [ ] `smelly_meat_#00`
- [ ] `maglite_off_#00`
- [ ] `smoke_bomb_#00`
- [ ] `bplan_drop_#00`
- [ ] `rp_book_#00`
- [ ] `book_gen_letter_#00`
- [ ] `book_gen_box_#00`
- [ ] `postal_box_#00`
- [ ] `rp_twin_#00`
- [ ] `badge_#00`
- [ ] `angryc_#00`
- [ ] `chudol_#00`
- [ ] `lilboo_#00`
- [ ] `cdelvi_#00`
- [ ] `cdbrit_#00`
- [ ] `cdphil_#00`
- [ ] `catbox_#00`
- [ ] `pet_snake2_#00`
- [ ] `cinema_#00`
- [ ] `fest_#00`
- [ ] `bretz_#00`
- [ ] `tekel_#00`

Some entries above carry source event IDs or other conditions that still need classification before they are treated as ordinary gameplay dependencies. Do not implement conditional content merely to make this list smaller.

## Broader upstream registry

The pinned 383-ID `ItemId` registry also contains seasonal, hero/profession, blueprint, key, soul, event, state-variant, and other specialist items that are outside the ordinary-loot backlog above. Keep the pinned upstream enum as the complete discovery source and add a row/checklist entry here when one of those systems enters Live2Nite scope.

Examples include Christmas/Halloween items, blueprints and prints, soul items, fireworks, keys, suits/vests, event weapons, photo states, alarm states, tame-pet states, and specialist quest/RP items.

The important boundary is: **the tracker may know about source-only content; runtime `ITEMS` should not contain source-only placeholders solely for Codex display.**