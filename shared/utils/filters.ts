import {
  CATEGORIES,
  type Category,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  type ProductFilters,
  SORT_OPTIONS,
  type SortOption,
} from '../types/product'

export const MAX_PER_PAGE = 48

/** A URL query param: a string, a repeated array, or absent. */
export type RawParam = string | null | undefined | (string | null)[]
export type RawQuery = Record<string, RawParam>

function toSingle(value: RawParam): string {
  if (Array.isArray(value)) return value[0] == null ? '' : String(value[0])
  return value == null ? '' : String(value)
}

function toStringArray(value: RawParam): string[] {
  const parts = Array.isArray(value) ? value : value == null ? [] : [value]
  // Accept repeated params (?manufacturer=a&manufacturer=b) and comma lists.
  return parts
    .flatMap(part => (part == null ? [] : String(part).split(',')))
    .map(entry => entry.trim())
    .filter(Boolean)
}

function toNonNegativeNumberOrNull(value: RawParam): number | null {
  const text = toSingle(value).trim()
  if (text === '') return null
  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function toPositiveInt(value: RawParam, fallback: number): number {
  const parsed = toNonNegativeNumberOrNull(value)
  if (parsed === null) return fallback
  return Math.max(1, Math.trunc(parsed))
}

/**
 * Pure, dependency-free normalization of raw URL query params into typed,
 * defaulted filters. Shared by the Nitro endpoint and the client composable so
 * both sides agree on what a URL means. Never throws.
 */
export function normalizeFilters(raw: RawQuery): ProductFilters {
  const categoryRaw = toSingle(raw.category).trim()
  const category: Category | null = (CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as Category)
    : null

  const sortRaw = toSingle(raw.sort).trim()
  const sort: SortOption = (SORT_OPTIONS as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortOption)
    : DEFAULT_SORT

  return {
    category,
    manufacturers: toStringArray(raw.manufacturer),
    q: toSingle(raw.q).slice(0, 200),
    priceMin: toNonNegativeNumberOrNull(raw.priceMin),
    priceMax: toNonNegativeNumberOrNull(raw.priceMax),
    specMin: toNonNegativeNumberOrNull(raw.specMin),
    specMax: toNonNegativeNumberOrNull(raw.specMax),
    sort,
    page: toPositiveInt(raw.page, 1),
    perPage: Math.min(MAX_PER_PAGE, toPositiveInt(raw.perPage, DEFAULT_PER_PAGE)),
  }
}

/**
 * Serialize filters back to a minimal URL query: defaults and empty values are
 * omitted so links stay clean and canonical (good for SEO and shareability).
 */
export function serializeFilters(filters: ProductFilters): Record<string, string | string[]> {
  const q: Record<string, string | string[]> = {}
  if (filters.category) q.category = filters.category
  if (filters.manufacturers.length) q.manufacturer = [...filters.manufacturers]
  if (filters.q.trim()) q.q = filters.q.trim()
  if (filters.priceMin !== null) q.priceMin = String(filters.priceMin)
  if (filters.priceMax !== null) q.priceMax = String(filters.priceMax)
  if (filters.specMin !== null) q.specMin = String(filters.specMin)
  if (filters.specMax !== null) q.specMax = String(filters.specMax)
  if (filters.sort !== DEFAULT_SORT) q.sort = filters.sort
  if (filters.page > 1) q.page = String(filters.page)
  if (filters.perPage !== DEFAULT_PER_PAGE) q.perPage = String(filters.perPage)
  return q
}

/** True when no filters/search are active (only default sort/pagination). */
export function hasActiveFilters(filters: ProductFilters): boolean {
  return Boolean(
    filters.category
    || filters.manufacturers.length
    || filters.q.trim()
    || filters.priceMin !== null
    || filters.priceMax !== null
    || filters.specMin !== null
    || filters.specMax !== null,
  )
}
