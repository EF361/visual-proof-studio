const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { encodeGifFromPngFrames } = require('./gifEncoder');
const { resolveTechIcon } = require('./techIcons');
const { convertToMp4 } = require('./videoExport');

const MIN_STAGES = 3;
const MAX_STAGES = 8;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalises one stage. Accepts "Label (sub label)" strings or
 * { label, sub, message } objects. Nothing is invented: a sub label only
 * appears when the caller gives one, and the status message defaults to
 * the stage label.
 */
function normalizeStage(stage, idx, total) {
  let label = '';
  let sub = '';
  let message = '';

  if (stage && typeof stage === 'object') {
    label = String(stage.label || '').trim();
    sub = String(stage.sub || '').trim();
    message = String(stage.message || '').trim();
  } else {
    const text = String(stage || '').trim();
    const match = text.match(/^(.*?)\s*\((.*)\)\s*$/);
    label = match ? match[1].trim() : text;
    sub = match ? match[2].trim() : '';
  }

  if (!label) label = `Step ${idx + 1}`;
  return {
    label,
    sub,
    message: message || `Step ${idx + 1} of ${total}: ${label}`
  };
}

/**
 * Lays nodes out in rows of at most 4, snaking left-to-right then
 * right-to-left, so each arrow follows the order the stages were given.
 */
function layoutNodes(count, width, canvasHeight) {
  const rows = Math.ceil(count / 4);
  const perRow = Math.ceil(count / rows);
  const marginX = 70;
  const colWidth = (width - marginX * 2) / perRow;
  const rowHeight = canvasHeight / rows;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    let col = i % perRow;
    if (row % 2 === 1) col = perRow - 1 - col;
    return {
      x: Math.round(marginX + colWidth * (col + 0.5)),
      y: Math.round(rowHeight * (row + 0.5))
    };
  });
}

/**
 * Renders and animates a clean 2D flowchart: Start -> stages -> End.
 * Every visible word comes from the options; nothing is hard-coded about
 * the project being shown.
 *
 * @param {object} options
 * @param {string} [options.title]
 * @param {Array<string|{label,sub,message}>} options.stages 3-8 stages
 * @param {string} [options.footer] Short text shown on the right of the status bar
 * @param {string} [options.finalMessage] Status text shown at the end
 * @param {'multicolor'|'onecolor'} [options.colorMode]
 * @param {boolean} [options.mp4] Also export MP4 (needs ffmpeg on PATH)
 */
