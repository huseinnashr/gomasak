import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app.js'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('resolveIngredient (catalog)', () => {
  it('reuses existing ingredient case-insensitively', () => {
    const s = useAppStore()
    const a = s.resolveIngredient('Garlic')
    const b = s.resolveIngredient('  garlic ')
    expect(a).toBe(b)
    expect(s.ingredients).toHaveLength(1)
  })

  it('creates a new ingredient for a new name', () => {
    const s = useAppStore()
    s.resolveIngredient('Garlic')
    s.resolveIngredient('Onion')
    expect(s.ingredients).toHaveLength(2)
  })
})

describe('recipes + trash', () => {
  it('creates a recipe and resolves ingredient lines', () => {
    const s = useAppStore()
    const id = s.createRecipe({
      title: 'Fried Rice',
      servingSize: 2,
      steps: 'cook',
      ingredients: [
        { name: 'Rice', qty: 200, unit: 'g' },
        { name: 'Salt', qty: null, unit: 'secukupnya' },
      ],
    })
    const r = s.recipeById(id)
    expect(r.ingredients).toHaveLength(2)
    expect(r.ingredients[1].qty).toBeNull() // to-taste
    expect(s.ingredients).toHaveLength(2)
  })

  it('trash hides from activeRecipes but keeps record when referenced', () => {
    const s = useAppStore()
    const id = s.createRecipe({
      title: 'X',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'A', qty: 1, unit: 'g' }],
    })
    s.planMeal({ recipeId: id, date: '2999-01-01', mealType: 'lunch' })
    s.trashRecipe(id)
    expect(s.activeRecipes).toHaveLength(0)
    // Still referenced by a meal → retained.
    expect(s.recipeById(id)).not.toBeNull()
  })
})

describe('stock', () => {
  it('setStock upserts and converts within family on overwrite', () => {
    const s = useAppStore()
    const ing = s.resolveIngredient('Flour')
    s.setStock(ing, 500, 'g')
    expect(s.stockByIngredient(ing)).toMatchObject({ qty: 500, unit: 'g' })
    s.setStock(ing, 1, 'kg') // compatible family
    expect(s.stockByIngredient(ing)).toMatchObject({ qty: 1, unit: 'kg' })
  })

  it('setStock rejects cross-family unit and negative qty', () => {
    const s = useAppStore()
    const ing = s.resolveIngredient('Milk')
    s.setStock(ing, 1, 'l')
    expect(() => s.setStock(ing, 5, 'g')).toThrow()
    expect(() => s.setStock(ing, -1, 'l')).toThrow()
  })

  it('deleteStock removes only the stock entry, not the ingredient', () => {
    const s = useAppStore()
    const ing = s.resolveIngredient('Sugar')
    s.setStock(ing, 100, 'g')
    s.deleteStock(ing)
    expect(s.stockByIngredient(ing)).toBeNull()
    expect(s.ingredientById(ing)).not.toBeNull()
  })

  it('listStockRows returns zero rows for ingredients without stock', () => {
    const s = useAppStore()
    s.resolveIngredient('Pepper')
    const rows = s.listStockRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ stocked: false, qty: 0 })
  })
})

describe('meal planning', () => {
  function seedRecipe(s) {
    return s.createRecipe({
      title: 'Soup',
      servingSize: 2,
      steps: '',
      ingredients: [
        { name: 'Water', qty: 500, unit: 'ml' },
        { name: 'Salt', qty: null, unit: 'secukupnya' },
      ],
    })
  }

  it('scaledLines scales by override and passes to-taste through', () => {
    const s = useAppStore()
    const rid = seedRecipe(s)
    const mid = s.planMeal({
      recipeId: rid,
      date: '2999-01-01',
      mealType: 'dinner',
      servingSizeOverride: 4, // 2x
    })
    const lines = s.scaledLines(s.mealById(mid))
    expect(lines[0]).toMatchObject({ qty: 1000, unit: 'ml' })
    expect(lines[1].qty).toBeNull()
  })

  it('reconcilePastMeals flips only past Planned, idempotent', () => {
    const s = useAppStore()
    const rid = seedRecipe(s)
    const past = s.planMeal({ recipeId: rid, date: '2000-01-01', mealType: 'lunch' })
    const future = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    s.reconcilePastMeals()
    expect(s.mealById(past).status).toBe('NotCooked')
    expect(s.mealById(future).status).toBe('Planned')
    s.reconcilePastMeals() // idempotent
    expect(s.mealById(past).status).toBe('NotCooked')
  })

  it('updateMeal refuses edits when status is not Planned', () => {
    const s = useAppStore()
    const rid = seedRecipe(s)
    const mid = s.planMeal({ recipeId: rid, date: '2000-01-01', mealType: 'lunch' })
    s.reconcilePastMeals() // → NotCooked
    expect(() => s.updateMeal(mid, { mealType: 'dinner' })).toThrow()
  })
})

