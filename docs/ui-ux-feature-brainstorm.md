# UI/UX Interface & Feature Brainstorm

Companion to `OEE-Andon-Manufacturing-Brainstorm.md`. That document defines the concept and the master data. This one lists every interface the system could have, who uses it, and what each screen does. Status column: **Built** (in the demo today), **Partial**, or **New**.

---

## 1. Who uses it, where, and for how long

Design each surface around the time its user has.

| Persona | Device and place | Attention per visit | Core question |
|---|---|---|---|
| Operator | Fixed tablet at the machine, gloves on | 3 to 10 seconds | What do I press? |
| Line Leader | Tablet or phone, walking the line | 30 seconds | Which machine needs me first? |
| Maintenance Technician | Phone in a pocket | 10 seconds to accept, minutes to close | Where do I go and what do I bring? |
| QC Inspector | Station tablet | 10 seconds per reject | Which defect, how many? |
| Warehouse Runner | Phone or forklift tablet | 10 seconds | Which material, which line, how urgent? |
| Production Supervisor | Laptop plus wall TV | 2 to 5 minutes, many times a shift | Are we on plan this hour? |
| Production / Plant Manager | Laptop, phone in meetings | 5 minutes a day, 30 in the weekly review | What did we lose, what is it worth, who owns the fix? |
| CI / Process Engineer | Laptop, long sessions | Hours | What is the root cause and did the fix hold? |
| Master Data Admin | Laptop | Occasional | Is the configuration right? |
| IT / OT Integrator | Laptop | During setup and incidents | Is data flowing, and where did it break? |

---

## 2. Shopfloor surfaces

### 2.1 Operator terminal (Built, extend)

| Screen / feature | What it does | Status |
|---|---|---|
| Stop classification | Category tiles, then detail chips. 1 to 3 taps. | Built |
| Call for help | Maintenance, Quality, Material, Supervisor while the machine keeps running. | Built |
| Running view with target counter | Big "412 / 450 pcs this hour", green or red against pace. The operator sees the gap before the supervisor does. | New |
| Cycle time dial | Actual against ideal cycle for the running product. Turns amber at +15%. | New |
| Suggested reason | The PLC fault code or the last three reasons on this machine appear as the first tile. One tap confirms. Cuts "Other". | New |
| Changeover mode | Operator taps "Start changeover", picks the next product, sees a SMED timer against standard changeover time. Ideal cycle switches when it ends. | New |
| Planned stop buttons | Break, Meeting, Cleaning, Trial. Logged as excluded or planned so they never pollute availability. | New |
| Reject entry | Plus and minus counter with defect category tiles. Optional photo. | New |
| Shift start check | Operator badge scan or PIN, product confirm, first-piece check tick. Gives accountability without a login form. | New |
| Work instruction drawer | One-point lesson or SOP photo for the current reason or product. | New |
| Response status strip | "Ardi is on the way, 2 min". Removes the urge to call again. | Partial |
| Voice note | Hold to record instead of typing a comment with gloves. | New |
| Offline queue | Taps are stored and replayed when the network returns. A small cloud icon shows queue depth. | New |

UX rules for this surface: touch targets at least 64 px, no keyboards, no scrolling on the primary screen, one colour block that says the state from three metres away, Bahasa Indonesia as the default language with an EN toggle.

### 2.2 Andon TV board (Built, extend)

| Feature | What it does | Status |
|---|---|---|
| Machine grid by line with active issues | Current design. | Built |
| Hour-by-hour board | Plan, actual and gap per hour for the line, the classic short-interval-control board. | New |
| Auto-rotating pages | Line view, plant view, top losses, safety days. 15 seconds each, pauses while any machine is red. | New |
| Escalation banner | When an event reaches red, a full-width band names the machine, the cause and who was notified. | New |
| Sound and stack light | Distinct chime per priority, mapped to a physical tower light through the PLC. Mute schedule for night shift. | New |
| Shift countdown and takt | Time left in shift, pieces needed per minute to hit target. | New |
| Line-side mini display | One line only, for a small monitor at the line head. | New |
| Celebration state | Quiet green band when a line passes target or runs a full hour without a stop. Cheap and good for adoption. | New |

### 2.3 QC station (New)

Reject logging by defect category and reason, sample inspection checklist, hold and release of a batch, "Waiting QC" timer visible to QC so they see what their delay costs, defect photo gallery per product.

### 2.4 Material call screen (New)

Warehouse view of open material requests sorted by line stop risk. Each card shows material, line, minutes until the machine starves, and an accept button. Pairs with the "Material low" state so the call happens before the stop.

### 2.5 Physical touchpoints (New)

QR code on each machine that opens its operator or technician page on a phone. Optional wireless Andon button or pull cord that raises the same event. Stack light mirrors the screen state.

---

## 3. Responder mobile PWA (New)

House mobile pattern: greeting header, chip filter, segmented tabs, lazy-loaded cards, bottom tab bar.

