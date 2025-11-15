import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Caminho Anglicano/)
  })

  test('should display navigation cards', async ({ page }) => {
    await page.goto('/')

    // Should have at least 3 navigation cards (Localizador, Glossário, Dashboard)
    const cards = page.locator('a[class*="bg-white"][class*="rounded-lg"]')
    await expect(cards).toHaveCount(3)
  })

  test('should navigate to localizador', async ({ page }) => {
    await page.goto('/')

    await page.click('text=Localizador de Igrejas')

    await expect(page).toHaveURL(/\/localizador/)
  })

  test('should navigate to glossário', async ({ page }) => {
    await page.goto('/')

    await page.click('text=Glossário Anglicano')

    await expect(page).toHaveURL(/\/glossario/)
  })

  test('should be accessible', async ({ page }) => {
    await page.goto('/')

    // Check for main heading
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()

    // Check for proper meta tags
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /.+/)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Navigation cards should still be visible
    const cards = page.locator('a[class*="bg-white"]')
    await expect(cards.first()).toBeVisible()
  })

  test('should have working PWA manifest', async ({ page }) => {
    await page.goto('/')

    // Check for manifest link
    const manifest = page.locator('link[rel="manifest"]')
    await expect(manifest).toHaveAttribute('href', /.+/)
  })
})
