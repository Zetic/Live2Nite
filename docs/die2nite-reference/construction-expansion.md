# Town construction expansion reference boundary

PR #19 expands Live2Nite from the original six-project prototype into a broad Hordes/Die2Nite-style construction tree while keeping reconstructed values distinguishable from recovered mechanics.

## Source labels

Every construction definition carries a source and confidence marker.

- `HORDES_V4_4` — the project identity or mechanic is associated with the mature Motion Twin-era Hordes construction set used as the primary design target.
- `MYHORDES_CURRENT` — the project identity/mechanic is retained or represented by current MyHordes and is being imported intentionally rather than presented as an original-English constant.
- `DIE2NITE_ARCHIVE` — reserved for values that can be tied specifically to surviving English material.
- `LIVE2NITE_ADAPTATION` — behavior invented or substantially reconstructed for this simulation.

`sourceConfidence` describes confidence in the project/mechanic itself. `historicalCostConfidence` separately describes confidence in AP/material requirements. A project can therefore be a well-supported historical construction while still using an adapted Live2Nite material mix.

## Why costs are frequently adapted

Live2Nite currently has a deliberately smaller construction-material vocabulary than mature Hordes/Die2Nite. The implemented Bank economy primarily exposes:

- Twisted Plank
- Wrought Iron
- Unshaped Concrete Block
- Battery
- Box of Matches
- Pharmaceutical Products

Historical projects that depended on items not yet represented in Live2Nite cannot reproduce their full original bill of materials without inventing those item systems at the same time. Those projects retain their identity, branch position and currently supportable effect, but their component mix is marked `adapted`.

This is preferable to silently claiming that a simplified Live2Nite recipe is an exact Motion Twin value.

## Construction branches

The schema-v13 catalog is divided into seven player-facing branches:

1. Defensive Wall
2. Pump
3. Workshop
4. Watchtower
5. Foundations
6. Portal
7. Sanctuary

The catalog contains more than seventy-five projects. Parent/prerequisite relationships are data, not UI-only indentation. A child project becomes actionable only when all of its prerequisites are complete.

The Construction screen can display the whole catalog for planning, while the legal-action and AI surfaces operate on the currently unlocked frontier. This keeps a large tree from turning every bot decision into an exhaustive scan of locked descendants.

## Generic effect layer

Construction completion does not hard-code project IDs into unrelated systems. Definitions emit structured effects consumed by the appropriate core domain. Current effect types include:

- flat town defense
- total-defense multipliers
- Bank-defense multipliers
- personal-home defense bonuses
- home-to-town contribution ratios
- Well water added on completion
- extra daily Well withdrawals
- Workshop AP discounts
- Search Tower replenishment chance
- camping survival bonus
- gate lock / automatic close hour
- defense per dead citizen
- deterministic daily Bank-item production
- Watchtower accuracy and forecast horizon
- full terrain revelation without current zombie intelligence

This is the extension point for later projects whose historical mechanics become supportable.

## Shared defense boundary

`town.defense` remains the 40-point Live2Nite bootstrap/static base. Effective shared defense is derived at resolution time from:

`bootstrap + Bank contribution + home contribution + completed construction effects`

and then construction multipliers are applied.

Home defense is intentionally not counted at 100% toward the shared wall. The base reconstruction contributes 40% of aggregate in-town home defense, rounded down. Projects such as Circular Quarters can raise that ratio. Personal home-breach defense still uses the full home value.

Keeping shared defense derived prevents Bank withdrawals, temporary projects, multipliers, and rebuildable emergency defenses from being counted twice.

## Temporary constructions

Projects marked `expiresAfterAttack` are one-night preparations rather than permanent upgrades.

They:

1. can be completed normally during the day;
2. contribute their effect to the next attack;
3. emit `CONSTRUCTION_EXPIRED` after attack resolution;
4. reset to `completed: false` and `apContributed: 0`;
5. can be rebuilt on a later day if their prerequisites remain satisfied.

Examples include Emergency Reinforcements and several emergency Watchtower/Wall defenses.

## Daily and completion effects

Water-addition projects modify Well reserves only when completion occurs. They do not repeatedly add their completion bonus every day.

Food-producing projects emit deterministic `CONSTRUCTION_GENERATED_ITEM` events during night rollover. The event trail keeps the Bank increase visible in Town Records and reproducible from the town seed/day.

## Watchtower progression

The Watchtower remains the only construction in its branch that creates a dedicated facility screen. Passive descendants modify the same facility rather than creating new navigation destinations.

Current supported progression includes:

- Watchtower — current-night estimate
- Scanner — narrower estimate margin
- Planner — next-day forecast
- Search Tower — nightly chance to restore a depleted known zone

The exact estimate formula remains an isolated Live2Nite reconstruction where a trustworthy original-English formula has not been recovered.

## Workshop progression

The Workshop creates the material-processing facility. Factory reduces Workshop recipe AP cost through a generic discount effect. Defensive Workshop descendants contribute to shared defense without changing Workshop UI navigation.

Recipe AP cost has a hard floor of 1 AP.

## Portal and Foundations integration

Portal projects can lock or automatically close the gate at the final pre-attack hour through generic gate effects.

The Hot-Air Balloon reveals terrain discovery state across the World Beyond but deliberately does **not** fabricate current zombie observations. Terrain knowledge and zombie intelligence remain separate systems.

The Lighthouse contributes to the existing camping-outlook calculation instead of creating a second camping model.

## Sanctuary boundary

Sanctuary projects are included to establish the historical/modern branch structure, but Live2Nite does not yet implement the complete soul, terror, purification, or related status ecosystem. Where those original/modern effects are unsupported, the definition says so explicitly and only a currently supportable structural effect is active.

These projects should be revisited when the corresponding citizen-status/social systems exist rather than approximating hidden mechanics now.

## AI construction policy

Bots do not follow one hard-coded project order after the Workshop bootstrap. `constructionPriority()` scores the current unlocked frontier using factors including:

- existing project progress
- descendant unlock value
- missing-material burden
- Well pressure per living citizen
- previous-night breach/defense gap
- flat and multiplicative defensive value
- infrastructure utility
- temporary-defense urgency
- early-game cost of large Foundations projects

The Workshop remains the explicit bootstrap priority because the existing economy depends on it to convert depleted-zone feedstock and repair field weapons.

## UI/navigation boundary

The Construction screen uses category tabs and dense rows rather than one large card per project. Indentation communicates parent depth; prerequisite/material state remains authoritative data.

The main navigation is stable:

- row 1: Home, Well, Bank, Construction, World Beyond, Citizens, Town Records
- row 2: six reserved facility positions

Workshop and Watchtower occupy fixed facility positions when completed. Passive projects never reshuffle the primary navigation.

## Persisted schema

This expansion raises the save schema to **v13**. Earlier schema 2–12 saves normalize construction state against the full catalog so existing completed projects/progress are preserved while newly introduced projects begin incomplete.

The migration does not infer that a historical save had projects which did not exist in its schema.
