const express = require('express');
const path = require('path');
const fs = require('fs');
const { planInstructions } = require('./planner');
const { recordWalkthrough, formatFromRatio } = require('./walkthrough');
const { generateFlowchartGif, MIN_STAGES, MAX_STAGES } = require('./flowchartAnimator');
const { assertSafeTargetUrl, privateNetworkGuard } = require('./urlSafety');

const app = express();
const PORT = process.env.PORT || 3000;
// Local-only by default. Set HOST=0.0.0.0 only on a trusted network.
const HOST = process.env.HOST || '127.0.0.1';
const LOCAL_ORIGIN = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'outputs');

// Input problems the user can fix (400) vs a step that failed on the page (422)
function errorStatus(err) {
  if (['INVALID_STEPS', 'INVALID_CONFIG', 'UNSAFE_URL'].includes(err.code)) return 400;
  if (/^(Step \d+|Page returned HTTP)/.test(err.message)) return 422;
  return 500;
}

function resolveTargetUrl(targetUrl) {
  const raw = String(targetUrl || '').trim() || '/demo';
  return raw.startsWith('/') ? `${LOCAL_ORIGIN}${raw}` : raw;
}

function fileInfo(filePath) {
  if (!filePath) return { url: null, name: null, size: 0 };
  const name = path.basename(filePath);
  return { url: `/outputs/${name}`, name, size: fs.statSync(filePath).size };
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/outputs', express.static(OUTPUT_DIR));

// Demo route shortcut
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'demo', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'VisualProof Studio', uptime: process.uptime() });
});

// Step Planner Endpoint: turns one-step-per-line text into recordable steps
app.post('/api/plan', (req, res) => {
  try {
    const { prompt, targetUrl } = req.body || {};
    const plan = planInstructions(prompt, resolveTargetUrl(targetUrl));
    res.json({ success: true, plan });
  } catch (err) {
    res.status(errorStatus(err)).json({ error: err.message });
  }
});

// Generate Web Walkthrough GIF & Video
app.post('/api/generate-walkthrough', async (req, res) => {
  try {
    const { prompt, targetUrl, duration, aspectRatio, badgePosition } = req.body || {};
    const url = await assertSafeTargetUrl(resolveTargetUrl(targetUrl), { allowOrigin: LOCAL_ORIGIN });
    const plan = planInstructions(prompt, url);
    const seconds = Number(duration);

    console.log(`[Server] Recording ${plan.steps.length} steps on ${url} [${aspectRatio || '1:1'}]...`);
    const [result] = await recordWalkthrough({
      name: `visualproof_${Date.now()}`,
      url,
      steps: plan.steps,
      formats: [formatFromRatio(aspectRatio)],
      output: ['gif', 'webm', 'mp4'],
      badgePosition: badgePosition === 'top' ? 'top' : 'bottom',
      duration: seconds >= 3 && seconds <= 60 ? seconds : undefined
    }, {
      outputDir: OUTPUT_DIR,
      routeGuard: privateNetworkGuard(LOCAL_ORIGIN)
    });

    const gif = fileInfo(result.files.gif);
    const video = fileInfo(result.files.mp4 || result.files.webm);
    res.json({
      success: true,
      gifUrl: gif.url,
      gifFilename: gif.name,
      size: gif.size,
      videoUrl: video.url,
      videoFilename: video.name,
      videoSize: video.size,
      resolution: result.resolution,
      frameCount: result.frameCount,
      durationSec: result.durationSec,
      aspectRatio: aspectRatio || '1:1'
    });
  } catch (err) {
    console.error('Walkthrough recording failed:', err.message);
    res.status(errorStatus(err)).json({ error: err.message });
  }
});

// Generate Flowchart Architecture GIF & Video
app.post('/api/generate-flowchart', async (req, res) => {
  try {
    const { title, nodes, stages, footer, colorMode } = req.body;
    const resolvedStages = (Array.isArray(stages) && stages.length > 0) ? stages : nodes;
    const count = Array.isArray(resolvedStages) ? resolvedStages.length : 0;
    if (count < MIN_STAGES || count > MAX_STAGES) {
      return res.status(400).json({ error: `Flowchart needs ${MIN_STAGES}-${MAX_STAGES} stages, got ${count}.` });
    }
    console.log(`[Server] Generating flowchart for "${title || 'How It Works'}" [${colorMode || 'multicolor'}]...`);
    const result = await generateFlowchartGif({
      title,
      stages: resolvedStages,
      footer,
      colorMode: colorMode || 'multicolor',
      outputDir: OUTPUT_DIR,
      mp4: true
    });

    const video = fileInfo(result.mp4Url ? path.join(OUTPUT_DIR, result.mp4Filename) : result.videoPath);
    res.json({
      success: true,
      gifUrl: result.gifUrl,
      gifFilename: result.gifFilename,
      size: result.size,
      videoUrl: video.url,
      videoFilename: video.name,
      videoSize: video.size,
      resolution: result.resolution,
      frameCount: result.frameCount,
      durationSec: result.durationSec,
      colorMode: result.colorMode
    });
  } catch (err) {
    console.error('Flowchart generation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// List recent generated outputs
app.get('/api/outputs', (req, res) => {
  try {
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.gif') || f.endsWith('.webm') || f.endsWith('.mp4'))
      .map(filename => {
        const filePath = path.join(OUTPUT_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          url: `/outputs/${filename}`,
          sizeBytes: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`VisualProof Studio running at http://localhost:${PORT} (listening on ${HOST})`);
    console.log(`Built-in demo target available at http://localhost:${PORT}/demo`);
  });
}

module.exports = app;
