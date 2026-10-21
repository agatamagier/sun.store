<script setup lang="ts">
import type { Product } from '~~/shared/types/product'

const props = defineProps<{ product: Product }>()

const spec = computed(() => formatSpec(props.product))
const categoryColor = computed(() => {
  switch (props.product.category) {
    case 'battery': return 'primary' as const
    case 'solar panel': return 'warning' as const
    default: return 'neutral' as const
  }
})
</script>

<template>
  <UCard
    variant="outline"
    class="h-full flex flex-col transition-shadow hover:shadow-md"
    :ui="{ body: 'flex-1 flex flex-col gap-2' }"
    data-testid="product-card"
  >
    <div class="flex items-start justify-between gap-2">
      <UBadge :color="categoryColor" variant="subtle" size="sm">
        {{ categoryLabel(product.category) }}
      </UBadge>
      <UBadge v-if="spec" color="neutral" variant="outline" size="sm" class="font-mono">
        {{ spec }}
      </UBadge>
    </div>

    <h3 class="font-semibold leading-tight text-highlighted">
      {{ product.name }}
    </h3>
    <p class="text-sm text-muted">
      {{ product.manufacturer }}
    </p>

    <p class="text-sm text-dimmed line-clamp-3 flex-1">
      {{ product.description }}
    </p>

    <div class="pt-2 mt-auto">
      <span class="text-lg font-bold text-highlighted">{{ formatPrice(product.price) }}</span>
    </div>
  </UCard>
</template>
