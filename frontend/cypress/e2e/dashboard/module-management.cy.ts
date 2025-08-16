describe('Module Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPassword123!')
    cy.visit('/dashboard/modules')
    cy.waitForPageLoad()
  })

  describe('Module Catalog', () => {
    it('should display available modules', () => {
      cy.getByTestId('module-catalog').should('be.visible')
      cy.getByTestId('module-item').should('have.length.greaterThan', 0)
    })

    it('should filter modules by category', () => {
      cy.getByTestId('category-filter').select('Payment')
      cy.getByTestId('module-item').each(($el) => {
        cy.wrap($el).should('contain', 'Payment')
      })
    })

    it('should search modules by name', () => {
      cy.getByTestId('module-search').type('Payment Gateway')
      cy.getByTestId('module-item').should('contain', 'Payment Gateway')
    })

    it('should display module details', () => {
      cy.getByTestId('module-item').first().click()
      cy.getByTestId('module-details-modal').should('be.visible')
      cy.getByTestId('module-description').should('be.visible')
      cy.getByTestId('module-price').should('be.visible')
      cy.getByTestId('module-features').should('be.visible')
    })
  })

  describe('Module Activation', () => {
    it('should activate a free module', () => {
      // Find a free module
      cy.getByTestId('module-item').contains('Free').first().within(() => {
        cy.getByTestId('activate-module-button').click()
      })
      
      cy.getByTestId('module-activation-modal').should('be.visible')
      
      // Select bot
      cy.getByTestId('bot-select').select('Test Bot')
      
      // Set markup percentage
      cy.getByTestId('markup-input').type('10')
      
      cy.getByTestId('confirm-activation-button').click()
      
      cy.contains('Module activated successfully').should('be.visible')
    })

    it('should handle paid module activation', () => {
      // Find a paid module
      cy.getByTestId('module-item').contains('$').first().within(() => {
        cy.getByTestId('activate-module-button').click()
      })
      
      cy.getByTestId('module-activation-modal').should('be.visible')
      cy.getByTestId('bot-select').select('Test Bot')
      cy.getByTestId('markup-input').type('15')
      cy.getByTestId('confirm-activation-button').click()
      
      // Should redirect to payment page
      cy.url().should('include', '/payment')
    })

    it('should validate markup percentage', () => {
      cy.getByTestId('module-item').first().within(() => {
        cy.getByTestId('activate-module-button').click()
      })
      
      cy.getByTestId('module-activation-modal').should('be.visible')
      cy.getByTestId('bot-select').select('Test Bot')
      
      // Try invalid markup
      cy.getByTestId('markup-input').type('-5')
      cy.getByTestId('confirm-activation-button').click()
      
      cy.contains('Markup must be between 0 and 100').should('be.visible')
    })
  })

  describe('Active Modules', () => {
    it('should display active modules', () => {
      cy.getByTestId('active-modules-tab').click()
      cy.getByTestId('active-module-item').should('have.length.greaterThan', 0)
    })

    it('should allow deactivating modules', () => {
      cy.getByTestId('active-modules-tab').click()
      
      cy.getByTestId('active-module-item').first().within(() => {
        cy.getByTestId('deactivate-module-button').click()
      })
      
      cy.getByTestId('confirm-deactivation-button').click()
      cy.contains('Module deactivated successfully').should('be.visible')
    })

    it('should allow updating module settings', () => {
      cy.getByTestId('active-modules-tab').click()
      
      cy.getByTestId('active-module-item').first().within(() => {
        cy.getByTestId('module-settings-button').click()
      })
      
      cy.getByTestId('module-settings-modal').should('be.visible')
      cy.getByTestId('markup-input').clear().type('20')
      cy.getByTestId('save-settings-button').click()
      
      cy.contains('Module settings updated').should('be.visible')
    })
  })

  describe('Module Upload (Developer)', () => {
    it('should allow developers to upload modules', () => {
      // Switch to developer mode or visit developer section
      cy.visit('/dashboard/modules/upload')
      cy.waitForPageLoad()
      
      cy.getByTestId('module-name-input').type('Test Module')
      cy.getByTestId('module-description-input').type('A test module for demonstration')
      cy.getByTestId('module-category-select').select('Utility')
      cy.getByTestId('module-price-input').type('9.99')
      
      // Upload module file
      cy.getByTestId('module-file-input').selectFile('cypress/fixtures/test-module.zip')
      
      cy.getByTestId('upload-module-button').click()
      
      cy.contains('Module uploaded successfully').should('be.visible')
      cy.contains('Your module is now under review').should('be.visible')
    })
  })
})