# 04 — Ingredient Catalog & Stock Page

**Covers:** Epic 3 stock stories US-3.2, US-3.3, US-3.4 (US-3.1 done in plan 03).
**Depends on:** 01 (store), 02 (conversion), 03 (ingredient catalog).
**Milestone:** M2.

---

## Scope

A stock page that lists every ingredient with its current qty+unit (or zero/not
stocked), lets the user set/adjust a single stored qty+unit per ingredient with
on-read/on-write unit conversion, and delete a stock record.

---

## Data Touched

- `stock: StockEntry[]` — `{ ingredientId, qty, unit }`, at most one per ingredient.
- Reads `ingredients` for names; reads units module for conversion.

---

## Tasks

1. **Store actions**
   - `getStock(ingredientId)` → entry or null.
   - `setStock(ingredientId, qty, unit)` — upsert; if user entered a compatible
     unit, convert to the entry's stored unit on write (or store the chosen unit —
     see conversion rule below); validate qty ≥ 0 and unit valid.
   - `deleteStock(ingredientId)` — remove the stock record (ingredient remains).
   - `listStockRows()` — every ingredient joined with its stock (zero if none).
2. **Stock view** (`StockView.vue`, `/#/stock`)
   - List rows: ingredient name + qty + unit; ingredients with no record show
     "0 / not stocked".
   - Per-row edit: qty input + unit dropdown (units module, grouped by family).
   - Display-in-chosen-unit: user can switch the display unit within the family;
     value converts on read.
   - Add-stock affordance for an ingredient that has none.
   - Delete action with confirmation.
3. **Conversion behavior (US-3.3 / stories §)**
   - On **write**: accept any unit in the ingredient's family; store one qty+unit.
     Define the stored unit policy: keep the unit the user last entered (single
     qty+unit), converting prior value into it. Document and reuse this exact rule
     in prep save (plan 06) and cooking deduction (plan 07) so math is consistent.
   - On **read**: allow viewing in any compatible unit via `convert()`.
4. **Validation**
   - qty is a non-negative number; unit must belong to a single family for the
     ingredient (no cross-family stock). To-taste cannot have stock.

---

## Files Introduced

`src/views/StockView.vue`, optional `src/components/StockRow.vue`,
stock actions in `src/store/actions.js`.

---

## Acceptance Criteria

- US-3.2: lists ingredients with qty+unit; no-stock shows zero/not stocked.
- US-3.3: set/adjust qty+unit; single qty+unit stored; enter in any compatible
  unit (converted on write); display in chosen compatible unit on read; saves
  immediately.
- US-3.4: delete removes the stock record (ingredient definition stays);
  confirmation prompt before delete.

---

## Tests

- `setStock` with a compatible unit converts and stores one qty+unit.
- `setStock` rejects cross-family unit and negative qty.
- `deleteStock` removes only the stock entry, not the ingredient.
- `listStockRows` returns zero rows for ingredients without stock.

---

## Risks / Notes

- The "stored unit" policy (keep last-entered vs. fixed canonical) must be settled
  here because prep-save and cooking-deduction both write back to stock. Recommended:
  store the unit the user works in; convert needed/deducted amounts into it.
- Count-family ingredients: ensure the chosen member is preserved (no cross-member
  conversion).
