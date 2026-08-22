# Die2Nite reference: town construction and Workshop loop

This document records the source basis for the first Live2Nite town-progression implementation. Values that are not well established are kept out of the authoritative rules or explicitly marked as Live2Nite placeholders.

## Implemented historical mechanics

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Construction labor | Citizens contribute AP to a shared project; this pass exposes contributions in 1 AP increments | High | https://die2nite.fandom.com/wiki/Action_Points |
| Materials during construction | All required materials must be present before AP can be contributed; materials remain in the bank until completion | High | https://gaming.stackexchange.com/questions/18410/do-materials-get-used-when-you-start-a-construction-in-die2nite |
| Workshop AP cost | 25 AP | High | https://die2nite.fandom.com/wiki/Workshop |
| Workshop materials | 10 Twisted Planks, 8 Wrought Iron, 1 Unshaped Concrete Block | Medium-high | https://die2nite.fandom.com/wiki/Buildings and https://gaming.stackexchange.com/questions/11765/whats-the-optimal-construction-strategy-in-die2nite |
| Workshop conversion AP | 3 AP per conversion before Factory/hacksaw reductions | High | https://die2nite.fandom.com/wiki/Workshop and https://die2nite.fandom.com/wiki/Action_Points |
| Rotten Logs -> Twisted Planks | 2 Rotten Logs -> 1 Twisted Plank | Medium-high | https://gaming.stackexchange.com/questions/11765/whats-the-optimal-construction-strategy-in-die2nite |
| Scrap Metal -> Wrought Iron | 2 Scrap Metal -> 1 Wrought Iron | Medium-high | https://gaming.stackexchange.com/questions/11765/whats-the-optimal-construction-strategy-in-die2nite |
| Watchtower cost | 12 AP, 3 Twisted Planks, 2 Wrought Iron | High | https://d2nwiki.spacekadt.com/wiki/Watchtower |
| Watchtower defense | +3 town defense | Medium-high | https://gaming.stackexchange.com/questions/11647/is-there-a-building-tree-for-die2nite and https://gaming.stackexchange.com/questions/11765/whats-the-optimal-construction-strategy-in-die2nite |
| Workshop vs Watchtower choice | Both are early projects; Workshop was commonly recommended first | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome |

## Behavior deliberately deferred

- Watchtower attack estimation and citizen estimates.
- Workshop upgrade levels that reduce construction AP costs.
- Factory and hacksaw reductions to Workshop processing cost.
- Advanced Workshop recipes.
- Blueprints and the full construction tree.
- Daily town-upgrade voting.
- Home upgrades and their contribution to town defense.

## Live2Nite placeholders still present

- procedural World Beyond zombie distribution;
- search/depletion counts;
- weighted loot frequency, including intact construction materials;
- base town defense;
- nightly attack progression;
- basic-bot strategic priorities.

The loot pool includes uncommon intact construction materials because historical accounts describe early towns finding usable planks and iron before the Workshop was complete. Their exact frequency is intentionally not treated as canonical.
