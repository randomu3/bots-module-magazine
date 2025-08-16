# End-to-End Testing with Cypress

This directory contains comprehensive end-to-end tests for the Telegram Bot Modules Platform using Cypress.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Frontend application running on `http://localhost:3000`
- Backend API running on `http://localhost:5000`

### Installation
```bash
cd frontend
npm install
```

### Running Tests

#### Interactive Mode (Development)
```bash
npm run e2e:open
```

#### Headless Mode (CI/CD)
```bash
npm run e2e
```

#### Browser-Specific Tests
```bash
npm run e2e:chrome    # Chrome browser
npm run e2e:firefox   # Firefox browser
npm run e2e:edge      # Edge browser
```

#### Device-Specific Tests
```bash
npm run e2e:mobile    # Mobile viewport (375x667)
npm run e2e:tablet    # Tablet viewport (768x1024)
npm run e2e:desktop   # Desktop viewport (1920x1080)
```

#### Test Suite-Specific
```bash
npm run e2e:auth         # Authentication tests
npm run e2e:dashboard    # Dashboard functionality tests
npm run e2e:admin        # Admin panel tests
npm run e2e:critical     # Critical user journey tests
npm run e2e:responsive   # Responsive design tests
```

#### Cross-Browser Testing
```bash
npm run e2e:cross-browser
```

## 📁 Test Structure

```
cypress/
├── e2e/                          # End-to-end test files
│   ├── auth/                     # Authentication tests
│   │   └── authentication.cy.ts
│   ├── dashboard/                # Dashboard functionality tests
│   │   ├── bot-management.cy.ts
│   │   ├── module-management.cy.ts
│   │   └── analytics.cy.ts
│   ├── admin/                    # Admin panel tests
│   │   └── admin-panel.cy.ts
│   ├── responsive/               # Responsive design tests
│   │   └── mobile-experience.cy.ts
│   ├── cross-browser/            # Browser compatibility tests
│   │   └── browser-compatibility.cy.ts
│   └── critical-paths/           # Critical user journey tests
│       └── user-journey.cy.ts
├── fixtures/                     # Test data
│   ├── users.json
│   ├── bots.json
│   ├── modules.json
│   └── test-module.zip
├── support/                      # Support files and commands
│   ├── commands.ts               # Custom Cypress commands
│   ├── e2e.ts                   # E2E support file
│   ├── component.ts             # Component testing support
│   └── browser-config.ts        # Browser configurations
├── scripts/                      # Utility scripts
│   ├── run-cross-browser-tests.js
│   └── generate-test-report.js
└── reports/                      # Generated test reports
    ├── test-report.html
    ├── test-report.json
    └── summary.txt
```

## 🧪 Test Categories

### 1. Authentication Tests (`auth/`)
- User registration flow
- Login/logout functionality
- Password reset process
- Email verification
- Form validation

### 2. Dashboard Tests (`dashboard/`)
- **Bot Management**: Connect, configure, and manage Telegram bots
- **Module Management**: Browse, activate, and configure modules
- **Analytics**: Revenue tracking, user metrics, and reporting

### 3. Admin Panel Tests (`admin/`)
- User management and moderation
- Module approval workflow
- Financial oversight
- Support ticket management
- System settings

### 4. Responsive Tests (`responsive/`)
- Mobile experience (iPhone, Android)
- Tablet compatibility (iPad)
- Touch interactions
- Mobile navigation

### 5. Cross-Browser Tests (`cross-browser/`)
- Chrome compatibility
- Firefox compatibility
- Edge compatibility
- Safari compatibility (when available)

### 6. Critical Path Tests (`critical-paths/`)
- Complete user onboarding journey
- End-to-end module activation flow
- Admin workflow testing
- Developer workflow testing

## 🛠 Custom Commands

### Authentication Commands
```typescript
cy.login(email, password)          // Login with credentials
cy.logout()                        // Logout current user
```

### Utility Commands
```typescript
cy.getByTestId(testId)            // Get element by test ID
cy.waitForPageLoad()              // Wait for page to fully load
```

## 📊 Test Data

Test data is stored in the `fixtures/` directory:

- `users.json`: Test user accounts for different roles
- `bots.json`: Sample bot configurations
- `modules.json`: Module catalog data
- `test-module.zip`: Sample module file for upload testing

## 🎯 Test ID Convention

All interactive elements should have `data-testid` attributes:

```html
<!-- Good -->
<button data-testid="login-button">Login</button>
<input data-testid="email-input" type="email" />

<!-- Avoid -->
<button id="btn-1">Login</button>
<input class="form-input" type="email" />
```

## 🔧 Configuration

### Cypress Configuration (`cypress.config.ts`)
- Base URL: `http://localhost:3000`
- Viewport: 1280x720 (default)
- Video recording: Enabled
- Screenshot on failure: Enabled
- Timeouts: 10 seconds

### Environment Variables
```bash
CYPRESS_BASE_URL=http://localhost:3000
CYPRESS_API_URL=http://localhost:5000/api
```

## 📈 Reporting

### HTML Report
Comprehensive visual report with:
- Test summary and metrics
- Browser-specific results
- Individual test details
- Success rate visualization

Generate with:
```bash
node cypress/scripts/generate-test-report.js
```

### CI/CD Integration
GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) runs:
- Cross-browser testing (Chrome, Firefox, Edge)
- Mobile responsive testing
- Critical path validation
- Artifact collection (screenshots, videos)

## 🐛 Debugging

### Local Debugging
1. Run tests in interactive mode: `npm run e2e:open`
2. Use browser developer tools
3. Add `cy.pause()` to pause execution
4. Use `cy.debug()` for debugging information

### CI/CD Debugging
1. Check uploaded artifacts (screenshots, videos)
2. Review test logs in GitHub Actions
3. Run specific test suites locally

## 📝 Best Practices

### Writing Tests
1. **Use descriptive test names**: Clearly describe what the test validates
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Use data-testid**: Avoid relying on CSS classes or IDs
4. **Keep tests independent**: Each test should be able to run in isolation
5. **Use custom commands**: Reuse common actions like login/logout

### Test Data
1. **Use fixtures**: Store test data in JSON files
2. **Generate unique data**: Use timestamps for unique emails/names
3. **Clean up**: Reset state between tests when necessary

### Performance
1. **Minimize API calls**: Use intercepts and mocks when appropriate
2. **Optimize selectors**: Use efficient element selection strategies
3. **Parallel execution**: Run tests in parallel when possible

## 🚨 Troubleshooting

### Common Issues

#### Tests failing locally but passing in CI
- Check viewport differences
- Verify environment variables
- Ensure consistent test data

#### Flaky tests
- Add proper waits (`cy.wait()`, `cy.should()`)
- Use retry logic for unstable elements
- Check for race conditions

#### Slow test execution
- Optimize selectors
- Reduce unnecessary waits
- Use `cy.intercept()` to mock slow API calls

### Getting Help
1. Check Cypress documentation: https://docs.cypress.io/
2. Review test logs and screenshots
3. Use Cypress Discord community
4. Create GitHub issues for platform-specific problems

## 🔄 Continuous Integration

The E2E tests are automatically run on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Nightly scheduled runs (optional)

Test results are available in:
- GitHub Actions logs
- Uploaded artifacts (screenshots, videos)
- Generated HTML reports