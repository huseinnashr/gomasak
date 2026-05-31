import { SCHEMA_VERSION, emptyState } from './app.js'

// Export the whole AppState to a downloadable dated JSON file (US-EX.1).
export function exportState(store, dateISO) {
  const data = {
    version: store.version,
    ingredients: store.ingredients,
    stock: store.stock,
    recipes: store.recipes,
    mealPlans: store.mealPlans,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gomasak-backup-${dateISO}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Validate a parsed import object against the current schema shape + version.
// Returns { ok: true, state } or { ok: false, error }. Never throws.
export function validateImport(obj) {
  if (obj == null || typeof obj !== 'object') {
    return { ok: false, error: 'File is not a valid object.' }
  }
  const required = ['version', 'ingredients', 'stock', 'recipes', 'mealPlans']
  for (const key of required) {
    if (!(key in obj)) {
      return { ok: false, error: `Missing required field: "${key}".` }
    }
  }
  const arrays = ['ingredients', 'stock', 'recipes', 'mealPlans']
  for (const key of arrays) {
    if (!Array.isArray(obj[key])) {
      return { ok: false, error: `Field "${key}" must be an array.` }
    }
  }
  if (obj.version !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Incompatible backup version ${obj.version} (expected ${SCHEMA_VERSION}).`,
    }
  }
  // Normalize against empty state to drop any unexpected keys.
  const seed = emptyState()
  return {
    ok: true,
    state: {
      version: SCHEMA_VERSION,
      ingredients: obj.ingredients,
      stock: obj.stock,
      recipes: obj.recipes,
      mealPlans: obj.mealPlans,
    },
    _seed: seed,
  }
}

// Parse raw text, validate, and (if valid) replace store state. Returns the
// validation result so the caller can surface errors without losing data.
export function importState(store, rawText) {
  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  const result = validateImport(parsed)
  if (!result.ok) return result
  store.replaceState(result.state)
  return { ok: true }
}
