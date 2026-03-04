# Frontend Testing Guide

This guide explains how to test the frontend application, including both automated tests and manual testing procedures.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [Manual Testing](#manual-testing)
6. [Testing Checklist](#testing-checklist)

---

## Quick Start

### Prerequisites

All testing dependencies are already installed. If you need to reinstall:

```bash
cd frontend
npm install
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (for CI/CD pipelines)
npm run test:ci
```

---

## Running Tests

### Automated Testing

The project uses **Jest** and **React Testing Library** for automated testing.

#### Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode (auto-rerun on changes) |
| `npm run test:coverage` | Run tests and generate coverage report |
| `npm run test:ci` | Run tests optimized for CI/CD |

#### Test Output

When you run `npm test`, you'll see:

```
PASS  src/components/ui/__tests__/Button.test.tsx
PASS  src/lib/__tests__/utils.test.ts
PASS  src/hooks/__tests__/useSummaryForm.test.tsx

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

#### Coverage Report

Run `npm run test:coverage` to see code coverage:

```
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|----------|---------|--------
All files |   65.23 |    58.33 |   62.50 |   65.23
```

Coverage reports are saved to `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser for a detailed view.

---

## Test Structure

Tests are organized as follows:

```
frontend/
├── src/
│   ├── __tests__/
│   │   ├── utils/
│   │   │   └── test-utils.tsx      # Test utilities and helpers
│   │   └── integration/
│   │       └── dashboard.test.tsx  # Integration tests
│   ├── components/
│   │   └── ui/
│   │       └── __tests__/
│   │           └── Button.test.tsx # Component unit tests
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useSummaryForm.test.tsx # Hook tests
│   └── lib/
│       └── __tests__/
│           └── utils.test.ts       # Utility function tests
├── jest.config.js                  # Jest configuration
└── jest.setup.js                   # Test setup and mocks
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.test.tsx` (in `__tests__/integration/`)
- Test files should be co-located with the code they test, or in `__tests__` folders

---

## Writing Tests

### Component Tests

Example: Testing a Button component

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Tests

Example: Testing a custom hook

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSummaryForm } from '../useSummaryForm'

describe('useSummaryForm hook', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSummaryForm())
    
    expect(result.current.urlText).toBe('')
    expect(result.current.hasValidUrls).toBe(false)
  })
})
```

### Utility Function Tests

Example: Testing a utility function

```typescript
import { cn } from '../utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
})
```

### Best Practices

1. **Test user behavior, not implementation details**
   - ✅ Good: `screen.getByRole('button', { name: /submit/i })`
   - ❌ Bad: `container.querySelector('.submit-button')`

2. **Use descriptive test names**
   - ✅ Good: `'disables button when no valid URLs are provided'`
   - ❌ Bad: `'test button'`

3. **Keep tests isolated**
   - Each test should be independent
   - Use `beforeEach` to reset state between tests

4. **Mock external dependencies**
   - Mock API calls, browser APIs, and Next.js router
   - See `jest.setup.js` for global mocks

---

## Manual Testing

**Yes, you can and should test manually in Chrome!** Manual testing is essential for:

- Visual verification
- User experience testing
- Browser-specific issues
- Performance testing
- Accessibility testing

### How to Test Manually

#### 1. Start the Development Server

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`

#### 2. Open in Chrome

Navigate to `http://localhost:3000/app` (or wherever your app is hosted)

#### 3. Manual Testing Checklist

Use this checklist when testing manually:

##### Basic Functionality
- [ ] Page loads without errors
- [ ] URL input accepts YouTube links
- [ ] URL validation works (shows errors for invalid URLs)
- [ ] Preset selection works
- [ ] Custom prompt input works
- [ ] Language selector works
- [ ] "Summarize" button is enabled/disabled correctly
- [ ] Form submission works

##### Processing State
- [ ] Processing overlay appears when job starts
- [ ] Whimsical loader animates correctly
- [ ] Progress bar updates
- [ ] Status messages display correctly
- [ ] Connection status banner shows (if applicable)

##### Result Display
- [ ] Result card appears after processing
- [ ] Markdown renders correctly
- [ ] Copy button works
- [ ] "New Batch" button resets form
- [ ] Streaming text appears in real-time

