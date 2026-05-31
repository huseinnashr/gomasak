import { emptyState } from './app.js'

export const STORAGE_KEY = 'gomasak.v1'

// Load persisted state into the store. On missing/corrupt data, seed empty state
// so the app never crashes on bad storage.
export function load(store) {
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (!raw) {
    store.replaceState(emptyState())
    return
  }
  try {
    const parsed = JSON.parse(raw)
    // Minimal shape guard; full validation lives in import (plan 08).
    const seed = emptyState()
    store.replaceState({
      version: parsed.version ?? seed.version,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      stock: Array.isArray(parsed.stock) ? parsed.stock : [],
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      mealPlans: Array.isArray(parsed.mealPlans) ? parsed.mealPlans : [],
    })
  } catch (err) {
    console.warn('gomasak: corrupt persisted state, seeding empty.', err)
    store.replaceState(emptyState())
  }
}

function serialize(store) {
  return JSON.stringify({
    version: store.version,
    ingredients: store.ingredients,
    stock: store.stock,
    recipes: store.recipes,
    mealPlans: store.mealPlans,
  })
}

function write(store) {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(store))
  } catch (err) {
    console.warn('gomasak: failed to persist state.', err)
  }
}

// Subscribe to store mutations and persist with a debounce (~300ms) so we don't
// write on every keystroke. Flush on beforeunload to avoid losing the tail.
export function start(store) {
  let timer = null
  store.$subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      write(store)
    }, 300)
  })
  window.addEventListener('beforeunload', () => {
    if (timer) clearTimeout(timer)
    write(store)
  })
}
