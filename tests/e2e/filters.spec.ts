import { expect, test, type Page } from '@playwright/test'

const cardNames = (page: Page) =>
  page.getByTestId('product-card').locator('h3').allInnerTexts()

// Ensure the client app has hydrated (interactive) before driving controls.
// The page sets data-hydrated="true" from onMounted.
async function waitForHydration(page: Page) {
  await expect(page.locator('[data-hydrated="true"]')).toBeAttached()
}

test('a filtered link renders identical results after reload (SSR from URL)', async ({ page }) => {
  await page.goto('/?category=battery&sort=spec-desc')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batteries')

  const countBefore = await page.getByTestId('result-count').innerText()
  const namesBefore = await cardNames(page)
  expect(namesBefore.length).toBeGreaterThan(0)

  await page.reload()

  // Same count and same order after a full reload -> served by the server.
  await expect(page.getByTestId('result-count')).toHaveText(countBefore)
  expect(await cardNames(page)).toEqual(namesBefore)
})

test('applying a filter updates the URL and is undone by the Back button', async ({ page }) => {
  await page.goto('/')
  await waitForHydration(page)
  const totalAll = await page.getByTestId('result-count').innerText()

  // Toggle a manufacturer filter via its checkbox.
  const manufacturer = page.getByRole('checkbox', { name: 'AmpereDrive' })
  await manufacturer.click()
  await expect(manufacturer).toBeChecked() // retries until the click registers

  // Filter state is reflected in the URL and the results narrow accordingly.
  await expect(page).toHaveURL(/manufacturer=AmpereDrive/)
  const totalFiltered = await page.getByTestId('result-count').innerText()
  expect(totalFiltered).not.toEqual(totalAll)

  // Back button restores the previous (unfiltered) state and its results.
  await page.goBack()
  await expect(page).not.toHaveURL(/manufacturer=/)
  await expect(page.getByTestId('result-count')).toHaveText(totalAll)
})

test('category pills filter the list and mark the active category', async ({ page }) => {
  await page.goto('/')
  await waitForHydration(page)

  const batteryPill = page.getByRole('button', { name: /^Battery/ })
  await batteryPill.click()

  await expect(page).toHaveURL(/category=battery/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Batteries')
  await expect(batteryPill).toHaveAttribute('aria-pressed', 'true')
})

test('a search link is server-rendered and marked noindex', async ({ page }) => {
  const response = await page.goto('/?q=LiFePO4')
  expect(response?.status()).toBe(200)

  // Results are present on first paint (SSR), before any hydration.
  const names = await cardNames(page)
  expect(names.length).toBeGreaterThan(0)

  // Deep filter combinations are excluded from indexing.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page).toHaveTitle(/LiFePO4/)
})
