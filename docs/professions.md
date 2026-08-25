# Professions

Live2Nite treats professions as ordinary citizen roles, not as a paid or Hero-status system. Every citizen in a newly created town has one of six English-language professions:

| Profession | Profession item | Current state |
| --- | --- | --- |
| Scavenger | Small Shovel | equipment present; gameplay perks deferred |
| Scout | Camouflage Suit | equipment present; gameplay perks deferred |
| Guardian | Riot Shield | control and defense perks implemented |
| Survivalist | Survival Manual | equipment present; gameplay perks deferred |
| Tamer | Three-Legged Maltese | equipment present; gameplay perks deferred |
| Technician | Technician's Wrench | equipment present; gameplay perks deferred |

## Equipment-backed profession identity

Profession identity is derived from the item occupying the citizen's locked Profession Item slot. Live2Nite does not store a separate authoritative profession flag. Future profession-changing mechanics should replace the profession equipment through a dedicated action; ordinary inventory actions cannot manipulate that slot.

Every citizen has two permanent equipment slots rendered first in the Rucksack:

1. **Town Uniform** — permanent town-issued equipment.
2. **Profession Item** — determines the active profession.

These are equipment, not ordinary cargo. They cannot be dropped, deposited in the Bank or another home, stored in the Home Chest, stolen, or replaced through ordinary item actions. They do not consume normal cargo capacity.

## Citizen baseline

The profession foundation also adopts the former universal high-quality citizen baseline without carrying over any paid-service concept:

- 5 ordinary Rucksack cargo slots, plus the 2 locked equipment slots;
- 5 base Home Chest slots;
- +2 inherent personal Home defense.

The +2 inherent defense protects the individual home only. It is not included in contributable home defense used by shared town-defense calculations.

## Guardian

The **Riot Shield** is the sole capability token for Guardian mechanics. There is no independent `isGuardian` state. Replacing the Profession Item with another profession item immediately removes the Guardian bonuses.

Implemented source behavior:

- **4 World Beyond control points** instead of the ordinary 2. Terrorized citizens still contribute 0 control points; Guardian does not bypass Terror.
- **+1 personal Home defense** in addition to the universal +2 citizen baseline. This Guardian point is personal only and is excluded from contributable Home defense.
- **+5 global town defense** while the Guardian is alive and physically in town. Leaving town, dying, or replacing the Riot Shield removes this contribution immediately.
- Multiple in-town Guardians stack normally, including bot-controlled Guardians.
- If the existing **Guard Tower** construction is completed, each in-town Guardian contributes **+15** town defense instead of +5.

Current source reference: Eternal Twinpedia `hordes/gardien`, last modified 2025-12-13, cross-checked against the active MyHordes repository/release line in August 2026. The reference states 4 control points, +1 personal defense, +5 town defense in town, and +15 per Guardian with the Guard Tower.

The Guard Tower's separate once-per-day **Organize Defenses** action is not implemented in this PR. That source action spends 1 AP to add 10 temporary town defense, but Live2Nite does not yet have a general temporary-town-defense action subsystem. The construction remains WIP for ordinary construction access; its passive Guardian multiplier is already honored if the project is completed through a compatible future implementation or debug state.

Guardian Watch/Veilleur bonuses are also deferred until Live2Nite has the corresponding watch system.

## New Town flow

With no compatible active town, Live2Nite opens on the profession-selection landing screen. One of the six professions must be selected before **New Town** is enabled. The selected profession determines the player's starting Profession Item.

Bots are assigned professions during town creation using a seeded balanced distribution. Across the bot population, profession counts differ by at most one when population size permits. Assignment is deterministic for the same town seed and does not consume the simulation RNG stream.

A valid profession-era local save resumes normally. Debug **New Town** and the restart action after town extinction clear the active save and return to the profession-selection screen with no previous profession selected. Older saves without valid profession equipment are intentionally treated as incompatible with this foundation rather than silently assigning a profession to an existing citizen.

## Deferred professions

Scavenging bonuses, Scout camouflage/intelligence, Survivalist survival mechanics, Tamer logistics, and Technician construction points/actions remain for individual follow-up PRs. Those implementations should query the equipped profession item through the profession helpers so replacing that item remains the single source of profession identity.
