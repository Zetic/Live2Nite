# Die2Nite reference: nightly attack, Watchtower, and home defense

This note records what PR #7 treats as historically supported versus reconstructed/adapted. The target remains the original English Die2Nite ruleset where surviving evidence is specific enough.

## High-confidence mechanics implemented

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Town defense blocks zombies one-for-one | `zombiesInside = attackStrength - effectiveDefense`, floored at zero | High | https://die2nite.fandom.com/wiki/Zombie_Attack_Algorithm |
| Citizens outside die before the town attack while camping is not implemented | outside deaths resolve before shared defense and home attacks | High for current no-camping slice | https://die2nite.fandom.com/wiki/About_the_game and attack-algorithm notes |
| Breached zombies are distributed randomly among surviving citizens | each breached zombie is independently assigned to a uniformly random surviving in-town citizen | High | https://die2nite.fandom.com/wiki/Zombie_Attack_Algorithm |
| Personal home defense is the last line of survival | citizen survives when assigned zombies do not exceed personal defense | High | https://die2nite.fandom.com/wiki/Your_House and https://die2nite.fandom.com/wiki/Zombie_Attack_Algorithm |
| Camp Bed has no defense; Tent has +1 | implemented as 0 -> 1 structural personal defense | High | https://die2nite.fandom.com/wiki/Home |
| Building a Tent costs 2 AP | first home upgrade costs 2 AP and no materials | High | https://die2nite.fandom.com/wiki/Action_Points and https://die2nite.fandom.com/wiki/Your_House |
| Defensive objects are more effective in the Bank than at Home | Old Door remains +2 in Bank and gives +1 while stored at Home | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome and https://die2nite.fandom.com/wiki/Items |
| Watchtower estimates the next horde attack | operational Watchtower screen appears after construction and provides a range for tonight | High for capability | https://die2nite.fandom.com/wiki/Buildings |

## Horde-strength reconstruction

The surviving `Zombie Attack Strength` page contains empirical attack observations from original English towns. PR #7 uses the observed envelope for days 1–10 as the allowed range for the deterministic Live2Nite attack roll:

| Day | Range used |
| ---: | ---: |
| 1 | 21–29 |
| 2 | 25–84 |
| 3 | 57–124 |
| 4 | 92–227 |
| 5 | 160–300 |
| 6 | 217–450 |
| 7 | 290–493 |
| 8 | 357–651 |
| 9 | 468–801 |
| 10 | 611–901 |

Evidence: https://die2nite.fandom.com/wiki/Zombie_Attack_Strength

These are empirical bounds from the surviving sample, not a recovered server-side formula. Day 11+ currently uses an isolated 15% growth extrapolation. That extrapolation is `LIVE2NITE_ADAPTATION`, not an original mechanic.

## Watchtower accuracy

The original Watchtower clearly gave an estimate of the next attack, and Scanner/Predictor were later constructions that improved/extended attack information. The exact base-Watchtower error distribution was not recovered from the sources used for this PR.

Live2Nite therefore shows a rough range centered on the deterministic nightly attack strength with a ±15% envelope, clamped to the day's attack range. This is deliberately isolated in `night.ts` so it can be replaced without changing UI or night-resolution contracts.

Classification: `LIVE2NITE_ADAPTATION` for the exact ±15% accuracy; `ORIGINAL_D2N_CONFIRMED` for the Watchtower's role as an attack-estimation facility.

## Town defense still intentionally incomplete

The current game begins with 40 shared defense as a bootstrap value inherited from the earlier prototype. Surviving English documentation describes a much smaller basic defense plus defensive objects, housing contributions, and a broad construction tree. Changing that baseline before the missing defensive construction tree exists would make the current slice collapse immediately and would not be a faithful reconstruction by itself.

PR #7 therefore makes breach consequences real while leaving the 40-point initial shared defense explicitly temporary. A later defense/construction reconstruction should replace the bootstrap value and add the missing walls, pits, upgrades, temporary defenses, and related effects together.

## Deferred

- exact original server horde RNG / day curve beyond the empirical sample;
- exact base Watchtower estimation error distribution;
- Scanner and Predictor construction/effects;
- full housing chain after Tent (Hovel, Shack, Home, Fort, etc.);
- terrorized status after surviving a home attack;
- exact contribution of structural house levels to the shared town-defense display;
- camping survival;
- town upgrades and free nightly upgrade voting;
- complete original defensive construction tree;
- hardcore-specific defensive-object/building damage, which is not part of the baseline English rules targeted here.
