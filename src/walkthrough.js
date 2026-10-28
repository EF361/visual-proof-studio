const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { PNG } = require('pngjs');
const { encodeGifFromPngFrames } = require('./gifEncoder');
const { framesToMp4 } = require('./videoExport');

// Output canvas sizes. The desktop viewport matches the canvas so frames are
// pixel-exact; the mobile viewport is centred on a dark canvas.
const FORMATS = {
  '1x1': { width: 1080, height: 1080, label: '1:1 Square' },
  '4x5': { width: 1080, height: 1350, label: '4:5 Portrait' },
  '1.91x1': { width: 1200, height: 627, label: '1.91:1 Landscape' },
  standard: { width: 1080, height: 648, label: 'Standard' }
};
const OUTPUTS = ['gif', 'gif-lite', 'webm', 'mp4'];
const STEP_ACTIONS = ['click', 'point'];
const DEFAULT_STEP_TIMEOUT_MS = 5000;

/** Maps UI ratio names ('1:1', '4:5', '1.91:1') to format keys. */
function formatFromRatio(ratio) {
  const key = String(ratio || '1:1').replace(/:/g, 'x');
  return FORMATS[key] ? key : '1x1';
}

function describeTarget(target) {
  if (!target || typeof target !== 'object') return 'target';
  if (target.role) return `${target.role} '${target.name || ''}'`;
  if (target.text !== undefined) return `text '${target.text}'`;
  if (target.selector) return `element '${target.selector}'`;
  return 'target';
}

function isValidTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.role) return typeof target.role === 'string';
  if (target.text !== undefined) return typeof target.text === 'string' || target.text instanceof RegExp;
  return typeof target.selector === 'string' && target.selector.trim() !== '';
}

/**
 * Checks a walkthrough config and returns a normalised copy. Collects every
 * problem and throws one error listing them, so the user can fix all at once.
 */
function validateConfig(config) {
  const errors = [];
  const cfg = config && typeof config === 'object' ? config : {};

  let url;
  try {
    url = new URL(cfg.url);
    if (!['http:', 'https:'].includes(url.protocol)) errors.push('url must start with http:// or https://');
  } catch (_) {
    errors.push('url is missing or not a valid URL');
  }

  const formats = cfg.formats === undefined ? ['1x1'] : cfg.formats;
  if (!Array.isArray(formats) || formats.length === 0) {
    errors.push(`formats must be a list, e.g. ["1x1"]. Options: ${Object.keys(FORMATS).join(', ')}`);
  } else {
    formats.filter(f => !FORMATS[f]).forEach(f => errors.push(`unknown format '${f}'. Options: ${Object.keys(FORMATS).join(', ')}`));
  }

  const output = cfg.output === undefined ? ['gif', 'webm'] : cfg.output;
  if (!Array.isArray(output) || output.length === 0) {
    errors.push(`output must be a list, e.g. ["gif", "mp4"]. Options: ${OUTPUTS.join(', ')}`);
  } else {
    output.filter(o => !OUTPUTS.includes(o)).forEach(o => errors.push(`unknown output '${o}'. Options: ${OUTPUTS.join(', ')}`));
  }

  const badgePosition = cfg.badgePosition === undefined ? 'bottom' : cfg.badgePosition;
  if (!['top', 'bottom'].includes(badgePosition)) errors.push("badgePosition must be 'top' or 'bottom'");

  if (cfg.duration !== undefined && !(typeof cfg.duration === 'number' && cfg.duration >= 3 && cfg.duration <= 60)) {
    errors.push('duration must be a number of seconds between 3 and 60 (leave it out to keep real timing)');
  }

  if (!Array.isArray(cfg.steps) || cfg.steps.length === 0) {
    errors.push('steps must be a non-empty list');
  } else {
    cfg.steps.forEach((step, i) => {
      const n = i + 1;
      if (!step || typeof step !== 'object') {
        errors.push(`Step ${n}: must be an object`);
        return;
      }
      if (typeof step.caption !== 'string' || !step.caption.trim()) errors.push(`Step ${n}: caption is required`);
      const actions = STEP_ACTIONS.filter(a => step[a] !== undefined);
      if (actions.length > 1) errors.push(`Step ${n}: use only one of ${STEP_ACTIONS.join(' / ')}`);
      actions.forEach(a => {
        if (!isValidTarget(step[a])) {
          errors.push(`Step ${n}: ${a} needs { role, name }, { text } or { selector }`);
        }
      });
      if (step.viewport !== undefined && !['mobile', 'desktop'].includes(step.viewport)) {
        errors.push(`Step ${n}: viewport must be 'mobile' or 'desktop'`);
      }
      if (step.scroll !== undefined && typeof step.scroll !== 'number') errors.push(`Step ${n}: scroll must be a number of pixels`);
      if (step.hold !== undefined && !(typeof step.hold === 'number' && step.hold >= 0 && step.hold <= 10000)) {
        errors.push(`Step ${n}: hold must be 0-10000 ms`);
      }
    });
  }

  if (errors.length) {
    const err = new Error(`Invalid walkthrough config:\n  - ${errors.join('\n  - ')}`);
    err.code = 'INVALID_CONFIG';
    throw err;
  }

  const fallbackName = url.hostname.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'walkthrough';
  return {
    ...cfg,
    url: url.href,
    name: String(cfg.name || fallbackName).replace(/[^a-z0-9_-]+/gi, '_'),
    formats,
    output,
    badgePosition,
    stepTimeoutMs: cfg.stepTimeoutMs || DEFAULT_STEP_TIMEOUT_MS
  };
}

