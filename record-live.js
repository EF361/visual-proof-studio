#!/usr/bin/env node
/**
 * Records a walkthrough from a project config file.
 *
 *   node record-live.js                       # uses ./visualproof.config.js
 *   node record-live.js path/to/my.config.js
 *
 * Any step whose button or element is missing stops the run with a clear
 * error, so you never get a GIF with half the demo silently skipped.
 */
const path = require('path');
const fs = require('fs');
const { recordWalkthrough } = require('./src/walkthrough');

async function main() {
  const configArg = process.argv[2] || 'visualproof.config.js';
  const configPath = path.resolve(process.cwd(), configArg);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}\nCopy visualproof.config.js and edit it for your project.`);
  }

  const config = require(configPath);
  const outputDir = config.outputDir
    ? path.resolve(path.dirname(configPath), config.outputDir)
    : path.join(__dirname, 'public', 'outputs');

  const results = await recordWalkthrough(config, { outputDir });

  console.log('\nDone:');
  for (const r of results) {
    console.log(`  ${r.format} (${r.resolution}, ${r.durationSec}s, ${r.frameCount} frames)`);
    for (const [kind, file] of Object.entries(r.files)) {
      const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
      console.log(`    ${kind.padEnd(8)} ${path.relative(process.cwd(), file)} (${size} MB)`);
    }
  }
}

main().catch(err => {
  console.error(`\n[FAIL] ${err.message}`);
  process.exit(1);
});
