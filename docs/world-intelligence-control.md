# World Beyond intelligence, control, and rescue

This document describes the schema-v12 World Beyond model introduced after the autonomous-AI architecture refactor.

## Authoritative world vs town intelligence

`WorldZone.zombies` is authoritative simulation truth. It is used by core legality, combat, night evolution, and zone control.

`WorldState.intel[zoneKey]` is shared town knowledge:

```text
observedZombies
lastObservedDay
lastObservedHour
```

Agents and the strategic map must never substitute authoritative zombie truth for this observation layer.

A discovered zone therefore has two independent facts:

```text
World truth:      7 zombies
Town observation: 3 zombies, Day 2 06:00
```

On Day 3 the town still remembers the zone and its last report, but the report is `stale`.

Freshness is derived rather than persisted:

- `fresh`: observed during the current day;
- `stale`: observed on an earlier day;
- `unknown`: no zombie observation exists.

Terrain discovery, special-site discovery, search depletion, and campsite preparation are persistent world knowledge and are not erased merely because zombie intelligence becomes stale.

## Observation

Entering a World Beyond zone emits `ZONE_OBSERVED` with the authoritative zombie count at that moment. Combat emits a new observation with the post-combat count.

Observations are shared town intelligence. A future communication model may narrow that assumption, but schema v12 intentionally treats citizen observations as town-visible once generated.

## Nightly zombie evolution

Night resolution can emit `WORLD_ZOMBIES_EVOLVED` before the next `DAY_STARTED` event.

Evolution is:

- deterministic from town seed, day, and coordinates;
- spatially influenced by neighboring zombie pressure;
- capable of propagating into cleared zones;
- mildly day-scaled;
- bounded to avoid explosive early-game growth.

The event changes authoritative zombie counts only. It does **not** rewrite old observations. The next day therefore begins with yesterday's map information naturally stale.

The exact propagation coefficients are a `LIVE2NITE_ADAPTATION`; the gameplay purpose follows the historical Hordes/Die2Nite requirement that the World Beyond cannot be permanently solved by a single scouting pass.

## Repeat reconnaissance

Scouting has two current purposes:

1. `frontier` — discover unknown territory;
2. `recon` — refresh stale intelligence on already-known useful territory.

Recon targets prefer productive zones, useful undepleted special sites, old reports, and relevant mission territory. Route movement refreshes every zone actually traversed.

Ordinary gather/excavation opportunities require fresh target intelligence. Town assignment planning captures ordinary opportunities before the current hour's scouts execute, so a reconnaissance team cannot instantaneously unlock a large party in the same assignment batch.

This creates a staged loop:

```text
night changes world
    -> reports become stale
    -> scouts refresh routes/targets
    -> later planning pass mobilizes larger parties
```

## Zone control states

The authoritative historical control equation remains:

```text
human control = living citizens in zone * 2
zombie control = zombies in zone
trapped = zombie control > human control
```

Schema v12 layers decision states around that rule:

- `secure` — controlled and one departure does not immediately lose control;
- `fragile` — controlled now, but one departure would lose control;
- `temporary` — actual control has been lost, but a citizen-specific extraction window remains active;
- `trapped` — actual control is lost and the citizen has no active extraction window.

## Temporary control

Historical Hordes granted a short grace period when a citizen departure caused the remaining group to lose control. Live2Nite currently has an hourly planning clock rather than continuous thirty-minute simulation, so the historical window is adapted as:

> remaining citizens may escape through the rest of the current hourly simulation window.

A departure that changes an actually controlled zone into an uncontrolled zone emits:

```text
ZONE_CONTROL_LOST
TEMPORARY_CONTROL_GRANTED (per remaining citizen)
```

Temporary control:

- permits movement/escape;
- permits emergency combat and consumables;
- does not count as actual zone control;
- does not permit ordinary scavenging or special-site excavation/search;
- expires explicitly at the hourly boundary via `TEMPORARY_CONTROL_EXPIRED`;
- is cleared early if real control is restored.

This is intentionally an extraction mechanic, not a temporary productivity buff.

## Group-aware movement

Autonomous citizens predict whether their own departure would lose control for companions.

For a fragile zone they prefer to:

1. reduce the zombie threat with a useful carried weapon when possible;
2. otherwise choose a deterministic extraction leader;
3. preserve rescue responders until protected/non-rescue citizens have had the better opportunity to leave.

Bots do not deliberately create a grace-only state around a controlled human citizen during their autonomous portion of the hour.

Because bot execution is sequential, `runBotHour` includes a final temporary-extraction pass. If a later citizen's departure grants temporary control to a bot that already acted earlier in the array, that bot gets another opportunity to extract before the grace window expires.

## Rescue semantics

Emergency rescue assignment now budgets:

```text
route to casualty
+ route home
+ rescue safety reserve
```

against actual usable AP/refill potential. Reaching the casualty is no longer sufficient for dispatch.

At the casualty:

- responders restore human control by presence and/or combat;
- a fragile rescue team preferentially reduces the threat before extraction;
- the protected citizen can depart first;
- if that departure causes control loss, responders receive temporary control and extract;
- responder missions are not complete until they return to town and unload/clear normally.

The exact rescue staffing and combat heuristics remain deterministic Live2Nite AI policy, not a claim about original Die2Nite autonomous citizens.

## Player-facing map

The strategic map displays shared knowledge rather than truth:

- `H#` — current living citizen count in the zone;
- `Z#` — fresh current-day observation;
- `Z~#` — stale observation;
- `Z?` — unknown zombie count;
- `R` — active/inbound rescue.

The controlled citizen is shown by a tile highlight rather than replacing the zone data with `@`.

Control state is also visually encoded for occupied zones. Hover text exposes citizen names, observation age, known site status, control state, and rescue activity.

The detailed current-zone panel may show the authoritative zombie count because the controlled citizen is physically present and is observing that zone.

## Extension rules

Future systems should plug into these seams:

- Watchtower/map upgrades may create observations or improve their precision/freshness, not read truth directly in UI/AI.
- Scout professions may extend observation radius or quality.
- Camping AI may reason about stale routes but must not reveal overnight evolution automatically.
- Guardian/terror/status effects should change core control points, after which the shared `zoneControlState` model remains authoritative.
- LLM strategy may choose goals and risk tolerance from `AgentDecisionContext`; it must not bypass `WorldKnowledge` to inspect hidden zombies.
