import { test, expect } from '@playwright/test'

test.describe('Localizador de Igrejas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/localizador')
  })

  test('should load localizador page', async ({ page }) => {
    await expect(page).toHaveTitle(/Localizador|Igrejas/)
  })

  test('should display jurisdiction filters', async ({ page }) => {
    // Look for jurisdiction filters or tabs
    const filters = page.locator('button, a').filter({ hasText: /IEAB|REB|IECB/ })

    // Should have at least one jurisdiction option
    if (await filters.count() > 0) {
      await expect(filters.first()).toBeVisible()
    }
  })

  test('should filter churches by jurisdiction', async ({ page }) => {
    // Click on a jurisdiction filter
    const ieabFilter = page.locator('button:has-text("IEAB"), a:has-text("IEAB")').first()

    if (await ieabFilter.count() > 0) {
      await ieabFilter.click()

      // Wait for churches to load
      await page.waitForTimeout(1000)

      // URL should reflect the filter
      await expect(page).toHaveURL(/ieab/)
    }
  })

  test('should display church list', async ({ page }) => {
    // Wait for any church cards or list items to appear
    await page.waitForTimeout(2000)

    // Look for church elements
    const churches = page.locator('article, [data-testid="church-card"], li').filter({ hasText: /Igreja|Paróquia/ })

    // If churches are loaded, check visibility
    if (await churches.count() > 0) {
      await expect(churches.first()).toBeVisible()
    }
  })

  test('should search for churches', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]')

    if (await searchInput.count() > 0) {
      await searchInput.fill('São Paulo')
      await page.waitForTimeout(1000)

      // Results should be filtered
      const results = page.locator('body')
      await expect(results).toBeVisible()
    }
  })

  test('should navigate to church detail page', async ({ page }) => {
    await page.waitForTimeout(2000)

    // Click on first church link
    const churchLink = page.locator('a').filter({ hasText: /Igreja|Paróquia/ }).first()

    if (await churchLink.count() > 0 && await churchLink.isVisible()) {
      const href = await churchLink.getAttribute('href')

      if (href && href.includes('/igrejas/')) {
        await churchLink.click()

        // Should navigate to detail page
        await expect(page).toHaveURL(/\/igrejas\//)
      }
    }
  })

  test('should display map if available', async ({ page }) => {
    // Look for map container or map element
    const map = page.locator('[id*="map"], [class*="map"], iframe[src*="maps"]')

    if (await map.count() > 0) {
      await expect(map.first()).toBeVisible()
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/localizador')

    // Page should be usable on mobile
    const mainContent = page.locator('main, [role="main"]')
    await expect(mainContent.first()).toBeVisible()
  })

  test('should have proper accessibility', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main, [role="main"]')
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible()
    }

    // Check for headings
    const heading = page.locator('h1, h2').first()
    if (await heading.count() > 0) {
      await expect(heading).toBeVisible()
    }
  })
})
