const { execSync } = require('child_process');
const { browserConfigs, deviceConfigs } = require('../support/browser-config');

// Test configurations
const testConfigs = [
  {
    browser: 'chrome',
    device: 'desktop',
    spec: 'cypress/e2e/**/*.cy.ts'
  },
  {
    browser: 'firefox',
    device: 'desktop',
    spec: 'cypress/e2e/**/*.cy.ts'
  },
  {
    browser: 'edge',
    device: 'desktop',
    spec: 'cypress/e2e/**/*.cy.ts'
  },
  {
    browser: 'chrome',
    device: 'mobile',
    spec: 'cypress/e2e/responsive/*.cy.ts'
  },
  {
    browser: 'chrome',
    device: 'tablet',
    spec: 'cypress/e2e/responsive/*.cy.ts'
  }
];

async function runTests() {
  console.log('Starting cross-browser testing...');
  
  for (const config of testConfigs) {
    console.log(`\nRunning tests for ${config.browser} on ${config.device}...`);
    
    try {
      const command = `npx cypress run --browser ${config.browser} --spec "${config.spec}" --config viewportWidth=${deviceConfigs[config.device].viewport.width},viewportHeight=${deviceConfigs[config.device].viewport.height}`;
      
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log(`✅ Tests passed for ${config.browser} on ${config.device}`);
    } catch (error) {
      console.error(`❌ Tests failed for ${config.browser} on ${config.device}`);
      console.error(error.message);
    }
  }
  
  console.log('\nCross-browser testing completed!');
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };