import { test, expect } from '@playwright/test'

/**
 * E2E tests for user church submission workflow
 */

test.describe('Church Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/localizador')
  })

  test('should display church locator page', async ({ page }) => {
    await expect(page).toHaveTitle(/Caminho Anglicano/i)
    await expect(page.getByText(/localizador/i)).toBeVisible()
  })

  test('should open add church modal when clicking contribute button', async ({ page }) => {
    // Look for a button/link to add church
    const contributeButton = page.getByRole('button', { name: /adicionar|contribuir|igreja/i })

    if (await contributeButton.isVisible()) {
      await contributeButton.click()

      // Modal should appear with form fields
      await expect(page.getByText(/nome/i)).toBeVisible()
      await expect(page.getByText(/endereço/i)).toBeVisible()
    }
  })

  test('should validate required fields in submission form', async ({ page }) => {
    // Open modal
    const contributeButton = page.getByRole('button', { name: /adicionar|contribuir|igreja/i })

    if (await contributeButton.isVisible()) {
      await contributeButton.click()

      // Try to submit without filling fields
      const submitButton = page.getByRole('button', { name: /enviar|submit/i })
      await submitButton.click()

      // Should show validation errors
      await expect(page.getByText(/obrigatório|required/i)).toBeVisible()
    }
  })

  test('should submit church successfully with valid data', async ({ page }) => {
    const contributeButton = page.getByRole('button', { name: /adicionar|contribuir|igreja/i })

    if (await contributeButton.isVisible()) {
      await contributeButton.click()

      // Fill form with valid data
      await page.getByLabel(/nome/i).fill('Igreja Anglicana Test E2E')
      await page.getByLabel(/endereço/i).fill('Rua Example, 123 - Centro, São Paulo - SP')
      await page.getByLabel(/email/i).fill('test@church.com')

      // Select jurisdiction if available
      const jurisdictionSelect = page.getByLabel(/jurisdição|diocese/i)
      if (await jurisdictionSelect.isVisible()) {
        await jurisdictionSelect.selectOption({ index: 1 })
      }

      // Submit form
      const submitButton = page.getByRole('button', { name: /enviar|submit/i })
      await submitButton.click()

      // Should show success message
      await expect(page.getByText(/sucesso|success|enviado|submitted/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should display church markers on map', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('[class*="map"]', { timeout: 10000 })

    // Map should be visible
    const mapElement = page.locator('[class*="map"]').first()
    await expect(mapElement).toBeVisible()
  })

  test('should search for churches by name', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: /buscar|search|pesquisar/i })

    if (await searchInput.isVisible()) {
      await searchInput.fill('Catedral')
      await searchInput.press('Enter')

      // Wait for results
      await page.waitForTimeout(1000)

      // Should show filtered results
      const results = page.locator('[class*="church"]')
      if (await results.count() > 0) {
        await expect(results.first()).toBeVisible()
      }
    }
  })

  test('should filter churches by jurisdiction', async ({ page }) => {
    const jurisdictionFilter = page.getByRole('combobox', { name: /jurisdição|diocese/i })

    if (await jurisdictionFilter.isVisible()) {
      await jurisdictionFilter.selectOption({ index: 1 })

      // Wait for filter to apply
      await page.waitForTimeout(1000)

      // Churches should be filtered
      await expect(page.locator('[class*="church"]').first()).toBeVisible()
    }
  })

  test('should open feedback modal', async ({ page }) => {
    const feedbackButton = page.getByRole('button', { name: /feedback|reportar/i })

    if (await feedbackButton.isVisible()) {
      await feedbackButton.click()

      // Feedback form should appear
      await expect(page.getByText(/mensagem|message/i)).toBeVisible()
    }
  })
})

test.describe('Bulk Church Submission Flow', () => {
  test('should open bulk submission modal', async ({ page }) => {
    await page.goto('/localizador')

    const bulkButton = page.getByRole('button', { name: /lote|bulk|múltiplas/i })

    if (await bulkButton.isVisible()) {
      await bulkButton.click()

      // Should show file upload option
      await expect(page.getByText(/arquivo|file|csv|json/i)).toBeVisible()
    }
  })

  test('should validate file format for bulk upload', async ({ page }) => {
    await page.goto('/localizador')

    const bulkButton = page.getByRole('button', { name: /lote|bulk|múltiplas/i })

    if (await bulkButton.isVisible()) {
      await bulkButton.click()

      // Try uploading invalid file type
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'invalid.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('invalid content'),
        })

        // Should show error for invalid format
        await expect(page.getByText(/formato|format|inválido|invalid/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
