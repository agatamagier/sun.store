import { parse } from 'csv-parse/sync'
import { CATEGORIES, type Category, type Product } from '../../shared/types/product'
import { deriveProductSpec } from './spec'

/** A row straight from the CSV: all columns are strings and optional, pre-validation. */
interface RawCsvRow {
  name?: string
  manufacturer?: string
  price?: string
  description?: string
  category?: string
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value)
}

/**
 * Parse the raw CSV text into enriched products. Pure and synchronous so it can
 * be unit-tested directly without the Nitro runtime.
 *
 * Uses a real CSV parser (csv-parse) because descriptions contain commas and
 * are quoted inconsistently across rows — `split(',')` would corrupt them.
 */
export function parseProductsCsv(csv: string): Product[] {
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as RawCsvRow[]

  const products: Product[] = []
  rows.forEach((row, index) => {
    const name = row.name?.trim() ?? ''
    const category = row.category?.trim() ?? ''
    // Defensively skip malformed rows (missing name or unknown category).
    if (!name || !isCategory(category)) return

    const price = Number.parseFloat(row.price ?? '')
    const description = row.description?.trim() ?? ''
    const spec = deriveProductSpec(category, name, description)

    products.push({
      id: String(index + 1),
      name,
      manufacturer: row.manufacturer?.trim() ?? '',
      price: Number.isFinite(price) ? price : 0,
      description,
      category,
      ...spec,
    })
  })
  return products
}

// Module-level cache: the CSV is read and parsed once per server process.
let cache: Product[] | null = null

/** Load (and memoize) all products from the bundled CSV server asset. */
export async function getProducts(): Promise<Product[]> {
  if (cache) return cache
  const csv = await useStorage('assets:data').getItem<string>('products.csv')
  if (typeof csv !== 'string') {
    throw new Error('products.csv could not be read from server assets (assets:data)')
  }
  cache = parseProductsCsv(csv)
  return cache
}
