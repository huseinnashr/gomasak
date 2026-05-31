# 06 — Ingredient Prep

**Covers:** Epic 5 — US-5.1 (select), US-5.2 (aggregate), US-5.3 (inline stock
adjust + shortfall), US-5.4 (explicit save).
**Depends on:** 02 (aggregation), 04 (stock read/write), 05 (`scaledLines`, window).
**Milestone:** M3.

---

## Scope

Select meal plans, aggregate the total ingredients they need (with overrides and
unit conversion), show each ingredient's current stock as an editable field with a
computed shortfall, and persist adjusted stock via an explicit Save.

---

## Tasks

1. **Selection (US-5.1)**
   - Default scope = current calendar window (weekly); user can widen/narrow via
     date range and/or per-meal checklist. Selection spans dates + meal types.
   - Consider including all statuses or only Planned — **decision:** aggregate over
     selected meals regardless of status by default, but exclude `Cooked`/`NotCooked`
     from "what to buy"? Confirm with product; default plan = include only
     **Planned** meals (those still to cook). Document the chosen filter in the UI.
2. **Aggregation (US-5.2)** — `computePrep(selectedMealIds)`:
   - For each meal → `scaledLines(meal)` (plan 05).
   - Group all lines by `ingredientId`; per ingredient call units `aggregate()`.
   - Compatible units combined within family; incompatible same-ingredient →
     separate lines + warning flag; to-taste listed without a number.
3. **Inline stock + shortfall (US-5.3)**
   - Each row: ingredient name, needed (display unit), current stock (pre-filled
     from saved stock, **editable**), shortfall.
   - `shortfall = max(0, needed − currentStock)` computed **after** unit conversion
     into a common unit. Convert saved stock into the row's display unit for the
     subtraction.
   - To-taste rows: no number, no shortfall.
   - Incompatible rows: show each segment separately with the mismatch warning.
4. **Explicit save (US-5.4)**
   - Local editable buffer for current-stock values; **no auto-save per edit**.
   - "Save stock" button commits buffered values via `setStock` (plan 04),
     converting back into each ingredient's stored unit per the plan-04 policy.
   - Reopening prep reflects last saved stock.
5. **View** — `PrepView.vue` (`/#/prep`): selection controls + aggregated table +
   Save action. Mobile-first.

---

## Files Introduced

`src/views/PrepView.vue`, optional `src/components/PrepRow.vue`,
`computePrep` helper (in store or `src/units`-adjacent prep module).

---

## Acceptance Criteria

- US-5.1: multi-select by range/checklist across dates+types; default = weekly
  window, freely adjustable.
- US-5.2: per-ingredient sums with overrides; compatible units combined;
  incompatible → separate lines + warning; to-taste without number.
- US-5.3: row shows name/needed/current(editable)/shortfall;
  `shortfall = max(0, needed − current)` after conversion; user can adjust.
- US-5.4: explicit Save only; updates saved stock; persists across reopen.

---

## Tests

- `computePrep` sums across meals with overrides (reuses scaling + aggregate).
- Shortfall math after conversion (e.g. need 1.5 kg, stock 800 g → short 700 g).
- Incompatible-unit ingredient produces separate rows + warning.
- Save writes buffered values; no write occurs before Save.

---

## Risks / Notes

- **Consistency requirement:** prep must call the same units module as cooking
  (plan 07) — do not fork the math.
- Settle the status filter (which meals count as "needed") explicitly; it affects
  results and should match user expectation for a shopping list.
- Converting edited current-stock back to stored unit on save must use plan-04's
  stored-unit policy to avoid drift.
