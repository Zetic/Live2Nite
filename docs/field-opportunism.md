# Field opportunism, loot logistics, and hydration assurance

Autonomous citizens treat an expedition mission as the primary reason for a trip, not as permission to ignore free value along the route.

## Free field actions

Before another movement AP is spent in a controlled zone, bots may:

- pick up useful visible ground loot;
- search a normal zone if that citizen has not searched it;
- search a depleted zone if that citizen has not performed their depleted search there;
- search an accessible special site;
- drop a carried item to make room for a materially better find;
- leave useful but non-critical materials in a near-town route cell as a relay cache.

These actions use the same legal command surface as the human player. `SEARCH_ZONE`, `SEARCH_SPECIAL_SITE`, `PICK_UP_ITEM`, and `DROP_ITEM` cost 0 AP. Emergency control/combat still takes precedence when the citizen is trapped.

## Contextual loot value

Loot is ranked from public town needs and the citizen's own situation rather than a fixed universal list. Construction shortages increase the value of finished materials and Workshop feedstock; water rises when hydration or Well pressure is poor; food and weapons rise when town supply is low; and defensive objects rise during a public defense shortfall.

A full rucksack can drop its lowest non-protected item before taking a substantially more valuable ground item. Water needed for hydration, useful expedition food, and essential mission weapons are protected from casual swapping.

A very valuable haul can cause the citizen to return before reaching the original target. This is intentionally conservative so ordinary scouts still expand the map rather than turning around for every small find.

## Relay caches

Outbound citizens with a nearly full rucksack may leave middling construction/raw/defense items in safe cells one to three tiles from town when their target lies farther out. Returning citizens execute the same ground-loot pass and can carry those cached items home. The cache is ordinary world ground state, not hidden shared inventory or overseer knowledge.

## Hydration assurance

Current AP is perishable, so ordinary Thirst at high AP is still delayed while useful AP sinks remain. The policy becomes survival-first near the attack:

- Dehydration is always urgent.
- Low-AP Thirst is urgent.
- At the late hydration threshold, a town citizen tries to treat Thirst after useful AP spending has had a chance to run.
- A gate AP reservation prevents AP-consuming work but does not end the citizen's turn before zero-AP drinking or water withdrawal can happen.
- Expedition loadouts use the citizen's real remaining Well allowance and projected desert movement. A route expected to create a new hydration need must have a reachable water solution before it is accepted.

The objective is that autonomous citizens do not enter a new day Dehydrated merely because they failed to use legally accessible town water.

## Home-material inventory loop

A material deliberately withdrawn for the next personal Home level is protected from the generic town unload pass. It is moved into Home storage when possible, or kept in the rucksack until the upgrade can run. This prevents the pathological `withdraw -> deposit -> withdraw -> deposit` loop that could create hundreds of fake Bank contributions without useful AP expenditure.
