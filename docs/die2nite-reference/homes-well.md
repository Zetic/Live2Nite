# Die2Nite / Hordes reference: homes, starter supplies, well, and AP refresh

This document records the historical basis for Live2Nite's citizen-home and daily-supply loop. Home progression changed substantially across Die2Nite/Hordes eras, so the implementation labels the version boundary instead of treating every historical table as simultaneous canon.

## Implemented historical mechanics

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Starting town water | Seeded 80–140 Water Rations | High | https://die2nite.fandom.com/wiki/About_the_game |
| Starter packages | Every citizen starts with a Citizen's Welcome Pack and Doggy Bag | High | https://die2nite.fandom.com/wiki/About_the_game |
| Base home | Every citizen begins with a Camp Bed; personal defense 0 | High | https://die2nite.fandom.com/wiki/Your_House |
| Base rucksack | 4 carried slots | High | https://wiki.eternal-twin.net/die2nite/inventory |
| Base home chest | 4 storage slots for an ordinary citizen | Medium-high | https://wiki.eternal-twin.net/die2nite/inventory |
| Daily well ration | One Water Ration may be taken from the well per citizen per day before infrastructure modifiers | High | historical Die2Nite well/beginner documentation |
| Food AP refresh | Ordinary food can refresh the citizen to 6/6 AP once per day | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome and https://die2nite.fandom.com/wiki/Action_Points |
| Water AP refresh | Water can independently refresh the citizen to 6/6 AP once per day | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome and https://die2nite.fandom.com/wiki/Action_Points |
| Shared bank access | Citizens may deposit and take shared town-bank items | High | https://die2nite.fandom.com/wiki/About_the_game |
| Home upgrade cadence | After the initial state, a citizen can improve the structural home once per day | High | https://wiki.eternal-twin.net/hordes/maison and https://die2nite.fandom.com/wiki/Your_House |
| Home contribution | Eligible home defense contributes 40% to town defense | High | https://wiki.eternal-twin.net/hordes/attaque and https://wiki.eternal-twin.net/hordes/maison |
| Circular Quarters | Raises eligible home contribution to 80% | High | https://wiki.eternal-twin.net/hordes/attaque |

## Structural home progression

PR #21 uses the later Hordes / Season-16 progression documented by Eternal Twin because it forms a complete mature progression and matches the later-style Home UI being used as an information-architecture reference.

| Level | Home | Structural defense | Upgrade AP | Live2Nite material handling |
| ---: | --- | ---: | ---: | --- |
| 0 | Camp Bed | 0 | — | starting state |
| 1 | Tent | 1 | 2 | no materials |
| 2 | Hovel | 4 | 4 | 1 Rotting Log; historical item maps directly |
| 3 | Shack | 9 | 5 | 1 Twisted Plank; historical item maps directly |
| 4 | House | 16 | 6 | 1 Scrap Metal; historical item maps directly |
| 5 | Fenced House | 25 | 6 | later historical resource mix is simplified to represented wood/metal |
| 6 | Fortified Shelter | 36 | 7 | later historical resource mix is simplified to represented concrete/wood/metal |
| 7 | Bunker | 49 | 7 | later historical resource mix is simplified to represented advanced materials |
| 8 | Castle | 64 | 8 | later historical resource mix is simplified to represented advanced materials |

Evidence: https://wiki.eternal-twin.net/hordes/maison

Older English Die2Nite documentation records a different defense curve and some different names/material requirements. Those values remain useful historical evidence, but Live2Nite does **not** mix the older defense table into the Season-16 progression. See https://die2nite.fandom.com/wiki/Your_House.

### High-tier AP boundary

Ordinary Live2Nite citizens currently have the historically familiar 6 AP baseline. The Fortified Shelter, Bunker, and Castle upgrades therefore remain visible but cannot yet be completed from a fresh 6-AP day. This is intentional: the game will eventually gain historically grounded ways of exceeding the ordinary AP budget through other systems. The implementation does not falsify the home table by lowering those 7/8 AP costs.

## Personal defense versus town contribution

The Home now distinguishes two defense layers:

1. **Personal home defense** protects that citizen when zombies breach the town.
2. **Eligible/contributable home defense** is the structural and installed-improvement portion which feeds the shared town-defense calculation.

Loose defensive objects stored in the citizen's private chest remain full-strength personal protection but are excluded from the 40%/80% town contribution. The historical town contribution is therefore derived from structural home defense and eligible installed improvements, not every defensive object a citizen happens to hoard privately.

The shared calculation is:

`floor(sum(eligible home defense for living citizens in town) × contribution ratio)`

where the contribution ratio is normally **0.40** and becomes **0.80** with Circular Quarters.

## Supported Home Improvements

The later Home system contains many Hero/home works. PR #21 implements only the subset whose effects already fit Live2Nite's current simulation:

- **Fence** — one installed level, +3 personal/eligible defense;
- **Reinforcements** — up to ten levels, +1 personal/eligible defense per level;
- **More Storage** — up to thirteen levels, +1 Home Chest slot per level, using the documented AP curve where available.

The identities/effects come from historical Home/Hero documentation. **Access is currently a Live2Nite adaptation:** until Hero/profession mechanics exist, ordinary citizens are allowed to construct this supported subset so the Home system can be exercised. That temporary access rule should be revisited when the Hero system is implemented. Some reinforcement/fence material costs are also adapted because Live2Nite does not yet represent the full historical item catalog.

Deferred improvements include Alarm, Lock, Kitchen, Laboratory, Curtain, Siesta and other works whose real purpose depends on theft, cooking, drugs, privacy, Hero actions or other systems not yet present.

## Starter-package handling

The surviving documentation establishes that the packages exist and identifies several possible contents, but Live2Nite does not claim to reproduce the complete original random tables.

- Doggy Bag: opens into one ordinary food item in the current slice. The internal generic food item is presented as a Moldy Ham Sandwich. Exact Doggy Bag food distribution is deferred.
- Citizen's Welcome Pack: uses a small pool whose contents are individually documented as Welcome Pack outcomes:
  - Battery — https://die2nite.fandom.com/wiki/Battery
  - Box of Matches — https://die2nite.fandom.com/wiki/Box_of_Matches
  - Pharmaceutical Products — https://die2nite.fandom.com/wiki/Pharmaceutical_Products

Container results use the game's seeded RNG, so the same state and action order produce the same result.

## AP semantics

Food and water do not add six AP on top of the current amount. They restore the ordinary citizen to the 6 AP cap. For example, eating at 1 AP leaves the citizen at 6 AP, effectively recovering 5. This is why players historically tried to spend their remaining AP before eating or drinking.

Food and water are separate daily refresh opportunities. Live2Nite records `ate` and `drank` separately and resets both at the start of the next day. Hydration/status timing is documented separately in `status-hydration.md`.

## Deliberately deferred

- complete special-food catalog and side effects;
- complete Doggy Bag and Welcome Pack probability tables;
- exact mature resource costs for high home tiers until their historical item types exist in the game;
- theft, locks, curtains, alarms, and social consequences for taking bank/home items;
- Hero-only access restrictions and Hero-specific home actions;
- cooking, laboratory, drugs and other improvement-dependent systems.
