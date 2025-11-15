// import { test, expect } from '@playwright/test'
// import AxeBuilder from '@axe-core/playwright'

// test.describe('Accessibility Tests', () => {
//   test('home page should not have accessibility violations', async ({ page }) => {
//     await page.goto('/')

//     const accessibilityScanResults = await new AxeBuilder({ page }).analyze()

//     expect(accessibilityScanResults.violations).toEqual([])
//   })

//   test('glossário page should not have accessibility violations', async ({ page }) => {
//     await page.goto('/glossario')

//     // Wait for page to load
//     await page.waitForLoadState('networkidle')

//     const accessibilityScanResults = await new AxeBuilder({ page })
//       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
//       .analyze()

//     expect(accessibilityScanResults.violations).toEqual([])
//   })

//   test('localizador page should not have accessibility violations', async ({ page }) => {
//     await page.goto('/localizador')

//     await page.waitForLoadState('networkidle')

//     const accessibilityScanResults = await new AxeBuilder({ page })
//       .withTags(['wcag2a', 'wcag2aa'])
//       .analyze()

//     expect(accessibilityScanResults.violations).toEqual([])
//   })

//   test('keyboard navigation should work on home page', async ({ page }) => {
//     await page.goto('/')

//     // Press Tab to navigate
//     await page.keyboard.press('Tab')

//     // Focus should be on first interactive element
//     const focusedElement = await page.locator(':focus')
//     await expect(focusedElement).toBeVisible()
//   })

//   test('all images should have alt text', async ({ page }) => {
//     await page.goto('/')

//     const images = await page.locator('img').all()

//     for (const img of images) {
//       const alt = await img.getAttribute('alt')
//       // Alt can be empty string for decorative images, but must exist
//       expect(alt).not.toBeNull()
//     }
//   })

//   test('all interactive elements should be keyboard accessible', async ({ page }) => {
//     await page.goto('/')

//     // Get all buttons and links
//     const interactiveElements = await page.locator('button, a[href]').all()

//     for (const element of interactiveElements.slice(0, 5)) { // Test first 5
//       // Element should be focusable
//       await element.focus()
//       await expect(element).toBeFocused()
//     }
//   })

//   test('page should have proper heading hierarchy', async ({ page }) => {
//     await page.goto('/')

//     await expect(page.locator('h1')).toHaveCount(1);

//     // H1 should not be empty
//     const h1Text = await page.locator('h1').textContent()
//     expect(h1Text?.trim().length).toBeGreaterThan(0)
//   })

//   test('forms should have proper labels', async ({ page }) => {
//     await page.goto('/glossario')

//     // All input fields should have labels or aria-label
//     const inputs = await page.locator('input').all()

//     for (const input of inputs) {
//       const id = await input.getAttribute('id')
//       const ariaLabel = await input.getAttribute('aria-label')
//       const ariaLabelledBy = await input.getAttribute('aria-labelledby')

//       const hasLabel = id
//         ? await page.locator(`label[for="${id}"]`).count() > 0
//         : false

//       const isAccessible = hasLabel || ariaLabel || ariaLabelledBy
//       expect(isAccessible).toBeTruthy()
//     }
//   })

//   test('color contrast should meet WCAG AA standards', async ({ page }) => {
//     await page.goto('/')

//     const accessibilityScanResults = await new AxeBuilder({ page })
//       .withTags(['wcag2aa'])
//       .include('body')
//       .analyze()

//     const contrastViolations = accessibilityScanResults.violations.filter(
//       v => v.id === 'color-contrast'
//     )

//     expect(contrastViolations).toEqual([])
//   })

//   test('page should have lang attribute', async ({ page }) => {
//     await page.goto('/')

//     const html = page.locator('html')
//     const lang = await html.getAttribute('lang')

//     expect(lang).toBe('pt-BR')
//   })

//   test('skip to main content link should exist', async ({ page }) => {
//     await page.goto('/')

//     // Many accessible sites have a skip link
//     const skipLink = page.locator('a[href="#main"], a[href="#content"], a:has-text("Pular para")')

//     if (await skipLink.count() > 0) {
//       await expect(skipLink.first()).toBeTruthy()
//     }
//   })

//   test('focus should be visible', async ({ page }) => {
//     await page.goto('/')

//     // Navigate with keyboard
//     await page.keyboard.press('Tab')

//     const focusedElement = page.locator(':focus')

//     // Element should have visible focus indicator
//     const outline = await focusedElement.evaluate(el => {
//       const styles = window.getComputedStyle(el)
//       return {
//         outline: styles.outline,
//         outlineWidth: styles.outlineWidth,
//         boxShadow: styles.boxShadow,
//       }
//     })

//     // Should have some form of focus indication
//     const hasFocusStyle =
//       outline.outline !== 'none' ||
//       parseFloat(outline.outlineWidth) > 0 ||
//       outline.boxShadow !== 'none'

//     expect(hasFocusStyle).toBe(true)
//   })
// })
