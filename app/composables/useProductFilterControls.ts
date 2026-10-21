import { useDebounceFn } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import type { Category, FilterOptions, SortOption } from '~~/shared/types/product'

const DEBOUNCE_MS = 350

// reka-ui's Select forbids an empty-string item value (reserved for clearing),
// so "All categories" uses a non-empty sentinel mapped to null.
const ALL_CATEGORIES = '__all__'

/**
 * View-model glue for the filter controls: ready-to-bind models and handlers
 * that translate between the UI widgets and the URL-backed filter state.
 *
 * Keeping this out of the components leaves them as (almost) pure templates,
 * removes the repeated debounce wiring, and makes the glue unit-testable.
 */
export function useProductFilterControls(filterOptions: MaybeRefOrGetter<FilterOptions | undefined>) {
  const { filters, active, updateFilters, reset } = useProductFilters()
  const options = computed(() => toValue(filterOptions))

  // --- Category -----------------------------------------------------------
  const categoryItems = computed(() => [
    { label: 'All categories', value: ALL_CATEGORIES },
    ...(options.value?.categories ?? []).map(category => ({
      label: `${categoryLabel(category.value)} (${category.count})`,
      value: category.value,
    })),
  ])
  const categoryModel = computed({
    get: () => filters.value.category ?? ALL_CATEGORIES,
    set: (value: string) => {
      const category = (value === ALL_CATEGORIES ? null : value) as Category | null
      const willHaveSpec = category === 'battery' || category === 'solar panel'
      const sort = filters.value.sort
      // Spec sort only makes sense for a spec-bearing category.
      const changes = !willHaveSpec && (sort === 'spec-asc' || sort === 'spec-desc')
        ? { category, sort: 'relevance' as const }
        : { category }
      updateFilters(changes)
    },
  })

  // --- Manufacturers ------------------------------------------------------
  function toggleManufacturer(name: string, checked: boolean) {
    const selected = new Set(filters.value.manufacturers)
    if (checked) selected.add(name)
    else selected.delete(name)
    updateFilters({ manufacturers: [...selected] })
  }

  // --- Price / spec ranges (debounced number inputs) ----------------------
  const applyPriceMin = useDebounceFn((value: number | undefined) => updateFilters({ priceMin: value ?? null }), DEBOUNCE_MS)
  const applyPriceMax = useDebounceFn((value: number | undefined) => updateFilters({ priceMax: value ?? null }), DEBOUNCE_MS)
  const applySpecMin = useDebounceFn((value: number | undefined) => updateFilters({ specMin: value ?? null }), DEBOUNCE_MS)
  const applySpecMax = useDebounceFn((value: number | undefined) => updateFilters({ specMax: value ?? null }), DEBOUNCE_MS)

  // --- Search (local state + debounced write to URL) ----------------------
  const searchModel = ref(filters.value.q)
  watch(
    () => filters.value.q,
    (query) => {
      // Resync when the query changes externally (e.g. Back button, Clear all).
      if (query !== searchModel.value) searchModel.value = query
    },
  )
  const applySearch = useDebounceFn((value: string) => updateFilters({ q: value }), DEBOUNCE_MS)
  function onSearch(value: string | number) {
    const text = value == null ? '' : String(value)
    searchModel.value = text
    applySearch(text)
  }
  function clearSearch() {
    searchModel.value = ''
    updateFilters({ q: '' })
  }

  // --- Sort ---------------------------------------------------------------
  const sortItems = computed(() => {
    const items: { label: string; value: SortOption }[] = [
      { label: 'Relevance', value: 'relevance' },
      { label: 'Price: low to high', value: 'price-asc' },
      { label: 'Price: high to low', value: 'price-desc' },
      { label: 'Name: A–Z', value: 'name-asc' },
    ]
    if (options.value?.spec) {
      const label = options.value.spec.label
      items.push(
        { label: `${label}: low to high`, value: 'spec-asc' },
        { label: `${label}: high to low`, value: 'spec-desc' },
      )
    }
    return items
  })
  const sortModel = computed({
    get: () => filters.value.sort,
    set: (value: SortOption) => updateFilters({ sort: value }),
  })

  return {
    filters,
    active,
    reset,
    categoryItems,
    categoryModel,
    toggleManufacturer,
    applyPriceMin,
    applyPriceMax,
    applySpecMin,
    applySpecMax,
    searchModel,
    onSearch,
    clearSearch,
    sortItems,
    sortModel,
  }
}
