# Die2Nite reference: homes, starter supplies, well, and AP refresh

This document records the historical basis for Live2Nite's first citizen-home and daily-supply loop. Where the surviving English documentation is incomplete, the implementation stays deliberately narrow instead of presenting a guessed table as canonical.

## Implemented historical mechanics

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Starting town water | Seeded 80–140 Water Rations | High | https://die2nite.fandom.com/wiki/About_the_game |
| Starter packages | Every citizen starts with a Citizen's Welcome Pack and Doggy Bag | High | https://die2nite.fandom.com/wiki/About_the_game |
| Base home | Every citizen begins with a Camp Bed; personal defense 0 | High | https://die2nite.fandom.com/wiki/Your_House |
| Base rucksack | 4 carried slots | High | https://wiki.eternal-twin.net/die2nite/inventory |
| Base home chest | 4 storage slots for an ordinary citizen | Medium-high | https://wiki.eternal-twin.net/die2nite/inventory |
| Daily well ration | One Water Ration may be taken from the well per citizen per day | High | historical Die2Nite well/beginner documentation |
| Food AP refresh | Ordinary food can refresh the citizen to 6/6 AP once per day | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome and https://die2nite.fandom.com/wiki/Action_Points |
| Water AP refresh | Water can independently refresh the citizen to 6/6 AP once per day | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome and https://die2nite.fandom.com/wiki/Action_Points |
| Shared bank access | Citizens may deposit and take shared town-bank items | High | https://die2nite.fandom.com/wiki/About_the_game |

## Starter-package handling in this slice

The surviving documentation establishes that the packages exist and identifies several possible contents, but this PR does not claim to reproduce the complete original random tables.

- Doggy Bag: opens into one ordinary food item in the current slice. The internal generic food item is presented as a Moldy Ham Sandwich. Exact Doggy Bag food distribution is deferred.
- Citizen's Welcome Pack: uses a small pool whose contents are individually documented as Welcome Pack outcomes:
  - Battery — https://die2nite.fandom.com/wiki/Battery
  - Box of Matches — https://die2nite.fandom.com/wiki/Box_of_Matches
  - Pharmaceutical Products — https://die2nite.fandom.com/wiki/Pharmaceutical_Products

Container results use the game's seeded RNG, so the same state and action order produce the same result.

## AP semantics

Food and water do not add six AP on top of the current amount. They restore the ordinary citizen to the 6 AP cap. For example, eating at 1 AP leaves the citizen at 6 AP, effectively recovering 5. This is why players historically tried to spend their remaining AP before eating or drinking.

Food and water are separate daily refresh opportunities. This slice records `ate` and `drank` separately and resets both at the start of the next day.

## Deliberately deferred

- hunger, thirst, dehydration, and related death/status timing;
- special foods that restore more than the normal AP cap or carry side effects;
- the complete food catalog;
- the complete Doggy Bag and Welcome Pack probability tables;
- home upgrade progression beyond Camp Bed;
- home-defense resolution during a town breach;
- theft, locks, curtains, alarms, and social consequences for taking bank/home items;
- Hero-specific storage and home improvements;
- traditional-bot strategy for deciding when to consume food/water or claim scarce well water.

These should be added only after their original behavior is documented well enough to distinguish English Die2Nite mechanics from later Hordes/MyHordes differences.
