# Die2Nite reference: PR #2 World Beyond loop

This document records which mechanics in the World Beyond prototype are sourced from surviving English Die2Nite documentation and which are temporary Live2Nite implementation choices.

## Confirmed original mechanics used in PR #2

| Mechanic | Live2Nite implementation | Confidence | Source |
| --- | --- | --- | --- |
| Ordinary daily AP | 6 AP maximum, refreshed after the nightly attack | High | https://die2nite.fandom.com/wiki/Action_Points |
| Cardinal world movement | 1 AP per square; no diagonal movement | High | https://die2nite.fandom.com/wiki/Action_Points and https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |
| Town gate | Opening or closing costs 1 AP; gate must be open to exit | High | https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |
| Zone control | Ordinary human = 2 control points; zombie = 1; movement is blocked when zombie points exceed human points | High | https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |
| Manual search | Manual searching is a zero-AP action | High | https://die2nite.fandom.com/wiki/Expedition_Guide |
| Ordinary rucksack | 4 inventory slots | High | https://wiki.eternal-twin.net/die2nite/inventory |
| Outside at attack | A citizen outside at the nightly attack dies unless camping | High | https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |
| World shape | Historical documentation describes a 14 × 13 tile map | Medium | https://die2nite.fandom.com/wiki/The_Map |

## Live2Nite placeholders in PR #2

These are deliberately **not** represented as original Die2Nite values:

- procedural zombie-count distribution across generated zones;
- number of manual searches required to deplete a generated zone;
- four-item temporary loot table and its distribution;
- initial town defense of 40;
- nightly attack strength formula;
- treating an open gate as zero effective town defense in the temporary attack report;
- basic bot strategy.

These values exist only to exercise the engine and should be replaced when the corresponding original mechanics are researched and implemented.

## Deferred original systems

PR #2 intentionally does not yet implement:

- AP restoration through water, food, drugs, alcohol, coffee, cards, or other items;
- thirst/dehydration;
- auto-search timing;
- weapons and zombie combat;
- heavy/cumbersome inventory restrictions;
- special zones and ruin exploration;
- camping;
- homes and personal defense;
- full town construction and upgrade trees;
- the original nightly attack/death allocation algorithm;
- map-marker and stale-information mechanics;
- hero jobs/powers.

Future PRs should add a reference document before encoding any uncertain historical constant as canonical behavior.
