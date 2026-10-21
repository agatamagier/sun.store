// Shared domain types, auto-imported in both the Nuxt app and the Nitro server.

export const CATEGORIES = ['battery', 'solar panel', 'connector'] as const
export type Category = (typeof CATEGORIES)[number]

/**
 * The spec metric exposed by a category:
 * - `battery` is rated by storage capacity (kWh)
 * - `solar panel` is rated by power output (W)
 * - `connector` has neither (rated by current/voltage/AWG instead)
 */
export type SpecMetric = 'capacity' | 'power'

export interface Product {
  id: string
  name: string
  manufacturer: string
  price: number
  description: string
  category: Category
  /** Storage capacity in kWh (batteries only), else null. */
  capacityKwh: number | null
  /** Power output in W (solar panels only), else null. */
  powerW: number | null
  /** Which spec metric this product is rated by, if any. */
  specMetric: SpecMetric | null
  /** Unified numeric spec value (kWh or W depending on `specMetric`), for per-category filter/sort. */
  specValue: number | null
}

export const SORT_OPTIONS = [
  'relevance',
  'price-asc',
  'price-desc',
  'spec-asc',
  'spec-desc',
  'name-asc',
] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const DEFAULT_SORT: SortOption = 'relevance'
export const DEFAULT_PER_PAGE = 12

/** Normalized, server-validated filter state. Mirrors the URL query. */
export interface ProductFilters {
  category: Category | null
  manufacturers: string[]
  q: string
  priceMin: number | null
  priceMax: number | null
  specMin: number | null
  specMax: number | null
  sort: SortOption
  page: number
  perPage: number
}

/** A selectable filter option together with how many products match it. */
export interface OptionCount<T> {
  value: T
  count: number
}

/** The available numeric range for the capacity/power filter. */
export interface SpecRange {
  metric: SpecMetric
  unit: 'kWh' | 'W'
  label: string
  min: number
  max: number
}

/** The options available to populate the filter controls, derived from the data. */
export interface FilterOptions {
  categories: OptionCount<Category>[]
  manufacturers: OptionCount<string>[]
  price: { min: number; max: number }
  /** Present only when the active category exposes a spec metric. */
  spec: SpecRange | null
}

export interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  perPage: number
  pageCount: number
  filterOptions: FilterOptions
  filters: ProductFilters
}
