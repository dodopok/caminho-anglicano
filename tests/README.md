# Test Suite Documentation

This directory contains the comprehensive test suite for the Caminho Anglicano application.

## Test Structure

```
tests/
├── unit/                    # Unit tests for utilities, composables, and components
│   ├── utils/              # Utility function tests
│   │   ├── adminAuth.test.ts
│   │   ├── validation.test.ts
│   │   ├── rateLimit.test.ts
│   │   ├── submissionTransformer.test.ts
│   │   └── geocoding.test.ts
│   ├── composables/        # Composable tests
│   └── components/         # Component tests
├── integration/            # Integration tests for API endpoints and workflows
│   ├── api/               # API endpoint tests
│   └── workflows/         # Complex workflow tests
├── e2e/                   # End-to-end tests with Playwright
│   ├── user-submit-church.spec.ts
│   └── admin-approval.spec.ts
└── setup.ts               # Global test setup and mocks
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test tests/unit/utils/adminAuth.test.ts
```

### Coverage
```bash
# Generate coverage report
pnpm test:coverage

# Coverage report will be in ./coverage/index.html
```

### E2E Tests
```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run specific E2E test
pnpm test:e2e tests/e2e/user-submit-church.spec.ts
```

## Test Coverage Goals

The test suite aims for the following coverage thresholds:

- **Lines**: 75%
- **Statements**: 75%
- **Functions**: 75%
- **Branches**: 75%

### Per-File Coverage Targets

Critical files should have higher coverage:
- `adminAuth.ts`: 95%
- `validation.ts`: 90%
- `rateLimit.ts`: 85%
- `submissionTransformer.ts`: 90%
- `geocoding.ts`: 75%

## Test Categories

### 🔴 Critical (Priority 1)
Tests for security and data integrity:
- Admin authentication (`adminAuth.test.ts`)
- Data validation schemas (`validation.test.ts`)
- Rate limiting (`rateLimit.test.ts`)

### 🟠 High (Priority 2)
Tests for core business logic:
- Submission transformation (`submissionTransformer.test.ts`)
- Geocoding integration (`geocoding.test.ts`)
- API endpoint integration tests

### 🟡 Medium (Priority 3)
Tests for features and components:
- Composable tests
- Component tests
- E2E user flows

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle valid input', () => {
    const result = myFunction('valid')
    expect(result).toBe('expected')
  })

  it('should throw on invalid input', () => {
    expect(() => myFunction('invalid')).toThrow()
  })
})
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Flow', () => {
  test('should complete user action', async ({ page }) => {
    await page.goto('/page')
    await page.getByRole('button').click()
    await expect(page.getByText('Success')).toBeVisible()
  })
})
```

## Mocking

### Environment Variables
All required environment variables are mocked in `tests/setup.ts`:
- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_EMAIL`
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### External APIs
External API calls should be mocked using `vi.mock()`:
```typescript
vi.mock('#imports', () => ({
  $fetch: vi.fn(),
}))
```

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

The CI pipeline runs:
1. Type checking (`pnpm typecheck`)
2. Linting (`pnpm lint`)
3. Unit tests (`pnpm test:unit`)
4. Coverage check (fails if below 75%)
5. E2E tests (`pnpm test:e2e`)

## Debugging Tests

### Debug in VS Code
Add a debug configuration to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "--run", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug E2E Tests
```bash
# Run with headed browser
pnpm exec playwright test --headed

# Run with debug mode
pnpm exec playwright test --debug

# Run specific test with trace
pnpm exec playwright test --trace on tests/e2e/user-submit-church.spec.ts
```

## Common Issues

### Test Timeout
Increase timeout for slow tests:
```typescript
test('slow test', async () => {
  // ...
}, { timeout: 30000 })
```

### Mock Not Working
Ensure mocks are defined before imports:
```typescript
vi.mock('module', () => ({ ... }))
import { function } from 'module'
```

### E2E Test Flakiness
Use `waitFor` and proper selectors:
```typescript
await page.waitForSelector('[data-testid="element"]')
await expect(page.getByText('text')).toBeVisible({ timeout: 10000 })
```

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use descriptive names** - Test names should explain what they test
3. **Arrange-Act-Assert** - Follow the AAA pattern
4. **Mock external dependencies** - Don't make real API calls in unit tests
5. **Test edge cases** - Include tests for error conditions
6. **Keep tests fast** - Unit tests should run in milliseconds
7. **Use fixtures** - Reuse test data with fixtures
8. **Clean up after tests** - Reset state in `afterEach` hooks

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
