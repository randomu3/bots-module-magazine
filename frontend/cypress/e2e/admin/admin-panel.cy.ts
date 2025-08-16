describe('Admin Panel', () => {
  beforeEach(() => {
    // Login as admin user
    cy.login('admin@example.com', 'AdminPassword123!')
    cy.visit('/admin')
    cy.waitForPageLoad()
  })

  describe('Admin Dashboard', () => {
    it('should display admin dashboard with key metrics', () => {
      cy.getByTestId('admin-dashboard').should('be.visible')
      cy.getByTestId('total-users-metric').should('be.visible')
      cy.getByTestId('total-bots-metric').should('be.visible')
      cy.getByTestId('total-revenue-metric').should('be.visible')
      cy.getByTestId('active-modules-metric').should('be.visible')
    })

    it('should display recent activity feed', () => {
      cy.getByTestId('recent-activity').should('be.visible')
      cy.getByTestId('activity-item').should('have.length.greaterThan', 0)
    })
  })

  describe('User Management', () => {
    it('should display user list with search and filters', () => {
      cy.visit('/admin/users')
      cy.waitForPageLoad()
      
      cy.getByTestId('user-list').should('be.visible')
      cy.getByTestId('user-item').should('have.length.greaterThan', 0)
      
      // Test search functionality
      cy.getByTestId('user-search').type('john')
      cy.getByTestId('user-item').should('contain', 'john')
    })

    it('should allow blocking and unblocking users', () => {
      cy.visit('/admin/users')
      cy.waitForPageLoad()
      
      cy.getByTestId('user-item').first().within(() => {
        cy.getByTestId('user-actions-menu').click()
        cy.getByTestId('block-user-button').click()
      })
      
      cy.getByTestId('confirm-block-button').click()
      cy.contains('User blocked successfully').should('be.visible')
      
      // Verify user status changed
      cy.getByTestId('user-item').first().should('contain', 'Blocked')
    })

    it('should display user details and activity', () => {
      cy.visit('/admin/users')
      cy.waitForPageLoad()
      
      cy.getByTestId('user-item').first().click()
      cy.getByTestId('user-details-modal').should('be.visible')
      
      cy.getByTestId('user-info').should('be.visible')
      cy.getByTestId('user-bots').should('be.visible')
      cy.getByTestId('user-transactions').should('be.visible')
    })
  })

  describe('Module Moderation', () => {
    it('should display pending modules for review', () => {
      cy.visit('/admin/modules')
      cy.waitForPageLoad()
      
      cy.getByTestId('pending-modules-tab').click()
      cy.getByTestId('pending-module-item').should('be.visible')
    })

    it('should allow approving modules', () => {
      cy.visit('/admin/modules')
      cy.waitForPageLoad()
      
      cy.getByTestId('pending-modules-tab').click()
      
      cy.getByTestId('pending-module-item').first().within(() => {
        cy.getByTestId('review-module-button').click()
      })
      
      cy.getByTestId('module-review-modal').should('be.visible')
      cy.getByTestId('approve-module-button').click()
      
      cy.getByTestId('approval-reason').type('Module meets all requirements')
      cy.getByTestId('confirm-approval-button').click()
      
      cy.contains('Module approved successfully').should('be.visible')
    })

    it('should allow rejecting modules', () => {
      cy.visit('/admin/modules')
      cy.waitForPageLoad()
      
      cy.getByTestId('pending-modules-tab').click()
      
      cy.getByTestId('pending-module-item').first().within(() => {
        cy.getByTestId('review-module-button').click()
      })
      
      cy.getByTestId('module-review-modal').should('be.visible')
      cy.getByTestId('reject-module-button').click()
      
      cy.getByTestId('rejection-reason').type('Module does not meet security requirements')
      cy.getByTestId('confirm-rejection-button').click()
      
      cy.contains('Module rejected').should('be.visible')
    })
  })

  describe('Financial Management', () => {
    it('should display financial overview', () => {
      cy.visit('/admin/finances')
      cy.waitForPageLoad()
      
      cy.getByTestId('revenue-overview').should('be.visible')
      cy.getByTestId('commission-breakdown').should('be.visible')
      cy.getByTestId('pending-payouts').should('be.visible')
    })

    it('should process withdrawal requests', () => {
      cy.visit('/admin/withdrawals')
      cy.waitForPageLoad()
      
      cy.getByTestId('withdrawal-request').first().within(() => {
        cy.getByTestId('process-withdrawal-button').click()
      })
      
      cy.getByTestId('withdrawal-modal').should('be.visible')
      cy.getByTestId('approve-withdrawal-button').click()
      
      cy.contains('Withdrawal processed').should('be.visible')
    })
  })

  describe('Support Management', () => {
    it('should display support tickets', () => {
      cy.visit('/admin/support')
      cy.waitForPageLoad()
      
      cy.getByTestId('support-tickets').should('be.visible')
      cy.getByTestId('ticket-item').should('have.length.greaterThan', 0)
    })

    it('should allow responding to tickets', () => {
      cy.visit('/admin/support')
      cy.waitForPageLoad()
      
      cy.getByTestId('ticket-item').first().click()
      cy.getByTestId('ticket-details-modal').should('be.visible')
      
      cy.getByTestId('response-textarea').type('Thank you for contacting support. We will help you resolve this issue.')
      cy.getByTestId('send-response-button').click()
      
      cy.contains('Response sent').should('be.visible')
    })

    it('should allow closing tickets', () => {
      cy.visit('/admin/support')
      cy.waitForPageLoad()
      
      cy.getByTestId('ticket-item').first().within(() => {
        cy.getByTestId('close-ticket-button').click()
      })
      
      cy.getByTestId('confirm-close-button').click()
      cy.contains('Ticket closed').should('be.visible')
    })
  })

  describe('System Settings', () => {
    it('should allow updating platform settings', () => {
      cy.visit('/admin/settings')
      cy.waitForPageLoad()
      
      cy.getByTestId('platform-settings').should('be.visible')
      
      // Update commission rate
      cy.getByTestId('commission-rate-input').clear().type('15')
      cy.getByTestId('save-settings-button').click()
      
      cy.contains('Settings updated').should('be.visible')
    })
  })
})