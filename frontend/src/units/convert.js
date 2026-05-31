// Conversion + aggregation operations. The ONLY place conversion math lives —
// recipe scaling, stock read/write, prep aggregation, and cooking deduction all
// route through here (cross-cutting convention §4).

import {
  FAMILIES,
  TO_TASTE,
  areCompatible,
  factorToBase,
  isCount,
  isKnownUnit,
  isToTaste,
  unitFamily,
} from './units.js'

// Convert qty from one unit to another within the same family.
// Throws on incompatible families / unknown units. Identity for same unit.
// Count members only convert to themselves.
export function convert(qty, fromUnit, toUnit) {
  if (fromUnit === toUnit) return qty
  if (!isKnownUnit(fromUnit) || !isKnownUnit(toUnit)) {
    throw new Error(`Unknown unit: ${fromUnit} → ${toUnit}`)
  }
  if (!areCompatible(fromUnit, toUnit)) {
    throw new Error(`Incompatible units: ${fromUnit} → ${toUnit}`)
  }
  // Both share a convertible family (mass/volume).
  const base = qty * factorToBase(fromUnit)
  return base / factorToBase(toUnit)
}

// qty in `unit` expressed in its family base unit.
export function toBase(qty, unit) {
  if (isToTaste(unit) || isCount(unit)) return qty
  return qty * factorToBase(unit)
}

// qty given in `baseUnit` expressed in `displayUnit` (same family).
export function fromBase(qty, baseUnit, displayUnit) {
  return convert(qty, baseUnit, displayUnit)
}

// Choose a readable display unit for a base quantity within a family.
// Deterministic thresholds: promote to the larger unit at >= 1000 base units.
export function pickDisplayUnit(qtyBase, family) {
  if (family === 'mass') {
    return qtyBase >= 1000
      ? { qty: qtyBase / 1000, unit: 'kg' }
      : { qty: qtyBase, unit: 'g' }
  }
  if (family === 'volume') {
    return qtyBase >= 1000
      ? { qty: qtyBase / 1000, unit: 'l' }
      : { qty: qtyBase, unit: 'ml' }
  }
  // count / toTaste: no promotion; caller passes the member unit through.
  return { qty: qtyBase, unit: null }
}

// Aggregate lines for ONE ingredient: [{ qty, unit }].
// Returns:
//   {
//     groups: [{ family, qtyBase, baseUnit, displayQty, displayUnit }],
//     toTaste: boolean,        // any to-taste line present
//     incompatible: boolean,   // >1 distinct numeric segment for this ingredient
//   }
// - mass/volume: summed in base, one group per family.
// - count: one group per exact member (no merge across members).
// - to-taste: flagged, excluded from numeric groups.
export function aggregate(lines) {
  let toTaste = false
  // Key by "family" for mass/volume; by "count:<member>" for count members.
  const buckets = new Map()

  for (const line of lines) {
    const { qty, unit } = line
    if (isToTaste(unit)) {
      toTaste = true
      continue
    }
    if (!isKnownUnit(unit)) continue // skip unknown units defensively
    if (qty == null) {
      // null qty on a non-to-taste unit is treated as to-taste passthrough.
      toTaste = true
      continue
    }
    const family = unitFamily(unit)
    if (family === 'count') {
      const key = `count:${unit}`
      const prev = buckets.get(key) || { family, member: unit, qtyBase: 0 }
      prev.qtyBase += qty
      buckets.set(key, prev)
    } else {
      const key = family
      const prev = buckets.get(key) || { family, qtyBase: 0 }
      prev.qtyBase += toBase(qty, unit)
      buckets.set(key, prev)
    }
  }

  const groups = []
  for (const bucket of buckets.values()) {
    if (bucket.family === 'count') {
      groups.push({
        family: 'count',
        qtyBase: bucket.qtyBase,
        baseUnit: bucket.member,
        displayQty: bucket.qtyBase,
        displayUnit: bucket.member,
      })
    } else {
      const baseUnit = FAMILIES[bucket.family].base
      const disp = pickDisplayUnit(bucket.qtyBase, bucket.family)
      groups.push({
        family: bucket.family,
        qtyBase: bucket.qtyBase,
        baseUnit,
        displayQty: disp.qty,
        displayUnit: disp.unit,
      })
    }
  }

  return {
    groups,
    toTaste,
    incompatible: groups.length > 1,
  }
}

export { TO_TASTE, areCompatible, isToTaste, unitFamily }