function locate(page, target) {
  if (target.role) return page.getByRole(target.role, { name: target.name, exact: target.exact });
  if (target.text !== undefined) return page.getByText(target.text, { exact: target.exact });
  return page.locator(target.selector);
}

/** Centres a smaller screenshot (e.g. the mobile viewport) on a dark canvas. */
function frameOnCanvas(pngBuffer, canvasWidth, canvasHeight) {
  const src = PNG.sync.read(pngBuffer);
  if (src.width === canvasWidth && src.height === canvasHeight) return pngBuffer;

  const canvas = new PNG({ width: canvasWidth, height: canvasHeight });
  for (let i = 0; i < canvasWidth * canvasHeight; i++) {
    canvas.data[i * 4] = 10;
    canvas.data[i * 4 + 1] = 14;
    canvas.data[i * 4 + 2] = 23;
    canvas.data[i * 4 + 3] = 255;
  }
  const padX = Math.floor((canvasWidth - src.width) / 2);
  const padY = Math.floor((canvasHeight - src.height) / 2);
  for (let y = 0; y < src.height; y++) {
    const dy = padY + y;
    if (dy < 0 || dy >= canvasHeight) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = padX + x;
      if (dx < 0 || dx >= canvasWidth) continue;
      src.data.copy(canvas.data, (dy * canvasWidth + dx) * 4, (y * src.width + x) * 4, (y * src.width + x) * 4 + 4);
    }
  }
  return PNG.sync.write(canvas);
}