##### Error Handling
- [ ] Error messages display correctly
- [ ] Retry button works
- [ ] Network errors are handled gracefully
- [ ] Invalid input shows helpful errors

##### Responsive Design
- [ ] Test on mobile viewport (< 640px)
- [ ] Test on tablet viewport (640px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Layout adapts correctly at breakpoints

##### Accessibility
- [ ] Tab navigation works
- [ ] Focus indicators are visible
- [ ] Screen reader announces status changes
- [ ] Keyboard shortcuts work (Ctrl+Enter, Ctrl+N)
- [ ] Color contrast is sufficient

##### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if on Mac)
- [ ] Test in Edge

### Browser DevTools

Use Chrome DevTools for debugging:

1. **Console Tab**: Check for JavaScript errors
   - Open DevTools (F12)
   - Look for red error messages
   - Check for warnings

2. **Network Tab**: Monitor API calls
   - Filter by "Fetch/XHR" to see API requests
   - Check SSE connections (EventSource)
   - Verify request/response payloads

3. **React DevTools**: Inspect component state
   - Install React DevTools extension
   - Inspect component props and state
   - Monitor re-renders

4. **Performance Tab**: Check performance
   - Record performance profile
   - Check for layout shifts
   - Monitor frame rate during animations

### Testing SSE (Server-Sent Events)

To test SSE connections:

1. Open Network tab in DevTools
2. Filter by "EventSource" or "SSE"
3. Start a summary job
4. Verify:
   - Connection is established
   - Events are received (`connected`, `fetching`, `processing`, etc.)
   - Events contain correct data structure
   - Connection closes on completion

### Testing Edge Cases

Manually test these scenarios:

1. **Empty Input**
   - Submit form with no URLs
   - Should show validation error

2. **Invalid URLs**
   - Paste non-YouTube URLs
   - Should highlight invalid lines

3. **Network Failure**
   - Disconnect internet
   - Start a job
   - Should show error and retry option

4. **Long Input**
   - Paste 50+ URLs
   - Verify performance and UI responsiveness

5. **Rapid Clicks**
   - Click "Summarize" multiple times quickly
   - Should prevent duplicate submissions

---

## Testing Checklist

### Before Committing Code

- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run lint` - no linting errors
- [ ] Manual test in Chrome - basic flow works
- [ ] Check console for errors
- [ ] Test on mobile viewport

### Before Deploying

- [ ] All automated tests pass (`npm test`)
- [ ] Coverage meets threshold (50% minimum)
- [ ] Manual testing checklist completed
- [ ] Tested in multiple browsers
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Accessibility tested

### Weekly Testing

- [ ] Run full test suite
- [ ] Review coverage report
- [ ] Test new features manually
- [ ] Test regression scenarios
- [ ] Update test documentation

---

## Troubleshooting

### Tests Fail to Run

**Problem**: `jest: command not found`

**Solution**: 
```bash
npm install
```

### Tests Fail with Module Errors

**Problem**: Cannot find module '@/components/...'

**Solution**: Check `jest.config.js` - `moduleNameMapper` should map `@/` to `src/`

### Tests Fail with "window is not defined"

**Problem**: Server-side rendering issue

**Solution**: Ensure `testEnvironment: 'jest-environment-jsdom'` in `jest.config.js`

### Coverage Report Not Generated

**Problem**: Coverage folder not created

**Solution**: Run `npm run test:coverage` (not just `npm test`)

### Manual Testing: Page Won't Load

**Problem**: `localhost:3000` shows error

**Solution**: 
1. Check if dev server is running: `npm run dev`
2. Check console for errors
3. Verify backend is running (if API calls are made)
4. Check `.env.local` for correct API URL

---

## Next Steps

1. **Write More Tests**: Add tests for components that don't have coverage yet
2. **Increase Coverage**: Aim for 70%+ coverage
3. **E2E Testing**: Consider adding Playwright or Cypress for end-to-end tests
4. **Visual Regression**: Consider adding visual regression testing (e.g., Chromatic, Percy)

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)

---

**Last Updated**: [Current Date]
**Maintained By**: Development Team

