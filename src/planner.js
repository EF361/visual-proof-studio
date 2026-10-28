/**
 * Step planner for VisualProof Studio.
 *
 * Turns plain-text lines into walkthrough steps (the same step format as
 * visualproof.config.js). It is rule-based, not AI: every step must name its
 * own target, so a click never lands on a guessed spot.
 *
 * One step per line:
 *   Click "Generate"                  -> click the element with that visible text
 *   Point at "Strength meter"         -> move the cursor there without clicking
 *   Click `#qr-btn`                   -> CSS selector in backticks
 *   Mobile: Click "Regenerate"        -> switch to the mobile viewport first
 *   Caption text | Click "Generate"   -> custom badge caption before the |
 */

const CLICK_WORDS = /\b(click|tap|press|toggle|open|select|choose|close)\b/i;
const POINT_WORDS = /\b(point|hover|show|highlight|look)\b/i;

// Built-in demo app (public/demo): known-good steps for the "Local Demo" preset
const DEMO_STEPS = [
  { caption: 'Live entropy estimate', point: { selector: '#entropy-bits' } },
  { caption: 'One-tap generation', click: { selector: '#generate-btn' } },
  { caption: 'Passphrase mode', click: { selector: '#mode-passphrase-btn' } },
  { caption: 'QR code for another device', click: { selector: '#qr-btn' } },
  { caption: 'Close the QR code', click: { selector: '#close-modal-btn' }, hold: 600 },
  { caption: 'Mobile view', viewport: 'mobile', click: { selector: '#mobile-generate-btn' } }
];

function isBuiltInDemo(targetUrl) {
  try {
    return new URL(targetUrl).pathname.replace(/\/$/, '') === '/demo';
  } catch (_) {
    return false;
  }
}

/** Parses one line. Returns { step } or { error }. Blank lines return null. */
function parseLine(rawLine, n) {
  let line = rawLine.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim();
  if (!line) return null;

  let caption = '';
  const pipe = line.indexOf('|');
  if (pipe !== -1) {
    caption = line.slice(0, pipe).trim();
    line = line.slice(pipe + 1).trim();
  }

  const step = {};
  const viewport = line.match(/^(mobile|desktop)\s*[:,-]?\s*/i);
  if (viewport) {
    step.viewport = viewport[1].toLowerCase();
    line = line.slice(viewport[0].length);
  }

  const selector = line.match(/`([^`]+)`/);
  const quoted = line.match(/"([^"]+)"|“([^”]+)”|'([^']+)'/);
  const target = selector
    ? { selector: selector[1].trim() }
    : quoted ? { text: (quoted[1] || quoted[2] || quoted[3]).trim() } : null;

  const wantsClick = CLICK_WORDS.test(line);
  const wantsPoint = POINT_WORDS.test(line);

  if (target) {
    step[wantsClick || !wantsPoint ? 'click' : 'point'] = target;
  } else if (wantsClick) {
    return { error: `Step ${n} ("${rawLine.trim()}"): add the button text in quotes, e.g. Click "Generate", or a selector in backticks` };
  } else if (!step.viewport) {
    return { error: `Step ${n} ("${rawLine.trim()}"): say what to click or point at, e.g. Click "Generate" or Point at "Score"` };
  }

  const fromLine = (viewport ? viewport[0] : '') + line;
  const cleaned = fromLine.replace(/`[^`]+`/g, '').replace(/["“”]/g, '').replace(/\s+/g, ' ').replace(/[\s:,-]+$/, '').trim();
  step.caption = (caption || cleaned || rawLine.trim()).slice(0, 70);
  return { step };
}

/**
 * @returns {{ title, targetUrl, steps, estimatedDurationSec }}
 * @throws Error listing every line that could not become a step
 */
function planInstructions(promptText, targetUrl, options = {}) {
  const text = String(promptText || '').trim();

  if (!text && isBuiltInDemo(targetUrl)) {
    return {
      title: 'Built-in demo steps',
      targetUrl,
      steps: DEMO_STEPS,
      estimatedDurationSec: Math.round(DEMO_STEPS.length * 2.4)
    };
  }

  const steps = [];
  const errors = [];
  text.split(/\r?\n/).forEach(line => {
    const parsed = parseLine(line, steps.length + errors.length + 1);
    if (!parsed) return;
    if (parsed.error) errors.push(parsed.error);
    else steps.push(parsed.step);
  });

  if (errors.length || steps.length === 0) {
    const err = new Error(errors.length
      ? `Some steps need a target:\n  - ${errors.join('\n  - ')}`
      : 'No steps found. Write one step per line, e.g. Click "Generate".');
    err.code = 'INVALID_STEPS';
    throw err;
  }

  return {
    title: options.title || 'Custom walkthrough',
    targetUrl,
    steps,
    estimatedDurationSec: Math.round(steps.length * 2.4)
  };
}

module.exports = {
  planInstructions,
  parseLine,
  DEMO_STEPS
};
