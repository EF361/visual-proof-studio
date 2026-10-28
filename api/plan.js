const { planInstructions } = require('../src/planner');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    // Same step parser as the local server; an empty prompt on /demo uses the demo steps
    const plan = planInstructions(body.prompt, body.targetUrl || '/demo');
    return res.status(200).json({ success: true, plan });
  } catch (err) {
    const status = err.code === 'INVALID_STEPS' ? 400 : 500;
    return res.status(status).json({ success: false, error: err.message });
  }
};
