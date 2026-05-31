import { describe, it, expect } from 'vitest'
import {
  convert,
  toBase,
  fromBase,
  pickDisplayUnit,
  aggregate,
} from '../convert.js'
import { areCompatible, unitFamily, isToTaste, listUnits } from '../units.js'

describe('convert', () => {
  it('mass round-trips g↔kg', () => {
    expect(convert(1000, 'g', 'kg')).toBe(1)
    expect(convert(2, 'kg', 'g')).toBe(2000)
    expect(convert(500, 'g', 'g')).toBe(500)
  })

  it('volume round-trips ml↔l', () => {
    expect(convert(1000, 'ml', 'l')).toBe(1)
    expect(convert(1.5, 'l', 'ml')).toBe(1500)
  })

  it('spoon/cup → ml', () => {
    expect(convert(1, 'sdt', 'ml')).toBe(5)
    expect(convert(1, 'sdm', 'ml')).toBe(15)
    expect(convert(1, 'gelas', 'ml')).toBe(240)
  })

  it('throws on incompatible families', () => {
    expect(() => convert(1, 'g', 'ml')).toThrow()
  })

  it('count members only convert to themselves', () => {
    expect(convert(3, 'butir', 'butir')).toBe(3)
    expect(() => convert(3, 'butir', 'siung')).toThrow()
  })

  it('throws on unknown units', () => {
    expect(() => convert(1, 'g', 'furlong')).toThrow()
  })
})

describe('toBase / fromBase', () => {
  it('converts to and from base', () => {
    expect(toBase(2, 'kg')).toBe(2000)
    expect(toBase(1, 'l')).toBe(1000)
    expect(fromBase(2000, 'g', 'kg')).toBe(2)
  })

  it('count/to-taste pass through toBase', () => {
    expect(toBase(5, 'butir')).toBe(5)
    expect(toBase(1, 'secukupnya')).toBe(1)
  })
})

describe('pickDisplayUnit', () => {
  it('keeps g below 1000, promotes to kg at 1000', () => {
    expect(pickDisplayUnit(999, 'mass')).toEqual({ qty: 999, unit: 'g' })
    expect(pickDisplayUnit(1000, 'mass')).toEqual({ qty: 1, unit: 'kg' })
    expect(pickDisplayUnit(1500, 'mass')).toEqual({ qty: 1.5, unit: 'kg' })
  })

  it('keeps ml below 1000, promotes to l at 1000', () => {
    expect(pickDisplayUnit(750, 'volume')).toEqual({ qty: 750, unit: 'ml' })
    expect(pickDisplayUnit(2000, 'volume')).toEqual({ qty: 2, unit: 'l' })
  })
})

describe('aggregate', () => {
  it('sums mixed mass lines (500 g + 1 kg = 1.5 kg)', () => {
    const r = aggregate([
      { qty: 500, unit: 'g' },
      { qty: 1, unit: 'kg' },
    ])
    expect(r.groups).toHaveLength(1)
    expect(r.incompatible).toBe(false)
    expect(r.groups[0]).toMatchObject({
      family: 'mass',
      qtyBase: 1500,
      displayQty: 1.5,
      displayUnit: 'kg',
    })
  })

  it('sums volume mixing sdm + ml + l', () => {
    const r = aggregate([
      { qty: 2, unit: 'sdm' }, // 30 ml
      { qty: 100, unit: 'ml' }, // 100 ml
      { qty: 1, unit: 'l' }, // 1000 ml
    ])
    expect(r.groups[0].qtyBase).toBe(1130)
    expect(r.groups[0].displayUnit).toBe('l')
    expect(r.groups[0].displayQty).toBeCloseTo(1.13)
  })

  it('count: 2 butir + 3 butir = 5 butir', () => {
    const r = aggregate([
      { qty: 2, unit: 'butir' },
      { qty: 3, unit: 'butir' },
    ])
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0]).toMatchObject({ displayQty: 5, displayUnit: 'butir' })
  })

  it('count: butir + siung kept separate (no merge)', () => {
    const r = aggregate([
      { qty: 2, unit: 'butir' },
      { qty: 1, unit: 'siung' },
    ])
    expect(r.groups).toHaveLength(2)
    expect(r.incompatible).toBe(true)
  })

  it('incompatible same-ingredient: g + ml → two segments + flag', () => {
    const r = aggregate([
      { qty: 100, unit: 'g' },
      { qty: 200, unit: 'ml' },
    ])
    expect(r.groups).toHaveLength(2)
    expect(r.incompatible).toBe(true)
  })

  it('to-taste excluded from totals, surfaced separately', () => {
    const r = aggregate([
      { qty: 100, unit: 'g' },
      { qty: null, unit: 'secukupnya' },
    ])
    expect(r.toTaste).toBe(true)
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].displayUnit).toBe('g')
  })

  it('null qty on non-to-taste unit treated as to-taste passthrough', () => {
    const r = aggregate([{ qty: null, unit: 'g' }])
    expect(r.toTaste).toBe(true)
    expect(r.groups).toHaveLength(0)
  })

  it('unknown unit is skipped', () => {
    const r = aggregate([{ qty: 5, unit: 'furlong' }])
    expect(r.groups).toHaveLength(0)
  })

  it('qty 0 aggregates to a zero group', () => {
    const r = aggregate([{ qty: 0, unit: 'g' }])
    expect(r.groups[0].qtyBase).toBe(0)
  })
})

describe('units helpers', () => {
  it('areCompatible respects families and count members', () => {
    expect(areCompatible('g', 'kg')).toBe(true)
    expect(areCompatible('g', 'ml')).toBe(false)
    expect(areCompatible('butir', 'butir')).toBe(true)
    expect(areCompatible('butir', 'siung')).toBe(false)
    expect(areCompatible('secukupnya', 'g')).toBe(false)
  })

  it('unitFamily + isToTaste', () => {
    expect(unitFamily('kg')).toBe('mass')
    expect(unitFamily('l')).toBe('volume')
    expect(unitFamily('butir')).toBe('count')
    expect(isToTaste('secukupnya')).toBe(true)
  })

  it('listUnits groups by family', () => {
    const groups = listUnits()
    const mass = groups.find((g) => g.family === 'mass')
    expect(mass.units).toContain('g')
    expect(mass.units).toContain('kg')
  })
})
