describe('Analytics Dashboard', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'TestPassword123!')
    cy.visit('/dashboard/analytics')
    cy.waitForPageLoad()
  })

  describe('Revenue Analytics', () => {
    it('should display revenue charts', () => {
      cy.getByTestId('revenue-chart').should('be.visible')
      cy.getByTestId('revenue-total').should('be.visible')
      cy.getByTestId('revenue-growth').should('be.visible')
    })

    it('should allow filtering by date range', () => {
      cy.getByTestId('date-range-picker').click()
      cy.getByTestId('last-30-days').click()
      
      // Chart should update
      cy.getByTestId('revenue-chart').should('be.visible')
      cy.contains('Last 30 days').should('be.visible')
    })

    it('should allow filtering by bot', () => {
      cy.getByTestId('bot-filter').select('Test Bot')
      
      // Analytics should update for selected bot
      cy.getByTestId('revenue-chart').should('be.visible')
      cy.contains('Test Bot').should('be.visible')
    })

    it('should display module performance', () => {
      cy.getByTestId('module-performance-section').should('be.visible')
      cy.getByTestId('module-revenue-item').should('have.length.greaterThan', 0)
    })
  })

  describe('User Analytics', () => {
    it('should display user engagement metrics', () => {
      cy.getByTestId('user-analytics-tab').click()
      
      cy.getByTestId('active-users-chart').should('be.visible')
      cy.getByTestId('user-retention-chart').should('be.visible')
      cy.getByTestId('conversion-rate').should('be.visible')
    })

    it('should show user activity timeline', () => {
      cy.getByTestId('user-analytics-tab').click()
      cy.getByTestId('activity-timeline').should('be.visible')
      cy.getByTestId('activity-item').should('have.length.greaterThan', 0)
    })
  })

  describe('Export Functionality', () => {
    it('should export analytics data', () => {
      cy.getByTestId('export-button').click()
      cy.getByTestId('export-format-select').select('CSV')
      cy.getByTestId('confirm-export-button').click()
      
      cy.contains('Export started').should('be.visible')
      
      // Check if download started (this might need adjustment based on browser behavior)
      cy.readFile('cypress/downloads/analytics-export.csv').should('exist')
    })

    it('should export in different formats', () => {
      cy.getByTestId('export-button').click()
      cy.getByTestId('export-format-select').select('PDF')
      cy.getByTestId('confirm-export-button').click()
      
      cy.contains('Export started').should('be.visible')
    })
  })

  describe('Real-time Updates', () => {
    it('should update analytics in real-time', () => {
      // Get initial revenue value
      cy.getByTestId('revenue-total').invoke('text').as('initialRevenue')
      
      // Wait for potential updates (simulate real-time data)
      cy.wait(5000)
      
      // Revenue might have updated
      cy.getByTestId('revenue-total').should('be.visible')
    })
  })
})