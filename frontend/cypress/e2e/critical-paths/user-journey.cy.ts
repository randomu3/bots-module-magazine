describe('Critical User Journey', () => {
  it('should complete full user onboarding and module activation flow', () => {
    // Step 1: User Registration
    cy.visit('/auth/register')
    cy.waitForPageLoad()
    
    const timestamp = Date.now()
    const testEmail = `test${timestamp}@example.com`
    
    cy.getByTestId('first-name-input').type('Test')
    cy.getByTestId('last-name-input').type('User')
    cy.getByTestId('email-input').type(testEmail)
    cy.getByTestId('password-input').type('TestPassword123!')
    cy.getByTestId('confirm-password-input').type('TestPassword123!')
    cy.getByTestId('register-button').click()
    
    // Should redirect to email verification
    cy.url().should('include', '/auth/verify-email')
    
    // Step 2: Simulate email verification (in real scenario, this would be done via email)
    // For testing, we'll directly navigate to login
    cy.visit('/auth/login')
    cy.waitForPageLoad()
    
    // Step 3: User Login
    cy.getByTestId('email-input').type(testEmail)
    cy.getByTestId('password-input').type('TestPassword123!')
    cy.getByTestId('login-button').click()
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard')
    cy.contains('Welcome').should('be.visible')
    
    // Step 4: Connect First Bot
    cy.visit('/dashboard/bots')
    cy.waitForPageLoad()
    
    cy.getByTestId('add-bot-button').click()
    cy.getByTestId('add-bot-modal').should('be.visible')
    
    cy.getByTestId('bot-token-input').type('1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRss')
    cy.getByTestId('connect-bot-button').click()
    
    cy.contains('Bot connected successfully').should('be.visible')
    
    // Step 5: Browse and Activate Module
    cy.visit('/dashboard/modules')
    cy.waitForPageLoad()
    
    // Find and activate a free module
    cy.getByTestId('module-item').contains('Free').first().within(() => {
      cy.getByTestId('activate-module-button').click()
    })
    
    cy.getByTestId('module-activation-modal').should('be.visible')
    cy.getByTestId('bot-select').select('Test Bot')
    cy.getByTestId('markup-input').type('10')
    cy.getByTestId('confirm-activation-button').click()
    
    cy.contains('Module activated successfully').should('be.visible')
    
    // Step 6: Check Analytics
    cy.visit('/dashboard/analytics')
    cy.waitForPageLoad()
    
    cy.getByTestId('revenue-chart').should('be.visible')
    cy.getByTestId('revenue-total').should('be.visible')
    
    // Step 7: Update Profile
    cy.visit('/dashboard/profile')
    cy.waitForPageLoad()
    
    cy.getByTestId('first-name-input').clear().type('Updated Test')
    cy.getByTestId('save-profile-button').click()
    
    cy.contains('Profile updated successfully').should('be.visible')
    
    // Step 8: Test Support System
    cy.visit('/dashboard/support')
    cy.waitForPageLoad()
    
    cy.getByTestId('create-ticket-button').click()
    cy.getByTestId('ticket-subject-input').type('Test Support Ticket')
    cy.getByTestId('ticket-message-input').type('This is a test support ticket to verify the system works correctly.')
    cy.getByTestId('submit-ticket-button').click()
    
    cy.contains('Support ticket created').should('be.visible')
    
    // Step 9: Logout
    cy.logout()
    cy.url().should('include', '/auth/login')
  })

  it('should handle admin workflow', () => {
    // Admin login
    cy.login('admin@example.com', 'AdminPassword123!')
    
    // Step 1: Review Dashboard
    cy.visit('/admin')
    cy.waitForPageLoad()
    
    cy.getByTestId('admin-dashboard').should('be.visible')
    cy.getByTestId('total-users-metric').should('be.visible')
    
    // Step 2: Manage Users
    cy.visit('/admin/users')
    cy.waitForPageLoad()
    
    cy.getByTestId('user-list').should('be.visible')
    cy.getByTestId('user-search').type('test')
    cy.getByTestId('user-item').should('contain', 'test')
    
    // Step 3: Review Modules
    cy.visit('/admin/modules')
    cy.waitForPageLoad()
    
    cy.getByTestId('pending-modules-tab').click()
    
    // If there are pending modules, review one
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="pending-module-item"]').length > 0) {
        cy.getByTestId('pending-module-item').first().within(() => {
          cy.getByTestId('review-module-button').click()
        })
        
        cy.getByTestId('module-review-modal').should('be.visible')
        cy.getByTestId('approve-module-button').click()
        cy.getByTestId('approval-reason').type('Module meets all requirements')
        cy.getByTestId('confirm-approval-button').click()
      }
    })
    
    // Step 4: Check Financial Overview
    cy.visit('/admin/finances')
    cy.waitForPageLoad()
    
    cy.getByTestId('revenue-overview').should('be.visible')
    cy.getByTestId('commission-breakdown').should('be.visible')
    
    // Step 5: Handle Support Tickets
    cy.visit('/admin/support')
    cy.waitForPageLoad()
    
    cy.getByTestId('support-tickets').should('be.visible')
    
    // If there are tickets, respond to one
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="ticket-item"]').length > 0) {
        cy.getByTestId('ticket-item').first().click()
        cy.getByTestId('ticket-details-modal').should('be.visible')
        
        cy.getByTestId('response-textarea').type('Thank you for your inquiry. We will investigate this issue.')
        cy.getByTestId('send-response-button').click()
        
        cy.contains('Response sent').should('be.visible')
      }
    })
    
    cy.logout()
  })

  it('should handle developer workflow', () => {
    // Developer login
    cy.login('developer@example.com', 'DevPassword123!')
    
    // Step 1: Upload Module
    cy.visit('/dashboard/modules/upload')
    cy.waitForPageLoad()
    
    cy.getByTestId('module-name-input').type('Test Developer Module')
    cy.getByTestId('module-description-input').type('A comprehensive test module for the platform')
    cy.getByTestId('module-category-select').select('Utility')
    cy.getByTestId('module-price-input').type('19.99')
    
    // Upload module file
    cy.getByTestId('module-file-input').selectFile('cypress/fixtures/test-module.zip')
    
    cy.getByTestId('upload-module-button').click()
    cy.contains('Module uploaded successfully').should('be.visible')
    
    // Step 2: Check Module Status
    cy.visit('/dashboard/modules/my-modules')
    cy.waitForPageLoad()
    
    cy.getByTestId('my-modules-list').should('be.visible')
    cy.getByTestId('module-item').should('contain', 'Test Developer Module')
    
    // Step 3: View Analytics for Modules
    cy.visit('/dashboard/analytics/modules')
    cy.waitForPageLoad()
    
    cy.getByTestId('module-analytics').should('be.visible')
    
    cy.logout()
  })
})