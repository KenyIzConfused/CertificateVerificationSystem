# Testing Guide

## Test Types

### 1. Unit Tests (Node.js/Functions)
Tests for pure functions in `tools/functions/index.js`. Run with:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:ui       # Vitest UI
```

### 2. Frontend Tests (Browser JS)
The frontend uses ES modules loaded from Firebase CDN. Testing options:

**End-to-End (Recommended):**
```bash
npm install -D playwright @playwright/test
npx playwright test
```

**Unit Testing ((jsdom):**
- Requires mocking Firebase CDN imports
- Complex setup for browser-specific code (localStorage, document, etc.)

## Project Structure for Tests

- `tests/` - Unit tests for Node.js code
- `e2e/` - Playwright tests (create this for frontend)

## Mock Firebase Functions

For testing frontend code, use Playwright to test in real browsers:

```javascript
// e2e/settings.spec.js
import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    // Login first
    await page.fill('#email', 'admin@test.com');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
  });

  test('saves settings', async ({ page }) => {
    await page.fill('#departmentName', 'New Department');
    await page.selectOption('#themeSelect', 'blue');
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast')).toContainText('Settings saved successfully');
  });
});
```

## What to Test

**Frontend (manual testing recommended):**
- UI interactions (form submissions, button clicks)
- Firebase auth state changes
- Real-time Firestore data updates

**Backend Functions:**
- Input validation (eventCode format, password length)
- Business logic (invite code generation, admin claims)
- Error handling (permission denied, not found)