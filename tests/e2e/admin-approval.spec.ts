import { test, expect } from '@playwright/test'

/**
 * E2E tests for admin approval workflow
 * Note: These tests require valid admin credentials in environment variables
 */

test.describe('Admin Login Flow', () => {
  test('should display admin login page', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.getByText(/login|entrar/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/senha|password/i)).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login')

    await page.getByLabel(/email/i).fill('invalid@test.com')
    await page.getByLabel(/senha|password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /entrar|login/i }).click()

    // Should show error message
    await expect(page.getByText(/erro|error|inválido|invalid/i)).toBeVisible({ timeout: 5000 })
  })

  test('should redirect to admin dashboard after successful login', async ({ page }) => {
    // Skip if no admin credentials in env
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
      return
    }

    await page.goto('/admin/login')

    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL)
    await page.getByLabel(/senha|password/i).fill(process.env.TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar|login/i }).click()

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })
})

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Skip if no admin credentials
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
      return
    }

    // Login first
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL)
    await page.getByLabel(/senha|password/i).fill(process.env.TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar|login/i }).click()
    await page.waitForURL(/\/admin/, { timeout: 10000 })
  })

  test('should display admin dashboard with statistics', async ({ page }) => {
    await page.goto('/admin')

    // Should show statistics
    await expect(page.getByText(/estatística|statistics|total/i)).toBeVisible()
  })

  test('should display navigation to submissions', async ({ page }) => {
    await page.goto('/admin')

    const submissionsLink = page.getByRole('link', { name: /submissões|submissions/i })
    await expect(submissionsLink).toBeVisible()
  })

  test('should navigate to submission list', async ({ page }) => {
    await page.goto('/admin')

    const submissionsLink = page.getByRole('link', { name: /submissões|submissions/i })
    if (await submissionsLink.isVisible()) {
      await submissionsLink.click()
      await expect(page).toHaveURL(/\/admin\/submissions/)
    }
  })
})

test.describe('Submission Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
      return
    }

    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL)
    await page.getByLabel(/senha|password/i).fill(process.env.TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar|login/i }).click()
    await page.waitForURL(/\/admin/, { timeout: 10000 })
  })

  test('should display pending submissions list', async ({ page }) => {
    await page.goto('/admin/submissions')

    // Should show submissions table or list
    await expect(page.getByText(/pendente|pending|nome|name/i)).toBeVisible({ timeout: 5000 })
  })

  test('should filter submissions by status', async ({ page }) => {
    await page.goto('/admin/submissions')

    const statusFilter = page.getByRole('combobox', { name: /status/i })
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('pending')
      await page.waitForTimeout(1000)

      // Should show only pending submissions
      await expect(page.getByText(/pendente|pending/i)).toBeVisible()
    }
  })

  test('should open submission detail modal', async ({ page }) => {
    await page.goto('/admin/submissions')

    // Click on first submission if available
    const firstSubmission = page.locator('[data-testid="submission-row"]').first()
    const viewButton = page.getByRole('button', { name: /ver|view|detalhes/i }).first()

    if (await viewButton.isVisible()) {
      await viewButton.click()

      // Modal should open with submission details
      await expect(page.getByText(/endereço|address|jurisdição/i)).toBeVisible()
    }
  })

  test('should approve submission', async ({ page }) => {
    await page.goto('/admin/submissions')

    const approveButton = page.getByRole('button', { name: /aprovar|approve/i }).first()

    if (await approveButton.isVisible()) {
      await approveButton.click()

      // Should show confirmation or success message
      await expect(page.getByText(/sucesso|success|aprovad/i)).toBeVisible({ timeout: 15000 })
    }
  })

  test('should reject submission with notes', async ({ page }) => {
    await page.goto('/admin/submissions')

    const rejectButton = page.getByRole('button', { name: /rejeitar|reject/i }).first()

    if (await rejectButton.isVisible()) {
      await rejectButton.click()

      // Should prompt for rejection notes
      const notesInput = page.getByLabel(/nota|note|motivo|reason/i)
      if (await notesInput.isVisible()) {
        await notesInput.fill('Dados incompletos - teste E2E')

        const confirmButton = page.getByRole('button', { name: /confirmar|confirm|rejeitar/i })
        await confirmButton.click()

        // Should show success message
        await expect(page.getByText(/rejeitad|rejected/i)).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Bulk Submission Review Flow', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
      return
    }

    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL)
    await page.getByLabel(/senha|password/i).fill(process.env.TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar|login/i }).click()
    await page.waitForURL(/\/admin/, { timeout: 10000 })
  })

  test('should display bulk submissions list', async ({ page }) => {
    await page.goto('/admin/bulk-submissions')

    await expect(page.getByText(/lote|bulk|múltiplas/i)).toBeVisible({ timeout: 5000 })
  })

  test('should preview bulk submission data', async ({ page }) => {
    await page.goto('/admin/bulk-submissions')

    const viewButton = page.getByRole('button', { name: /ver|view|preview/i }).first()

    if (await viewButton.isVisible()) {
      await viewButton.click()

      // Should show preview of bulk data
      await expect(page.getByText(/quantidade|count|igrejas|churches/i)).toBeVisible()
    }
  })

  test('should approve bulk submission', async ({ page }) => {
    await page.goto('/admin/bulk-submissions')

    const approveButton = page.getByRole('button', { name: /aprovar|approve/i }).first()

    if (await approveButton.isVisible()) {
      await approveButton.click()

      // Should show success message after processing
      await expect(page.getByText(/sucesso|success/i)).toBeVisible({ timeout: 30000 })
    }
  })
})

