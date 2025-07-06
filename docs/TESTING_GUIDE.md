# Testing Guide

## 📊 Overview

This guide provides comprehensive testing strategies and procedures for the GearUp platform. Testing ensures code quality, reliability, and user experience across all platform features.

---

## 🎯 Testing Strategy

### Testing Pyramid
```
    /\
   /  \     E2E Tests (Few)
  /____\    Integration Tests (Some)
 /______\   Unit Tests (Many)
```

### Testing Priorities
1. **Unit Tests**: Core business logic and utilities
2. **Integration Tests**: API endpoints and database operations
3. **End-to-End Tests**: Critical user journeys
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Vulnerability assessment

---

## 🧪 Unit Testing

### Testing Framework Setup

#### Install Dependencies
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
```

#### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
})
```

#### Test Setup
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      single: vi.fn()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn()
      }))
    }
  }))
}))

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    redirectToCheckout: vi.fn()
  }))
}))
```

### Component Testing

#### Basic Component Test
```typescript
// src/components/__tests__/GearCard.test.tsx
import { render, screen } from '@testing-library/react'
import { GearCard } from '../GearCard'
import { describe, it, expect, vi } from 'vitest'

const mockGear = {
  id: '1',
  name: 'Sony A7 III',
  price_per_day: 5000,
  images: ['image1.jpg'],
  owner: {
    full_name: 'John Doe',
    avatar_url: 'avatar.jpg'
  }
}

describe('GearCard', () => {
  it('renders gear information correctly', () => {
    render(<GearCard gear={mockGear} />)
    
    expect(screen.getByText('Sony A7 III')).toBeInTheDocument()
    expect(screen.getByText('50 RON/zi')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const mockOnClick = vi.fn()
    render(<GearCard gear={mockGear} onClick={mockOnClick} />)
    
    const card = screen.getByRole('button')
    await userEvent.click(card)
    
    expect(mockOnClick).toHaveBeenCalledWith(mockGear.id)
  })
})
```

#### Form Component Test
```typescript
// src/components/__tests__/GearForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GearForm } from '../GearForm'
import { describe, it, expect, vi } from 'vitest'

describe('GearForm', () => {
  it('validates required fields', async () => {
    const mockSubmit = vi.fn()
    render(<GearForm onSubmit={mockSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: /salvează/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Numele echipamentului este obligatoriu')).toBeInTheDocument()
      expect(screen.getByText('Prețul pe zi este obligatoriu')).toBeInTheDocument()
    })
    
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const mockSubmit = vi.fn()
    render(<GearForm onSubmit={mockSubmit} />)
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/nume echipament/i), {
      target: { value: 'Sony A7 III' }
    })
    fireEvent.change(screen.getByLabelText(/preț pe zi/i), {
      target: { value: '50' }
    })
    
    const submitButton = screen.getByRole('button', { name: /salvează/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: 'Sony A7 III',
        price_per_day: 5000
      })
    })
  })
})
```

### Hook Testing

#### Custom Hook Test
```typescript
// src/hooks/__tests__/useGear.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useGear } from '../useGear'
import { describe, it, expect, vi } from 'vitest'

describe('useGear', () => {
  it('fetches gear data successfully', async () => {
    const mockGear = [
      { id: '1', name: 'Sony A7 III', price_per_day: 5000 }
    ]
    
    // Mock Supabase response
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockGear, error: null })
      })
    } as any)
    
    const { result } = renderHook(() => useGear('1'))
    
    await waitFor(() => {
      expect(result.current.gear).toEqual(mockGear)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles error states', async () => {
    const mockError = new Error('Failed to fetch')
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError })
      })
    } as any)
    
    const { result } = renderHook(() => useGear('1'))
    
    await waitFor(() => {
      expect(result.current.error).toEqual(mockError)
      expect(result.current.loading).toBe(false)
    })
  })
})
```

### Utility Function Testing

#### Validation Functions
```typescript
// src/utils/__tests__/validation.test.ts
import { validateGearInput, validateEmail, validatePhone } from '../validation'
import { describe, it, expect } from 'vitest'

