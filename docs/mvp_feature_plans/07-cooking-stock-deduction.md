# 07 — Cooking & Stock Deduction

**Covers:** Epic 6 — US-6.1 (mark Cooked + deduct), US-6.2 (stock reflects cooking),
non-blocking shortfall notice. Implements §7.3 (cooked snapshot).
**Depends on:** 02 (conversion), 04 (stock write), 05 (`scaledLines`, calendar).
**Milestone:** M3.

---

## Scope

Mark a Planned meal as Cooked (with confirmation), deduct its scaled+converted
ingredient quantities from stock (floored at zero), freeze a `cookedSnapshot`, show
the reduced stock, and surface a non-blocking shortfall notice. One-way only.

---

## Tasks

1. **`markCooked(mealId)` action**
   - Require explicit confirmation in UI before calling (irreversible).
   - Compute effective lines via `scaledLines(meal)` (live recipe at cook time).
   - Build `cookedSnapshot = { title, servingSize: effectiveServing, lines: [{ ingredientId, qty, unit }] }`
     from those effective lines (§7.3). Store on the meal.
   - For each non-to-taste line:
     - convert needed qty into the ingredient's **stored stock unit** (plan-04
       policy) via units module;
     - `newQty = max(0, currentStock − needed)`; record shortfall if
       `needed > currentStock`.
     - write back via `setStock`.
   - Set status → `Cooked` (one-way; `updateMeal` already refuses Planned-only edits
     on Cooked meals).
   - Return a list of shortfalls for the notice.
2. **Floor-at-zero + shortfall notice (US-6.1, §6 notice)**
   - Stock never goes negative; shortfall beyond stock is not recorded as debt.
   - After cooking, show a **non-blocking** "you were short X of ingredient Y"
     message (dismissible; does not block the action).
3. **Snapshot-based rendering (§7.3)**
   - Cooked meals render title/serving/lines from `cookedSnapshot`, ignoring later
     recipe edits/trashing. Wire calendar + any recipe-derived views to read the
     snapshot when status === Cooked.
4. **UI**
   - "Mark Cooked" action on a Planned calendar entry → confirm dialog → `markCooked`
     → shortfall notice. Cooked entries visually distinct (badge/color) and offer no
     revert.

---

## Files Introduced / Touched

`markCooked` in `src/store/actions.js`; confirm dialog + shortfall notice
component(s); calendar entry wiring (plan 05) to read snapshot for Cooked.

---

## Acceptance Criteria

- US-6.1: explicit confirmation; deducts each ingredient (after scaling +
  conversion); floors at zero (no negative/debt); status → Cooked (one-way);
  visually distinct; writes `cookedSnapshot`.
- US-6.2: stock page shows reduced quantities; zeroed ingredients show 0.
- Non-blocking shortfall notice shown when stock was insufficient; does not block.
- Edits/trashing of the recipe afterward do not change the Cooked meal (snapshot).

---

## Tests

- Deduction with conversion (recipe in kg, stock in g) lands correct stored value.
- Floor-at-zero: stock 200 g, need 500 g → stock 0, shortfall 300 g reported.
- To-taste lines never deducted.
- Snapshot frozen: editing the recipe after cook doesn't alter snapshot/lines.
- `markCooked` is idempotent-safe (re-invoking on a Cooked meal is a no-op/blocked).

---

## Risks / Notes

- Cooking and prep MUST share scaling (`scaledLines`) and the units module — verify
  identical results for the same meal between prep "needed" and cooking deduction.
- Ingredient with **no** stock entry: treat current as 0 → full amount becomes
  shortfall; do not create negative stock.
- Stored-unit policy (plan 04) governs the write-back unit; keep consistent.
