const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Design 1: Video camera with play cutout and glowing gradient
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="vpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- App Icon Base -->
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#vpGrad)" />
  <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />

  <!-- Camera Body & Lens Group -->
  <g filter="url(#shadow)">
    <!-- Main Camera Housing -->
    <rect x="12" y="19" width="26" height="26" rx="5" fill="#ffffff" />
    
    <!-- Lens Cone with rounded right corners -->
    <path d="M38 27.5 L49.2 20.8 C50.8 19.8 52 20.7 52 22.4 L52 41.6 C52 43.3 50.8 44.2 49.2 43.2 L38 36.5 Z" fill="#ffffff" />
    
    <!-- Record / Play Icon in center of camera housing -->
    <polygon points="21.5 25.5 30.5 32 21.5 38.5" fill="url(#lensGrad)" />
  </g>

  <!-- Small Recording Indicator Pill / Dot (VisualProof signature) -->
  <circle cx="17.5" cy="14" r="2.5" fill="#ef4444" />
  <circle cx="17.5" cy="14" r="2.5" fill="#f87171" opacity="0.8" />
</svg>`;

// Design 2: Pure sleek match with logo-box in the header (clean camera outline + record dot)
const svgContentMinimal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="vpGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="shadow2" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#vpGrad2)" />
  <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5" />

  <!-- Camera Symbol (Centered, High contrast, perfectly scalable) -->
  <g filter="url(#shadow2)">
    <!-- Camera Body -->
    <rect x="12" y="18" width="27" height="28" rx="6" fill="#ffffff" />
    <!-- Camera Lens Projection -->
    <path d="M39 27 L49.5 20.5 C51 19.5 52 20.3 52 22 L52 42 C52 43.7 51 44.5 49.5 43.5 L39 37 Z" fill="#ffffff" />
    <!-- Center Play/Action Motif -->
    <path d="M22 25 L31 32 L22 39 Z" fill="#0284c7" />
  </g>
</svg>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Test rendering both
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgContentMinimal);
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon-alt.svg'), svgContent);

  // Take screenshots of both at 32x32, 64x64, 180x180, 512x512
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; background: transparent; display: flex; align-items: center; justify-content: center; }
      svg { width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    ${svgContentMinimal}
  </body>
  </html>`;

  await page.setContent(html);

  // 180x180 for Apple touch icon
  await page.setViewportSize({ width: 180, height: 180 });
  await page.screenshot({
    path: path.join(__dirname, 'public', 'apple-touch-icon.png'),
    omitBackground: true
  });

  // 32x32 for standard PNG favicon
  await page.setViewportSize({ width: 32, height: 32 });
  await page.screenshot({
    path: path.join(__dirname, 'public', 'favicon-32x32.png'),
    omitBackground: true
  });

  // 16x16 for 16px PNG favicon
  await page.setViewportSize({ width: 16, height: 16 });
  await page.screenshot({
    path: path.join(__dirname, 'public', 'favicon-16x16.png'),
    omitBackground: true
  });

  // 192x192 for Android / PWA
  await page.setViewportSize({ width: 192, height: 192 });
  await page.screenshot({
    path: path.join(__dirname, 'public', 'icon-192.png'),
    omitBackground: true
  });

  // Also create a proper multi-size ICO file using PNG frames
  // An ICO file header is:
  // ICONDIR (6 bytes): 0x0000 (reserved), 0x0001 (image type 1 = icon), count (2 bytes)
  // ICONDIRENTRY (16 bytes per image): width, height, colors, reserved, planes, bpp, bytesInRes, imageOffset
  // Followed by raw PNG data for each image! Modern ICO supports PNG format directly!
  const png16 = fs.readFileSync(path.join(__dirname, 'public', 'favicon-16x16.png'));
  const png32 = fs.readFileSync(path.join(__dirname, 'public', 'favicon-32x32.png'));
  const icoBuffer = createIcoFromPngs([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 }
  ]);
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), icoBuffer);

  await browser.close();
  console.log('Successfully generated favicon suite: favicon.svg, favicon.ico, favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png');
}

function createIcoFromPngs(images) {
  const count = images.length;
  const headerSize = 6 + (16 * count);
  let totalSize = headerSize;
  for (const img of images) {
    totalSize += img.buffer.length;
  }

  const buf = Buffer.alloc(totalSize);
  // ICONDIR
  buf.writeUInt16LE(0, 0);      // Reserved
  buf.writeUInt16LE(1, 2);      // 1 = ICO
  buf.writeUInt16LE(count, 4);  // Image count

  let currentOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const img = images[i];
    const entryOffset = 6 + (i * 16);
    buf.writeUInt8(img.size === 256 ? 0 : img.size, entryOffset);     // Width
    buf.writeUInt8(img.size === 256 ? 0 : img.size, entryOffset + 1); // Height
    buf.writeUInt8(0, entryOffset + 2);                               // Color count (0 = no palette)
    buf.writeUInt8(0, entryOffset + 3);                               // Reserved
    buf.writeUInt16LE(1, entryOffset + 4);                            // Color planes (1)
    buf.writeUInt16LE(32, entryOffset + 6);                           // Bits per pixel (32 for RGBA)
    buf.writeUInt32LE(img.buffer.length, entryOffset + 8);            // Image data size
    buf.writeUInt32LE(currentOffset, entryOffset + 12);               // Image offset

    img.buffer.copy(buf, currentOffset);
    currentOffset += img.buffer.length;
  }

  return buf;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
