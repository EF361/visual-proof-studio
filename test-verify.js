const fs = require('fs');
const path = require('path');
const app = require('./src/server');
const { planInstructions } = require('./src/planner');
const { generateFlowchartGif } = require('./src/flowchartAnimator');
const { recordWalkthrough, validateConfig } = require('./src/walkthrough');
const { isPrivateIp } = require('./src/urlSafety');

const TEST_PORT = 3001;
const OUTPUT_DIR = path.join(__dirname, 'public', 'outputs', 'test');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectError(fn, pattern, label) {
  try {
    await fn();
  } catch (err) {
    assert(pattern.test(err.message), `${label}: unexpected error "${err.message}"`);
    console.log(`[PASS] ${label}: ${err.message.split('\n')[0]}`);
    return;
  }
  throw new Error(`${label}: expected an error, got none`);
}

function assertGif(file) {
  const header = fs.readFileSync(file).slice(0, 6).toString('ascii');
  assert(header.startsWith('GIF8'), `Invalid GIF header in ${file}: ${header}`);
}

async function runTests() {
  console.log('=== VisualProof Studio verification ===\n');
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  const server = app.listen(TEST_PORT);
  const demoUrl = `http://localhost:${TEST_PORT}/demo`;

  try {
    const health = await (await fetch(`http://localhost:${TEST_PORT}/api/health`)).json();
    assert(health.status === 'ok', 'Health check failed');
    console.log('[PASS] Health check');

    // Step planner
    const demoPlan = planInstructions('', demoUrl);
    assert(demoPlan.steps.length === 6, `Expected 6 demo steps, got ${demoPlan.steps.length}`);
    const custom = planInstructions('Click "Generate"\nMobile: Tap `#mobile-generate-btn`', 'https://example.com');
    assert(custom.steps[0].click.text === 'Generate' && custom.steps[1].viewport === 'mobile', 'Planner parsed steps wrongly');
    console.log('[PASS] Step planner parses targets and viewport switches');
    await expectError(() => planInstructions('Click generate', 'https://example.com'), /button text in quotes/, 'Planner rejects a click with no target');

    // Config validation
    await expectError(() => validateConfig({ url: 'ftp://x', steps: [] }), /http:\/\/ or https:\/\/[\s\S]*steps must be a non-empty list/, 'Config validation lists every problem');

    // URL safety
    assert(isPrivateIp('169.254.169.254') && isPrivateIp('::ffff:10.0.0.1') && !isPrivateIp('8.8.8.8'), 'Private IP detection failed');
    const unsafe = await fetch(`http://localhost:${TEST_PORT}/api/generate-walkthrough`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Click "Go"', targetUrl: 'http://127.0.0.1:22' })
    });
    assert(unsafe.status === 400, `Unsafe URL should give 400, got ${unsafe.status}`);
    console.log('[PASS] Server blocks private target URLs');

    // Flowchart: labels only from input, 3-8 stages
    await expectError(() => generateFlowchartGif({ stages: ['A', 'B'], outputDir: OUTPUT_DIR }), /3-8 stages/, 'Flowchart rejects 2 stages');
    const flow = await generateFlowchartGif({
      title: 'Test Flow',
      stages: ['Input', 'Process (sub label)', 'Output'],
      footer: 'test footer',
      outputDir: OUTPUT_DIR,
      filenamePrefix: 'test_flow'
    });
    assertGif(flow.gifPath);
    console.log(`[PASS] Flowchart GIF: ${flow.frameCount} frames, ${Math.round(flow.size / 1024)} KB, ${flow.durationSec}s`);

    // Walkthrough: records the demo, then fails loudly on a missing button
    const [walk] = await recordWalkthrough({
      name: 'test_walk',
      url: demoUrl,
      output: ['gif', 'gif-lite'],
      steps: demoPlan.steps
    }, { outputDir: OUTPUT_DIR });
    assertGif(walk.files.gif);
    assertGif(walk.files.gifLite);
    assert(fs.statSync(walk.files.gifLite).size < fs.statSync(walk.files.gif).size, 'Lite GIF should be smaller');
    console.log(`[PASS] Walkthrough GIF + lite GIF: ${walk.frameCount} frames, ${walk.durationSec}s`);

    await expectError(() => recordWalkthrough({
      name: 'test_missing',
      url: demoUrl,
      output: ['gif'],
      stepTimeoutMs: 1500,
      steps: [{ caption: 'Missing', click: { role: 'button', name: 'No Such Button' } }]
    }, { outputDir: OUTPUT_DIR }), /Step 1 .*not found/, 'Missing button stops the run');

    const leftovers = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('page@') || f.includes('test_missing'));
    assert(leftovers.length === 0, `Leftover files: ${leftovers.join(', ')}`);
    console.log('[PASS] No leftover temp recordings');

    console.log('\n=== All checks passed ===');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('\n[FAIL]', err.message);
  process.exit(1);
});
