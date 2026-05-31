# 09 — Trashed-Recipe Purge

**Covers:** MVP spec §8 — lazy purge of trashed recipes no longer referenced.
**Depends on:** 03 (trash flag), 05 (meal deletion), 07 (cooked snapshot).
**Milestone:** M4.

---

## Scope

Lazily remove a recipe with `trashed = true` once **no** meal plan references it,
without ever breaking calendar/history (Cooked meals carry their own snapshot).

---

## Tasks

1. **`purgeTrashedRecipes()` action**
   - For each recipe with `trashed === true`: if no `mealPlan.recipeId === recipe.id`
     exists, remove it from `state.recipes`.
   - A trashed recipe still referenced (by any meal, incl. Cooked/NotCooked history)
     is retained.
2. **Wire into lifecycle**
   - Call on app boot (after `load()`).
   - Call after `deleteMeal` (plan 05) and after `markCooked`/status changes that
     could drop the last reference.
   - Deterministic + idempotent.
3. **Snapshot safety check**
   - Confirm Cooked meals render from `cookedSnapshot` (plan 07) so purging a still-
     trashed-and-now-unreferenced recipe (e.g. only referenced by Cooked meals that
     were later deleted) never breaks history. Note: a Cooked meal counts as a
     reference, so it won't be purged while that meal exists.

---

## Files Touched

`purgeTrashedRecipes` in `src/store/actions.js`; boot wiring in `main.js`;
call sites in meal-deletion / status-change paths.

---

## Acceptance Criteria

- §8: trashed + unreferenced recipe is removed from state.
- Trashed + still-referenced recipe is retained.
- Purge never breaks calendar/history display (snapshots intact).

---

## Tests

- Trash a recipe with no meals → boot purge removes it.
- Trash a recipe referenced by a Planned meal → retained; delete the meal →
  next purge removes the recipe.
- Recipe referenced only by a Cooked meal → retained while that meal exists; its
  display still works from snapshot even though recipe is trashed.

---

## Risks / Notes

- Run purge *after* `reconcilePastMeals` (plan 05) on boot so status changes settle
  first; order both deterministically in `main.js`.
