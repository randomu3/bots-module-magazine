const fs = require('fs');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.results = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0
      },
      browsers: {},
      devices: {},
      testSuites: []
    };
  }

  generateReport(resultsDir = 'cypress/results') {
    console.log('Generating comprehensive test report...');
    
    try {
      // Read test results from various sources
      this.readCypressResults(resultsDir);
      
      // Generate HTML report
      this.generateHTMLReport();
      
      // Generate JSON report
      this.generateJSONReport();
      
      // Generate summary
      this.generateSummary();
      
      console.log('Test report generated successfully!');
    } catch (error) {
      console.error('Error generating test report:', error);
    }
  }

  readCypressResults(resultsDir) {
    const resultsPath = path.join(process.cwd(), resultsDir);
    
    if (!fs.existsSync(resultsPath)) {
      console.warn('Results directory not found:', resultsPath);
      return;
    }

    const files = fs.readdirSync(resultsPath);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(resultsPath, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.processTestResults(data);
      }
    });
  }

  processTestResults(data) {
    if (data.runs) {
      data.runs.forEach(run => {
        this.results.summary.totalTests += run.stats.tests;
        this.results.summary.passedTests += run.stats.passes;
        this.results.summary.failedTests += run.stats.failures;
        this.results.summary.skippedTests += run.stats.skipped;
        this.results.summary.duration += run.stats.duration;

        // Process by browser
        const browser = run.browserName || 'unknown';
        if (!this.results.browsers[browser]) {
          this.results.browsers[browser] = {
            tests: 0,
            passed: 0,
            failed: 0,
            duration: 0
          };
        }
        
        this.results.browsers[browser].tests += run.stats.tests;
        this.results.browsers[browser].passed += run.stats.passes;
        this.results.browsers[browser].failed += run.stats.failures;
        this.results.browsers[browser].duration += run.stats.duration;

        // Process test suites
        if (run.tests) {
          run.tests.forEach(test => {
            this.results.testSuites.push({
              title: test.title,
              fullTitle: test.fullTitle,
              state: test.state,
              duration: test.duration,
              browser: browser,
              spec: run.spec.relative
            });
          });
        }
      });
    }
  }

  generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report - Telegram Bot Platform</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .metric {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .metric.passed { border-left: 4px solid #28a745; }
        .metric.failed { border-left: 4px solid #dc3545; }
        .metric.total { border-left: 4px solid #007bff; }
        .metric.duration { border-left: 4px solid #ffc107; }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .section {
            padding: 30px;
            border-top: 1px solid #eee;
        }
        .section h2 {
            margin-top: 0;
            color: #333;
        }
        .browser-results {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .browser-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
        }
        .browser-name {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        .test-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .test-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .test-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .test-status.passed {
            background: #d4edda;
            color: #155724;
        }
        .test-status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .test-status.skipped {
            background: #fff3cd;
            color: #856404;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>E2E Test Report</h1>
            <p>Telegram Bot Modules Platform</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric total">
                <div class="metric-value">${this.results.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric passed">
                <div class="metric-value">${this.results.summary.passedTests}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric failed">
                <div class="metric-value">${this.results.summary.failedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric duration">
                <div class="metric-value">${Math.round(this.results.summary.duration / 1000)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Overall Progress</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(this.results.summary.passedTests / this.results.summary.totalTests * 100) || 0}%"></div>
            </div>
            <p>Success Rate: ${Math.round((this.results.summary.passedTests / this.results.summary.totalTests * 100) || 0)}%</p>
        </div>
        
        <div class="section">
            <h2>Browser Results</h2>
            <div class="browser-results">
                ${Object.entries(this.results.browsers).map(([browser, stats]) => `
                    <div class="browser-card">
                        <div class="browser-name">${browser.charAt(0).toUpperCase() + browser.slice(1)}</div>
                        <p>Tests: ${stats.tests} | Passed: ${stats.passed} | Failed: ${stats.failed}</p>
                        <p>Duration: ${Math.round(stats.duration / 1000)}s</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(stats.passed / stats.tests * 100) || 0}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="section">
            <h2>Test Details</h2>
            <div class="test-list">
                ${this.results.testSuites.map(test => `
                    <div class="test-item">
                        <div>
                            <strong>${test.title}</strong>
                            <br>
                            <small>${test.spec} (${test.browser})</small>
                        </div>
                        <div class="test-status ${test.state}">${test.state}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync('cypress/reports/test-report.html', html);
    console.log('HTML report generated: cypress/reports/test-report.html');
  }

  generateJSONReport() {
    const reportDir = 'cypress/reports';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, 'test-report.json'),
      JSON.stringify(this.results, null, 2)
    );
    console.log('JSON report generated: cypress/reports/test-report.json');
  }

  generateSummary() {
    const summary = `
E2E Test Summary
================
Total Tests: ${this.results.summary.totalTests}
Passed: ${this.results.summary.passedTests}
Failed: ${this.results.summary.failedTests}
Skipped: ${this.results.summary.skippedTests}
Success Rate: ${Math.round((this.results.summary.passedTests / this.results.summary.totalTests * 100) || 0)}%
Duration: ${Math.round(this.results.summary.duration / 1000)}s

Browser Breakdown:
${Object.entries(this.results.browsers).map(([browser, stats]) => 
  `${browser}: ${stats.passed}/${stats.tests} passed (${Math.round(stats.passed / stats.tests * 100)}%)`
).join('\n')}
`;

    fs.writeFileSync('cypress/reports/summary.txt', summary);
    console.log('Summary generated: cypress/reports/summary.txt');
    console.log(summary);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport();
}

module.exports = TestReportGenerator;