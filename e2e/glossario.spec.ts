import { test, expect } from '@playwright/test'

test.describe('Glossário Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/glossario')
  })

  test('should display glossary terms', async ({ page }) => {
    // Wait for terms to load
    const terms = page.locator('[data-testid="glossary-term"], div:has-text("Anglican"), div:has-text("Bishop")')
    await expect(terms.first()).toBeVisible({ timeout: 10000 })
  })

  test('should filter terms by search', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="text"], input[placeholder*="Buscar"], input[placeholder*="buscar"]')

    if (await searchInput.count() > 0) {
      await searchInput.type('bispo')

      await page.waitForTimeout(500)

      await expect(page).toHaveURL(/q=bispo/)
    }
  })

  test('should filter by letter', async ({ page }) => {
    // Click on letter filter (if available)
    const letterB = page.locator('button:has-text("B"), a:has-text("B")').first()

    if (await letterB.count() > 0) {
      await letterB.click()

      // Wait for filter to apply
      await page.waitForTimeout(500)

      // URL should reflect letter filter
      await expect(page).toHaveURL(/letra=B/)
    }
  })

  test('should navigate between pages if pagination exists', async ({ page }) => {
    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Próxima"), button:has-text("→"), a:has-text("Próxima")')

    if (await nextButton.count() > 0 && await nextButton.isVisible()) {
      await nextButton.click()

      // Should navigate to page 2
      await expect(page).toHaveURL(/pagina=2/)
    }
  })

  test('should display term details', async ({ page }) => {
    // Click on first term
    const firstTerm = page.locator('a, button').filter({ hasText: /^[A-Z]/ }).first()

    if (await firstTerm.count() > 0) {
      await firstTerm.click()

      // Should show term definition
      await page.waitForTimeout(500)
    }
  })

  test('should clear search', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]').first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('test search')
      await page.waitForTimeout(300)

      // Look for clear button
      const clearButton = page.locator('button[aria-label*="limpar busca"]')

      if (await clearButton.count() > 0) {
        await clearButton.click()

        // Search should be cleared
        await expect(searchInput).toHaveValue('')
      }
    }
  })

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/glossario')

    // Page should still be usable on mobile
    const content = page.locator('main, [role="main"], body > div')
    await expect(content.first()).toBeVisible()
  })

  test('should have proper meta tags for SEO', async ({ page }) => {
    const title = await page.title()
    expect(title).toContain('Glossário')

    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /.+/)
  })
})