describe('validation', () => {
  describe('validateGearInput', () => {
    it('validates correct gear input', () => {
      const validInput = {
        name: 'Sony A7 III',
        description: 'Professional camera',
        price_per_day: 5000
      }
      
      expect(validateGearInput(validInput)).toBe(true)
    })

    it('rejects invalid gear input', () => {
      const invalidInputs = [
        { name: '', description: 'Test', price_per_day: 5000 },
        { name: 'Test', description: 'Test', price_per_day: -100 },
        { name: 'A'.repeat(101), description: 'Test', price_per_day: 5000 }
      ]
      
      invalidInputs.forEach(input => {
        expect(validateGearInput(input)).toBe(false)
      })
    })
  })

  describe('validateEmail', () => {
    it('validates correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com'
      ]
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })
})
```

---

## 🔗 Integration Testing

### API Endpoint Testing

#### Supabase Edge Functions Testing
```typescript
// src/functions/__tests__/stripe-create-payment-intent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPaymentIntent } from '../stripe-create-payment-intent'

// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn()
    }
  }))
}))

describe('stripe-create-payment-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates payment intent successfully', async () => {
    const mockPaymentIntent = {
      id: 'pi_test_123',
      client_secret: 'pi_test_secret_123',
      amount: 25000
    }
    
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue(mockPaymentIntent)
    
    const result = await createPaymentIntent({
      booking_id: 'booking_123',
      amount: 25000,
      rental_amount: 15000,
      deposit_amount: 10000
    })
    
    expect(result).toEqual({
      success: true,
      payment_intent: mockPaymentIntent
    })
  })

  it('handles Stripe errors', async () => {
    const mockError = new Error('Payment failed')
    vi.mocked(stripe.paymentIntents.create).mockRejectedValue(mockError)
    
    const result = await createPaymentIntent({
      booking_id: 'booking_123',
      amount: 25000,
      rental_amount: 15000,
      deposit_amount: 10000
    })
    
    expect(result).toEqual({
      success: false,
      error: 'Payment failed'
    })
  })
})
```

### Database Integration Testing

#### Database Operations Testing
```typescript
// src/database/__tests__/bookings.test.ts
import { createBooking, getBooking, updateBookingStatus } from '../bookings'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('bookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates booking successfully', async () => {
    const bookingData = {
      gear_id: 'gear_123',
      renter_id: 'user_123',
      owner_id: 'owner_123',
      start_date: '2024-02-01',
      end_date: '2024-02-03',
      total_days: 3,
      total_amount: 15000,
      deposit_amount: 10000
    }
    
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'booking_123', ...bookingData },
            error: null
          })
        })
      })
    } as any)
    
    const result = await createBooking(bookingData)
    
    expect(result.success).toBe(true)
    expect(result.booking.id).toBe('booking_123')
  })

  it('updates booking status', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'booking_123', status: 'confirmed' },
              error: null
            })
          })
        })
      })
    } as any)
    
    const result = await updateBookingStatus('booking_123', 'confirmed')
    
    expect(result.success).toBe(true)
    expect(result.booking.status).toBe('confirmed')
  })
})
```

---

## 🌐 End-to-End Testing

### Playwright Setup

#### Install Dependencies
```bash
npm install --save-dev @playwright/test
npx playwright install
```

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
})
```

### Critical User Journey Tests