| Screen | Content |
|---|---|
| My calls | Tabs: New (accent), Mine, Done. Card shows machine, cause, running clock, SLA countdown ring. |
| Call detail | Dark hero with duration, machine location, last 5 events on this machine, last fix note, spare parts used last time, Accept / Arrived / Resolve as one sticky button that changes label. |
| Resolve form | Reason refine chips, action taken, parts used, photo before and after, "needs follow-up work order" toggle. |
| Handover | Reassign to a colleague or escalate to vendor with one tap and a note. |
| Machine scan | Scan the QR, land on the machine page. |
| On-call status | Available, busy, break. The assignment engine skips busy people. |
| My performance | Response time, MTTR, calls closed this week. Personal view only, never a public ranking. |
| Push notifications | Actionable: Accept from the lock screen. |

Notification channels to consider for Indonesia: WhatsApp Business template messages and Telegram bots reach people faster than email. Each person sets channel and quiet hours per priority.

---

## 4. Control Tower web (Built, extend)

### 4.1 Dashboard

| Feature | What it does | Status |
|---|---|---|
| Five questions layout, OEE hero, open events, response KPIs, top losses | Current design. | Built |
| Time scope | Shift, today, yesterday, week, month, custom. Compare against the previous period. | New |
| Hierarchy drill | Company → plant → department → line → machine as a breadcrumb that re-scopes every card. | Partial |
| OEE waterfall | Planned time down to good output, one bar per loss class. The clearest single picture of OEE. | New |
| Hour-by-hour strip | OEE and output per hour for the shift with stop markers. | New |
| Plan attainment | Production order target against actual with a projected finish time. | New |
| Shift compare | Shift 1 vs 2 vs 3 on A, P, Q, response time. | New |
| Personal watchlist | Pin machines or losses. The dashboard opens on what the user follows. | New |
| Morning meeting mode | One-click presenter view: yesterday's OEE, top 3 losses, open actions, owners. Built for a 10-minute stand-up. | New |
| Daily digest | 06:30 message with the same content. | New |

### 4.2 Plant map (New)

Floor plan with machine markers coloured by Andon level, pulsing when stopped, technician positions by last scan. Click a marker for the machine card. Useful for visitors and for supervisors who think spatially.

### 4.3 Andon events (Built, extend)

Add: SLA breach badge and countdown, bulk acknowledge, split or merge events, reclassify with audit trail, comment thread with mentions, attach photo, link to the CMMS work order state, "similar past events" panel with the fix that worked, filter presets saved per user, Kanban view by lifecycle column.

### 4.4 Machines (Built, extend)

Add: side-by-side machine compare, benchmark within machine group, health score from fault frequency and speed drift, maintenance calendar overlay on the state timeline, timeline zoom with brush select to reclassify an unexplained span, live tag panel, document tab for manuals.

---

## 5. Analysis and continuous improvement

| Screen | What it does | Status |
|---|---|---|
| Loss tree and opportunities | Current design with reduction slider. | Built |
| Pareto explorer | Pareto by reason, machine, shift, product, operator crew. Click a bar to filter everything else. | New |
| Heatmap | Hour of day by day of week, coloured by downtime. Exposes handover and break effects. | New |
| Micro stop analyzer | Count and duration distribution per machine. Micro stops hide the largest performance loss. | New |
| Speed loss by product | Actual against ideal cycle per SKU. Finds wrong standards as often as slow machines. | New |
| Changeover analysis | Actual against standard per product pair, SMED trend. | New |
| Quality view | Reject rate by defect, product, machine, first hour after changeover. | New |
| Response analytics | MTTA, response and MTTR by owner department, by person, by hour. SLA compliance. | Partial |
| Recurrence tracker | Same reason on the same machine within N days after a "resolved". Flags fixes that did not hold. | New |
| What-if simulator | Sliders for several losses at once, result in OEE points, pieces and rupiah. Exportable as a one-page business case. | Partial |
| Action tracker | Every top loss gets an owner, a countermeasure, a due date and a before/after chart that fills itself. This closes the "improve" step of the loop. | New |
| Root cause workspace | 5-Why or fishbone template attached to a loss, with evidence pulled from events. | New |
| Report builder | Shift report, weekly OEE pack, PDF and Excel, scheduled by email. | New |

---

## 6. AI layer

Ordered by how much clean data each needs.

| Feature | What it does | Needs |
|---|---|---|
| Ask the plant | Natural-language question box: "why was Line B low yesterday?" Answer cites events and charts. | Levels 1 to 5 |
| Auto shift summary | Draft handover note from the shift's events. Leader edits and sends. | Levels 1 to 6 |
| Reason suggestion | Predicts L1 to L3 from fault code, machine and recent history. | Classified history |
| Free-text normaliser | Maps operator comments and voice notes to reason codes. | Classified history |
| Anomaly cards | Cycle drift, rising micro stops, unusual reject mix. | State and count history |
| Predictive alert | Motor current pattern before slowdown, as in the brainstorm example. | Sensor history |
| Prescriptive plan | Suggests the PM slot and parts before the predicted failure. | CMMS link |
| Insight feedback | Useful, not useful, already known. Trains ranking and builds trust. | Any |

