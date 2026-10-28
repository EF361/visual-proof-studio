module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const ratio = body.aspectRatio || '1:1';

    let gifUrl = '/samples/intelligent_curie_1x1.gif';
    let videoUrl = '/samples/intelligent_curie_1x1.webm';
    let gifFilename = 'visualproof_1x1_square.gif';
    let videoFilename = 'visualproof_1x1_square.webm';
    let size = 1751120;
    let videoSize = 839168;
    let resolution = '1080 × 1080';
    let frameCount = 34;
    let durationSec = 17;

    if (ratio === '4:5') {
      gifUrl = '/samples/intelligent_curie_4x5.gif';
      videoUrl = '/samples/intelligent_curie_4x5.webm';
      gifFilename = 'visualproof_4x5_portrait.gif';
      videoFilename = 'visualproof_4x5_portrait.webm';
      size = 1772140;
      videoSize = 1092800;
      resolution = '1080 × 1350';
    } else if (ratio === '1.91:1') {
      gifUrl = '/samples/intelligent_curie_landscape.gif';
      videoUrl = '/samples/intelligent_curie_landscape.webm';
      gifFilename = 'visualproof_1.91x1_landscape.gif';
      videoFilename = 'visualproof_1.91x1_landscape.webm';
      size = 1457660;
      videoSize = 503600;
      resolution = '1200 × 627';
    } else if (ratio === 'standard') {
      gifUrl = '/samples/intelligent_curie.gif';
      videoUrl = '/samples/intelligent_curie.webm';
      gifFilename = 'visualproof_standard.gif';
      videoFilename = 'visualproof_standard.webm';
      size = 1457660;
      videoSize = 538100;
      resolution = '1080 × 648';
    }

    return res.status(200).json({
      success: true,
      gifUrl,
      videoUrl,
      gifFilename,
      videoFilename,
      size,
      videoSize,
      resolution,
      frameCount,
      durationSec,
      aspectRatio: ratio,
      clientSynthesize: false,
      demo: true,
      targetUrl: body.targetUrl || 'https://intelligent-curie-alpha.vercel.app/'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
