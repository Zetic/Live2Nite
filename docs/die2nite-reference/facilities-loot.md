# Die2Nite reference: facilities, gate placement, and depleted-zone loot

This document records the historical basis and Live2Nite decisions used for PR #6. The goal is to separate verified behavior from placeholder loot frequencies while making town facilities distinct gameplay destinations.

## Verified / high-confidence mechanics

| Mechanic | Live2Nite implementation | Confidence | Evidence |
| --- | --- | --- | --- |
| Gate belongs to outside travel flow | Gate controls live on the World Beyond screen | High | https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing |
| Workshop is a built prerequisite for processing | Workshop processing UI and commands are only available after the Workshop is completed | High | https://die2nite.fandom.com/wiki/Workshop |
| Workshop converts low-grade materials | Rotting Log -> Twisted Plank and Scrap Metal -> Wrought Iron | High | https://die2nite.fandom.com/wiki/Workshop and https://die2nite.fandom.com/wiki/Buildings |
| Rotting Logs come from depleted desert zones | Depleted-zone scavenging can yield Rotting Logs | High | https://die2nite.fandom.com/wiki/Rotting_Log |
| Depleted zones yield inferior Workshop-dependent resources | Depleted searches use a separate low-grade loot pool | High | https://die2nite.fandom.com/wiki/Beginners%27_Welcome |
| Undepleted/special zones can contain immediately useful construction material | Normal search pool contains construction-ready resources needed to bootstrap early projects | Medium-high | https://die2nite.fandom.com/wiki/Special_Zones and individual item pages |

## Live2Nite search model in this slice

A zone now has two search phases:

1. **Undepleted** — the zone has normal search opportunities. These produce useful loot and can include Twisted Planks, Wrought Iron, concrete, food, water, defensive items, and miscellaneous resources.
2. **Depleted** — normal search opportunities are exhausted. Each citizen may comb that depleted zone once in the current simplified model, producing low-grade Workshop feedstock: Rotting Logs or Scrap Metal.

The exact quantities, probability weights, autosearch timing, Search Tower regeneration, special-zone tables, and per-day depleted-search behavior are not claimed to be exact Die2Nite rules yet. They remain explicit follow-up research areas.

## Facility navigation

The old generic Town screen is removed. Shared town systems are first-class destinations:

- Home
- The Well
- The Bank
- Construction Sites
- World Beyond
- Citizens
- Chronicle

Operational built facilities can add navigation destinations dynamically. The Workshop is the first such facility. Its navigation entry does not exist until construction completes.

The Watchtower currently has no dedicated operational screen because its attack-estimation mechanic has not yet been implemented. Construction completion is preserved, and a future Watchtower implementation can register another facility destination without redesigning the shell.

## Deliberately deferred

- exact normal-zone and depleted-zone loot probabilities;
- autosearch timing and repeated depleted-zone scavenging rules;
- Search Tower undepletion/regeneration;
- special-zone generation and location-specific loot tables;
- exact Watchtower estimation behavior;
- full construction tree and blueprint unlock system.
