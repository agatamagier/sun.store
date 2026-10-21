<script setup lang="ts">
import type { FilterOptions } from '~~/shared/types/product'

const props = defineProps<{
  total: number
  filterOptions: FilterOptions | undefined
  loading?: boolean
}>()

const { searchModel, onSearch, clearSearch, sortItems, sortModel }
  = useProductFilterControls(() => props.filterOptions)
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <UInput
      :model-value="searchModel"
      icon="i-lucide-search"
      placeholder="Search by name, manufacturer or description…"
      class="w-full sm:max-w-sm"
      :loading="loading"
      autocomplete="off"
      aria-label="Search products"
      @update:model-value="onSearch"
    >
      <template v-if="searchModel" #trailing>
        <UButton
          color="neutral"
          variant="link"
          size="xs"
          icon="i-lucide-x"
          aria-label="Clear search"
          @click="clearSearch"
        />
      </template>
    </UInput>

    <div class="flex items-center gap-3">
      <output class="text-sm text-muted whitespace-nowrap" data-testid="result-count">
        <span class="font-semibold text-highlighted">{{ total }}</span>
        {{ total === 1 ? 'product' : 'products' }}
      </output>
      <USelect
        v-model="sortModel"
        :items="sortItems"
        icon="i-lucide-arrow-up-down"
        class="min-w-48"
        aria-label="Sort products"
      />
    </div>
  </div>
</template>
