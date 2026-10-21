<script setup lang="ts">
import type { ProductsResponse } from '~~/shared/types/product'

const route = useRoute()
const { filters, active, updateFilters, reset } = useProductFilters()

// Server-side filtering: the API receives the URL query verbatim, so an SSR
// request for a filtered link returns the right results on first paint.
const { data, status, error } = await useFetch<ProductsResponse>('/api/products', {
  query: computed(() => route.query),
  // Refetch whenever the URL query changes, including on browser Back/Forward.
  watch: [() => route.query],
})

const loading = computed(() => status.value === 'pending')

const heading = computed(() =>
  filters.value.category ? categoryPlural(filters.value.category) : 'Solar products',
)

// --- Dynamic SEO ----------------------------------------------------------
// Only canonical entry points are indexable: the full catalogue and the
// per-category views. Deep filter combinations (manufacturer / price / spec /
// search / pagination) are noindex,follow to avoid crawl-budget waste and
// near-duplicate pages, while still letting crawlers follow through to products.
const seo = computed(() => {
  const f = filters.value
  const total = data.value?.total ?? 0
  const subject = f.category ? categoryPlural(f.category) : 'Solar products'
  const query = f.q.trim()

  let title = f.manufacturers.length === 1
    ? `${f.manufacturers[0]} ${subject.toLowerCase()}`
    : subject
  if (query) title += ` matching “${query}”`

  const indexable
    = f.manufacturers.length === 0 && query === ''
      && f.priceMin === null && f.priceMax === null
      && f.specMin === null && f.specMax === null && f.page === 1

  return {
    title: `${title} | sun.store`,
    description: query
      ? `${total} ${subject.toLowerCase()} matching “${query}” for solar installers and distributors on sun.store.`
      : `Browse ${total} ${subject.toLowerCase()} for solar installers and distributors on sun.store. Filter by manufacturer, price and capacity or power.`,
    robots: indexable ? 'index,follow' : 'noindex,follow',
  }
})
useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,
  ogTitle: () => seo.value.title,
  ogDescription: () => seo.value.description,
  ogType: 'website',
  robots: () => seo.value.robots,
})

function onPage(page: number) {
  updateFilters({ page }, { resetPage: false })
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// hydration signal for end-to-end tests: becomes true only once
// the client app has mounted (and its interactive controls are wired up).
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <UContainer class="py-8" :data-hydrated="hydrated ? 'true' : 'false'">
    <header class="mb-6">
      <p class="text-sm font-medium text-primary">
        sun.store · B2B solar marketplace
      </p>
      <h1 class="text-2xl font-bold text-highlighted sm:text-3xl">
        {{ heading }}
      </h1>
      <p class="mt-1 text-muted">
        Panels, batteries and accessories for installers and distributors across Europe.
      </p>
    </header>

    <div class="mb-6">
      <ProductToolbar
        :total="data?.total ?? 0"
        :filter-options="data?.filterOptions"
        :loading="loading"
      />
    </div>

    <div class="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside class="lg:w-72 lg:shrink-0 lg:sticky lg:top-6">
        <ProductFilters :filter-options="data?.filterOptions" />
      </aside>

      <section class="min-w-0 flex-1">
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Could not load products"
          :description="error.message"
        />

        <div
          v-else-if="data && data.items.length > 0"
          class="transition-opacity"
          :class="{ 'opacity-60': loading }"
        >
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ProductCard
              v-for="product in data.items"
              :key="product.id"
              :product="product"
            />
          </div>

          <div v-if="data.pageCount > 1" class="mt-8 flex justify-center">
            <UPagination
              :page="data.page"
              :total="data.total"
              :items-per-page="data.perPage"
              @update:page="onPage"
            />
          </div>
        </div>

        <!-- Loading skeletons for the very first render -->
        <div
          v-else-if="loading"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <USkeleton v-for="n in 6" :key="n" class="h-56 w-full" />
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-default py-16 text-center"
        >
          <UIcon name="i-lucide-package-search" class="size-10 text-dimmed" />
          <p class="text-muted">
            No products match your filters.
          </p>
          <UButton v-if="active" color="neutral" variant="soft" @click="reset">
            Clear all filters
          </UButton>
        </div>
      </section>
    </div>
  </UContainer>
</template>
