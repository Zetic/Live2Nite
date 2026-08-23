# Threat-aware defense strategy

PR #21 connects nightly survival, construction, home defense, World Beyond resource demand, and the distributed coordination model without introducing a hidden town overseer.

## Information boundary

Autonomous citizens may use only information an ordinary player could reasonably obtain:

- current public town defense, gate state, Bank/Well/construction state and citizen locations;
- the public Watchtower estimate when that facility exists;
- the previous Night Report;
- public Town Records bulletin/coordination commitments and field claims;
- shared World Knowledge through the existing freshness-aware intelligence boundary;
- the individual citizen's own AP, status, inventory, home and mission.

The deterministic exact horde value produced by `attackStrengthForDay()` remains authoritative night-resolution truth and is **not** part of `WatchtowerEstimate` or the agent decision surface.

## Public threat assessment

`TownDefenseStrategy.publicDefenseAssessment()` produces one of four qualitative pressure states:

- `comfortable` — current defense covers the complete known planning range;
- `uncertain` — defense covers only part of the range, or information is weak;
- `shortfall` — defense is below the lower planning bound;
- `critical` — the shortfall is severe or the gate is currently open.

### Watchtower available

The same public `min..max` range shown to the human is consumed by AI. There is no additional hidden bot-only value.

### No Watchtower

After at least one attack, citizens use the previous public Night Report as a conservative planning anchor:

`previous attack .. ceil(previous attack × 1.35)`

This exact fallback envelope is a **LIVE2NITE_ADAPTATION**, not a recovered historical Die2Nite formula. Its purpose is to let citizens make imperfect but rational decisions before better town intelligence exists.

Before any attack and without a Watchtower, the assessment remains `uncertain` rather than reading the hidden Day-1 roll.

## Dynamic construction strategy

The core construction catalog still owns generic project metadata and baseline priority. The agent layer adds situational value from public threat pressure:

- defensive projects gain value when the town appears underdefended;
- the ordinary Workshop bootstrap preference can yield during a serious public defense shortfall;
- the Watchtower is more valuable when the town lacks current threat intelligence;
- temporary one-night defenses gain late-day value when the known threat is dangerous;
- gate automation gains strategic value when defense is uncertain or insufficient.

This keeps gameplay policy out of authoritative core rules while preventing a fixed construction order from ignoring an obvious imminent survival problem.

## Resource-demand propagation

`TownNeeds` derives its active construction need from the threat-aware strategic project. Missing materials therefore propagate naturally into existing gathering/exploration behavior and the Town Records bulletin.

The flow is:

`public threat -> strategic project -> missing materials -> public need -> individual volunteering`

There is still no town-wide AP pool or hidden workforce allocator.

## Personal versus communal defense

Citizens may independently choose home upgrades when defense pressure is high or when they have expendable late-day AP.

A bot may withdraw a material from the shared Bank for a personal home upgrade only when that material is surplus to the current communal strategic project's requirement. This models a visible individual tradeoff rather than centrally assigning resources.

Personal home defense and communal construction therefore compete for the same real resources while remaining understandable from public town state.

## Town Records bulletin

The prototype coordination board introduced in PR #20 now lives under **Town Records -> Town Bulletin** rather than Home. Town Records is the first primary navigation destination and the application's default screen.

The bulletin exposes:

- current public defense outlook;
- information source (Watchtower, previous Night Report, or unknown);
- current strategic construction project;
- missing strategic materials;
- gate primary/backup volunteers;
- construction commitments;
- current field claims.

This is an in-world explanation surface for AI behavior and is intentionally shaped so a future forum/social system can replace or augment the structured posts without changing the legal-command or public-information rules.

## Regression boundary

Hard CI tests should protect:

- exact horde truth is absent from public Watchtower/agent assessment;
- structural/eligible home defense follows the 40%/80% contribution rule;
- private chest defense stays personal;
- the complete supported home level/AP curve remains stable;
- one structural home upgrade per day;
- personal home materials are actually consumed;
- construction strategy can react to a known public defense crisis;
- distributed gate/field coordination regressions remain intact.

Exact multi-day survivor counts, precise construction frequencies and other balance outputs remain diagnostic telemetry until the larger progression/status/profession systems stabilize.
