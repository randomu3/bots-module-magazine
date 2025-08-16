describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear any existing sessions
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('User Registration', () => {
    it('should allow new user registration', () => {
      cy.visit('/auth/register')
      cy.waitForPageLoad()

      // Fill registration form
      cy.getByTestId('first-name-input').type('John')
      cy.getByTestId('last-name-input').type('Doe')
      cy.getByTestId('email-input').type('john.doe@example.com')
      cy.getByTestId('password-input').type('SecurePassword123!')
      cy.getByTestId('confirm-password-input').type('SecurePassword123!')

      // Submit registration
      cy.getByTestId('register-button').click()

      // Should redirect to email verification page
      cy.url().should('include', '/auth/verify-email')
      cy.contains('Please check your email').should('be.visible')
    })

    it('should show validation errors for invalid data', () => {
      cy.visit('/auth/register')
      cy.waitForPageLoad()

      // Try to submit empty form
      cy.getByTestId('register-button').click()

      // Should show validation errors
      cy.contains('First name is required').should('be.visible')
      cy.contains('Last name is required').should('be.visible')
      cy.contains('Email is required').should('be.visible')
      cy.contains('Password is required').should('be.visible')
    })

    it('should validate password strength', () => {
      cy.visit('/auth/register')
      cy.waitForPageLoad()

      cy.getByTestId('first-name-input').type('John')
      cy.getByTestId('last-name-input').type('Doe')
      cy.getByTestId('email-input').type('john.doe@example.com')
      cy.getByTestId('password-input').type('weak')
      cy.getByTestId('confirm-password-input').type('weak')

      cy.getByTestId('register-button').click()

      cy.contains('Password must be at least 8 characters').should('be.visible')
    })
  })

  describe('User Login', () => {
    it('should allow existing user to login', () => {
      cy.visit('/auth/login')
      cy.waitForPageLoad()

      // Fill login form with valid credentials
      cy.getByTestId('email-input').type('test@example.com')
      cy.getByTestId('password-input').type('TestPassword123!')
      cy.getByTestId('login-button').click()

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      cy.contains('Welcome').should('be.visible')
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/login')
      cy.waitForPageLoad()

      cy.getByTestId('email-input').type('invalid@example.com')
      cy.getByTestId('password-input').type('wrongpassword')
      cy.getByTestId('login-button').click()

      cy.contains('Invalid email or password').should('be.visible')
    })

    it('should redirect to login when accessing protected routes', () => {
      cy.visit('/dashboard')
      cy.url().should('include', '/auth/login')
    })
  })

  describe('Password Reset', () => {
    it('should allow password reset request', () => {
      cy.visit('/auth/login')
      cy.waitForPageLoad()

      cy.getByTestId('forgot-password-link').click()
      cy.url().should('include', '/auth/forgot-password')

      cy.getByTestId('email-input').type('test@example.com')
      cy.getByTestId('reset-password-button').click()

      cy.contains('Password reset email sent').should('be.visible')
    })
  })

  describe('Logout', () => {
    it('should allow user to logout', () => {
      // First login
      cy.login('test@example.com', 'TestPassword123!')

      // Then logout
      cy.logout()

      // Should be redirected to login page
      cy.url().should('include', '/auth/login')
    })
  })
})