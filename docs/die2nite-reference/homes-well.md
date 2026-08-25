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

Live2Nite uses the later Hordes / Season-16 progression documented by Eternal Twin because it forms a complete mature progression and matches the later-style Home UI used by the project.

| Level | Home | Structural defense | Upgrade AP | Live2Nite material handling |
| ---: | --- | ---: | ---: | --- |
| 0 | Camp Bed | 0 | — | starting state |
| 1 | Tent | 1 | 2 | no materials |
| 2 | Hovel | 4 | 4 | 1 Rotting Log; represented directly |
| 3 | Shack | 9 | 5 | 1 Twisted Plank; represented directly |
| 4 | House | 16 | 6 | 1 Scrap Metal; represented directly |
| 5 | Fenced House | 25 | 6 | mapped represented materials plus explicit Padlock and Chain blocker |
| 6 | Fortified Shelter | 36 | 7 | mapped represented materials plus explicit Cardboard blocker |
| 7 | Bunker | 49 | 7 | mapped represented materials plus explicit Metal Structure / Powered Mini Hi-Fi blockers |
| 8 | Castle | 64 | 8 | mapped represented materials plus explicit Metal Structure / Car Door blockers |

Evidence: https://wiki.eternal-twin.net/hordes/maison

Older English Die2Nite documentation records a different defense curve and some different names/material requirements. Those values remain useful historical evidence, but Live2Nite does **not** mix the older defense table into the Season-16 progression. See https://die2nite.fandom.com/wiki/Your_House.

PR #51 removes the prior high-tier substitute-material approximation. If a source requirement has no modeled Live2Nite item/acquisition mechanic, that tier stays visible but fails closed rather than silently accepting a different material.

### High-tier AP boundary

Ordinary Live2Nite citizens currently have the historically familiar 6 AP baseline. The Fortified Shelter, Bunker, and Castle upgrades therefore remain visible but cannot yet be completed from a fresh 6-AP day. The implementation does not falsify the home table by lowering those 7/8 AP costs.

### Structural anti-theft threshold

For the later Hordes progression used here, Fenced House and higher protect the home from ordinary foreign-home deposit/intrusion/theft. The separate Lock work supplies equivalent ordinary anti-theft protection before that structural threshold.

Evidence: https://wiki.eternal-twin.net/hordes/maison and https://wiki.eternal-twin.net/hordes/vol

## Personal defense versus town contribution

The Home distinguishes two defense layers:

1. **Personal home defense** protects that citizen when zombies breach the town.
2. **Eligible/contributable home defense** is the structural and installed-improvement portion which feeds the shared town-defense calculation.

Loose defensive objects stored in the citizen's private chest remain full-strength personal protection but are excluded from the 40%/80% town contribution. The shared calculation is:

`floor(sum(eligible home defense for living citizens in town) × contribution ratio)`

where the contribution ratio is normally **0.40** and becomes **0.80** with Circular Quarters.

## Home works represented in PR #51

The later Home system contains many Hero/home works. PR #51 records the broader work catalogue but only enables construction where the required effect and source dependencies are represented.

- **Fence** — +3 personal/eligible defense; effect represented, missing structural input keeps construction blocked.
- **Reinforcements** — up to ten levels, +1 personal/eligible defense per level; existing `wire_mesh` represents the source fencing input used by later levels.
- **More Storage** — up to thirteen levels, +1 Home Chest slot per level.
- **Rudimentary Alarm** — records/identifies intrusion and guarantees identification of theft from that home.
- **Large Curtain** — hides Home Chest contents from visitors until a successful intrusion.
- **Lock** — blocks ordinary foreign-home deposit, intrusion and theft; construction remains blocked while Padlock and Chain is unmodeled.
- **Siesta** — one daily attempt when below full AP; 33% / 66% / 99% chance by level to recover +2 AP. The Mattress-dependent level remains blocked until Mattress is represented.
- **Kitchen** — catalogued, effect unavailable until the cooking subsystem exists.
- **Laboratory** — catalogued, effect unavailable until the production/drug subsystem exists.

Hero/profession restrictions are still deferred. Until that system exists, ordinary-citizen access remains a Live2Nite integration boundary that should be revisited with Hero implementation.

Evidence: https://wiki.eternal-twin.net/hordes/travaux

## Foreign-home transfer, theft, and pillage

The ordinary pre-Chaos behavior implemented by PR #51 is:

- a living resident must be outside town before another citizen can deposit into or steal from that home;
- Fenced House+ or the Lock work blocks ordinary deposit/intrusion/theft;
- Curtain hides chest contents until an intrusion succeeds;
- deposit, theft and pillage share one successful foreign-home item transfer allowance per actor per day;
- deposit has a 10% identification chance;
- ordinary theft has a 50% identification chance;
- Rudimentary Alarm guarantees identification of theft and identifies alarmed intrusion attempts;
- pillage targets a dead citizen's abandoned chest, is always identified, and consumes the same daily transfer allowance;
- corpse disposal remains a separate body-management action.

Unspotted deposit/theft event text remains anonymous; spotted actions name the actor.

Evidence: https://wiki.eternal-twin.net/hordes/vol and https://wiki.eternal-twin.net/hordes/travaux

Chaos-mode overrides are intentionally not implemented in this pass.

## Starter-package handling

The surviving documentation establishes that the packages exist and identifies several possible contents, but Live2Nite does not claim to reproduce the complete original random tables.

- Doggy Bag: opens into one ordinary food item in the current slice. The internal generic food item is presented as a Moldy Ham Sandwich. Exact Doggy Bag food distribution is deferred.
- Citizen's Welcome Pack: uses a small pool whose contents are individually documented as Welcome Pack outcomes:
  - Battery — https://die2nite.fandom.com/wiki/Battery
  - Box of Matches — https://die2nite.fandom.com/wiki/Box_of_Matches
  - Pharmaceutical Products — https://die2nite.fandom.com/wiki/Pharmaceutical_Products

Container results use the game's seeded RNG, so the same state and action order produce the same result.

## AP semantics

Food and water do not add six AP on top of the current amount. They restore the ordinary citizen to the 6 AP cap. For example, eating at 1 AP leaves the citizen at 6 AP, effectively recovering 5.

Food and water are separate daily refresh opportunities. Live2Nite records `ate` and `drank` separately and resets both at the start of the next day. Hydration/status timing is documented separately in `status-hydration.md`.

Siesta is different: it is unavailable while already at full AP and, on success, adds 2 AP rather than restoring to the ordinary baseline.

## Deliberately deferred

- complete special-food catalog and side effects;
- complete Doggy Bag and Welcome Pack probability tables;
- runtime/acquisition support for source items still represented as structural/work blockers;
- Hero-only access restrictions and Hero-specific home actions;
- Chaos-mode theft/pillage overrides;
- Kitchen cooking recipes/effects;
- Laboratory production/drug actions.
