# Professions

Live2Nite treats professions as ordinary citizen roles, not as a paid or Hero-status system. Every citizen in a newly created town has one of six English-language professions:

| Profession | Profession item | Current state |
| --- | --- | --- |
| Scavenger | Small Shovel | search, depletion-intel, replenishment, and ruin-oxygen perks implemented |
| Scout | Camouflage Suit | SP travel, camouflage, reconnaissance, Scout Levels, camping, and ruin-entry perks implemented |
| Guardian | Riot Shield | control and defense perks implemented |
| Survivalist | Survival Manual | equipment present; gameplay perks deferred |
| Tamer | Three-Legged Maltese | dog logistics and ruin-exit guidance implemented |
| Technician | Technician's Wrench | equipment present; gameplay perks deferred |

## Source policy

Profession mechanics are sourced from the current EternalTwin/MyHordes GitLab implementation and release line. Live2Nite reproduces gameplay semantics while retaining its own runtime ids, architecture, and implementation. Wiki/Twinpedia summaries are not authoritative for profession mechanics.

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

MyHordes item-source metadata marks some runtime items as **cumbersome/heavy**. Live2Nite now derives that classification from the source catalogue instead of maintaining a separate hard-coded list. A citizen may carry at most one cumbersome item in the rucksack at a time; ordinary light cargo can still occupy the remaining cargo slots.

## Guardian

The **Riot Shield** is the sole capability token for Guardian mechanics. There is no independent `isGuardian` state. Replacing the Profession Item with another profession item immediately removes the Guardian bonuses.

Implemented source behavior:

- **4 World Beyond control points** instead of the ordinary 2. Terrorized citizens still contribute 0 control points; Guardian does not bypass Terror.
- **+1 personal Home defense** in addition to the universal +2 citizen baseline. This Guardian point is personal only and is excluded from contributable Home defense.
- **+5 global town defense** while the Guardian is alive and physically in town. Leaving town, dying, or replacing the Riot Shield removes this contribution immediately.
- Multiple in-town Guardians stack normally, including bot-controlled Guardians.
- If the existing **Guard Tower** construction is completed, each in-town Guardian contributes **+15** town defense instead of +5.

The Guardian values and interactions are maintained against the current MyHordes GitLab implementation/release line rather than wiki-derived runtime behavior.

The Guard Tower's separate once-per-day **Organize Defenses** action is not implemented in this PR. Live2Nite does not yet have a general temporary-town-defense action subsystem. The construction remains WIP for ordinary construction access; its passive Guardian multiplier is already honored if the project is completed through a compatible future implementation or debug state.

Guardian Watch/Veilleur bonuses are also deferred until Live2Nite has the corresponding watch system.

## Scavenger

The **Small Shovel** is the sole capability token for Scavenger mechanics. There is no independent `isScavenger` state. Replacing the Profession Item immediately returns the citizen to ordinary search timing, probability, depletion information, and ruin oxygen.

The wasteland search system is shared by every citizen. A manual search starts that citizen's search session for the zone. Staying in the zone allows automatic attempts; moving away ends the session. Search attempts are probabilistic, so a failed attempt produces no item and does not consume one of the zone's buried normal finds.

Implemented search behavior:

- ordinary undepleted search success uses the current MyHordes base probability;
- depleted zones remain searchable through the same attempt system and successful depleted attempts use the low-grade Rotting Log / Scrap Metal table;
- successful normal searches consume one buried find; failures do not;
- a zone becoming depleted does not terminate an already-active search session;
- ordinary automatic searches use the **2-hour base interval**;
- Scavenger repeat searches use **75% of that base interval (90 minutes)**, with the fractional schedule retained internally even though Live2Nite currently advances the visible simulation in whole hours;
- the Small Shovel applies the current Scavenger search-success modifier to the shared probability calculation;
- ordinary citizens only learn whether searchable resources remain or the zone is depleted;
- Scavengers receive qualitative depletion tiers instead of an exact hidden remaining-find count;
- explorable-ruin oxygen is increased by **50%** for a Scavenger.

A depleted zone also exposes **Replenish with Spade** to a Scavenger. Spade replenishment uses the generic zone-replenishment event rather than defining a separate kind of zone. The Small Shovel can replenish a given zone only once, encouraging Scavengers to spread their replenishment work across the wasteland. That one-Spade-per-zone history does not prevent Search Tower or future independent replenishment sources from replenishing the same zone later.

Bot-controlled Scavengers receive the same probability, timing, depletion-information and Spade-action rules as the controlled citizen; there are no bot-only Scavenger bonuses.

## Scout

The **Camouflage Suit** is the sole capability token for Scout mechanics. The suit has an active/inactive camouflage state, but the citizen remains a Scout in either state because profession identity is derived from the equipment item's type, not from whether its cover is currently active.

Implemented source behavior:

