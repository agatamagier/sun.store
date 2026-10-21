import type { Product } from '~~/shared/types/product'

const priceFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
})

export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

/** Human-readable spec, e.g. "10 kWh" / "450 W", or null when not applicable. */
export function formatSpec(product: Pick<Product, 'specMetric' | 'specValue'>): string | null {
  if (product.specMetric === null || product.specValue === null) return null
  const unit = product.specMetric === 'capacity' ? 'kWh' : 'W'
  return `${product.specValue} ${unit}`
}

const CATEGORY_LABELS: Record<Product['category'], string> = {
  'battery': 'Battery',
  'solar panel': 'Solar panel',
  'connector': 'Connector',
}

export function categoryLabel(category: Product['category']): string {
  return CATEGORY_LABELS[category]
}

const CATEGORY_PLURAL: Record<Product['category'], string> = {
  'battery': 'Batteries',
  'solar panel': 'Solar panels',
  'connector': 'Connectors',
}

export function categoryPlural(category: Product['category']): string {
  return CATEGORY_PLURAL[category]
}
