const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Bootstrap dotenv
require('dotenv').config();

// Ensure db.json is fresh or clear it so we have a clean test state
const dbPath = path.resolve('data/db.json');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Reset target app.js to the initial buggy state before running tests
const appJsPath = path.resolve('src/test-samples/sample-ecommerce/app.js');
if (fs.existsSync(appJsPath)) {
  let content = fs.readFileSync(appJsPath, 'utf8');
  // Revert fix if already applied
  if (content.includes('emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/')) {
    console.log('[E2E Test] Reverting app.js to buggy state...');
    content = content.replace(
      'emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/',
      'emailRegex = /^[^+\\s@]+@[^\\s@]+\\.[^\\s@]+$/'
    );
    fs.writeFileSync(appJsPath, content, 'utf8');
  }
}

// Import and start Express server on port 3030
console.log('[E2E Test] Booting Express Backend Server...');
const serverFile = path.resolve('dist/index.js');
if (!fs.existsSync(serverFile)) {
  console.error('[E2E Test] Compiled dist/index.js not found. Make sure backend is compiled.');
  process.exit(1);
}

// Start the server by requiring it (Express listens on 3030 automatically)
const serverInstance = require(serverFile);

// Helper delay
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runVerification() {
  // Give the server 12 seconds to initialize the default project
  await sleep(12000);

  const apiBase = 'http://localhost:3030/api';
  console.log('\n[E2E Test] Starting API pipeline verification...');

  try {
    // 1. Fetch registered projects (with polling fallback)
    console.log('[E2E Test] Fetching registered projects...');
    let projects = [];
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        const res = await axios.get(`${apiBase}/projects`);
        projects = res.data;
        if (projects.length > 0) {
          break;
        }
      } catch (e) {
        // ignore errors during startup
      }
      console.log(`  [Attempt ${attempt}/15] Waiting for project initialization...`);
      await sleep(2000);
    }

    if (projects.length === 0) {
      throw new Error('No registered projects found after waiting.');
    }
    const project = projects[0];
    const projectId = project.id;
    console.log(`[E2E Test] Verified project: ${project.name} (ID: ${projectId})`);

    // 2. Scan codebase and build Knowledge Graph
    console.log(`[E2E Test] POST /api/projects/${projectId}/analyze`);
    const scanRes = await axios.post(`${apiBase}/projects/${projectId}/analyze`);
    const nodesCount = scanRes.data.knowledgeGraph?.nodes.length || 0;
    const linksCount = scanRes.data.knowledgeGraph?.links.length || 0;
    console.log(`[E2E Test] Scan complete. Found ${nodesCount} nodes, ${linksCount} dependencies.`);

    // 3. Perform gap analysis against spec sheets
    console.log(`[E2E Test] POST /api/projects/${projectId}/analyze-docs`);
    const gapRes = await axios.post(`${apiBase}/projects/${projectId}/analyze-docs`);
    console.log(`[E2E Test] Gap Analysis completed. Compliance score: ${gapRes.data.gapAnalysis.matchingScore}%`);

    // 4. Generate test cases
    console.log(`[E2E Test] POST /api/projects/${projectId}/generate-tests`);
    const testGenRes = await axios.post(`${apiBase}/projects/${projectId}/generate-tests`);
    const tests = testGenRes.data;
    console.log(`[E2E Test] Generated ${tests.length} automated test cases.`);

    // 5. Run initial regression suite (should fail on checkout regex validator)
    console.log(`[E2E Test] POST /api/projects/${projectId}/run-tests (First Execution)`);
    const run1Res = await axios.post(`${apiBase}/projects/${projectId}/run-tests`);
    const run1 = run1Res.data;
    console.log(`[E2E Test] Run 1 Status: ${run1.status.toUpperCase()}`);
    console.log(`  Passed: ${run1.passedTests}, Failed: ${run1.failedTests}`);

    const failedTestResult = run1.results.find(r => r.status === 'failed');
    if (!failedTestResult) {
      throw new Error('Expected checkout test case validation to fail, but all tests passed.');
    }
    console.log(`[E2E Test] Captured expected failure on test: "${failedTestResult.name}"`);

    // 6. Trigger AI Root Cause Analysis & Self-Healing Patch
    console.log(`[E2E Test] POST /api/runs/${run1.id}/heal`);
    const healRes = await axios.post(`${apiBase}/runs/${run1.id}/heal`, {
      testId: failedTestResult.testId,
      testName: failedTestResult.name,
      errorMessage: failedTestResult.error.message,
      stackTrace: failedTestResult.error.stack
    });
    const healedBug = healRes.data;
    console.log(`[E2E Test] AI Root Cause: ${healedBug.rootCause}`);
    console.log(`[E2E Test] Proposed PR Branch: ${healedBug.prBranch}`);

    // 7. Approve and Commit Code Fix (applies diff patch to target app.js)
    console.log(`[E2E Test] POST /api/healed-bugs/${healedBug.id}/commit`);
    await axios.post(`${apiBase}/healed-bugs/${healedBug.id}/commit`);
    console.log(`[E2E Test] Code patch committed successfully!`);

    // 8. Re-run regression suite against healed target codebase
    console.log(`[E2E Test] POST /api/projects/${projectId}/run-tests (Second Execution)`);
    const run2Res = await axios.post(`${apiBase}/projects/${projectId}/run-tests`);
    const run2 = run2Res.data;
    console.log(`[E2E Test] Run 2 Status: ${run2.status.toUpperCase()}`);
    console.log(`  Passed: ${run2.passedTests}, Failed: ${run2.failedTests}`);

    if (run2.status !== 'passed' || run2.failedTests !== 0) {
      throw new Error(`Self-healing failed. Regression suite still reports failures: ${run2.failedTests}`);
    }
    console.log('\n[E2E Test] 🚀 SUCCESS! The application was successfully scanned, tested, healed, and validated!');
    
    // Shut down gracefully
    process.exit(0);

  } catch (err) {
    console.error('\n[E2E Test] ❌ Verification failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runVerification();
