# 03 — Recipe Management + Implicit Ingredient Catalog

**Covers:** Epic 2 (US-2.1–2.6) and US-3.1 (implicit catalog).
**Depends on:** 01 (store, router), 02 (unit list for dropdowns).
**Milestone:** M2.

---

## Scope

Full recipe CRUD with soft-delete (trash), plus the implicit ingredient catalog:
typing a new ingredient name in a recipe creates a catalog `Ingredient`; existing
names are offered via autocomplete to avoid duplicates.

---

## Data Touched

- `recipes: Recipe[]` — `{ id, title, servingSize, steps, ingredients[], trashed }`.
- `RecipeIngredient` — `{ ingredientId, qty: number|null, unit }` (null qty = to-taste).
- `ingredients: Ingredient[]` — `{ id, name, defaultUnit? }` (created implicitly).

---

## Tasks

1. **Store actions** (`src/store/actions.js`)
   - `createRecipe(input)`, `updateRecipe(id, input)`, `getRecipe(id)`,
     `listRecipes()` (excludes `trashed`), `trashRecipe(id)`.
   - `resolveIngredient(name)` — find existing (case-insensitive) catalog entry or
     create a new one; returns `ingredientId`. Called per ingredient line on save.
   - `purgeIfUnreferenced` hook deferred to plan 09 (called there).
2. **Ingredient autocomplete component** (`src/components/IngredientPicker.vue`)
   - Input with suggestions from `state.ingredients`; allows free text;
     on selection/typing returns a name (resolved to id at save).
3. **Recipe form component** (`src/components/RecipeForm.vue`)
   - Fields: title, serving size (>0), dynamic ingredient lines
     (name via picker + qty + unit dropdown from units module + add/remove),
     steps (multiline textarea).
   - To-taste support: choosing `secukupnya` unit disables/clears qty.
   - Client validation: title required, serving > 0, ≥1 ingredient line,
     qty > 0 for non-to-taste lines, unit from fixed list.
4. **Views**
   - `RecipeListView.vue` (`/#/recipes`) — titles (+ optional serving); excludes
     trashed; tap → detail; "New recipe" button.
   - `RecipeNewView.vue` (`/#/recipes/new`) — RecipeForm in create mode.
   - `RecipeDetailView.vue` (`/#/recipes/:id`) — title, serving, ingredient list
     (name/qty/unit), steps; Edit + Trash actions; mobile-readable.
   - `RecipeEditView.vue` (`/#/recipes/:id/edit`) — RecipeForm in edit mode.
5. **Trash flow**
   - `trashRecipe` sets `trashed = true` after a confirmation dialog; recipe
     disappears from list and from future meal-plan selection (consumed in plan 05).
   - Actual purge handled lazily in plan 09.

---

## Edit-Sync Contract (critical, ties to plans 05/07)

- **Planned** meals reference the **live** recipe by `recipeId` — editing a recipe
  is immediately reflected wherever Planned meals read recipe data.
- **Cooked** meals read their `cookedSnapshot` (written in plan 07) and are
  **unaffected** by edits/trashing. Recipe-management code must never mutate
  snapshots.
- Implication: recipe views/aggregation always read live recipe for Planned, and
  snapshot for Cooked. Document this so plan 05/06/07 follow it.

---

## Files Introduced

`src/components/{IngredientPicker,RecipeForm}.vue`,
`src/views/{RecipeListView,RecipeNewView,RecipeDetailView,RecipeEditView}.vue`,
recipe + ingredient actions in `src/store/actions.js`.

---

## Acceptance Criteria (from stories)

- US-2.1: can create with title, serving>0, ≥1 ingredient, multiline steps; saved.
- US-2.2: per-line name/qty/unit; autocomplete + new-name creation; add/remove lines.
- US-2.3: detail shows all fields, mobile layout.
- US-2.4: all fields editable; Planned meals see edits; Cooked unaffected.
- US-2.5: trash = soft delete, confirmation, hidden from list + new selection.
- US-2.6: list shows titles, excludes trashed, tap → detail.
- US-3.1: new names added to catalog; existing offered for reuse (no dup creation).

---

## Tests

- `resolveIngredient` reuses existing (case-insensitive) vs. creates new.
- Validation rejects serving≤0, empty title, zero ingredients, qty≤0 on non-to-taste.
- Trash hides from `listRecipes()` but keeps record in state.

---

## Risks / Notes

- Decide dedupe policy for ingredient names (case/whitespace normalization) and
  reuse it in stock (plan 04).
- `defaultUnit` is optional; can prefill the unit dropdown when a known ingredient
  is picked (nice-to-have, not required).
