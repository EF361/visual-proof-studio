const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let ffmpegChecked = false;
let ffmpegAvailable = false;

function hasFfmpeg() {
  if (!ffmpegChecked) {
    const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    ffmpegAvailable = probe.status === 0;
    ffmpegChecked = true;
  }
  return ffmpegAvailable;
}

/**
 * Converts a WebM recording to MP4 (H.264, yuv420p, faststart), the format
 * LinkedIn handles best. Returns the MP4 path, or null when ffmpeg is not
 * installed (the WebM is kept either way).
 */
function convertToMp4(webmPath) {
  if (!fs.existsSync(webmPath)) return null;
  if (!hasFfmpeg()) {
    console.warn('[Export] ffmpeg not found on PATH, skipping MP4. Install ffmpeg to get MP4 output.');
    return null;
  }

  const mp4Path = webmPath.replace(/\.webm$/i, '.mp4');
  const result = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', webmPath,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags', '+faststart',
    '-an',
    mp4Path
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`MP4 export failed: ${(result.stderr || '').trim() || 'ffmpeg exited with an error'}`);
  }
  return mp4Path;
}

/**
 * Builds an MP4 from captured PNG frames with their exact display times, so
 * the MP4 matches the GIF (same framing, same timing). Temp frames are kept
 * next to the output and removed afterwards. Returns null without ffmpeg.
 */
function framesToMp4(frames, mp4Path) {
  if (!frames.length) return null;
  if (!hasFfmpeg()) {
    console.warn('[Export] ffmpeg not found on PATH, skipping MP4. Install ffmpeg to get MP4 output.');
    return null;
  }

  const tmpDir = `${mp4Path}.frames`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const lines = [];
    frames.forEach((frame, i) => {
      const name = `f${String(i).padStart(5, '0')}.png`;
      fs.writeFileSync(path.join(tmpDir, name), frame.buffer);
      lines.push(`file '${name}'`, `duration ${(frame.delay / 1000).toFixed(3)}`);
    });
    // The concat demuxer ignores the last duration unless the file is listed again
    lines.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.png'`);
    const listPath = path.join(tmpDir, 'list.txt');
    fs.writeFileSync(listPath, lines.join('\n'));

    const result = spawnSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0', '-i', listPath,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-r', '30',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-movflags', '+faststart',
      mp4Path
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
      throw new Error(`MP4 export failed: ${(result.stderr || '').trim() || 'ffmpeg exited with an error'}`);
    }
    return mp4Path;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { convertToMp4, framesToMp4, hasFfmpeg };