test.describe('Church Management', () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD) {
      test.skip()
      return
    }

    // Login
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL)
    await page.getByLabel(/senha|password/i).fill(process.env.TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar|login/i }).click()
    await page.waitForURL(/\/admin/, { timeout: 10000 })
  })

  test('should display churches list', async ({ page }) => {
    await page.goto('/admin/churches')

    await expect(page.getByText(/igrejas|churches|nome|name/i)).toBeVisible({ timeout: 5000 })
  })

  test('should search churches by name', async ({ page }) => {
    await page.goto('/admin/churches')

    const searchInput = page.getByRole('textbox', { name: /buscar|search/i })

    if (await searchInput.isVisible()) {
      await searchInput.fill('Catedral')
      await searchInput.press('Enter')

      await page.waitForTimeout(1000)

      // Should show filtered results
      await expect(page.locator('table tbody tr').first()).toBeVisible()
    }
  })

  test('should edit church details', async ({ page }) => {
    await page.goto('/admin/churches')

    const editButton = page.getByRole('button', { name: /editar|edit/i }).first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Edit modal should open
      await expect(page.getByLabel(/nome|name/i)).toBeVisible()

      // Make a change
      const nameInput = page.getByLabel(/nome|name/i)
      const originalValue = await nameInput.inputValue()
      await nameInput.fill(originalValue + ' - Edited')

      // Save
      const saveButton = page.getByRole('button', { name: /salvar|save/i })
      await saveButton.click()

      // Should show success message
      await expect(page.getByText(/atualizado|updated|success/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should export churches as CSV', async ({ page }) => {
    await page.goto('/admin/churches')

    const exportButton = page.getByRole('button', { name: /exportar|export/i })

    if (await exportButton.isVisible()) {
      // Listen for download
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      const download = await downloadPromise

      // Should download CSV file
      expect(download.suggestedFilename()).toMatch(/\.csv$/)
    }
  })

  test('should delete church with confirmation', async ({ page }) => {
    await page.goto('/admin/churches')

    const deleteButton = page.getByRole('button', { name: /excluir|delete/i }).first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Should show confirmation dialog
      await expect(page.getByText(/confirma|confirm|certeza|sure/i)).toBeVisible()

      // Cancel deletion
      const cancelButton = page.getByRole('button', { name: /cancelar|cancel/i })
      await cancelButton.click()

      // Dialog should close
      await expect(page.getByText(/confirma|confirm/i)).not.toBeVisible()
    }
  })
})
