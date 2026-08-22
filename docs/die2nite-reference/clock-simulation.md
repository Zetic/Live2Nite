# Live2Nite reference: clock and hourly simulation

This note records the design status of the PR #9 clock system so simulation conveniences are not accidentally described later as recovered Die2Nite rules.

## Classification

The **player-controlled hourly clock and fast-forward controls are a LIVE2NITE_ADAPTATION**.

They exist because the current build is single-player while the intended town contains many autonomous citizens. The clock gives those citizens deterministic opportunities to act throughout the day without requiring a real-time server or changing the established AP economy.

The following are therefore implementation conventions, not claims about the original English game's server clock:

- new playable days begin at 01:00;
- the UI advances in whole-hour simulation checkpoints;
- buttons jump forward to noon, 23:00, or midnight;
- basic bots reconsider an objective on hourly ticks;
- basic bots currently begin return-home pressure between roughly 18:00 and 21:00 based on citizen id.

## Preserved gameplay principle

The clock does **not** make movement cost one hour and does not impose an hourly action allowance.

AP remains the ordinary action budget. When the simulation is at 23:00, a citizen with enough AP can perform several movements, a rescue, entry into town, deposits, or other legal actions before the clock becomes 00:00. This preserves the important gameplay behavior where citizens can keep an AP reserve and spend it aggressively near the end of the day.

The ordering rule is:

1. the controlled citizen acts manually while the clock remains at the current hour;
2. requesting a time advance tells the simulation the controlled citizen is finished with that hour;
3. autonomous citizens finish their current-hour plans;
4. the clock then moves forward.

## Midnight attack representation

Live2Nite represents 00:00–01:00 as an explicit attack phase so the nightly event is not silently skipped by fast-forward.

- the complete 23:00 autonomous window happens before entering midnight;
- normal citizen commands are locked at 00:00;
- advancing once from 00:00 resolves outside deaths, town defense, home attacks, and the Night Report;
- the next playable day starts at 01:00 with daily AP/use state refreshed.

The underlying attack, town-defense, breach-distribution, and home-defense mechanics are documented separately in `night-watchtower.md`; this document only classifies the clock orchestration around them.

## Future multiplayer note

A later multiplayer/server build may replace player-controlled fast-forward with authoritative server time. For that reason, clock advancement lives outside React and is kept separate from primitive gameplay commands. The core AP/action rules should not need to change when that migration happens.
