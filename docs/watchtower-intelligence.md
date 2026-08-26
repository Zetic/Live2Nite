# Watchtower intelligence

Live2Nite keeps the Watchtower family split into the same independent responsibilities established by the current MyHordes source audit.

## Watchtower estimation

The Watchtower no longer publishes an automatic fixed-margin forecast. Each living citizen physically in town may contribute once per day at no AP cost.

- normal target: 24 weighted contributions;
- public visibility threshold: 33% quality;
- ordinary citizen contribution: 1 weight;
- Scanner **or** a Telescope in the Bank: 2 weight;
- Scanner plus Telescope remains 2 weight because current source uses one OR condition;
- Predictor/Planner uses weighted contributions beyond today's 24-point target for tomorrow;
- tomorrow is rounded outward into source-style day-scaled blocks.

Autonomous citizens make this free contribution before their ordinary 08:00 movement/planning pass. A citizen that starts that hour in town therefore does not lose its valid daily contribution merely because it departs on a mission during the same simulated hour.

The contribution thresholds and Scanner/Telescope condition above are source-backed. Live2Nite's exact numerical range-shaping function remains an adaptation: the existing deterministic hidden attack value is surrounded by uncertainty that narrows with contribution progress because the exact upstream estimation-error distribution is not represented as copied game code here. Public UI, autonomous planning, and Night Watch enrollment receive only the resulting range, never the hidden exact value.

## Observation Platform

Observation Platform is intentionally **Partial** in this pass. The directly supported nightly intelligence-radius progression is active through level 3:

| Level | Nightly refresh radius |
| ---: | ---: |
| 0 | 0 km |
| 1 | 3 km |
| 2 | 6 km |
| 3 | 10 km |

Current-source levels 4 and 5 additionally alter free-return distance. Those effects remain deferred until the corresponding listener path is verified, so Live2Nite does not offer inert level-4/5 votes.

After nightly zombie evolution, living occupied outside zones and zones within the active Observation Platform radius receive fresh shared zombie intelligence for the new day. Platform intelligence does **not** mark an unseen zone as discovered: special sites, ground items, search state, and other exploration metadata remain hidden until ordinary exploration reaches that zone. Without Upgraded Map, the town receives only the existing Live2Nite zombie bands (0, 1–2, 3–4, 5+). Upgraded Map records exact zombie counts for the same refreshed cells without bypassing that discovery boundary. Coarse map observations retain their band identity when they become stale, and stale observations are rendered with stale-intelligence styling rather than being presented as current.

## Searchtower

World Beyond recovery is a natural nightly process; Searchtower does **not** switch it on.

- one deterministic compass sector is selected every night, even before Searchtower is built;
- zones must be more than 2 km from town;
- only depleted zones in that sector are eligible;
- eligibility does not depend on the town already having discovered the zone;
- without Searchtower, eligible zones recover at the base 25% chance and the selected sector remains hidden;
- constructing Searchtower at level 0 keeps recovery at 25% but reveals/records the selected sector;
- voted Searchtower upgrades raise recovery to 37%, 49%, 61%, 73%, then 85%.

The selected sector is stored on that night's world-evolution event only when Searchtower is completed, allowing the Chronicle and Watchtower facility to reveal it without retroactively inventing information for nights before construction. World truth and shared town intelligence remain separate throughout this process.
