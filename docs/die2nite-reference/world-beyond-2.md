# World Beyond 2.0 reference boundary

This document separates historically grounded Die2Nite World Beyond concepts from current Live2Nite reconstruction/adaptation choices.

## Source material

Primary surviving references used for this slice:

- Die2Nite Wiki — Special Zones: https://die2nite.fandom.com/wiki/Special_Zones
- Eternal Twinpedia — Die2Nite / World Beyond notes: https://wiki.eternal-twin.net/die2nite
- Die2Nite Wiki — Items: https://die2nite.fandom.com/wiki/Items

These community-preserved sources are incomplete and can mix seasons. Exact values are therefore only treated as original rules when the surviving evidence is sufficiently clear.

## ORIGINAL_D2N_CONFIRMED / strong surviving evidence

### Special locations exist separately from ordinary zone scavenging

The Special Zones reference describes buildings/special locations throughout the desert, represented separately on the map. It explicitly states that these locations have relatively narrow lists of likely finds **and that a Special Zone can still be searched for random items in the same way as a normal zone**.

Live2Nite therefore keeps three independent channels:

1. ordinary zone search;
2. depleted-zone scavenging;
3. special-site search.

Searching a ruin does not consume the ordinary zone's search capacity.

### Buried / unsearchable locations require clearing

The surviving Special Zones documentation describes an `Unsearchable Zone` concealing a building underneath and says AP can be used to clear it. The Eternal Twin material also describes buried buildings/ruins that must be cleared before exploration.

Live2Nite models this as shared excavation progress. Spending excavation AP is therefore grounded in the original concept, although the exact generated clearance requirement used by Live2Nite is an adaptation.

### Location identity affects likely loot

The surviving Special Zones table supports distinct location-oriented sources, including the six initial Live2Nite site identities:

- **Abandoned Construction Site** — construction-oriented finds such as trestles/cement/supports;
- **Wrecked Cars** — metal/components including Wrought Iron;
- **Destroyed Pharmacy** — pharmaceutical/drug-oriented finds;
- **Abandoned Supermarket** — food-oriented finds;
- **Dark Woods** — Rotting Logs and wood-related finds;
- **Old Police Station** — combat/utility-oriented finds.

Live2Nite uses these identities as broad source categories. Its exact small loot pools are deliberately simplified to items currently implemented in the game.

### Expedition planning must account for AP costs

The preserved Eternal Twin material discusses drawing expedition routes on the map and explicitly notes budgeting extra AP for things such as clearing a building or opening the gate. That supports the general design principle that a distant expedition must budget travel, task costs and return capacity.

## LIVE2NITE_ADAPTATION

The following are current simulation/gameplay choices and are **not claimed to reproduce an original Die2Nite algorithm**:

- exactly **12** special sites on the current 14×13 map;
- guaranteed balanced cycling through the six initial site types;
- current **3–7 AP** generated excavation requirement;
- current **2–4** generated special finds per site;
- exact loot weights in `specialSites.ts`;
- isolated-seed special-site placement used to preserve existing generated worlds;
- autonomous `TownNeeds` priority scoring;
- deterministic citizen exploration radii/directional biases;
- congestion penalties used to spread bot expeditions;
- route-planner risk costs;
- Well conservation bands (>2 normal, 1–2 cautious, <1 critical rations per survivor);
- automatic loadout planning and reserved-loot-slot calculation;
- deterministic `community` / `balanced` / `hoarder` supply dispositions;
- automatic Bank outfitting and starter-package decisions;
- derived bot plans displayed in the Citizens testing UI.

These heuristics exist because Live2Nite currently simulates 39 autonomous citizens in a single-player client. They are intentionally isolated under `src/agents/planning` so stronger historical evidence or future personality/LLM systems can replace them without changing core item/world rules.

## Deliberately deferred

This slice does not yet claim to reproduce:

- the complete original special-zone catalog;
- original map-generation frequencies/distribution rules for buildings;
- exact historical loot probabilities;
- season-specific variations in building tables;
- auto-search timing/regeneration interactions;
- Search Tower effects;
- complete expedition-route/group/escort mechanics;
- camping/topology interactions with ruins;
- Scout-specific buried-building knowledge;
- advanced ruin interiors introduced in later seasons;
- full historical weapon/tool/medical item behavior.

Those should be added only when they have a clear gameplay purpose and enough evidence to distinguish original rules from Live2Nite reconstruction.