#### User Registration and Login
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can register and login', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/')
    await page.click('text=Înregistrare')
    
    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="full-name-input"]', 'Test User')
    await page.click('[data-testid="register-button"]')
    
    // Verify successful registration
    await expect(page.locator('text=Cont creat cu succes')).toBeVisible()
    
    // Login with new account
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Verify successful login
    await expect(page.locator('text=Test User')).toBeVisible()
  })

  test('user cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Conectare')
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('text=Credențiale invalide')).toBeVisible()
  })
})
```

#### Gear Listing and Booking
```typescript
// tests/e2e/gear-booking.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Gear Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/')
    await page.click('text=Conectare')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
  })

  test('user can create gear listing', async ({ page }) => {
    await page.goto('/add-gear')
    
    // Fill gear form
    await page.fill('[data-testid="gear-name"]', 'Sony A7 III')
    await page.fill('[data-testid="gear-description"]', 'Professional camera')
    await page.selectOption('[data-testid="gear-category"]', 'camere-foto')
    await page.fill('[data-testid="gear-price"]', '50')
    await page.fill('[data-testid="gear-deposit"]', '100')
    await page.fill('[data-testid="gear-location"]', 'Bucharest')
    
    // Upload image
    await page.setInputFiles('[data-testid="gear-images"]', 'tests/fixtures/camera.jpg')
    
    await page.click('[data-testid="save-gear"]')
    
    // Verify gear was created
    await expect(page.locator('text=Sony A7 III')).toBeVisible()
    await expect(page.locator('text=50 RON/zi')).toBeVisible()
  })

  test('user can book gear', async ({ page }) => {
    await page.goto('/browse')
    
    // Click on gear item
    await page.click('[data-testid="gear-card"]')
    
    // Fill booking form
    await page.fill('[data-testid="start-date"]', '2024-02-01')
    await page.fill('[data-testid="end-date"]', '2024-02-03')
    await page.fill('[data-testid="booking-notes"]', 'Please deliver to my address')
    
    await page.click('[data-testid="book-gear"]')
    
    // Verify booking was created
    await expect(page.locator('text=Rezervare creată')).toBeVisible()
  })
})
```

#### Payment Flow
```typescript
// tests/e2e/payment.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Payment Flow', () => {
  test('user can complete payment', async ({ page }) => {
    // Create booking first
    await page.goto('/profile')
    await page.click('text=Rezervările mele')
    await page.click('[data-testid="pay-booking"]')
    
    // Mock Stripe checkout
    await page.route('https://checkout.stripe.com/**', route => {
      route.fulfill({
        status: 200,
        body: '<html><body>Payment successful</body></html>'
      })
    })
    
    await page.click('[data-testid="proceed-payment"]')
    
    // Verify payment success
    await expect(page.locator('text=Plată completată')).toBeVisible()
  })
})
```

---

## ⚡ Performance Testing

### Load Testing with Artillery

#### Install Artillery
```bash
npm install -g artillery
```

#### Load Test Configuration
```yaml
# tests/performance/load-test.yml
config:
  target: 'http://localhost:5173'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: "Browse gear"
    weight: 40
    flow:
      - get:
          url: "/api/gear"
          expect:
            - statusCode: 200
      - think: 2
      - get:
          url: "/api/categories"
          expect:
            - statusCode: 200

  - name: "User authentication"
    weight: 20
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          expect:
            - statusCode: 200

  - name: "Create booking"
    weight: 10
    flow:
      - post:
          url: "/api/bookings"
          json:
            gear_id: "gear_123"
            start_date: "2024-02-01"
            end_date: "2024-02-03"
          expect:
            - statusCode: 201
```

#### Run Load Tests
```bash
# Run load test
artillery run tests/performance/load-test.yml

