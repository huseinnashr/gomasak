// Unit families and conversion factors. This is the single source of unit
// metadata; convert.js builds all math on top of it. Pure data + tiny helpers,
// no framework dependencies.
//
// Approximate spoon/cup factors (stories §5) are "good enough" — documented as
// constants so they're easy to tweak later.

export const TO_TASTE = 'secukupnya'

// Each family: { base, members: { unit: factorToBase } }.
// For Count, members are non-convertible: each is its own unit (factor 1) and
// conversion is only allowed unit→same-unit (enforced in convert.js).
export const FAMILIES = {
  mass: {
    base: 'g',
    members: {
      g: 1,
      kg: 1000,
    },
  },
  volume: {
    base: 'ml',
    members: {
      ml: 1,
      l: 1000,
      sdt: 5, // teaspoon  ≈ 5 ml
      sdm: 15, // tablespoon ≈ 15 ml
      gelas: 240, // cup       ≈ 240 ml
    },
  },
  count: {
    base: null, // no shared base — members don't cross-convert
    members: {
      'buah/pcs': 1,
      butir: 1,
      siung: 1,
      lembar: 1,
      potong: 1,
      bungkus: 1,
      kaleng: 1,
      sachet: 1,
      ikat: 1,
    },
  },
  toTaste: {
    base: null,
    members: {
      [TO_TASTE]: 1, // display-only; excluded from aggregation/deduction
    },
  },
}

// Build a reverse lookup: unit → family key.
const UNIT_TO_FAMILY = {}
for (const [familyKey, family] of Object.entries(FAMILIES)) {
  for (const unit of Object.keys(family.members)) {
    UNIT_TO_FAMILY[unit] = familyKey
  }
}

// Return the family key for a unit, or null if unknown.
export function unitFamily(unit) {
  return UNIT_TO_FAMILY[unit] || null
}

export function isToTaste(unit) {
  return unit === TO_TASTE
}

// Whether a unit is a known unit at all.
export function isKnownUnit(unit) {
  return unit in UNIT_TO_FAMILY
}

// Whether the count family member should never merge with others.
export function isCount(unit) {
  return unitFamily(unit) === 'count'
}

// Two units are compatible if they share a family. Count members are only
// compatible with themselves (no cross-member conversion). To-taste is never
// compatible (it's display-only).
export function areCompatible(a, b) {
  if (isToTaste(a) || isToTaste(b)) return false
  const fa = unitFamily(a)
  const fb = unitFamily(b)
  if (!fa || !fb || fa !== fb) return false
  if (fa === 'count') return a === b
  return true
}

// All selectable units grouped by family, for dropdowns.
export function listUnits() {
  return Object.entries(FAMILIES).map(([familyKey, family]) => ({
    family: familyKey,
    units: Object.keys(family.members),
  }))
}

// Factor that converts `unit` into its family base. For count/to-taste returns 1.
export function factorToBase(unit) {
  const fam = unitFamily(unit)
  if (!fam) return null
  return FAMILIES[fam].members[unit]
}
