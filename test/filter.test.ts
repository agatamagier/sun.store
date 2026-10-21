import { describe, expect, it } from 'vitest'
import type { Category, Product, ProductFilters } from '../shared/types/product'
import { normalizeFilters } from '../shared/utils/filters'
import { deriveProductSpec } from '../server/utils/spec'
import { queryProducts } from '../server/utils/filter'

function make(
  id: string,
  name: string,
  manufacturer: string,
  price: number,
  category: Category,
  description: string,
): Product {
  return {
    id,
    name,
    manufacturer,
    price,
    description,
    category,
    ...deriveProductSpec(category, name, description),
  }
}

const PRODUCTS: Product[] = [
  make('1', 'Alpha Cell 10', 'AlphaBatt', 1000, 'battery', 'A 10kWh LiFePO4 battery.'),
  make('2', 'Alpha Cell 5', 'AlphaBatt', 500, 'battery', 'A 5kWh LiFePO4 battery.'),
  make('3', 'Beta Store 15', 'BetaBatt', 1500, 'battery', 'A 15kWh NMC battery.'),
  make('4', 'Gamma Panel 400', 'GammaSun', 200, 'solar panel', 'A 400W monocrystalline panel.'),
  make('5', 'Gamma Panel 500', 'GammaSun', 300, 'solar panel', 'A 500W bifacial panel.'),
  make('6', 'Delta MC4 Pair', 'DeltaConn', 10, 'connector', 'An IP67 15A connector pair.'),
]

function filters(overrides: Partial<ProductFilters> = {}): ProductFilters {
  return { ...normalizeFilters({}), ...overrides }
}

const names = (r: { items: Product[] }) => r.items.map(p => p.name)

describe('queryProducts — filtering', () => {
  it('returns everything by default', () => {
    const r = queryProducts(PRODUCTS, filters())
    expect(r.total).toBe(6)
    expect(r.filterOptions.spec).toBeNull() // no category selected
    expect(r.filterOptions.categories).toEqual([
      { value: 'battery', count: 3 },
      { value: 'solar panel', count: 2 },
      { value: 'connector', count: 1 },
    ])
  })

  it('filters by category and exposes the right spec range', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery' }))
    expect(r.total).toBe(3)
    expect(r.filterOptions.spec).toEqual({
      metric: 'capacity',
      unit: 'kWh',
      label: 'Capacity',
      min: 5,
      max: 15,
    })
    expect(r.filterOptions.manufacturers).toEqual([
      { value: 'AlphaBatt', count: 2 },
      { value: 'BetaBatt', count: 1 },
    ])
  })

  it('filters by manufacturer', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery', manufacturers: ['AlphaBatt'] }))
    expect(names(r).sort()).toEqual(['Alpha Cell 10', 'Alpha Cell 5'])
  })

  it('filters by price range', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery', priceMin: 600 }))
    expect(names(r).sort()).toEqual(['Alpha Cell 10', 'Beta Store 15'])
  })

  it('filters by spec range (capacity)', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery', specMin: 12 }))
    expect(names(r)).toEqual(['Beta Store 15'])
  })

  it('ignores spec bounds for categories without a spec metric', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'connector', specMin: 5, specMax: 8 }))
    expect(r.total).toBe(1)
    expect(r.filterOptions.spec).toBeNull()
  })

  it('searches across name, manufacturer and description', () => {
    const r = queryProducts(PRODUCTS, filters({ q: 'GammaSun' }))
    expect(r.total).toBe(2)
    expect(r.filterOptions.categories).toEqual([
      { value: 'battery', count: 0 },
      { value: 'solar panel', count: 2 },
      { value: 'connector', count: 0 },
    ])
  })
})

describe('queryProducts — sorting', () => {
  it('sorts by price ascending', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery', sort: 'price-asc' }))
    expect(names(r)).toEqual(['Alpha Cell 5', 'Alpha Cell 10', 'Beta Store 15'])
  })

  it('sorts by spec descending', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'battery', sort: 'spec-desc' }))
    expect(names(r)).toEqual(['Beta Store 15', 'Alpha Cell 10', 'Alpha Cell 5'])
  })

  it('sorts by spec ascending (solar panels, power)', () => {
    const r = queryProducts(PRODUCTS, filters({ category: 'solar panel', sort: 'spec-asc' }))
    expect(names(r)).toEqual(['Gamma Panel 400', 'Gamma Panel 500'])
  })
})

describe('queryProducts — pagination', () => {
  it('paginates and reports page metadata', () => {
    const r = queryProducts(PRODUCTS, filters({ perPage: 2, page: 2 }))
    expect(r.items).toHaveLength(2)
    expect(r.page).toBe(2)
    expect(r.pageCount).toBe(3)
    expect(r.total).toBe(6)
  })

  it('clamps an out-of-range page to the last page', () => {
    const r = queryProducts(PRODUCTS, filters({ perPage: 2, page: 99 }))
    expect(r.page).toBe(3)
    expect(r.items).toHaveLength(2)
  })
})