async function generateFlowchartGif(options = {}) {
  const rawStages = Array.isArray(options.stages)
    ? options.stages.filter(s => s && (typeof s === 'object' || String(s).trim()))
    : [];
  if (rawStages.length < MIN_STAGES || rawStages.length > MAX_STAGES) {
    throw new Error(`Flowchart needs ${MIN_STAGES}-${MAX_STAGES} stages, got ${rawStages.length}.`);
  }

  const outputDir = options.outputDir || path.join(__dirname, '..', 'public', 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });

  const colorMode = options.colorMode === 'onecolor' ? 'onecolor' : 'multicolor';
  const prefix = options.filenamePrefix || `flowchart_${colorMode}_${Date.now()}`;
  const gifFilename = `${prefix}.gif`;
  const videoFilename = `${prefix}.webm`;
  const gifPath = path.join(outputDir, gifFilename);
  const videoPath = path.join(outputDir, videoFilename);

  const title = String(options.title || '').trim() || 'How It Works';
  const footer = String(options.footer || '').trim();
  const finalMessage = String(options.finalMessage || '').trim() || 'All steps complete';

  const stages = rawStages.map((s, idx) => {
    const stage = normalizeStage(s, idx, rawStages.length);
    const tech = resolveTechIcon(`${stage.label} ${stage.sub}`);
    return {
      ...stage,
      iconSvg: tech.svg,
      color: colorMode === 'onecolor' ? '#3b82f6' : tech.color
    };
  });

  const width = 1080;
  const height = 740;
  const canvasHeight = height - 62 - 52; // minus header and status bar
  const positions = layoutNodes(stages.length + 2, width, canvasHeight);
  const accent = colorMode === 'onecolor' ? '#3b82f6' : '#06b6d4';

  const nodeHtml = [
    `<div class="node-terminal start active" id="node-0" style="left:${positions[0].x}px; top:${positions[0].y}px;">
      <div class="terminal-label">START</div>
    </div>`,
    ...stages.map((s, i) => {
      const p = positions[i + 1];
      return `<div class="node-pill" id="node-${i + 1}" style="left:${p.x}px; top:${p.y}px; --accent:${s.color}; --glow:${s.color}44;">
        <div class="tech-icon-frame">${s.iconSvg}</div>
        <div class="node-name">${escapeHtml(s.label)}</div>
        ${s.sub ? `<div class="node-subtext">${escapeHtml(s.sub)}</div>` : ''}
        <div class="inner-pill-bar"></div>
      </div>`;
    }),
    `<div class="node-terminal end" id="node-${stages.length + 1}" style="left:${positions[stages.length + 1].x}px; top:${positions[stages.length + 1].y}px;">
      <div class="terminal-label">END</div>
    </div>`
  ].join('\n');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${width}px; height: ${height}px;
      background: #080c15; color: #f1f5f9;
      font-family: 'Plus Jakarta Sans', sans-serif;
      display: flex; flex-direction: column;
      overflow: hidden; position: relative; user-select: none;
    }
    body::before {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 70%),
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 100% 100%, 36px 36px, 36px 36px;
    }
    .header-bar {
      height: 62px; padding: 0 42px;
      display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06); z-index: 10;
    }
    .title-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35);
      display: flex; align-items: center; justify-content: center; color: ${accent};
    }
    .title-text { font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }

    .canvas-flow { flex: 1; position: relative; z-index: 10; }
    .connector-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
    .flow-line { stroke: #1e293b; stroke-width: 2.4; fill: none; }
    .flow-line.active { stroke: ${accent}; stroke-width: 2.8; filter: drop-shadow(0 0 6px ${accent}); }

    .flow-packet {
      position: absolute; width: 14px; height: 14px; border-radius: 50%;
      background: #ffffff; box-shadow: 0 0 10px #ffffff, 0 0 20px ${accent}, 0 0 35px ${accent};
      z-index: 30; opacity: 0; transform: translate(-50%, -50%); pointer-events: none;
    }

    .node-terminal {
      width: 78px; height: 78px; border-radius: 50%;
      background: #101726; border: 2px solid #2e3e55;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      position: absolute; z-index: 15; transform: translate(-50%, -50%);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .node-terminal.start.active {
      border-color: #60a5fa; background: #0f1d38;
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.55); transform: translate(-50%, -50%) scale(1.06);
    }
    .node-terminal.end { border-color: #1e3a35; }
    .node-terminal.end.active {
      border-color: #34d399; background: #092620;
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.6); transform: translate(-50%, -50%) scale(1.08);
    }
    .terminal-label { font-size: 13px; font-weight: 800; letter-spacing: 0.05em; color: #f8fafc; }

    .node-pill {
      width: 180px; background: #0f172a; border: 1.8px solid #223249; border-radius: 26px;
      padding: 12px 14px 10px; display: flex; flex-direction: column; align-items: center;
      position: absolute; z-index: 15; box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      transform: translate(-50%, -50%); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .node-pill.active {
      border-color: var(--accent); background: #131d33;
      transform: translate(-50%, -50%) scale(1.05);
      box-shadow: 0 12px 30px rgba(0,0,0,0.65), 0 0 22px var(--glow);
    }
    .tech-icon-frame {
      width: 32px; height: 32px; border-radius: 8px; margin-bottom: 6px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: center; color: var(--accent);
    }
    .node-pill.active .tech-icon-frame { background: rgba(255,255,255,0.08); border-color: var(--accent); box-shadow: 0 0 12px var(--glow); }
    .tech-icon-frame svg { width: 18px; height: 18px; }
    .node-name { font-size: 12.5px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.25; margin-bottom: 4px; }
    .node-subtext {
      font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600;
      color: #94a3b8; text-align: center; margin-bottom: 6px;
    }
    .inner-pill-bar { width: 60px; height: 6px; border-radius: 9999px; background: #24344d; margin-top: 2px; }
    .node-pill.active .inner-pill-bar { background: var(--accent); box-shadow: 0 0 10px var(--accent); }

    .status-bar {
      height: 52px; background: #0a0f1d; border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 0 42px; font-size: 13px; color: #94a3b8; z-index: 10;
    }
    .status-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .pulse-dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: ${accent}; box-shadow: 0 0 10px ${accent}; }
    .status-message { font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-footer {
      flex-shrink: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700;
      color: ${accent}; background: rgba(59, 130, 246, 0.1);
      padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.25);
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="title-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </div>
    <div class="title-text">${escapeHtml(title)}</div>
  </div>

  <div class="canvas-flow" id="flow-canvas">
    ${nodeHtml}
    <svg class="connector-svg" id="connector-svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${accent}"/>
        </marker>
        <marker id="arrow-dim" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b"/>
        </marker>
      </defs>
    </svg>
    <div class="flow-packet" id="flow-packet"></div>
  </div>

  <div class="status-bar">
    <div class="status-left">
      <div class="pulse-dot"></div>
      <div class="status-message" id="status-message">${escapeHtml(title)}</div>
    </div>
    ${footer ? `<div class="status-footer">${escapeHtml(footer)}</div>` : ''}
  </div>
</body>
</html>`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      recordVideo: { dir: outputDir, size: { width, height } }
    });
    const page = await context.newPage();
    const frames = [];

    await page.setContent(htmlContent);
    await page.waitForTimeout(200);

    // Draw one arrow between each pair of consecutive nodes, measured from the
    // rendered boxes so it works for any stage count and label length.
    const lineCount = await page.evaluate((nodeCount) => {
      const svg = document.getElementById('connector-svg');
      const canvas = document.getElementById('flow-canvas').getBoundingClientRect();
      const box = id => {
        const r = document.getElementById(id).getBoundingClientRect();
        return { l: r.left - canvas.left, r: r.right - canvas.left, t: r.top - canvas.top, b: r.bottom - canvas.top, cx: r.left - canvas.left + r.width / 2, cy: r.top - canvas.top + r.height / 2 };
      };
      const gap = 8;
      for (let i = 0; i < nodeCount - 1; i++) {
        const a = box(`node-${i}`);
        const b = box(`node-${i + 1}`);
        let d;
        if (Math.abs(a.cy - b.cy) < 4) {
          d = a.cx < b.cx
            ? `M ${a.r + gap} ${a.cy} L ${b.l - gap - 6} ${b.cy}`
            : `M ${a.l - gap} ${a.cy} L ${b.r + gap + 6} ${b.cy}`;
        } else {
          d = `M ${a.cx} ${a.b + gap} L ${b.cx} ${b.t - gap - 6}`;
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', `flow-line-${i}`);
        path.setAttribute('class', 'flow-line');
        path.setAttribute('d', d);
        path.setAttribute('marker-end', 'url(#arrow-dim)');
        svg.appendChild(path);
      }
      return nodeCount - 1;
    }, stages.length + 2);

    async function capture(delay = 75) {
      frames.push({ buffer: await page.screenshot({ type: 'png' }), delay });
    }

    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    await capture(300);

    for (let i = 0; i < lineCount; i++) {
      const isLast = i === lineCount - 1;
      const message = isLast ? finalMessage : stages[i].message;
      const steps = 8;

      await page.evaluate((lineId) => {
        const line = document.getElementById(lineId);
        line.classList.add('active');
        line.setAttribute('marker-end', 'url(#arrow)');
      }, `flow-line-${i}`);

      for (let f = 1; f <= steps; f++) {
        await page.evaluate(({ lineId, t }) => {
          const line = document.getElementById(lineId);
          const packet = document.getElementById('flow-packet');
          const pt = line.getPointAtLength(line.getTotalLength() * t);
          packet.style.opacity = '1';
          packet.style.left = `${Math.round(pt.x)}px`;
          packet.style.top = `${Math.round(pt.y)}px`;
        }, { lineId: `flow-line-${i}`, t: easeInOut(f / steps) });
        await capture(75);
      }

      await page.evaluate(({ targetId, message }) => {
        document.getElementById(targetId).classList.add('active');
        document.getElementById('status-message').textContent = message;
      }, { targetId: `node-${i + 1}`, message });
      await capture(isLast ? 300 : 450);
    }

    await page.evaluate(() => {
      document.getElementById('flow-packet').style.opacity = '0';
    });
    for (let h = 0; h < 4; h++) await capture(300);

    await page.close();
    const video = page.video();
    if (video) {
      // saveAs waits for the recording to finish; delete removes Playwright's temp page@*.webm
      await video.saveAs(videoPath);
      await video.delete();
    }
    await context.close();
    await browser.close();

    console.log(`[Flowchart] Collected ${frames.length} frames. Encoding GIF: ${gifFilename}...`);
    const gifRes = await encodeGifFromPngFrames(frames, gifPath, width, height, 'contain');
    console.log(`[Flowchart] Saved GIF: ${gifFilename} (${(gifRes.size / 1024 / 1024).toFixed(2)} MB)`);

    const videoSize = fs.existsSync(videoPath) ? fs.statSync(videoPath).size : 0;
    const mp4 = options.mp4 ? convertToMp4(videoPath) : null;

    return {
      success: true,
      gifFilename,
      videoFilename,
      gifPath,
      videoPath,
      gifUrl: `/outputs/${gifFilename}`,
      videoUrl: `/outputs/${videoFilename}`,
      mp4Filename: mp4 ? path.basename(mp4) : null,
      mp4Url: mp4 ? `/outputs/${path.basename(mp4)}` : null,
      size: gifRes.size,
      videoSize,
      frameCount: frames.length,
      width,
      height,
      resolution: `${width} × ${height}`,
      colorMode,
      durationSec: Math.round(frames.reduce((a, b) => a + (b.delay || 75), 0) / 1000)
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

module.exports = {
  generateFlowchartGif,
  normalizeStage,
  MIN_STAGES,
  MAX_STAGES
};
