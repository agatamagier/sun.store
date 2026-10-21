import {
  CATEGORIES,
  type Category,
  type FilterOptions,
  type Product,
  type ProductFilters,
  type ProductsResponse,
  type SortOption,
  type SpecMetric,
} from '../../shared/types/product'
import { specLabel, specUnit } from './spec'

/** The spec metric a category is filtered/sorted by, if any. */
export function categorySpecMetric(category: Category | null): SpecMetric | null {
  if (category === 'battery') return 'capacity'
  if (category === 'solar panel') return 'power'
  return null
}

export function matchesSearch(product: Product, searchTerm: string): boolean {
  if (!searchTerm) return true
  const normalized = searchTerm.trim().toLowerCase()
  if (!normalized) return true
  return (
    product.name.toLowerCase().includes(normalized)
    || product.manufacturer.toLowerCase().includes(normalized)
    || product.description.toLowerCase().includes(normalized)
  )
}

/** Relevance score for a search term: name beats manufacturer beats description. */
function searchScore(product: Product, searchTerm: string): number {
  if (!searchTerm) return 0
  const name = product.name.toLowerCase()
  let score = 0
  if (name.includes(searchTerm)) score += name.startsWith(searchTerm) ? 5 : 3
  if (product.manufacturer.toLowerCase().includes(searchTerm)) score += 2
  if (product.description.toLowerCase().includes(searchTerm)) score += 1
  return score
}

function inRange(value: number | null, min: number | null, max: number | null): boolean {
  if (value === null) {
    // A product with no spec value is excluded only when a spec bound is active.
    return min === null && max === null
  }
  if (min !== null && value < min) return false
  if (max !== null && value > max) return false
  return true
}

function compare(a: Product, b: Product, sort: SortOption, searchTerm: string): number {
  switch (sort) {
    case 'price-asc':
      return a.price - b.price || a.name.localeCompare(b.name)
    case 'price-desc':
      return b.price - a.price || a.name.localeCompare(b.name)
    case 'spec-asc':
    case 'spec-desc': {
      // Products without a spec value always sort last, regardless of direction.
      const aSpec = a.specValue
      const bSpec = b.specValue
      if (aSpec === null && bSpec === null) return a.name.localeCompare(b.name)
      if (aSpec === null) return 1
      if (bSpec === null) return -1
      return (sort === 'spec-asc' ? aSpec - bSpec : bSpec - aSpec) || a.name.localeCompare(b.name)
    }
    case 'name-asc':
      return a.name.localeCompare(b.name)
    case 'relevance':
    default: {
      if (searchTerm) {
        const scoreDiff = searchScore(b, searchTerm) - searchScore(a, searchTerm)
        if (scoreDiff !== 0) return scoreDiff
      }
      // Stable default: group by category order, then by name.
      const categoryOrder = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
      return categoryOrder || a.name.localeCompare(b.name)
    }
  }
}

function countBy<T>(items: Product[], pick: (product: Product) => T): Map<T, number> {
  const counts = new Map<T, number>()
  for (const item of items) {
    const key = pick(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Run the full query pipeline against the product set.
 *
 * Filter options are computed with classic "exclude the option's own dimension"
 * logic so the UI controls stay useful:
 *   - category counts ignore the selected category (lets you switch)
 *   - manufacturer counts / price & spec ranges reflect category + search only
 */
export function queryProducts(all: Product[], filters: ProductFilters): ProductsResponse {
  const searchTerm = filters.q.trim().toLowerCase()

  // Base set for the manufacturer / price / spec options: everything constrained
  // by category + search, but NOT by manufacturer / price / spec themselves.
  const base = all.filter(
    product =>
      (filters.category === null || product.category === filters.category)
      && matchesSearch(product, searchTerm),
  )

  // Category options: ignore the category selection, honour search only.
  const categorySearched = all.filter(product => matchesSearch(product, searchTerm))
  const categoryCounts = countBy(categorySearched, product => product.category)
  const categories = CATEGORIES.map(value => ({ value, count: categoryCounts.get(value) ?? 0 }))

  // Manufacturer options.
  const manufacturerCounts = countBy(base, product => product.manufacturer)
  const manufacturers = [...manufacturerCounts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))

  // Price range.
  const prices = base.map(product => product.price)
  const price = prices.length
    ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
    : { min: 0, max: 0 }

  // Spec range — only when the active category exposes a spec metric.
  const metric = categorySpecMetric(filters.category)
  let spec: FilterOptions['spec'] = null
  if (metric) {
    const specValues = base
      .map(product => product.specValue)
      .filter((value): value is number => value !== null)
    if (specValues.length) {
      spec = {
        metric,
        unit: specUnit(metric),
        label: specLabel(metric),
        min: Math.floor(Math.min(...specValues)),
        max: Math.ceil(Math.max(...specValues)),
      }
    }
  }

  // Apply the remaining filters to the base set.
  const manufacturerSet = new Set(filters.manufacturers)
  const filtered = base.filter((product) => {
    if (manufacturerSet.size > 0 && !manufacturerSet.has(product.manufacturer)) return false
    if (!inRange(product.price, filters.priceMin, filters.priceMax)) return false
    // Spec bounds only apply when the category has a spec metric.
    if (metric && !inRange(product.specValue, filters.specMin, filters.specMax)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => compare(a, b, filters.sort, searchTerm))

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / filters.perPage))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const start = (page - 1) * filters.perPage
  const items = sorted.slice(start, start + filters.perPage)

  return {
    items,
    total,
    page,
    perPage: filters.perPage,
    pageCount,
    filterOptions: { categories, manufacturers, price, spec },
    filters: { ...filters, page },
  }
}
