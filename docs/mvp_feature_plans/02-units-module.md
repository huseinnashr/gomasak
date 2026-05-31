# 02 — Units & Conversion Module

**Covers:** MVP spec §7.1, user stories §5 — unit families, conversion, aggregation.
**Depends on:** 01. **Milestone:** M2.

This is the shared math used by recipe scaling, stock read/write conversion, prep
aggregation, and cooking deduction. **It must be the single source of conversion
logic.** Build it early and test it hard.

---

## Scope

A pure, dependency-free module: define unit families and factors, convert between
compatible units, aggregate quantities across recipe lines, and pick a sensible
display unit. No UI here.

---

## Unit Families (initial set — confirmed in stories §5)

| Family | Members (canonical base in **bold**) | Factors |
|--------|--------------------------------------|---------|
| Mass | **g**, kg | 1 kg = 1000 g |
| Volume | **ml**, l, sdt, sdm, gelas | 1 l = 1000 ml; sdt ≈ 5 ml; sdm ≈ 15 ml; gelas ≈ 240 ml |
| Count | buah/pcs, butir, siung, lembar, potong, bungkus, kaleng, sachet, ikat | counted as-is; **no cross-conversion** between members |
| To-taste | secukupnya | display-only; excluded from aggregation/deduction |

---

## Tasks

1. **`src/units/units.js`** — data tables:
   - `FAMILIES`: map of family → `{ base, members: { unit: factorToBase } }`.
   - Count family: each member is its own non-convertible unit (factor 1, but
     conversion only allowed unit→same-unit).
   - Helpers: `unitFamily(unit)`, `isToTaste(unit)`, `areCompatible(a, b)`,
     `listUnits()` (for dropdowns, grouped by family).
2. **`src/units/convert.js`** — operations:
   - `convert(qty, fromUnit, toUnit)` → number; throws/returns null on
     incompatible families; identity for count member→itself.
   - `toBase(qty, unit)` / `fromBase(qty, baseUnit, displayUnit)`.
   - `aggregate(lines)` where each line = `{ qty, unit }` for **one ingredient**:
     - group by family; sum within family in base unit;
     - count family: group by exact member (no merge across members);
     - to-taste lines: collected separately, no number;
     - returns groups: `[{ family, qtyBase, baseUnit, displayQty, displayUnit }]`
       plus a `toTaste` flag and an `incompatible` flag when >1 family/segment
       exists for the same ingredient.
   - `pickDisplayUnit(qtyBase, family)` — choose a readable unit (e.g. show kg when
     ≥ 1000 g; l when ≥ 1000 ml) — deterministic rules.
3. **`src/units/__tests__/convert.test.js`** — Vitest coverage (see below).

---

## Aggregation Contract (used by prep & cooking)

- Input: many `{ ingredientId, qty, unit }` lines across selected meals.
- Per ingredient: call `aggregate()` on its lines.
- Compatible units within a family → one combined number in a display unit.
- Different families for the same ingredient → **separate result segments** + an
  `incompatible: true` flag (UI shows a warning, prep shows separate lines).
- To-taste lines → listed without a quantity; excluded from numeric totals and
  from deduction.

---

## Test Matrix (Vitest)

- g↔kg and ml↔l round-trips; spoon/cup → ml (sdt/sdm/gelas).
- Sum mixed mass lines (e.g. 500 g + 1 kg = 1.5 kg display).
- Volume sum mixing sdm + ml + l.
- Count: 2 butir + 3 butir = 5 butir; butir + siung kept separate (no merge).
- Incompatible same-ingredient: g + ml → two segments + `incompatible` flag.
- To-taste excluded from totals; surfaced separately.
- Edge: qty 0, qty null (to-taste), unknown unit → defined behavior (throw/skip).
- `pickDisplayUnit` thresholds (999 g stays g; 1000 g → 1 kg).

---

## Files Introduced

`src/units/units.js`, `src/units/convert.js`, `src/units/__tests__/convert.test.js`.

---

## Acceptance Criteria

- All test-matrix cases pass.
- No other module re-implements conversion (enforced by code review in later plans).
- Pure functions: no store/DOM dependencies; importable in isolation.

---

## Risks / Notes

- Approximate spoon/cup factors are accepted "good enough" (stories §5) — document
  them as constants with comments so they're easy to tweak later.
- Decide and document the incompatible-unit return shape NOW; plans 06/07 depend on it.