async function injectOverlay(page, badgePosition) {
  await page.evaluate((position) => {
    document.getElementById('__vp_styles')?.remove();
    const style = document.createElement('style');
    style.id = '__vp_styles';
    style.textContent = `
      #__vp_cursor {
        position: fixed; width: 28px; height: 28px; z-index: 9999999;
        pointer-events: none; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.7));
      }
      .__vp_click_ripple {
        position: fixed; width: 20px; height: 20px; border-radius: 50%;
        border: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.45);
        transform: translate(-50%, -50%); pointer-events: none; z-index: 9999998;
        animation: __vp_r 0.75s ease-out forwards;
      }
      @keyframes __vp_r {
        0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
      }
      #__vp_step_badge {
        position: fixed; ${position}: 24px; left: 50%; transform: translateX(-50%);
        max-width: calc(100vw - 32px); text-align: center;
        background: rgba(15, 23, 42, 0.94); color: #f8fafc;
        border: 1.5px solid rgba(56, 189, 248, 0.7); border-radius: 9999px;
        padding: 8px 22px; font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        z-index: 9999999; pointer-events: none; letter-spacing: 0.02em;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7), 0 0 15px rgba(56, 189, 248, 0.25);
      }
      /* Caption drawn via CSS so text-based step targets never match the badge itself */
      #__vp_step_badge::after { content: attr(data-caption); }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('__vp_cursor')) {
      const cur = document.createElement('div');
      cur.id = '__vp_cursor';
      cur.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5.5 3.2L18.8 13.6L12.4 14.7L9.5 20.8L7.1 19.6L9.9 13.7L5.5 10.3V3.2Z" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/></svg>';
      document.body.appendChild(cur);
    }
    if (!document.getElementById('__vp_step_badge')) {
      const badge = document.createElement('div');
      badge.id = '__vp_step_badge';
      document.body.appendChild(badge);
    }
  }, badgePosition);
}

/** Drops every other frame (keeping total time) for the lite GIF. */
function thinFrames(frames) {
  const thinned = [];
  for (let i = 0; i < frames.length; i += 2) {
    const next = frames[i + 1];
    thinned.push({ buffer: frames[i].buffer, delay: frames[i].delay + (next ? next.delay : 0) });
  }
  return thinned;
}

/** Records one format. Throws on the first step that cannot run. */
async function recordFormat(browser, cfg, formatKey, outputDir, routeGuard) {
  const { width, height, label } = FORMATS[formatKey];
  const mobile = { width: 390, height: Math.min(844, height) };
  const baseName = `${cfg.name}_${formatKey}`;
  const files = {};

  console.log(`[Walkthrough] Recording ${label} (${width}x${height}) of ${cfg.url}`);
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: outputDir, size: { width, height } }
  });
  if (routeGuard) await context.route('**/*', routeGuard);
  const page = await context.newPage();
  const frames = [];
  let cursor = { x: Math.round(width * 0.3), y: Math.round(height * 0.25) };

  async function capture(delay) {
    const raw = await page.screenshot({ type: 'png' });
    frames.push({ buffer: frameOnCanvas(raw, width, height), delay });
  }

  async function glideTo(x, y) {
    for (let w = 1; w <= 4; w++) {
      const ease = 1 - Math.pow(1 - w / 4, 3);
      const pos = { x: Math.round(cursor.x + (x - cursor.x) * ease), y: Math.round(cursor.y + (y - cursor.y) * ease) };
      await page.evaluate(({ x, y }) => {
        const cur = document.getElementById('__vp_cursor');
        cur.style.left = `${x}px`;
        cur.style.top = `${y}px`;
      }, pos);
      await capture(120);
    }
    cursor = { x, y };
  }

  try {
    const response = await page.goto(cfg.url, { waitUntil: 'networkidle', timeout: 30000 });
    if (response && !response.ok()) {
      throw new Error(`Page returned HTTP ${response.status()} for ${cfg.url}`);
    }
    await injectOverlay(page, cfg.badgePosition);

    for (let i = 0; i < cfg.steps.length; i++) {
      const step = cfg.steps[i];
      const n = i + 1;
      console.log(`[Walkthrough]   Step ${n}/${cfg.steps.length}: ${step.caption}`);

      if (step.viewport) {
        await page.setViewportSize(step.viewport === 'mobile' ? mobile : { width, height });
        await page.waitForTimeout(400);
        await injectOverlay(page, cfg.badgePosition);
        const vp = page.viewportSize();
        cursor = { x: Math.round(vp.width / 2), y: Math.round(vp.height * 0.6) };
      }

      await page.evaluate((text) => { document.getElementById('__vp_step_badge').dataset.caption = text; }, step.caption);

      const action = STEP_ACTIONS.find(a => step[a] !== undefined);
      if (action) {
        const target = step[action];
        const locator = locate(page, target).first();
        try {
          await locator.waitFor({ state: 'visible', timeout: cfg.stepTimeoutMs });
        } catch (_) {
          throw new Error(`Step ${n} ("${step.caption}"): ${describeTarget(target)} not found`);
        }
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        if (!box) throw new Error(`Step ${n} ("${step.caption}"): ${describeTarget(target)} is not visible on screen`);
        await glideTo(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));

        if (action === 'click') {
          await page.evaluate(({ x, y }) => {
            const ripple = document.createElement('div');
            ripple.className = '__vp_click_ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 800);
          }, cursor);
          await capture(260);
          try {
            await locator.click({ timeout: cfg.stepTimeoutMs });
          } catch (err) {
            throw new Error(`Step ${n} ("${step.caption}"): could not click ${describeTarget(target)}: ${err.message.split('\n')[0]}`);
          }
        }
      }

      if (step.scroll) {
        await page.mouse.wheel(0, step.scroll);
        await page.waitForTimeout(300);
      }

      // Hold on the result so viewers can read it (real time, not stretched)
      const hold = step.hold === undefined ? 1800 : step.hold;
      const holdFrames = Math.max(1, Math.round(hold / 450));
      for (let h = 0; h < holdFrames; h++) {
        await page.waitForTimeout(150);
        await capture(Math.round(hold / holdFrames));
      }
    }

    await page.close();
    const webmPath = path.join(outputDir, `${baseName}.webm`);
    // saveAs waits for the recording to finish; delete removes Playwright's temp page@*.webm
    await page.video().saveAs(webmPath);
    await page.video().delete();
    await context.close();
    files.webm = webmPath;
  } catch (err) {
    await context.close().catch(() => {});
    // Remove the partial temp recording so failed runs leave nothing behind
    try { await page.video()?.delete(); } catch (_) {}
    throw err;
  }

  if (cfg.duration) {
    const total = frames.reduce((a, f) => a + f.delay, 0);
    const scale = (cfg.duration * 1000) / total;
    frames.forEach(f => { f.delay = Math.max(40, Math.round(f.delay * scale)); });
  }
  const durationSec = Math.round(frames.reduce((a, f) => a + f.delay, 0) / 100) / 10;

  let gif = null;
  if (cfg.output.includes('gif')) {
    const gifPath = path.join(outputDir, `${baseName}.gif`);
    gif = await encodeGifFromPngFrames(frames, gifPath, width, height, 'crop');
    files.gif = gifPath;
  }
  if (cfg.output.includes('gif-lite')) {
    const liteW = Math.round(width * 0.6 / 2) * 2;
    const liteH = Math.round(height * 0.6 / 2) * 2;
    const litePath = path.join(outputDir, `${baseName}_lite.gif`);
    await encodeGifFromPngFrames(thinFrames(frames), litePath, liteW, liteH, 'contain', { maxColors: 64 });
    files.gifLite = litePath;
  }
  if (cfg.output.includes('mp4')) {
    // Built from the GIF frames so mobile steps stay centred and timing matches
    const mp4Path = framesToMp4(frames, path.join(outputDir, `${baseName}.mp4`));
    if (mp4Path) files.mp4 = mp4Path;
  }
  if (!cfg.output.includes('webm') && files.mp4) {
    fs.unlinkSync(files.webm);
    delete files.webm;
  }

  return {
    format: formatKey,
    width,
    height,
    resolution: `${width} × ${height}`,
    frameCount: frames.length,
    durationSec,
    gifSize: gif ? gif.size : 0,
    files
  };
}

/**
 * Records a walkthrough for every format in the config.
 * @param {object} config see visualproof.config.js
 * @param {{ outputDir?: string, routeGuard?: Function }} [options]
 *   routeGuard: Playwright route handler applied to every browser request
 * @returns {Promise<Array>} one result per format, with the written file paths
 */
async function recordWalkthrough(config, options = {}) {
  const cfg = validateConfig(config);
  const outputDir = options.outputDir || path.join(__dirname, '..', 'public', 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const results = [];
    for (const formatKey of cfg.formats) {
      results.push(await recordFormat(browser, cfg, formatKey, outputDir, options.routeGuard));
    }
    return results;
  } finally {
    await browser.close();
  }
}

module.exports = {
  FORMATS,
  OUTPUTS,
  formatFromRatio,
  validateConfig,
  recordWalkthrough
};
