module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const colorMode = body.colorMode === 'onecolor' ? 'onecolor' : 'multicolor';

    let gifUrl = '/outputs/flowchart_multicolor.gif';
    let videoUrl = '/outputs/flowchart_multicolor.webm';
    let gifFilename = 'flowchart_multicolor_techstack.gif';
    let videoFilename = 'flowchart_multicolor_techstack.webm';
    let size = 1845493;
    let videoSize = 840000;

    if (colorMode === 'onecolor') {
      gifUrl = '/outputs/flowchart_onecolor.gif';
      videoUrl = '/outputs/flowchart_onecolor.webm';
      gifFilename = 'flowchart_onecolor_minimalist.gif';
      videoFilename = 'flowchart_onecolor_minimalist.webm';
      size = 1761607;
      videoSize = 812000;
    }

    return res.status(200).json({
      success: true,
      gifUrl,
      videoUrl,
      gifFilename,
      videoFilename,
      size,
      videoSize,
      resolution: '1080 × 620',
      frameCount: 34,
      durationSec: 12,
      colorMode,
      title: body.title || 'Enterprise Serverless & Edge Pipeline',
      clientSynthesize: false,
      demo: true
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
