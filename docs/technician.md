# Technician

The **Technician's Wrench** is the sole capability token for Technician profession mechanics. Live2Nite does not store a separate authoritative Technician flag; replacing the Profession Item immediately removes Technician-only CP, Wrench repair, and free ruin-imprint access.

## Current MyHordes core behavior

Technicians receive **6 Construction Points (CP) per town day**. CP are a dedicated work currency, not a speed multiplier or AP discount. Town construction and ordinary Workshop recipes spend CP first and use ordinary AP only when the remaining CP cannot cover the action. The pool refreshes automatically with the new day.

Examples:

- 6 CP / 6 AP, construction contribution costing 1 work point → 5 CP / 6 AP.
- 2 CP / 6 AP, Workshop action costing 3 → 0 CP / 5 AP.
- 0 CP / 6 AP, construction contribution → 0 CP / 5 AP.

Inside explorable ruins, a Technician standing at an eligible locked room can take the room's matching **key imprint with no material input**. This creates the matching Live2Nite semantic key; it does **not** open the room automatically. The ordinary unlock action remains separate and consumes the matching key.

## Technician's Wrench repair

The MyHordes Prime/seasonal Technician layer retained in the current source repository maps the Technician tool to a dedicated repair action:

- costs **3 CP**;
- costs **0 AP**;
- requires the citizen not to be exhausted and not wounded in the hands;
- repairs a supported broken item directly, without consuming a Repair Kit or Kwik-Fix.

Live2Nite derives supported Wrench-repair targets from its existing source-backed broken/working equipment families rather than maintaining a second independent item catalogue. The repaired item retains its runtime item identity.

## Technicians Workbench

The **Technicians Workbench** construction is sourced from the MyHordes Prime/seasonal layer retained in the current repository. Its existing Live2Nite construction entry is now active at the source-backed cost already present in the construction catalogue.

Once built, every citizen can use the Workbench **once per day** on a Workshop recipe that normally has multiple random outcomes. Instead of rolling randomly, that citizen chooses one supported outcome directly.

- Technician cost: **4 work points**, paid CP first and AP as fallback.
- Other profession cost: **6 AP**.
- The once-per-day use belongs to the citizen, not the town, so different citizens can each use the Workbench once that day.
- Current Live2Nite controlled-output candidates are the existing random dismantling recipes for Broken Electronic Devices and Mechanisms.

The Workbench does not change the ordinary Workshop recipe. A citizen may still use the normal random conversion path instead of spending the day's controlled-output use.

## Bot parity

Autonomous Technicians use the same legal command and payment paths as the controlled citizen. Their town-work reserve calculation treats CP-funded work as zero-AP work, allowing a Technician to contribute technical labor without falsely consuming AP reserved for gate or expedition obligations. The town material planner can use the Workbench to target a missing technical construction component rather than taking a random dismantle result when the once-daily option is available.

## Scope boundaries

Technician does not receive a scavenging, zombie-control, combat, camping, cargo-capacity, movement, or ruin-oxygen bonus. Generic Hero abilities, Chaos rules, Watch behavior, and unrelated profession buildings remain outside this profession pass.
