const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { PNG } = require('pngjs');
const fs = require('fs');

/**
 * Encodes an array of PNG frame buffers into a smooth, color-quantized GIF
 * with crop or contain options that NEVER distort or squish aspect ratios.
 * @param {Array<{ buffer: Buffer, delay: number }>} frames Array of PNG buffers and their display durations in ms
 * @param {string} outputPath Destination file path
 * @param {number} [targetWidth] Target width in pixels
 * @param {number} [targetHeight] Target height in pixels
 * @param {'crop'|'contain'} [fitMode] 'crop' (center-crop) or 'contain' (letterbox with dark frame)
 * @param {{ maxColors?: number }} [options] Palette size per frame (default 256; lower = smaller file)
 * @returns {Promise<{ path: string, size: number, frameCount: number, width: number, height: number }>}
 */
async function encodeGifFromPngFrames(frames, outputPath, targetWidth = null, targetHeight = null, fitMode = 'crop', options = {}) {
  const maxColors = Math.max(2, Math.min(256, options.maxColors || 256));
  if (!frames || frames.length === 0) {
    throw new Error('No frames provided for GIF encoding');
  }

  const firstPng = PNG.sync.read(frames[0].buffer);
  const srcWidth = firstPng.width;
  const srcHeight = firstPng.height;

  let width = targetWidth || srcWidth;
  let height = targetHeight || srcHeight;

  // If width is larger than 800 without custom target, scale down proportionally
  if (!targetWidth && width > 800) {
    const scale = 800 / width;
    width = 800;
    height = Math.round(srcHeight * scale);
  }

  // Ensure dimensions are even
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;

  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const png = PNG.sync.read(frame.buffer);

    let rgba;
    if (png.width === width && png.height === height) {
      rgba = png.data;
    } else {
      // Crop or fit with ZERO stretching/squishing
      rgba = cropOrFitRgba(png.data, png.width, png.height, width, height, fitMode);
    }

    // High quality rgb565 color quantization for crisp text & anti-aliased font edges
    const palette = quantize(rgba, maxColors, {
      format: 'rgb565',
      oneBitAlpha: false
    });
    const index = applyPalette(rgba, palette);
    
    const delay = Math.max(20, frame.delay || 100);
    gif.writeFrame(index, width, height, {
      palette,
      delay
    });
  }

  gif.finish();
  const buffer = Buffer.from(gif.bytes());
  fs.writeFileSync(outputPath, buffer);

  return {
    path: outputPath,
    size: buffer.length,
    frameCount: frames.length,
    width,
    height
  };
}

/**
 * Center-crop or letterbox RGBA image buffers maintaining natural aspect ratio.
 * NEVER squishes, blurs, or distorts the image.
 */
function cropOrFitRgba(srcData, srcW, srcH, dstW, dstH, mode = 'crop') {
  const dst = new Uint8Array(dstW * dstH * 4);

  // Fill default sleek dark studio backdrop (#0a0e17)
  for (let i = 0; i < dstW * dstH; i++) {
    dst[i * 4 + 0] = 10;
    dst[i * 4 + 1] = 14;
    dst[i * 4 + 2] = 23;
    dst[i * 4 + 3] = 255;
  }

  // If source fits entirely inside destination, center it with 100% 1:1 pixel sharpness (zero blur)
  if (srcW <= dstW && srcH <= dstH) {
    const padX = Math.floor((dstW - srcW) / 2);
    const padY = Math.floor((dstH - srcH) / 2);
    for (let y = 0; y < srcH; y++) {
      for (let x = 0; x < srcW; x++) {
        const srcIdx = (y * srcW + x) * 4;
        const dstIdx = ((padY + y) * dstW + (padX + x)) * 4;
        dst[dstIdx + 0] = srcData[srcIdx + 0];
        dst[dstIdx + 1] = srcData[srcIdx + 1];
        dst[dstIdx + 2] = srcData[srcIdx + 2];
        dst[dstIdx + 3] = srcData[srcIdx + 3];
      }
    }
    return dst;
  }

  if (mode === 'crop') {
    // If only one dimension is larger, center-crop without scaling if possible
    if (srcW >= dstW && srcH >= dstH) {
      const cropX = Math.floor((srcW - dstW) / 2);
      const cropY = Math.floor((srcH - dstH) / 2);
      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const srcIdx = ((y + cropY) * srcW + (x + cropX)) * 4;
          const dstIdx = (y * dstW + x) * 4;
          dst[dstIdx + 0] = srcData[srcIdx + 0];
          dst[dstIdx + 1] = srcData[srcIdx + 1];
          dst[dstIdx + 2] = srcData[srcIdx + 2];
          dst[dstIdx + 3] = srcData[srcIdx + 3];
        }
      }
      return dst;
    }

    // Cover & Center-Crop with smooth bilinear sampling
    const scale = Math.max(dstW / srcW, dstH / srcH);
    const scaledW = srcW * scale;
    const scaledH = srcH * scale;
    const cropX = (scaledW - dstW) / 2;
    const cropY = (scaledH - dstH) / 2;

    for (let y = 0; y < dstH; y++) {
      const srcY = (y + cropY) / scale;
      for (let x = 0; x < dstW; x++) {
        const srcX = (x + cropX) / scale;
        const [r, g, b, a] = sampleBilinear(srcData, srcW, srcH, srcX, srcY);
        const dstIdx = (y * dstW + x) * 4;
        dst[dstIdx + 0] = r;
        dst[dstIdx + 1] = g;
        dst[dstIdx + 2] = b;
        dst[dstIdx + 3] = a;
      }
    }
  } else {
    // Contain mode: scale to fit within canvas with smooth bilinear sampling
    const scale = Math.min(dstW / srcW, dstH / srcH);
    const renderW = Math.round(srcW * scale);
    const renderH = Math.round(srcH * scale);
    const padX = Math.floor((dstW - renderW) / 2);
    const padY = Math.floor((dstH - renderH) / 2);

    for (let y = 0; y < renderH; y++) {
      const dstY = padY + y;
      if (dstY < 0 || dstY >= dstH) continue;
      const srcY = y / scale;

      for (let x = 0; x < renderW; x++) {
        const dstX = padX + x;
        if (dstX < 0 || dstX >= dstW) continue;
        const srcX = x / scale;

        const [r, g, b, a] = sampleBilinear(srcData, srcW, srcH, srcX, srcY);
        const dstIdx = (dstY * dstW + dstX) * 4;
        dst[dstIdx + 0] = r;
        dst[dstIdx + 1] = g;
        dst[dstIdx + 2] = b;
        dst[dstIdx + 3] = a;
      }
    }
  }

  return dst;
}

function sampleBilinear(srcData, srcW, srcH, x, y) {
  const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));

  const wx = Math.max(0, Math.min(1, x - x0));
  const wy = Math.max(0, Math.min(1, y - y0));

  const w00 = (1 - wx) * (1 - wy);
  const w10 = wx * (1 - wy);
  const w01 = (1 - wx) * wy;
  const w11 = wx * wy;

  const idx00 = (y0 * srcW + x0) * 4;
  const idx10 = (y0 * srcW + x1) * 4;
  const idx01 = (y1 * srcW + x0) * 4;
  const idx11 = (y1 * srcW + x1) * 4;

  return [
    Math.round(srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11),
    Math.round(srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11),
    Math.round(srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11),
    Math.round(srcData[idx00 + 3] * w00 + srcData[idx10 + 3] * w10 + srcData[idx01 + 3] * w01 + srcData[idx11 + 3] * w11)
  ];
}

module.exports = {
  encodeGifFromPngFrames,
  cropOrFitRgba
};
