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

    let gifUrl = '/samples/flowchart_multicolor.gif';
    let videoUrl = '/samples/flowchart_multicolor.webm';
    let gifFilename = 'flowchart_multicolor_techstack.gif';
    let videoFilename = 'flowchart_multicolor_techstack.webm';
    let size = 3639612;
    let videoSize = 543606;

    if (colorMode === 'onecolor') {
      gifUrl = '/samples/flowchart_onecolor.gif';
      videoUrl = '/samples/flowchart_onecolor.webm';
      gifFilename = 'flowchart_onecolor_minimalist.gif';
      videoFilename = 'flowchart_onecolor_minimalist.webm';
      size = 3614789;
      videoSize = 400962;
    }

    return res.status(200).json({
      success: true,
      gifUrl,
      videoUrl,
      gifFilename,
      videoFilename,
      size,
      videoSize,
      resolution: '1080 × 740',
      frameCount: 50,
      durationSec: 7,
      colorMode,
      title: 'Demo App: How a Password Is Made',
      clientSynthesize: false,
      demo: true
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
