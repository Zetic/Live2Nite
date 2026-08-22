# Die2Nite reference: weapons and zombie combat

This note records the historical basis used for PR #8. The target remains the original English Die2Nite ruleset where surviving documentation is specific enough. Mechanics that still need item-state or citizen-status systems are intentionally deferred instead of approximated.

## High-confidence mechanics implemented

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Ordinary weapon use does not normally cost AP, but cannot be performed at 0 AP | `USE_WEAPON` spends 0 AP and is only legal while the citizen has at least 1 AP | High | https://die2nite.fandom.com/wiki/Killing_Zombies and https://die2nite.fandom.com/wiki/Action_Points |
| Bare-handed combat costs 1 AP | `ATTACK_BAREHANDED` emits an `AP_SPENT` event for 1 AP | High | https://die2nite.fandom.com/wiki/Action_Points and https://die2nite.fandom.com/wiki/Killing_Zombies |
| Bare-handed combat has about a 10% kill chance | deterministic 1–100 roll; 1–10 kills one zombie | Medium-high | https://die2nite.fandom.com/wiki/Action_Points |
| Water Bomb is single use | the carried item is consumed when used | High | https://die2nite.fandom.com/wiki/Killing_Zombies |
| Water Bomb kills 1–5 zombies | deterministic 1–5 result, capped by zombies currently in the zone | High | https://die2nite.fandom.com/wiki/Killing_Zombies |
| Killing zombies changes control immediately | zombie count is reduced by the combat event and normal zone-control rules are recalculated immediately | High | https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |

## Live2Nite combat model in this slice

Combat remains part of the same authoritative command/event surface as movement, scavenging, construction, and item use:

1. `getLegalActions` exposes combat commands only when the citizen is alive, outside, in a zone containing zombies, and satisfies the AP/item requirements.
2. `ATTACK_BAREHANDED` spends 1 AP and resolves the low kill chance from stored deterministic RNG state.
3. `USE_WEAPON` resolves the selected carried weapon from stored deterministic RNG state. The first fully implemented weapon is Water Bomb.
4. `COMBAT_RESOLVED` records the method, number of kills, consumed item, zone, and resulting RNG state.
5. The reducer subtracts killed zombies from the zone and consumes the weapon if appropriate.
6. Zone control is then naturally recomputed from the new zombie count. If zombie control no longer exceeds human control, movement becomes legal immediately.

The core does not special-case the human player. Traditional bots, the normal human citizen, and the temporary testing-controlled citizen all receive combat actions from the same legal-action API.

## Confirmed systems deliberately deferred

### Breakable and reloadable weapons

The surviving weapon documentation distinguishes single-use, breakable, reloadable, and other weapon behaviors. Those mechanics require per-item state such as remaining shots, ammunition, or break status. `ItemInstance` does not yet carry that state, so PR #8 does **not** fake durability with global counters or hard-coded UI state.

Future work should extend item instances before implementing Water Pistols, guns, chainsaws, and other stateful weapons.

### Terror / status restrictions

Historical combat rules interact with citizen statuses such as Terror. Live2Nite does not yet have the broader citizen-status lifecycle, so these restrictions are deferred to the status/thirst work rather than represented as hidden exceptions.

### Bare-handed wounds

Surviving wiki pages are not perfectly consistent about the exact injury consequence of bare-handed combat. The low kill chance and 1 AP cost are sufficiently documented to implement now; wound/injury consequences are deferred until the status system exists and the historical behavior is reconciled.

### Zombie despair / overnight cleanup

Historical beginner guidance describes an additional zombie dying overnight from despair after two zombies are killed in a zone. That rule is not included in this first combat slice because it belongs to a broader zone/night lifecycle pass. The implementation currently removes only zombies explicitly killed by combat.

## Water Bomb acquisition

Water Bomb is currently included as an uncommon result in the generic undepleted-zone loot pool so combat can be exercised in the existing procedural world. **Its exact Live2Nite loot frequency is a placeholder and is not claimed to match Die2Nite.**

Historical sources also document Water Bomb creation using water-related items (including the Water Ration / Plastic Bag path), but the required Plastic Bag and crafting path are not yet present in Live2Nite. That crafting route should be added when the item/crafting catalog expands rather than inventing a substitute recipe now.

Evidence: https://die2nite.fandom.com/wiki/Water_Ration and https://die2nite.fandom.com/wiki/Killing_Zombies

## Temporary citizen control

The citizen-switching control introduced alongside combat is **not a Die2Nite mechanic**. It is a Live2Nite development/testing aid so one browser session can directly exercise combat, inventory, home, well, Bank, and expedition states across different simulated citizens.

It is intentionally implemented in the UI/controller orchestration layer rather than persisted into authoritative game state:

- selecting a citizen does not modify that citizen's `controller` field;
- a selected basic bot is excluded from autonomous bot-phase execution while selected;
- the control selection itself is not part of the save schema;
- the feature is expected to be removed when direct multi-citizen testing is no longer useful.

## Sources

- https://die2nite.fandom.com/wiki/Killing_Zombies
- https://die2nite.fandom.com/wiki/Action_Points
- https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing
- https://die2nite.fandom.com/wiki/Beginners%27_Welcome
- https://die2nite.fandom.com/wiki/Water_Ration
