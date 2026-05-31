import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore, SCHEMA_VERSION } from '../app.js'
import { load, STORAGE_KEY } from '../persistence.js'
import { validateImport, importState } from '../transfer.js'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('persistence load (plan 01 smoke)', () => {
  it('seeds empty state when localStorage is empty', () => {
    const s = useAppStore()
    load(s)
    expect(s.version).toBe(SCHEMA_VERSION)
    expect(s.recipes).toEqual([])
    expect(s.ingredients).toEqual([])
    expect(s.stock).toEqual([])
    expect(s.mealPlans).toEqual([])
  })

  it('boots cleanly to empty state on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json')
    const s = useAppStore()
    load(s)
    expect(s.recipes).toEqual([])
  })

  it('loads valid persisted state', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: SCHEMA_VERSION,
        ingredients: [{ id: '1', name: 'Rice' }],
        stock: [],
        recipes: [],
        mealPlans: [],
      }),
    )
    const s = useAppStore()
    load(s)
    expect(s.ingredients).toHaveLength(1)
  })
})

describe('import validation (plan 08)', () => {
  it('accepts a well-formed current-version blob', () => {
    const r = validateImport({
      version: SCHEMA_VERSION,
      ingredients: [],
      stock: [],
      recipes: [],
      mealPlans: [],
    })
    expect(r.ok).toBe(true)
  })

  it('rejects missing keys, wrong types, mismatched version', () => {
    expect(validateImport({ version: SCHEMA_VERSION }).ok).toBe(false)
    expect(
      validateImport({
        version: SCHEMA_VERSION,
        ingredients: 'nope',
        stock: [],
        recipes: [],
        mealPlans: [],
      }).ok,
    ).toBe(false)
    expect(
      validateImport({
        version: 999,
        ingredients: [],
        stock: [],
        recipes: [],
        mealPlans: [],
      }).ok,
    ).toBe(false)
  })

  it('importState replaces state on valid, leaves state on invalid', () => {
    const s = useAppStore()
    s.resolveIngredient('Existing')
    const bad = importState(s, '{bad json')
    expect(bad.ok).toBe(false)
    expect(s.ingredients).toHaveLength(1) // untouched

    const good = importState(
      s,
      JSON.stringify({
        version: SCHEMA_VERSION,
        ingredients: [{ id: 'x', name: 'New' }],
        stock: [],
        recipes: [],
        mealPlans: [],
      }),
    )
    expect(good.ok).toBe(true)
    expect(s.ingredients).toHaveLength(1)
    expect(s.ingredients[0].name).toBe('New') // replaced, not merged
  })
})
