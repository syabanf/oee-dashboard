# OEE & Andon: Manufacturing Control Tower (demo frontend)

Clickable demo of the concept in `OEE-Andon-Manufacturing-Brainstorm.md`: OEE measures the loss, Andon drives the response, master data keeps both honest. Frontend only. All data is seeded fixtures held in a reducer store, so every action works without a backend.

## Run

```bash
pnpm install
pnpm dev:admin   # http://localhost:5183
```

Or in Docker, with nothing installed but Docker:

```bash
docker compose up -d --build   # http://localhost:8080
```

`ADMIN_PORT=9090 docker compose up -d --build` picks another host port. The image is nginx serving the built app; there is no server-side state.

`pnpm typecheck` and `pnpm build` must pass before a change is done. `pnpm gen:fixtures` regenerates `packages/fixtures/data/seed.json` (seeded, deterministic; do not hand-edit the JSON).

## Screens

Three dashboard tiers, one data model.

| Tier | Route | For | What it shows |
|---|---|---|---|
| Plant / executive | `/executive` | Plant manager, ops director, weekly | OEE trend over 12 weeks, top 5 loss categories in OEE points and rupiah, schedule attainment, line-to-line comparison |
| Line / asset | `/`, `/oee` | Shift supervisor, CI lead, per shift | OEE with A, P, Q, six big losses, hour by hour, alert flags, peer lines, schedule attainment, drill-down plant → line → machine |
| Floor | `/operator/:lineId`, `/board` | Operator, real time | Run / idle / down per machine, output against target, current reason, running order and the next changeover window, reject entry |

| Route | Screen |
|---|---|
| `/andon`, `/events`, `/events/:id` | Andon board; event list; one page per event with the lifecycle, the next step, production lost, recurrence, past fixes, other events on the machine and the escalation ladder |
| `/machines`, `/machines/:id` | Master machine with live OEE, current job, state timeline, hour by hour, cycle times, integration ids |
| `/quality` | Reject entry, defect Pareto, defect master. Scrap and rework are separate losses |
| `/downtime` | Planned against unplanned, Pareto of unplanned downtime with the 80% line, chronological stop log, CSV export |
| `/losses` | 30-day loss tree and ranked opportunities with a reduction slider |
| `/trends` | OEE, A, P or Q by hour, shift, day, week, month or year; comparison matrix by shift, line, machine or crew; CSV, Excel and PDF export |
| `/insights` | AI maturity ladder and sample insights |
| `/integration` | Mock CMMS work orders, message log (CMMS, PLC, WhatsApp / SMS / email gateway), payload console that resolves a PLC tag through the mapping master |
| `/m` | Responder phone app: my calls, call detail with accept → arrived → resolve, inbox, personal stats |
| `/me` | Personal response stats, visible only to the viewer |
| `/master/*` | States, reasons, Andon rules with channel per step, alert rules (threshold triggers), cycle times, shifts and calendar, integration mapping |

## How a stop travels

1. A PLC state arrives (Raise Andon → "engine detects", the payload console, or the Auto stops switch in the header).
2. The stop is silent. If the machine runs again inside the detection window it becomes a micro stop with no alarm.
3. Past the window the state engine opens the Andon event. The ladder notifies roles step by step; each role reads its own inbox (switch viewer from the account menu).
4. The operator names the reason on the line tablet. A responder accepts on the phone app, which opens the CMMS work order when the reason asks for one.
5. Arrived and resolved move the work order along. The machine returns to Running and OEE, the six big losses and the downtime log update.

Open the wall board, the line tablet and the phone app in separate tabs: a BroadcastChannel keeps them on the same story.

## UX rules the UI enforces

- **One state language.** `ANDON_TONE` and `AndonLegend` in `components/badges.tsx` drive every state colour, icon and label on the board, TV, tablet and explorer.
- **Explainable numbers.** Every OEE figure is an `ExplainButton` that opens the waterfall, the A, P, Q formulas and the counts behind it.
- **Unexplained time is chased.** The dashboard card totals stops without a reason, short stops without an event, and "Other". Events has a "Needs a reason" tab. Master data warns when "Other" passes 10%.
- **Blame-free.** Team screens compare departments and losses. Per-person numbers exist only on `/me`.

## Demo script

1. The plant clock starts at 14:40:53 with three live stops, one per lifecycle stage.
2. Press the round red button and raise an Andon on any machine.
3. Set the clock to 60x. The stop turns yellow at T+2 min and climbs the rule's escalation ladder; OEE and lost rupiah move with it.
4. Open the event, then acknowledge, classify, assign, mark arrived, resolve, verify. The machine returns to Running and the downtime span closes.
5. In Master Data, change a state's OEE impact or a rule's ladder. Every figure recalculates from configuration.

## Structure

```
apps/admin            Vite + React + Tailwind v4 app (state, layouts, pages/<feature>, components)
packages/types        domain model, zero dependencies
packages/fixtures     seed data, OEE and escalation maths (kpi.ts), formatters, reducer store
packages/integration  mock CMMS and gateway request builders, inbound payload parser
packages/ui           component kit in the WIT UI style
packages/tailwind-config  theme tokens
scripts               seeded fixture generator
```

OEE is computed from machine state spans, never from raw tags. Which states and reasons count as availability, performance or quality loss is master data (`MachineState.lossClass`, `outputFactor`, `DowntimeReason.lossClass`).

Not in this demo: login and a backend. `packages/integration` holds mock request builders and the inbound parser; no real CMMS, PLC or message gateway is called. Trend history is generated. The AI insights are illustrative text, not model output.