# Generate report
artillery run --output reports/load-test.json tests/performance/load-test.yml
artillery report reports/load-test.json
```

### Database Performance Testing

#### Query Performance Tests
```typescript
// tests/performance/database.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Database Performance', () => {
  test('gear listing query performance', async ({ request }) => {
    const startTime = Date.now()
    
    const response = await request.get('/api/gear?limit=100')
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    expect(response.status()).toBe(200)
    expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
  })

  test('booking creation performance', async ({ request }) => {
    const startTime = Date.now()
    
    const response = await request.post('/api/bookings', {
      data: {
        gear_id: 'gear_123',
        renter_id: 'user_123',
        start_date: '2024-02-01',
        end_date: '2024-02-03'
      }
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    expect(response.status()).toBe(201)
    expect(responseTime).toBeLessThan(2000) // Should respond within 2 seconds
  })
})
```

---

## 🔒 Security Testing

### Vulnerability Scanning

#### OWASP ZAP Integration
```typescript
// tests/security/security.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  test('XSS protection', async ({ page }) => {
    await page.goto('/add-gear')
    
    // Try to inject script
    await page.fill('[data-testid="gear-name"]', '<script>alert("xss")</script>')
    await page.click('[data-testid="save-gear"]')
    
    // Verify script is not executed
    const content = await page.content()
    expect(content).not.toContain('<script>alert("xss")</script>')
  })

  test('SQL injection protection', async ({ page }) => {
    await page.goto('/browse')
    
    // Try SQL injection in search
    await page.fill('[data-testid="search-input"]', "'; DROP TABLE gear; --")
    await page.click('[data-testid="search-button"]')
    
    // Verify page still loads
    await expect(page.locator('text=Echipamente')).toBeVisible()
  })

  test('CSRF protection', async ({ request }) => {
    // Test without CSRF token
    const response = await request.post('/api/bookings', {
      data: {
        gear_id: 'gear_123',
        start_date: '2024-02-01',
        end_date: '2024-02-03'
      }
    })
    
    expect(response.status()).toBe(403) // Should be rejected
  })
})
```

### Authentication Testing

#### Authentication Flow Tests
```typescript
// tests/security/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Security', () => {
  test('password requirements', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Înregistrare')
    
    // Try weak password
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', '123')
    await page.click('[data-testid="register-button"]')
    
    await expect(page.locator('text=Parola trebuie să aibă cel puțin 6 caractere')).toBeVisible()
  })

  test('session management', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.click('text=Conectare')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Verify protected route access
    await page.goto('/profile')
    await expect(page.locator('text=Profilul meu')).toBeVisible()
    
    // Clear session
    await page.evaluate(() => localStorage.clear())
    
    // Try to access protected route
    await page.goto('/profile')
    await expect(page.locator('text=Conectare')).toBeVisible()
  })
})
```

---

## 📊 Test Coverage

### Coverage Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

---

## 🚀 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

### Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest --config vitest.config.ts",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:performance": "artillery run tests/performance/load-test.yml"
  }
}
```

---

## 📋 Testing Checklist

### Pre-Release Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance tests within limits
- [ ] Security tests passing
- [ ] Coverage above 80%
- [ ] Accessibility tests passing
- [ ] Cross-browser compatibility verified

### Manual Testing
- [ ] User registration flow
- [ ] User login/logout
- [ ] Gear listing creation
- [ ] Gear browsing and search
- [ ] Booking creation and management
- [ ] Payment processing
- [ ] Messaging system
- [ ] Review system
- [ ] Admin functions (if applicable)

### Performance Testing
- [ ] Page load times under 3 seconds
- [ ] API response times under 1 second
- [ ] Database query performance
- [ ] Image upload performance
- [ ] Concurrent user handling

### Security Testing
- [ ] Authentication bypass attempts
- [ ] SQL injection attempts
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Input validation
- [ ] Authorization checks

---

## 🛠 Testing Tools

### Recommended Tools
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **Artillery**: Load testing
- **OWASP ZAP**: Security testing
- **Lighthouse**: Performance testing
- **axe-core**: Accessibility testing

### Browser Testing
- **Chrome**: Primary browser
- **Firefox**: Secondary browser
- **Safari**: macOS compatibility
- **Edge**: Windows compatibility
- **Mobile browsers**: iOS Safari, Chrome Mobile

---

This comprehensive testing guide ensures code quality, reliability, and user experience across all aspects of the GearUp platform. 