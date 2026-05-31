import { defineStore } from 'pinia'
import { newId } from '../lib/id.js'
import { todayISO, isPastISO } from '../lib/dates.js'
import { aggregate, convert } from '../units/convert.js'
import { areCompatible, isToTaste, unitFamily } from '../units/units.js'

// Current persisted schema version. Bumping this is the basis for migrations and
// for import-compatibility checks (plan 08).
export const SCHEMA_VERSION = 1

// The canonical empty AppState. Reused by persistence seeding (plan 01) and by
// import validation (plan 08) so the shape lives in exactly one place.
export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    ingredients: [], // { id, name, defaultUnit? }
    stock: [], // { ingredientId, qty, unit }   (at most one per ingredient)
    recipes: [], // { id, title, servingSize, steps, ingredients[], trashed }
    mealPlans: [], // { id, date, mealType, recipeId, servingSizeOverride, status, cookedSnapshot? }
  }
}

// Normalize an ingredient name for dedupe (case + surrounding whitespace).
// Shared by recipe ingredient resolution (plan 03) and stock (plan 04).
function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export const useAppStore = defineStore('app', {
  state: () => emptyState(),

  getters: {
    // ---- Ingredients ----
    ingredientById: (state) => (id) =>
      state.ingredients.find((i) => i.id === id) || null,

    // ---- Recipes ----
    // Live recipes excluding trashed (for lists + selectors).
    activeRecipes: (state) => state.recipes.filter((r) => !r.trashed),
    recipeById: (state) => (id) => state.recipes.find((r) => r.id === id) || null,

    // ---- Stock ----
    stockByIngredient: (state) => (ingredientId) =>
      state.stock.find((s) => s.ingredientId === ingredientId) || null,

    // ---- Meals ----
    mealById: (state) => (id) => state.mealPlans.find((m) => m.id === id) || null,
  },

  actions: {
    // Replace the entire state in place (used by load + import). Keeps the same
    // store instance reactive while swapping all collections.
    replaceState(next) {
      this.version = next.version
      this.ingredients = next.ingredients
      this.stock = next.stock
      this.recipes = next.recipes
      this.mealPlans = next.mealPlans
    },

    // =====================================================================
    // Ingredient catalog (plan 03 / shared)
    // =====================================================================

    // Find an existing catalog ingredient by normalized name, or create one.
    // Returns the ingredient id.
    resolveIngredient(name, defaultUnit) {
      const norm = normalizeName(name)
      const existing = this.ingredients.find((i) => normalizeName(i.name) === norm)
      if (existing) {
        if (defaultUnit && !existing.defaultUnit) existing.defaultUnit = defaultUnit
        return existing.id
      }
      const ing = { id: newId(), name: name.trim() }
      if (defaultUnit) ing.defaultUnit = defaultUnit
      this.ingredients.push(ing)
      return ing.id
    },

    // =====================================================================
    // Recipes (plan 03)
    // =====================================================================

    // input: { title, servingSize, steps, ingredients: [{ name, qty, unit }] }
    // Ingredient lines carry a name; we resolve each to a catalog id here.
    createRecipe(input) {
      const recipe = {
        id: newId(),
        title: input.title.trim(),
        servingSize: Number(input.servingSize),
        steps: input.steps || '',
        ingredients: this._resolveLines(input.ingredients),
        trashed: false,
      }
      this.recipes.push(recipe)
      return recipe.id
    },

    updateRecipe(id, input) {
      const recipe = this.recipeById(id)
      if (!recipe) return
      recipe.title = input.title.trim()
      recipe.servingSize = Number(input.servingSize)
      recipe.steps = input.steps || ''
      recipe.ingredients = this._resolveLines(input.ingredients)
    },

    // Convert form ingredient lines ({ name, qty, unit }) into stored
    // RecipeIngredient ({ ingredientId, qty, unit }). to-taste → qty null.
    _resolveLines(lines) {
      return lines.map((line) => {
        const ingredientId = this.resolveIngredient(line.name, line.unit)
        const toTaste = isToTaste(line.unit)
        return {
          ingredientId,
          qty: toTaste ? null : Number(line.qty),
          unit: line.unit,
        }
      })
    },

    trashRecipe(id) {
      const recipe = this.recipeById(id)
      if (recipe) recipe.trashed = true
      this.purgeTrashedRecipes()
    },

    // =====================================================================
    // Stock (plan 04)
    // =====================================================================

    // Upsert a single qty+unit per ingredient. Stored-unit policy: we keep the
    // unit the user last entered. If a prior entry exists in a compatible unit we
    // simply overwrite with the newly entered qty+unit (the caller decides the
    // final value). Reused by prep-save (06) and cooking deduction (07).
    setStock(ingredientId, qty, unit) {
      const n = Number(qty)
      if (!(n >= 0)) throw new Error('Stock qty must be >= 0')
      if (isToTaste(unit)) throw new Error('To-taste ingredients cannot have stock')
      const existing = this.stockByIngredient(ingredientId)
      if (existing) {
        // Reject cross-family changes — stock stays within one family.
        if (!areCompatible(existing.unit, unit)) {
          throw new Error('Stock unit must stay within the same family')
        }
        existing.qty = n
        existing.unit = unit
      } else {
        this.stock.push({ ingredientId, qty: n, unit })
      }
    },

    deleteStock(ingredientId) {
      const idx = this.stock.findIndex((s) => s.ingredientId === ingredientId)
      if (idx !== -1) this.stock.splice(idx, 1)
    },

    // Every ingredient joined with its stock entry (or zero/not-stocked).
    listStockRows() {
      return this.ingredients.map((ing) => {
        const entry = this.stockByIngredient(ing.id)
        return {
          ingredientId: ing.id,
          name: ing.name,
          family: entry ? unitFamily(entry.unit) : null,
          qty: entry ? entry.qty : 0,
          unit: entry ? entry.unit : null,
          stocked: !!entry,
        }
      })
    },

    // =====================================================================
    // Meal planning (plan 05)
    // =====================================================================

    planMeal({ recipeId, date, mealType, servingSizeOverride = null }) {
      const meal = {
        id: newId(),
        date,
        mealType,
        recipeId,
        servingSizeOverride:
          servingSizeOverride == null || servingSizeOverride === ''
            ? null
            : Number(servingSizeOverride),
        status: 'Planned',
        cookedSnapshot: null,
      }
      this.mealPlans.push(meal)
      return meal.id
    },

    // Only Planned meals are editable.
    updateMeal(id, patch) {
      const meal = this.mealById(id)
      if (!meal) return
      if (meal.status !== 'Planned') {
        throw new Error('Only Planned meals can be edited')
      }
      if ('recipeId' in patch) meal.recipeId = patch.recipeId
      if ('date' in patch) meal.date = patch.date
      if ('mealType' in patch) meal.mealType = patch.mealType
      if ('servingSizeOverride' in patch) {
        const v = patch.servingSizeOverride
        meal.servingSizeOverride = v == null || v === '' ? null : Number(v)
      }
    },

    deleteMeal(id) {
      const idx = this.mealPlans.findIndex((m) => m.id === id)
      if (idx !== -1) this.mealPlans.splice(idx, 1)
      this.purgeTrashedRecipes()
    },

    // override ?? recipe.servingSize
    effectiveServing(meal, recipe) {
      return meal.servingSizeOverride != null
        ? meal.servingSizeOverride
        : recipe.servingSize
    },

    // The single scaling helper feeding prep (06) and cooking (07).
    // Planned → live recipe scaled by override; Cooked → frozen snapshot.
    // Returns [{ ingredientId, qty, unit }] with to-taste passthrough (qty null).
    scaledLines(meal) {
      if (meal.status === 'Cooked' && meal.cookedSnapshot) {
        return meal.cookedSnapshot.lines.map((l) => ({ ...l }))
      }
      const recipe = this.recipeById(meal.recipeId)
      if (!recipe) return []
      const serving = this.effectiveServing(meal, recipe)
      const factor = recipe.servingSize > 0 ? serving / recipe.servingSize : 1
      return recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        qty: line.qty == null ? null : line.qty * factor,
        unit: line.unit,
      }))
    },

    // Auto-mark past Planned meals as NotCooked (§7.2). Idempotent.
    reconcilePastMeals() {
      for (const meal of this.mealPlans) {
        if (meal.status === 'Planned' && isPastISO(meal.date)) {
          meal.status = 'NotCooked'
        }
      }
    },

    // =====================================================================
    // Ingredient prep (plan 06)
    // =====================================================================

    // Aggregate the ingredients needed across the selected meals.
    // Returns rows: [{ ingredientId, name, segments: [aggregate group], toTaste, incompatible }].
    computePrep(selectedMealIds) {
      const byIngredient = new Map()
      for (const id of selectedMealIds) {
        const meal = this.mealById(id)
        if (!meal) continue
        for (const line of this.scaledLines(meal)) {
          if (!byIngredient.has(line.ingredientId)) {
            byIngredient.set(line.ingredientId, [])
          }
          byIngredient.get(line.ingredientId).push({ qty: line.qty, unit: line.unit })
        }
      }
      const rows = []
      for (const [ingredientId, lines] of byIngredient) {
        const ing = this.ingredientById(ingredientId)
        const agg = aggregate(lines)
        rows.push({
          ingredientId,
          name: ing ? ing.name : '(unknown)',
          segments: agg.groups,
          toTaste: agg.toTaste,
          incompatible: agg.incompatible,
        })
      }
      // Stable ordering by ingredient name for a predictable shopping list.
      rows.sort((a, b) => a.name.localeCompare(b.name))
      return rows
    },

    // =====================================================================
    // Cooking & stock deduction (plan 07)
    // =====================================================================

    // Mark a Planned meal Cooked: freeze a snapshot, deduct stock (floored at 0),
    // return shortfalls for a non-blocking notice. One-way.
    markCooked(mealId) {
      const meal = this.mealById(mealId)
      if (!meal || meal.status !== 'Planned') return []
      const recipe = this.recipeById(meal.recipeId)
      const lines = this.scaledLines(meal)

      // Freeze snapshot from the effective lines at cook time (§7.3).
      meal.cookedSnapshot = {
        title: recipe ? recipe.title : '(deleted recipe)',
        servingSize: recipe ? this.effectiveServing(meal, recipe) : null,
        lines: lines.map((l) => ({ ...l })),
      }

      const shortfalls = []
      for (const line of lines) {
        if (line.qty == null || isToTaste(line.unit)) continue // to-taste: skip
        const entry = this.stockByIngredient(line.ingredientId)
        const ing = this.ingredientById(line.ingredientId)
        // No stock entry → current is 0; full amount becomes shortfall.
        const storedUnit = entry ? entry.unit : line.unit
        const currentQty = entry ? entry.qty : 0
        let needed
        try {
          // Convert the needed amount into the stored unit (plan-04 policy).
          needed = convert(line.qty, line.unit, storedUnit)
        } catch {
          needed = null
        }
        if (needed == null) {
          // Incompatible with stored unit — cannot deduct safely; report shortfall.
          shortfalls.push({
            ingredientId: line.ingredientId,
            name: ing ? ing.name : '(unknown)',
            short: line.qty,
            unit: line.unit,
            note: 'unit mismatch with stock',
          })
          continue
        }
        const newQty = Math.max(0, currentQty - needed)
        if (needed > currentQty) {
          shortfalls.push({
            ingredientId: line.ingredientId,
            name: ing ? ing.name : '(unknown)',
            short: needed - currentQty,
            unit: storedUnit,
          })
        }
        if (entry) {
          entry.qty = newQty
        } else if (newQty > 0) {
          // Shouldn't happen (current was 0) but keep stock non-negative.
          this.stock.push({ ingredientId: line.ingredientId, qty: newQty, unit: storedUnit })
        }
      }

      meal.status = 'Cooked'
      this.purgeTrashedRecipes()
      return shortfalls
    },

    // =====================================================================
    // Trashed-recipe purge (plan 09)
    // =====================================================================

    // Remove trashed recipes that no meal plan references. Cooked meals keep their
    // own snapshot, but a meal still referencing the recipe counts as a reference
    // and prevents purge. Deterministic + idempotent.
    purgeTrashedRecipes() {
      const referenced = new Set(this.mealPlans.map((m) => m.recipeId))
      this.recipes = this.recipes.filter(
        (r) => !r.trashed || referenced.has(r.id),
      )
    },
  },
})
