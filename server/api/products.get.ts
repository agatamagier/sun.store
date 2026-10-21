import type { ProductsResponse } from '../../shared/types/product'
import { normalizeFilters } from '../../shared/utils/filters'
import { queryProducts } from '../utils/filter'
import { getProducts } from '../utils/products'

/**
 * GET /api/products
 *
 * Server-side filtering, searching and sorting. All filter state is read from
 * the URL query, so an SSR request for a filtered URL returns the correct
 * results directly. `normalizeFilters` fully validates + defaults the raw query.
 *
 * (`defineEventHandler`/`getQuery` are h3 globals auto-imported by Nitro; the
 * domain functions are imported explicitly for traceability.)
 */
export default defineEventHandler(async (event): Promise<ProductsResponse> => {
  const products = await getProducts()
  const filters = normalizeFilters(getQuery(event))
  return queryProducts(products, filters)
})
