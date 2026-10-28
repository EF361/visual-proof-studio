const path = require('path');
const fs = require('fs');
const { generateFlowchartGif } = require('./src/flowchartAnimator');

// Regenerates the sample flowcharts used by the Vercel demo and the UI fallback.
// The stages describe the built-in demo app (public/demo) as it really works.
const SAMPLE = {
  title: 'Demo App: How a Password Is Made',
  stages: [
    'Settings (length & character sets)',
    'Random Picks (Math.random)',
    'Password or Passphrase',
    'Entropy Estimate (bits)'
  ],
  footer: 'Sample · built-in demo'
};

async function main() {
  const outputDir = path.join(__dirname, 'public', 'samples');
  fs.mkdirSync(outputDir, { recursive: true });

  for (const colorMode of ['multicolor', 'onecolor']) {
    console.log(`Generating ${colorMode} sample flowchart...`);
    const res = await generateFlowchartGif({
      ...SAMPLE,
      outputDir,
      colorMode,
      filenamePrefix: `flowchart_${colorMode}`
    });
    console.log(`Done: ${res.gifFilename} (${(res.size / 1024 / 1024).toFixed(2)} MB)`);
  }
}

main().catch(err => {
  console.error('Flowchart generation error:', err);
  process.exit(1);
});