Every AI card shows its evidence, its confidence and a way to dismiss it.

---

## 7. Configuration and master data

| Screen | What it does | Status |
|---|---|---|
| States, reasons, rules, cycle times, integration mapping | CRUD. | Built |
| Shifts and calendar | Read-only today. Make it an editable calendar with holiday import and overtime entries. | Partial |
| Plant, department, line, workstation | Tree editor with drag to re-parent. | New |
| People, crews, PIC, on-call roster | Who is on shift now decides who gets notified. | New |
| Products, routing, defect reasons | CRUD plus routing as a simple step list. | New |
| State rule builder | Visual "if motor on and counter flat for 30 s then Running no output". Test against recorded signals before publishing. | New |
| Escalation simulator | Pick a rule, play a fake stop, watch who gets which message at which minute. | New |
| Reason tree editor | Drag and drop tree, usage counts, merge duplicates, warn when "Other" passes 10%. | New |
| Targets | OEE, A, P, Q targets by machine, line and period, with history. | Partial |
| Notification templates | Message text per channel and language. | New |
| Roles and permissions | Matrix of role by action. | New |
| Audit log and versioning | Who changed which rule when, with effective dates so past OEE is never silently recalculated. | New |
| Import and export | Excel templates for bulk master data, with a validation report. | New |
| Setup wizard | Six steps: plant, lines, machines, states, reasons, rules. Gets a pilot line live in one sitting. | New |

---

## 8. Integration and IT console

Connection health per source (PLC, SCADA, MES, CMMS, ERP, QMS) with last message time and lag. Live tag browser. Unmapped tag inbox. Payload console to paste, parse and ingest a sample. Message log with direction, status and latency. Dead-letter queue with retry. CMMS work order sync view. ERP cost rates used for the rupiah figures. API keys and webhooks. Data quality score per machine: gaps, flat-lined counters, clock drift.

---

## 9. Cross-cutting UX decisions

1. **One state language everywhere.** Same five Andon levels, same icon and colour on tablet, TV, phone and report. Status always carries an icon and a word, never colour alone.
2. **Machine state and downtime reason stay visually separate.** State is a badge, reason is text. The brainstorm insists on this split and the UI should teach it.
3. **Every number explains itself.** Tap any OEE figure to see planned time, run time, counts and the formula.
4. **Time is plant time.** Show the shift and the timezone. Flag late or edited data.
5. **Bilingual.** Bahasa Indonesia on the shopfloor, English optional for management and vendors.
6. **Unclassified time is a first-class citizen.** Show it, chase it, never hide it inside "Other".
7. **Blame-free framing.** Rank losses and machines. Show personal stats only to the person.
8. **Works degraded.** Offline queue on tablets, stale-data banner on dashboards, last-known state on the TV.
9. **Dark mode for TV and night shift, light for desks.**
10. **Deep links.** Every event, machine and loss has a URL that works in a WhatsApp message.

---

## 10. Wider feature ideas

Shift handover log with carry-over issues. Energy per piece next to OEE. Operator skill matrix tied to who may run which machine. Safety and near-miss Andon category with its own ladder. Spare part stock check from the technician screen. Vendor portal for machine makers to see their machines' faults. Multi-plant benchmark. Kaizen idea box from the operator tablet. Gemba walk checklist on the leader's phone. Wearable alert for technicians in loud areas. Customer-facing delivery risk flag when a bottleneck machine is down.

---

## 11. Suggested build order

**Now, to make the demo run end to end**
1. Signal simulator and state rule view
2. Auto-detected stops with the silent, micro-stop and yellow phases
3. Role switcher with notification inbox
4. Technician mobile PWA
5. Mock integration console with CMMS work order sync
6. Reject entry and live quality

**Next, what management asks for in the second meeting**
7. Time scope, hierarchy drill and OEE waterfall
8. Hour-by-hour board on TV and dashboard
9. Pareto explorer, heatmap, recurrence and SLA breach
10. Action tracker
11. Changeover mode with SMED timer
12. Morning meeting mode and shift report

**Later**
13. Plant map, state rule builder, escalation simulator, setup wizard
14. Ask the plant, auto shift summary, reason suggestion
15. WhatsApp and Telegram channels, audit log, permissions, multi-plant

---

## 12. Questions that change the design

1. Does each machine get its own tablet, or one per line? That decides whether the operator screen needs a machine picker.
2. Do operators log in? Badge, PIN or anonymous per shift crew?
3. Which notification channel do technicians already answer fastest?
4. Does the PLC expose fault codes? If yes, reason suggestion becomes cheap and accurate.
5. Who may reclassify an event after the shift closes, and does OEE recalculate?
6. Is the rupiah value a margin, a selling price or a cost rate from ERP?
7. One plant first, or must the hierarchy handle several from day one?
