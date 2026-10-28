// Walkthrough config for `npm run record`.
// This example records the built-in demo app, so run `npm start` first.
// Copy this file for each project and change the url and steps.
module.exports = {
  name: 'demo',                         // output file prefix
  url: 'http://localhost:3000/demo',
  formats: ['1x1'],                     // 1x1, 4x5, 1.91x1, standard
  output: ['gif', 'mp4'],               // gif, gif-lite, webm, mp4 (mp4 needs ffmpeg)
  badgePosition: 'top',                 // top or bottom
  // duration: 15,                      // optional: fit the GIF to N seconds; leave out for real timing

  // Each step needs a caption. Use `click` or `point` with ONE of:
  //   { role: 'button', name: 'Generate' }   accessible role + name (best)
  //   { text: 'Exact visible text' }          visible text (string or /regex/)
  //   { selector: '#css-selector' }           CSS selector
  // Optional per step: viewport: 'mobile' | 'desktop', scroll: px, hold: ms
  steps: [
    { caption: 'Live entropy estimate', point: { selector: '#entropy-bits' } },
    { caption: 'One-tap generation', click: { selector: '#generate-btn' } },
    { caption: 'Passphrase mode', click: { selector: '#mode-passphrase-btn' } },
    { caption: 'QR code for another device', click: { selector: '#qr-btn' } },
    { caption: 'Close the QR code', click: { role: 'button', name: 'Close' }, hold: 600 },
    { caption: 'Mobile view', viewport: 'mobile', click: { selector: '#mobile-generate-btn' } }
  ]
};
