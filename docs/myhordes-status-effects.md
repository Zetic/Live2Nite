# MyHordes citizen conditions and item effects

This document records the source boundary used by Live2Nite's generalized condition/effect foundation.

## Baseline

Behavior is audited against the current public Eternaltwin/MyHordes release line (v5.1.2, 2026-07-20). Structured item action/effect identifiers are cross-checked against `Zenoo/zen-hordes@f301c05f2527a341f663eea05e6ebd893f181ed6`, generated from MyHordes 5.1.1.

The runtime architecture stores game state rather than upstream status IDs. Source names such as `tg_meta_wound`, `infection`, `drugged`, and `addict` are mapped to typed Live2Nite state.

## Wounds

A wound has one of six body locations: **Head, Eye, Arms, Hands, Leg, Foot**.

All wounds reduce ordinary AP restoration by one point: ordinary 6 AP targets become 5 while wounded and 7 AP food targets become 6.

Represented source effects:
- **Arms:** cannot operate the gate or contribute construction AP.
- **Hands:** cannot open containers, use portable combinations/repairs, fight bare-handed, or use ordinary hand-operated weapons. Source-valid water weapons remain exceptions.
- **Leg:** movement can fail after AP is spent.
- **Foot:** retains the wound and AP penalty without another broad penalty.
- **Head/Eye:** locations are retained so later communication/search systems can consume them without changing state shape.

The audited source semantics describe wounded-leg failure as roughly one attempt in four/five but do not expose one unambiguous current constant. Live2Nite uses **25%** as an explicit approximation. Exact Eye scavenging and Head communication modifiers are not invented here.

Bandage removes the wound. Upstream also adds `healed`/bandaged state. Convalescent is explicitly out of scope, so Live2Nite preserves the one-treatment legality with a non-player-facing daily `woundTreated` marker rather than adding Convalescent.

An unresolved wound causes Infection at the attack unless temporary immunity protects the citizen.

## Infection and immunity

- Existing Infection has a **50% death risk at the attack** in ordinary rules.
- Paracetoid 7g removes Infection when present.
- Paracetoid also grants `immune`.
- Immunity protects the unresolved-wound infection transition for that attack, then clears in the nightly cycle.
- A cured Infection can return on a later attack if its wound remains untreated.

Pandemonium-specific odds are outside the current town-mode scope.

## Drugs and Addiction

1. First drug of the day applies **Drugged**.
2. Another drug while Drugged establishes **Addicted**.
3. Drugged clears at the attack.
4. Addiction persists.
5. An Addicted citizen reaching the attack without Drugged dies from withdrawal.

Proof items:
- Anabolic Steroids: drug cycle + AP target 6.
- Paracetoid 7g: drug cycle + remove Infection + apply Immune.
- Valium Shot: drug cycle + remove Terrorized when present.

All three source drug actions, and the source alcohol action below, also invoke `contaminated_zone_infect`. Live2Nite does not yet model contaminated zones as a disease source, so that environmental hook is explicitly deferred rather than silently approximated. The item actions in this PR are source-faithful within the citizen-condition systems that currently exist.

## Terror

Terrorized persists until treated. Valium removes it.

Represented now:
- 0 citizen control points outside;
- no bare-handed combat;
- while zombie control traps the citizen, ordinary item use is blocked but source drug actions allowed under Terror remain available.

Exact panic movement probabilities and future ruin-entry/forum interactions remain deferred rather than approximated.

## Alcohol

Vodka Marinostov and Wake The Dead use the source alcohol action:
- restore toward normal 6 AP (5 while wounded);
- apply Drunk;
- cannot be used while Drunk or Hungover;
- Drunk becomes Hangover at the attack;
- Hangover clears at the following attack.

Exact Drunk search/combat modifiers remain deferred until their resolver values are audited.

## Hydration and nourishment

Existing food/water commands now resolve through the same effect engine.

- **Fed** marks the daily food refresh.
- **Refreshed** marks water qualifying for the daily water refresh.
- Drinking while Dehydrated only improves Dehydrated → Thirsty and does **not** grant Refreshed or AP.
- Thirsty/Dehydrated movement and nightly progression retain the established hydration chain.

## Deferred

This PR deliberately does not add Ghoul or Convalescent as player-facing conditions, exact Eye-search numeric penalties, Head communication distortion, exact Terror panic movement probabilities, exact Drunk search/bare-hand penalties, or Pandemonium-specific status odds.