- Scouts begin each day with **2 Scout Points (SP)**.
- Movement from a World Beyond zone whose source-style rounded Euclidean distance is **3 km or farther** spends SP before AP. Once SP is exhausted, movement falls back to ordinary AP. Movement nearer than 3 km continues to use AP.
- The existing **Scouts Lair** construction now provides the source-backed daily **Map the Wasteland** action. It costs **1 AP** and prepares movement points for the following day. An ordinary citizen receives **+2 SP** next day; a Scout receives **+4 SP**, so a Scout who mapped the wasteland begins the following day with **6 SP** including the normal 2-SP base.
- Active camouflage lets a Scout leave a zombie-controlled zone without first gaining real human control. This does not add control points and does not convert the zone to human control.
- Active camouflage also lets the Scout enter an accessible explorable ruin from a zombie-controlled exterior zone. Once inside, the Scout has no special oxygen, lock, room-navigation, combat, or movement advantage.
- Camouflage can be broken when entering an overrun destination. The current source calculation is reproduced: zombie excess above arriving citizen control is multiplied by 1.3 and floored; low values are halved; each Scout Level removes 3 percentage points from the resulting detection chance. A successful deterministic roll deactivates the suit while leaving profession identity intact.
- **Re-camouflage** costs **0 AP**. It is always available in town when the suit is inactive and is available outside only while the citizen has usable real/temporary control. A Scout trapped after being detected cannot simply reactivate camouflage in place.
- Productive actions that obviously reveal the citizen while a zombie-controlled zone is being crossed — searching, excavation, structure searching, picking up or dropping items, attacking, or improving a camp — break camouflage before the action resolves. Hiding for the night intentionally preserves camouflage so its source-backed camping benefit can apply.
- Active camouflage changes the zombie component of the camping calculation from **-7 per zombie** to **-3 per zombie**. Other camping factors and caps are unchanged.
- A camouflaged Scout does not receive the desperate **Flee from Zombies** action because ordinary movement is already available through camouflage.

### Scout reconnaissance and Scout Level

Every successful Scout movement into a World Beyond zone records a persistent **Scout Visit**. Scout Visits do not reset each day.

- every **5 Scout Visits** adds one Scout Level;
- Scout Level is capped at **3**;
- the data model also retains source-compatible Scout Marker contribution space for future systems that produce explicit markers;
- Scout Level is a property of the zone, not a private character stat.

A Scout can estimate the zombie population of orthogonally adjacent zones without exposing authoritative hidden state directly to bot planning or ordinary citizens. The deterministic estimate follows the current source precision curve:

- Scout Level 0: actual zombie count ±2;
- Scout Level 1: actual zombie count ±1;
- Scout Level 2 or 3: exact zombie count;
- an actually empty adjacent zone is always reported as 0.

Scout Level also improves the shared scavenging probability for **every citizen** searching that zone by **+2.5 percentage points per level**, up to +7.5 at Level 3. This is intentionally not a direct Scout-only scavenging bonus: the reconnaissance work improves the zone for the town.

### Scout adaptations and deferred source dependencies

The current MyHordes camouflage detection formula applies an additional nighttime modifier. Live2Nite does not currently expose a traversable World Beyond nighttime phase: 00:00-01:00 is the resolved town-attack phase. No artificial daytime substitute is applied. The source night modifier should be added only if a comparable traversable night phase is introduced.

Current MyHordes also prevents re-camouflaging while leading followers. Live2Nite has no escort/follower subsystem, so no invented equivalent restriction is added.

Scout-controlled bots use the same commands, SP balance, camouflage state, detection events, mapping action, Scout Level information, and legal movement rules as the controlled citizen. When camouflage is the only reason a trapped-zone Scout can leave, autonomous Scouts prioritize preserving cover and moving to safety or continuing an outbound route rather than intentionally exposing themselves for opportunistic loot.

## Tamer

The **Three-Legged Maltese** is the sole capability token for Tamer mechanics. There is no independent `isTamer` state. Replacing the Profession Item immediately removes the dog logistics controls and ruin-exit guidance.

Implemented source behavior:

- while physically in the World Beyond, a Tamer can send the dog away **once per day**;
- the destination can be either the shared **town Bank** or the Tamer's own **Home Chest**;
- the dog returns the **entire ordinary rucksack cargo** in one trip; the locked Town Uniform and Profession Item are equipment rather than cargo and therefore remain with the citizen;
- after the trip, the dog is treated as **tired** for the rest of the day and becomes available again automatically on the next day;
- a **Terrorized** Tamer cannot send the dog;
- the normal dog cannot carry a cumbersome item, so any cumbersome cargo blocks the whole shipment instead of creating a partial delivery;
- giving the dog a carried **Anabolic Steroids** item consumes those steroids without applying their citizen status effects and lets that day's dog trip include the one cumbersome item permitted by the shared rucksack rule, together with the rest of the cargo;
- the Home Chest destination is only offered when the complete rucksack shipment fits in the Tamer's current home storage capacity; the Bank remains the unlimited shared destination;
- inside explorable ruins, the Maltese provides directional guidance toward the exit. This is navigation information only and does not bypass rooms, zombies, stairs, oxygen, or ordinary movement rules;
- bot-controlled Tamers use the same legal dog actions. Expedition bots prefer the shared Bank when they use the dog to clear a near-full field rucksack, and can steroid the dog first when a cumbersome haul would otherwise block the trip.

The dog usage and steroid state are derived from the day's Tamer events rather than stored as a separate citizen/profession flag. That keeps the Profession Item as the capability authority and makes the next-day reset follow the town day naturally.

The upstream Tamer's separate Watch/Veilleur defense bonus is intentionally deferred because Live2Nite does not yet implement the Watch system.

## New Town flow

With no compatible active town, Live2Nite opens on the profession-selection landing screen. One of the six professions must be selected before **New Town** is enabled. The selected profession determines the player's starting Profession Item.

Bots are assigned professions during town creation using a seeded balanced distribution. Across the bot population, profession counts differ by at most one when population size permits. Assignment is deterministic for the same town seed and does not consume the simulation RNG stream.

A valid profession-era local save resumes normally. Debug **New Town** and the restart action after town extinction clear the active save and return to the profession-selection screen with no previous profession selected. Older saves without valid profession equipment are intentionally treated as incompatible with this foundation rather than silently assigning a profession to an existing citizen.

## Deferred professions

Survivalist survival mechanics and Technician construction points/actions remain for individual follow-up PRs. Those implementations should query the equipped profession item through the profession helpers so replacing that item remains the single source of profession identity.