describe('computePrep', () => {
  it('sums across meals with overrides and converts units', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Bread',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Flour', qty: 500, unit: 'g' }],
    })
    const m1 = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    const m2 = s.planMeal({
      recipeId: rid,
      date: '2999-01-02',
      mealType: 'lunch',
      servingSizeOverride: 2,
    })
    const rows = s.computePrep([m1, m2]) // 500g + 1000g = 1.5kg
    expect(rows).toHaveLength(1)
    expect(rows[0].segments[0]).toMatchObject({ displayQty: 1.5, displayUnit: 'kg' })
  })
})

describe('markCooked + deduction', () => {
  it('deducts with conversion and floors at zero', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Stew',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Beef', qty: 500, unit: 'g' }],
    })
    const beef = s.recipeById(rid).ingredients[0].ingredientId
    s.setStock(beef, 200, 'g') // less than needed
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'dinner' })
    const shortfalls = s.markCooked(mid)
    expect(s.stockByIngredient(beef).qty).toBe(0) // floored
    expect(shortfalls).toHaveLength(1)
    expect(shortfalls[0]).toMatchObject({ short: 300, unit: 'g' })
    expect(s.mealById(mid).status).toBe('Cooked')
  })

  it('deducts across units (recipe kg, stock g)', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Cake',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Sugar', qty: 1, unit: 'kg' }],
    })
    const sugar = s.recipeById(rid).ingredients[0].ingredientId
    s.setStock(sugar, 1500, 'g')
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'dinner' })
    s.markCooked(mid)
    expect(s.stockByIngredient(sugar).qty).toBe(500) // 1500 - 1000
  })

  it('freezes a snapshot unaffected by later recipe edits', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Pasta',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Noodles', qty: 100, unit: 'g' }],
    })
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    s.markCooked(mid)
    s.updateRecipe(rid, {
      title: 'Pasta Deluxe',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Noodles', qty: 999, unit: 'g' }],
    })
    const snap = s.mealById(mid).cookedSnapshot
    expect(snap.title).toBe('Pasta')
    expect(snap.lines[0].qty).toBe(100)
  })

  it('to-taste lines are never deducted; markCooked on Cooked is a no-op', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Egg',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'Salt', qty: null, unit: 'secukupnya' }],
    })
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    const first = s.markCooked(mid)
    expect(first).toHaveLength(0)
    const second = s.markCooked(mid) // already Cooked
    expect(second).toHaveLength(0)
  })
})

describe('purgeTrashedRecipes', () => {
  it('removes trashed + unreferenced recipe', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Tmp',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'A', qty: 1, unit: 'g' }],
    })
    s.trashRecipe(rid) // no meals → purged immediately
    expect(s.recipeById(rid)).toBeNull()
  })

  it('retains trashed recipe until its last meal is removed', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Tmp',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'A', qty: 1, unit: 'g' }],
    })
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    s.trashRecipe(rid)
    expect(s.recipeById(rid)).not.toBeNull() // retained
    s.deleteMeal(mid)
    expect(s.recipeById(rid)).toBeNull() // now purged
  })

  it('cooked meal keeps a trashed recipe alive but renders from snapshot', () => {
    const s = useAppStore()
    const rid = s.createRecipe({
      title: 'Keep',
      servingSize: 1,
      steps: '',
      ingredients: [{ name: 'A', qty: 1, unit: 'g' }],
    })
    const mid = s.planMeal({ recipeId: rid, date: '2999-01-01', mealType: 'lunch' })
    s.markCooked(mid)
    s.trashRecipe(rid)
    expect(s.recipeById(rid)).not.toBeNull()
    expect(s.scaledLines(s.mealById(mid))[0].qty).toBe(1) // from snapshot
  })
})
