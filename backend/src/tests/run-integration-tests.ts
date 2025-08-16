#!/usr/bin/env ts-node

/**
 * Integration Test Runner
 * 
 * This script runs all integration tests in the correct order and provides
 * comprehensive reporting on test results, coverage, and performance.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface TestSummary {
  totalSuites: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage: number;
  results: TestResult[];
}

class IntegrationTestRunner {
  private testSuites: string[] = [
    'auth.integration.test.ts',
    'user.integration.test.ts',
    'bot.integration.test.ts',
    'telegram.integration.test.ts',
    'payment.integration.test.ts',
    'analytics.integration.test.ts',
    'notification.integration.test.ts',
    'support.integration.test.ts',
    'admin.integration.test.ts',
    'service-interactions.integration.test.ts'
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting Integration Test Suite');
    console.log('=====================================\n');

    // Setup test environment
    await this.setupTestEnvironment();

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate summary
    const summary = this.generateSummary();
    
    // Generate reports
    await this.generateReports(summary);

    return summary;
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.BOT_TOKEN_SECRET = 'test-bot-token-secret';
    
    // Clear any existing test data
    try {
      execSync('npm run test:cleanup', { stdio: 'pipe' });
    } catch (error) {
      // Cleanup script might not exist, that's okay
    }

    console.log('✅ Test environment ready\n');
  }

  private async runTestSuite(suiteName: string): Promise<void> {
    console.log(`📋 Running ${suiteName}...`);
    const startTime = Date.now();

    try {
      const testPath = path.join(__dirname, 'integration', suiteName);
      
      // Run the test suite with Jest
      const command = `npx jest ${testPath} --verbose --coverage --testTimeout=30000 --forceExit`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        cwd: path.join(__dirname, '../../..')
      });

      const duration = Date.now() - startTime;
      const result = this.parseJestOutput(suiteName, output, duration);
      this.results.push(result);

      console.log(`✅ ${suiteName} completed - ${result.passed} passed, ${result.failed} failed (${duration}ms)`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        coverage: 0
      };
      
      this.results.push(result);
      console.log(`❌ ${suiteName} failed - ${error.message}`);
      
      // Log error details for debugging
      if (error.stdout) {
        console.log('STDOUT:', error.stdout.toString());
      }
      if (error.stderr) {
        console.log('STDERR:', error.stderr.toString());
      }
    }

    console.log(''); // Empty line for readability
  }

  private parseJestOutput(suiteName: string, output: string, duration: number): TestResult {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let coverage = 0;

    // Look for test results summary
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed/);
        if (match) passed = parseInt(match[1]);
        
        const failMatch = line.match(/(\d+) failed/);
        if (failMatch) failed = parseInt(failMatch[1]);
        
        const skipMatch = line.match(/(\d+) skipped/);
        if (skipMatch) skipped = parseInt(skipMatch[1]);
      }
      
      // Extract coverage percentage
      if (line.includes('All files') && line.includes('%')) {
        const coverageMatch = line.match(/(\d+\.?\d*)%/);
        if (coverageMatch) coverage = parseFloat(coverageMatch[1]);
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      coverage
    };
  }

  private generateSummary(): TestSummary {
    const totalSuites = this.results.length;
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    // Calculate weighted average coverage
    const totalCoverage = this.results.reduce((sum, r) => sum + (r.coverage || 0), 0);
    const overallCoverage = totalCoverage / totalSuites;

    return {
      totalSuites,
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      results: this.results
    };
  }

  private async generateReports(summary: TestSummary): Promise<void> {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Test Suites: ${summary.totalSuites}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.totalPassed}`);
    console.log(`❌ Failed: ${summary.totalFailed}`);
    console.log(`⏭️  Skipped: ${summary.totalSkipped}`);
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📈 Overall Coverage: ${summary.overallCoverage.toFixed(2)}%`);

    // Detailed results per suite
    console.log('\n📋 Detailed Results by Suite');
    console.log('=============================');
    
    for (const result of summary.results) {
      const status = result.failed > 0 ? '❌' : '✅';
      const coverageStr = result.coverage ? `${result.coverage.toFixed(1)}%` : 'N/A';
      
      console.log(`${status} ${result.suite}`);
      console.log(`   Tests: ${result.passed + result.failed + result.skipped} (${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped)`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
      console.log(`   Coverage: ${coverageStr}`);
      console.log('');
    }

    // Generate JSON report
    const reportPath = path.join(__dirname, '../../../test-reports');
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary,
      environment: {
        node_version: process.version,
        platform: process.platform,
        test_environment: process.env.NODE_ENV
      }
    };

    fs.writeFileSync(
      path.join(reportPath, 'integration-test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    await this.generateHtmlReport(jsonReport, reportPath);

    console.log(`📄 Reports generated in: ${reportPath}`);
  }

  private async generateHtmlReport(report: any, reportPath: string): Promise<void> {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { margin: 10px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .suite.failed { border-left-color: #dc3545; }
        .suite h4 { margin: 0 0 10px 0; }
        .suite-stats { display: flex; gap: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Integration Test Results</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment.test_environment} | Node: ${report.environment.node_version} | Platform: ${report.environment.platform}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value passed">${report.summary.totalPassed}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value failed">${report.summary.totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value">${report.summary.overallCoverage.toFixed(2)}%</div>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <div class="value">${(report.summary.totalDuration / 1000).toFixed(2)}s</div>
        </div>
    </div>

    <h2>Test Suites</h2>
    ${report.summary.results.map((result: TestResult) => `
        <div class="suite ${result.failed > 0 ? 'failed' : ''}">
            <h4>${result.suite} ${result.failed > 0 ? '❌' : '✅'}</h4>
            <div class="suite-stats">
                <span>Tests: ${result.passed + result.failed + result.skipped}</span>
                <span class="passed">Passed: ${result.passed}</span>
                <span class="failed">Failed: ${result.failed}</span>
                <span class="skipped">Skipped: ${result.skipped}</span>
                <span>Duration: ${(result.duration / 1000).toFixed(2)}s</span>
                <span>Coverage: ${result.coverage ? result.coverage.toFixed(1) + '%' : 'N/A'}</span>
            </div>
        </div>
    `).join('')}
</body>
</html>`;

    fs.writeFileSync(
      path.join(reportPath, 'integration-test-results.html'),
      htmlContent
    );
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  
  runner.runAllTests()
    .then((summary) => {
      const exitCode = summary.totalFailed > 0 ? 1 : 0;
      
      if (exitCode === 0) {
        console.log('\n🎉 All integration tests passed!');
      } else {
        console.log('\n💥 Some integration tests failed!');
      }
      
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { IntegrationTestRunner };