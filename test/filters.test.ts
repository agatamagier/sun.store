import { describe, expect, it } from 'vitest'
import type { ProductFilters } from '../shared/types/product'
import { hasActiveFilters, normalizeFilters, serializeFilters } from '../shared/utils/filters'

const DEFAULTS: ProductFilters = {
  category: null,
  manufacturers: [],
  q: '',
  priceMin: null,
  priceMax: null,
  specMin: null,
  specMax: null,
  sort: 'relevance',
  page: 1,
  perPage: 12,
}

describe('normalizeFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(normalizeFilters({})).toEqual(DEFAULTS)
  })

  it('parses valid params', () => {
    expect(normalizeFilters({
      category: 'battery',
      manufacturer: ['AlphaBatt', 'BetaBatt'],
      q: 'panel',
      priceMin: '100',
      priceMax: '900',
      specMin: '5',
      sort: 'price-asc',
      page: '2',
      perPage: '24',
    })).toEqual({
      category: 'battery',
      manufacturers: ['AlphaBatt', 'BetaBatt'],
      q: 'panel',
      priceMin: 100,
      priceMax: 900,
      specMin: 5,
      specMax: null,
      sort: 'price-asc',
      page: 2,
      perPage: 24,
    })
  })

  it('rejects invalid values and falls back to defaults', () => {
    const f = normalizeFilters({ category: 'spaceship', sort: 'random', priceMin: '-5', page: '0' })
    expect(f.category).toBeNull()
    expect(f.sort).toBe('relevance')
    expect(f.priceMin).toBeNull()
    expect(f.page).toBe(1)
  })

  it('accepts comma-separated manufacturers', () => {
    expect(normalizeFilters({ manufacturer: 'AlphaBatt,BetaBatt' }).manufacturers)
      .toEqual(['AlphaBatt', 'BetaBatt'])
  })

  it('clamps perPage to the allowed maximum', () => {
    expect(normalizeFilters({ perPage: '9999' }).perPage).toBe(48)
  })
})

describe('serializeFilters', () => {
  it('omits defaults for a clean URL', () => {
    expect(serializeFilters(DEFAULTS)).toEqual({})
  })

  it('round-trips through normalize', () => {
    const f = normalizeFilters({
      category: 'solar panel',
      manufacturer: ['GammaSun'],
      q: 'bifacial',
      priceMin: '150',
      specMax: '500',
      sort: 'spec-desc',
      page: '3',
      perPage: '24',
    })
    expect(normalizeFilters(serializeFilters(f))).toEqual(f)
  })
})

describe('hasActiveFilters', () => {
  it('is false for defaults', () => {
    expect(hasActiveFilters(DEFAULTS)).toBe(false)
  })

  it('is true when any filter is set', () => {
    expect(hasActiveFilters({ ...DEFAULTS, category: 'battery' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULTS, q: 'panel' })).toBe(true)
  })

  it('ignores sort and pagination', () => {
    expect(hasActiveFilters({ ...DEFAULTS, sort: 'price-asc', page: 3 })).toBe(false)
  })
})
