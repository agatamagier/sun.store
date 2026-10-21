<script setup lang="ts">
import type { FilterOptions } from '~~/shared/types/product'

const props = defineProps<{ filterOptions: FilterOptions | undefined }>()

const {
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
} = useProductFilterControls(() => props.filterOptions)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">
        Filters
      </h2>
      <UButton
        v-if="active"
        color="neutral"
        variant="link"
        size="xs"
        icon="i-lucide-x"
        @click="reset"
      >
        Clear all
      </UButton>
    </div>

    <fieldset class="min-w-0">
      <legend class="mb-1.5 block text-sm font-medium text-default">
        Category
      </legend>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in categoryItems"
          :key="item.value"
          :label="item.label"
          size="sm"
          :color="categoryModel === item.value ? 'primary' : 'neutral'"
          :variant="categoryModel === item.value ? 'solid' : 'outline'"
          :ui="{ base: 'rounded-full' }"
          :aria-pressed="categoryModel === item.value"
          @click="categoryModel = item.value"
        />
      </div>
    </fieldset>

    <!-- Not a UFormField: each checkbox keeps its own accessible name (the
         manufacturer) instead of all inheriting a single group label. -->
    <fieldset v-if="filterOptions?.manufacturers.length" class="min-w-0">
      <legend class="mb-1.5 block text-sm font-medium text-default">
        Manufacturer
      </legend>
      <div class="max-h-60 overflow-y-auto pr-1 flex flex-col gap-2">
        <div
          v-for="m in filterOptions.manufacturers"
          :key="m.value"
          class="flex items-center justify-between gap-2"
        >
          <UCheckbox
            :model-value="filters.manufacturers.includes(m.value)"
            :label="m.value"
            @update:model-value="(checked) => toggleManufacturer(m.value, checked === true)"
          />
          <span class="text-xs text-dimmed tabular-nums">{{ m.count }}</span>
        </div>
      </div>
    </fieldset>

    <UFormField label="Price (€)">
      <div class="flex items-center gap-2">
        <UInputNumber
          :model-value="filters.priceMin ?? undefined"
          :min="0"
          :placeholder="filterOptions ? String(filterOptions.price.min) : 'Min'"
          class="w-full"
          :ui="{ base: 'w-full' }"
          @update:model-value="applyPriceMin"
        />
        <span class="text-dimmed">–</span>
        <UInputNumber
          :model-value="filters.priceMax ?? undefined"
          :min="0"
          :placeholder="filterOptions ? String(filterOptions.price.max) : 'Max'"
          class="w-full"
          :ui="{ base: 'w-full' }"
          @update:model-value="applyPriceMax"
        />
      </div>
    </UFormField>

    <UFormField
      v-if="filterOptions?.spec"
      :label="`${filterOptions.spec.label} (${filterOptions.spec.unit})`"
    >
      <div class="flex items-center gap-2">
        <UInputNumber
          :model-value="filters.specMin ?? undefined"
          :min="0"
          :placeholder="String(filterOptions.spec.min)"
          class="w-full"
          :ui="{ base: 'w-full' }"
          @update:model-value="applySpecMin"
        />
        <span class="text-dimmed">–</span>
        <UInputNumber
          :model-value="filters.specMax ?? undefined"
          :min="0"
          :placeholder="String(filterOptions.spec.max)"
          class="w-full"
          :ui="{ base: 'w-full' }"
          @update:model-value="applySpecMax"
        />
      </div>
      <template #help>
        <span class="text-xs text-dimmed">
          Available: {{ filterOptions.spec.min }}–{{ filterOptions.spec.max }} {{ filterOptions.spec.unit }}
        </span>
      </template>
    </UFormField>
  </div>
</template>
