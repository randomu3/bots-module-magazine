describe('Mobile Experience', () => {
  beforeEach(() => {
    // Set mobile viewport
    cy.viewport('iphone-x')
  })

  describe('Mobile Navigation', () => {
    it('should display mobile menu correctly', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard')
      cy.waitForPageLoad()
      
      // Mobile menu should be collapsed by default
      cy.getByTestId('mobile-menu-button').should('be.visible')
      cy.getByTestId('desktop-navigation').should('not.be.visible')
      
      // Open mobile menu
      cy.getByTestId('mobile-menu-button').click()
      cy.getByTestId('mobile-menu').should('be.visible')
      
      // Navigation items should be visible
      cy.getByTestId('nav-dashboard').should('be.visible')
      cy.getByTestId('nav-bots').should('be.visible')
      cy.getByTestId('nav-modules').should('be.visible')
      cy.getByTestId('nav-analytics').should('be.visible')
    })

    it('should navigate correctly on mobile', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard')
      cy.waitForPageLoad()
      
      cy.getByTestId('mobile-menu-button').click()
      cy.getByTestId('nav-bots').click()
      
      cy.url().should('include', '/dashboard/bots')
      cy.getByTestId('mobile-menu').should('not.be.visible')
    })
  })

  describe('Mobile Forms', () => {
    it('should handle login form on mobile', () => {
      cy.visit('/auth/login')
      cy.waitForPageLoad()
      
      // Form should be properly sized for mobile
      cy.getByTestId('login-form').should('be.visible')
      cy.getByTestId('email-input').should('be.visible')
      cy.getByTestId('password-input').should('be.visible')
      
      // Fill and submit form
      cy.getByTestId('email-input').type('test@example.com')
      cy.getByTestId('password-input').type('TestPassword123!')
      cy.getByTestId('login-button').click()
      
      cy.url().should('include', '/dashboard')
    })

    it('should handle bot connection on mobile', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard/bots')
      cy.waitForPageLoad()
      
      cy.getByTestId('add-bot-button').click()
      cy.getByTestId('add-bot-modal').should('be.visible')
      
      // Modal should be properly sized for mobile
      cy.getByTestId('bot-token-input').should('be.visible')
      cy.getByTestId('bot-token-input').type('1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRss')
      cy.getByTestId('connect-bot-button').click()
    })
  })

  describe('Mobile Tables and Lists', () => {
    it('should display bot list properly on mobile', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard/bots')
      cy.waitForPageLoad()
      
      // List should be responsive
      cy.getByTestId('bot-list').should('be.visible')
      cy.getByTestId('bot-item').should('be.visible')
      
      // Cards should stack vertically on mobile
      cy.getByTestId('bot-item').should('have.css', 'display', 'block')
    })

    it('should handle module catalog on mobile', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard/modules')
      cy.waitForPageLoad()
      
      cy.getByTestId('module-catalog').should('be.visible')
      cy.getByTestId('module-item').should('be.visible')
      
      // Module cards should be properly sized
      cy.getByTestId('module-item').first().click()
      cy.getByTestId('module-details-modal').should('be.visible')
    })
  })

  describe('Touch Interactions', () => {
    it('should handle swipe gestures', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard/analytics')
      cy.waitForPageLoad()
      
      // Test swipe on charts if implemented
      cy.getByTestId('revenue-chart').should('be.visible')
      
      // Simulate touch events
      cy.getByTestId('revenue-chart')
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
        .trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] })
        .trigger('touchend')
    })
  })
})

describe('Tablet Experience', () => {
  beforeEach(() => {
    // Set tablet viewport
    cy.viewport('ipad-2')
  })

  describe('Tablet Layout', () => {
    it('should display properly on tablet', () => {
      cy.login('test@example.com', 'TestPassword123!')
      cy.visit('/dashboard')
      cy.waitForPageLoad()
      
      // Should show desktop-like navigation on tablet
      cy.getByTestId('desktop-navigation').should('be.visible')
      cy.getByTestId('mobile-menu-button').should('not.be.visible')
    })

    it('should handle forms properly on tablet', () => {
      cy.visit('/auth/register')
      cy.waitForPageLoad()
      
      // Form should be well-sized for tablet
      cy.getByTestId('register-form').should('be.visible')
      
      // Fill form
      cy.getByTestId('first-name-input').type('John')
      cy.getByTestId('last-name-input').type('Doe')
      cy.getByTestId('email-input').type('john.doe@example.com')
      cy.getByTestId('password-input').type('SecurePassword123!')
      cy.getByTestId('confirm-password-input').type('SecurePassword123!')
      
      cy.getByTestId('register-button').click()
      cy.url().should('include', '/auth/verify-email')
    })
  })
})