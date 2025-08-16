describe('Bot Management', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('test@example.com', 'TestPassword123!')
    cy.visit('/dashboard/bots')
    cy.waitForPageLoad()
  })

  describe('Bot Connection', () => {
    it('should allow adding a new bot', () => {
      cy.getByTestId('add-bot-button').click()
      
      // Modal should open
      cy.getByTestId('add-bot-modal').should('be.visible')
      
      // Fill bot token
      cy.getByTestId('bot-token-input').type('1234567890:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRss')
      cy.getByTestId('connect-bot-button').click()
      
      // Should show success message
      cy.contains('Bot connected successfully').should('be.visible')
      
      // Bot should appear in the list
      cy.getByTestId('bot-list').should('contain', 'Test Bot')
    })

    it('should validate bot token format', () => {
      cy.getByTestId('add-bot-button').click()
      cy.getByTestId('bot-token-input').type('invalid-token')
      cy.getByTestId('connect-bot-button').click()
      
      cy.contains('Invalid bot token format').should('be.visible')
    })

    it('should handle invalid bot tokens', () => {
      cy.getByTestId('add-bot-button').click()
      cy.getByTestId('bot-token-input').type('1234567890:InvalidTokenThatDoesNotExist')
      cy.getByTestId('connect-bot-button').click()
      
      cy.contains('Bot not found or token is invalid').should('be.visible')
    })
  })

  describe('Bot Settings', () => {
    it('should allow editing bot settings', () => {
      // Assuming there's at least one bot in the list
      cy.getByTestId('bot-item').first().within(() => {
        cy.getByTestId('bot-settings-button').click()
      })
      
      cy.getByTestId('bot-settings-modal').should('be.visible')
      
      // Update bot name
      cy.getByTestId('bot-name-input').clear().type('Updated Bot Name')
      cy.getByTestId('save-settings-button').click()
      
      cy.contains('Bot settings updated').should('be.visible')
    })

    it('should allow removing a bot', () => {
      cy.getByTestId('bot-item').first().within(() => {
        cy.getByTestId('bot-settings-button').click()
      })
      
      cy.getByTestId('bot-settings-modal').should('be.visible')
      cy.getByTestId('remove-bot-button').click()
      
      // Confirmation dialog
      cy.getByTestId('confirm-remove-button').click()
      
      cy.contains('Bot removed successfully').should('be.visible')
    })
  })

  describe('Bot Status Monitoring', () => {
    it('should display bot status correctly', () => {
      cy.getByTestId('bot-item').first().within(() => {
        cy.getByTestId('bot-status').should('be.visible')
        cy.getByTestId('bot-status').should('contain.text', 'Active')
      })
    })

    it('should refresh bot status', () => {
      cy.getByTestId('refresh-bots-button').click()
      cy.contains('Bot status updated').should('be.visible')
    })
  })
})