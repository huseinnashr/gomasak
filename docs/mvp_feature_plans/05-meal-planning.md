# 05 — Meal Planning (Calendar)

**Covers:** Epic 4 — US-4.1 (plan), US-4.2 (serving override), US-4.3 (calendar),
US-4.4 (edit/remove), US-4.5 (auto-NotCooked).
**Depends on:** 01 (store, dates), 03 (recipes for selection/scaling).
**Milestone:** M3.

---

## Scope

Plan meals on a date with a meal type, optionally override serving size (scaling
ingredient quantities), view them in an adjustable-window calendar (weekly default),
edit/remove Planned meals, and auto-mark past Planned meals as NotCooked.

---

## Data Touched

- `mealPlans: MealPlan[]` — `{ id, date, mealType, recipeId, servingSizeOverride,
  status, cookedSnapshot? }`. Status here is `Planned` / `NotCooked` (Cooked set in
  plan 07).

---

## Tasks

1. **Store actions**
   - `planMeal({ recipeId, date, mealType, servingSizeOverride? })` → status
     `Planned`; multiple meals per date allowed.
   - `updateMeal(id, patch)` — only while status `Planned` (recipe/date/type/override).
   - `deleteMeal(id)` — remove; then trigger trashed-purge check (plan 09).
   - `effectiveServing(meal, recipe)` → override ?? recipe.servingSize.
   - `scaledLines(meal)` — for **Planned**: read live recipe, scale each line
     `scaled = recipe_qty × effectiveServing / recipe.servingSize` (skip to-taste);
     for **Cooked**: read `cookedSnapshot` (plan 07). Shared helper reused by prep
     (06) and cooking (07).
2. **Auto-NotCooked rule (§7.2)**
   - `reconcilePastMeals()` — any `Planned` meal with `date < todayISO()` →
     `NotCooked`; persist. Idempotent. Call on app boot (wire into `main.js`) and
     before rendering calendar/prep.
3. **Calendar view** (`CalendarView.vue`, `/#/calendar`)
   - Default **weekly** window; controls to widen/narrow (days/2 weeks/month) and
     navigate windows.
   - Group entries by date then meal type (breakfast/lunch/dinner/snack).
   - Each entry shows recipe title, serving (+override if any), and status badge.
   - Status visual distinction: Planned vs Cooked vs NotCooked (color/badge).
   - Entry actions: edit, delete (Planned only); Mark Cooked hook (plan 07).
4. **Plan/edit form** (`MealPlanForm.vue`)
   - Recipe selector (excludes trashed), date picker (ISO), meal-type selector,
     optional serving override (defaults to recipe serving).
   - Reused for create and edit.

---

## Scaling Contract (shared, critical)

`scaledLines(meal)` is the single function feeding prep aggregation (06) and
cooking deduction (07). It must:
- use live recipe for Planned, snapshot for Cooked;
- apply override scaling proportionally;
- pass to-taste lines through with `qty = null` (excluded from numeric math).

---

## Files Introduced

`src/views/CalendarView.vue`, `src/components/MealPlanForm.vue`,
meal-plan actions + `reconcilePastMeals` + `scaledLines` in store.

---

## Acceptance Criteria

- US-4.1: pick recipe+date+type; multiple per date; defaults to Planned.
- US-4.2: override defaults to recipe serving; scaling formula applied; reflected
  downstream in prep & cooking.
- US-4.3: weekly default; freely set window; grouped by date+type; shows title,
  serving(+override), status.
- US-4.4: edit recipe/date/type/override while Planned; delete allowed; no revert
  path from Cooked.
- US-4.5: past Planned → NotCooked automatically; no stock deduction; visually
  distinct.

---

## Tests

- `reconcilePastMeals` flips only past Planned (not today, not Cooked); idempotent.
- `scaledLines` scaling math (override vs base; to-taste passthrough).
- `updateMeal` refuses edits when status ≠ Planned.

---

## Risks / Notes

- Trashed recipes must not appear in the recipe selector but existing meal plans
  referencing them must still render (use live recipe data until Cooked snapshot).
- Window math uses native Date — be careful with timezone; store/compare ISO
  `YYYY-MM-DD` strings, not Date objects, for "past" checks.
