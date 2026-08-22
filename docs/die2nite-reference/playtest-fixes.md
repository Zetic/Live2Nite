# Playtest fixes after World Beyond rollout

This note records the historical mechanics clarified by the first merged World Beyond playtest and separates them from Live2Nite-specific simulation fixes.

## Historical behavior retained

- Zombie zone control prevents movement when zombie control points exceed human control points. A trapped citizen is expected to wait for another citizen or zombie removal to restore control.
- Manual searching remains available as a zero-AP activity while outside; being trapped does not turn scavenging into an AP action.
- Scrap Metal is not a defensive object. The Workshop converts Scrap Metal into Wrought Iron.
- Defensive objects placed in the town bank contribute town defense. The temporary loot pool now includes Old Door as a defensive object worth +2 town defense when banked.

## Live2Nite simulation fixes

- `Run citizen activity` lets autonomous citizens act during the current day without immediately resolving the night. This gives rescue mechanics a usable single-player equivalent of other players logging in during the day.
- Basic bots prioritize trapped citizens, can remain as control-point anchors after reaching them, and avoid entering already-known zones they cannot control during ordinary exploration.
- The bot phase attempts to close the gate through a normal legal bot command before it finishes.
- Night reporting now identifies outside citizens/deaths and explicitly explains when an open gate reduces effective defense to zero.
- The temporary attack-strength curve was reduced because the previous placeholder guaranteed a Day 1 breach against the prototype's 40 base defense. This remains a Live2Nite placeholder until the historical attack progression is implemented.

## Sources

- https://die2nite.fandom.com/wiki/Traveling_%26_Expedition_planing
- https://die2nite.fandom.com/wiki/Expedition_Guide
- https://die2nite.fandom.com/wiki/Beginners%27_Welcome
- https://die2nite.fandom.com/wiki/Workshop
- https://die2nite.fandom.com/wiki/Items
