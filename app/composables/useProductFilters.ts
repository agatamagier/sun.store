import type { ProductFilters } from '~~/shared/types/product'
import { hasActiveFilters, normalizeFilters, serializeFilters } from '~~/shared/utils/filters'

/**
 * Single source of truth for filter state: the URL.
 *
 * `filters` is derived from the current route query, so an SSR render and a
 * shared/bookmarked link both reflect the same state. `updateFilters` pushes a
 * new history entry (so the browser Back button restores the previous filters).
 */
export function useProductFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed<ProductFilters>(() => normalizeFilters(route.query))
  const active = computed(() => hasActiveFilters(filters.value))

  function updateFilters(changes: Partial<ProductFilters>, opts: { resetPage?: boolean } = {}) {
    const resetPage = opts.resetPage ?? true
    const next: ProductFilters = { ...filters.value, ...changes }
    // Any change other than paging returns to page 1.
    if (resetPage && changes.page === undefined) next.page = 1
    return router.push({ query: serializeFilters(next) })
  }

  function reset() {
    return router.push({ query: {} })
  }

  return { filters, active, updateFilters, reset }
}
