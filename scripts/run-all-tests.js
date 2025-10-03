#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all tests and generates a complete test report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting comprehensive test suite...\n');

const testResults = {
  timestamp: new Date().toISOString(),
  unit: { passed: 0, failed: 0, total: 0, duration: 0 },
  integration: { passed: 0, failed: 0, total: 0, duration: 0 },
  e2e: { passed: 0, failed: 0, total: 0, duration: 0 },
  coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
  errors: []
};

// Helper function to run command and capture output
function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  const startTime = Date.now();
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const duration = Date.now() - startTime;
    console.log(`✅ ${description} completed in ${duration}ms\n`);
    return { success: true, output, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${description} failed in ${duration}ms`);
    console.error(error.stdout || error.message);
    console.log('');
    return { success: false, error: error.message, duration };
  }
}

// 1. Run unit tests
console.log('📋 Running Unit Tests');
console.log('====================');

const unitTestResult = runCommand('npm run test:run -- --reporter=json', 'Unit tests');

if (unitTestResult.success) {
  try {
    const testOutput = JSON.parse(unitTestResult.output);
    testResults.unit.passed = testOutput.numPassedTests || 0;
    testResults.unit.failed = testOutput.numFailedTests || 0;
    testResults.unit.total = testOutput.numTotalTests || 0;
    testResults.unit.duration = unitTestResult.duration;
    
    console.log(`✅ Unit Tests: ${testResults.unit.passed}/${testResults.unit.total} passed`);
  } catch (parseError) {
    console.log('⚠️  Could not parse unit test results, but tests completed');
  }
} else {
  testResults.errors.push({
    type: 'unit',
    message: unitTestResult.error
  });
}

// 2. Run integration tests
console.log('\n📋 Running Integration Tests');
console.log('============================');

const integrationTestResult = runCommand(
  'npm run test:run -- --reporter=json src/test/integration/', 
  'Integration tests'
);

if (integrationTestResult.success) {
  try {
    const testOutput = JSON.parse(integrationTestResult.output);
    testResults.integration.passed = testOutput.numPassedTests || 0;
    testResults.integration.failed = testOutput.numFailedTests || 0;
    testResults.integration.total = testOutput.numTotalTests || 0;
    testResults.integration.duration = integrationTestResult.duration;
    
    console.log(`✅ Integration Tests: ${testResults.integration.passed}/${testResults.integration.total} passed`);
  } catch (parseError) {
    console.log('⚠️  Could not parse integration test results, but tests completed');
  }
} else {
  testResults.errors.push({
    type: 'integration',
    message: integrationTestResult.error
  });
}

// 3. Generate test coverage report
console.log('\n📊 Generating Coverage Report');
console.log('=============================');

const coverageResult = runCommand(
  'npm run test:run -- --coverage --reporter=json', 
  'Coverage analysis'
);

if (coverageResult.success) {
  try {
    // Try to read coverage summary
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverageData.total;
      
      testResults.coverage = {
        lines: total.lines.pct,
        functions: total.functions.pct,
        branches: total.branches.pct,
        statements: total.statements.pct
      };
      
      console.log(`📊 Coverage Summary:`);
      console.log(`   Lines: ${total.lines.pct}%`);
      console.log(`   Functions: ${total.functions.pct}%`);
      console.log(`   Branches: ${total.branches.pct}%`);
      console.log(`   Statements: ${total.statements.pct}%`);
    }
  } catch (parseError) {
    console.log('⚠️  Could not parse coverage results');
  }
}

// 4. Build the application for E2E tests
console.log('\n🔨 Building Application for E2E Tests');
console.log('=====================================');

const buildResult = runCommand('npm run build', 'Production build');

if (!buildResult.success) {
  console.error('❌ Build failed, skipping E2E tests');
  testResults.errors.push({
    type: 'build',
    message: buildResult.error
  });
} else {
  // 5. Run E2E tests
  console.log('\n🎭 Running End-to-End Tests');
  console.log('===========================');

  const e2eResult = runCommand('npm run test:e2e -- --reporter=json', 'E2E tests');

  if (e2eResult.success) {
    try {
      // Parse Playwright results
      const lines = e2eResult.output.split('\n');
      const resultLine = lines.find(line => line.includes('passed') || line.includes('failed'));
      
      if (resultLine) {
        const passedMatch = resultLine.match(/(\d+) passed/);
        const failedMatch = resultLine.match(/(\d+) failed/);
        
        testResults.e2e.passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        testResults.e2e.failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        testResults.e2e.total = testResults.e2e.passed + testResults.e2e.failed;
        testResults.e2e.duration = e2eResult.duration;
      }
      
      console.log(`✅ E2E Tests: ${testResults.e2e.passed}/${testResults.e2e.total} passed`);
    } catch (parseError) {
      console.log('⚠️  Could not parse E2E test results, but tests completed');
    }
  } else {
    testResults.errors.push({
      type: 'e2e',
      message: e2eResult.error
    });
  }
}

// 6. Generate comprehensive test report
console.log('\n📝 Generating Test Report');
console.log('=========================');

const totalTests = testResults.unit.total + testResults.integration.total + testResults.e2e.total;
const totalPassed = testResults.unit.passed + testResults.integration.passed + testResults.e2e.passed;
const totalFailed = testResults.unit.failed + testResults.integration.failed + testResults.e2e.failed;
const totalDuration = testResults.unit.duration + testResults.integration.duration + testResults.e2e.duration;

const report = {
  ...testResults,
  summary: {
    totalTests,
    totalPassed,
    totalFailed,
    totalDuration,
    successRate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0
  }
};

// Save detailed report
try {
  fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
  console.log('✅ Detailed test report saved to test-report.json');
} catch (error) {
  console.error('❌ Error saving test report:', error.message);
}

// Display summary
console.log('\n🎯 Test Summary');
console.log('===============');
console.log(`📊 Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
console.log(`📈 Success Rate: ${report.summary.successRate}%`);

if (testResults.coverage.lines > 0) {
  console.log(`🎯 Code Coverage: ${testResults.coverage.lines}%`);
}

// Display errors if any
if (testResults.errors.length > 0) {
  console.log('\n⚠️  Issues Found:');
  testResults.errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.type.toUpperCase()}: ${error.message}`);
  });
}

// Quality gates
console.log('\n🚦 Quality Gates');
console.log('================');

const qualityGates = [
  {
    name: 'Test Success Rate',
    value: report.summary.successRate,
    threshold: 95,
    unit: '%'
  },
  {
    name: 'Code Coverage',
    value: testResults.coverage.lines,
    threshold: 80,
    unit: '%'
  },
  {
    name: 'Build Success',
    value: buildResult.success ? 100 : 0,
    threshold: 100,
    unit: '%'
  }
];

let allGatesPassed = true;

qualityGates.forEach(gate => {
  const passed = gate.value >= gate.threshold;
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${gate.name}: ${gate.value}${gate.unit} (threshold: ${gate.threshold}${gate.unit})`);
  
  if (!passed) {
    allGatesPassed = false;
  }
});

// Final result
console.log('\n🏁 Final Result');
console.log('===============');

if (allGatesPassed && totalFailed === 0) {
  console.log('🎉 All tests passed and quality gates met!');
  console.log('✅ Ready for deployment!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed or quality gates not met');
  console.log('🔧 Please review and fix issues before deployment');
  process.exit(1);
}