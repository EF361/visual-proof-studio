document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Steps
  const navStep1 = document.getElementById('nav-step-1');
  const navStep2 = document.getElementById('nav-step-2');
  const navStep3 = document.getElementById('nav-step-3');
  const cardStepVisual = document.getElementById('card-step-visual');
  const cardStepCaption = document.getElementById('card-step-caption');
  const linkedinPreviewContainer = document.getElementById('linkedin-preview-container');

  // Media Mode Tabs
  const tabWalkthrough = document.getElementById('tab-walkthrough');
  const tabFlowchart = document.getElementById('tab-flowchart');
  const modeWalkthroughView = document.getElementById('mode-walkthrough-view');
  const modeFlowchartView = document.getElementById('mode-flowchart-view');

  // Walkthrough Form Elements
  const targetUrlInput = document.getElementById('target-url-input');
  const instructionsInput = document.getElementById('instructions-input');
  const durationSelect = document.getElementById('duration-select');
  const ratioSelect = document.getElementById('ratio-select');
  const badgePositionSelect = document.getElementById('badge-position-select');
  const planBtn = document.getElementById('plan-btn');
  const recordBtn = document.getElementById('record-btn');
  const stepTimeline = document.getElementById('step-timeline');
  const presetExample1 = document.getElementById('preset-example-1');
  const presetExample2 = document.getElementById('preset-example-2');

  // SARI Hook Framework Elements
  const sariSituation = document.getElementById('sari-situation');
  const sariAction = document.getElementById('sari-action');
  const sariResult = document.getElementById('sari-result');
  const sariInsight = document.getElementById('sari-insight');

  // Collapsible Advanced Settings
  const toggleAdvancedBtn = document.getElementById('toggle-advanced-btn');
  const advancedSettingsBody = document.getElementById('advanced-settings-body');
  const advancedChevron = document.getElementById('advanced-chevron');

  // Flowchart Form Elements
  const flowchartTitleInput = document.getElementById('flowchart-title-input');
  const flowchartBtn = document.getElementById('flowchart-btn');
  const colorModeMulti = document.getElementById('color-mode-multi');
  const colorModeOne = document.getElementById('color-mode-one');
  const flowchartFooterInput = document.getElementById('flowchart-footer-input');
  const nodeList = document.getElementById('node-list');
  const addStageBtn = document.getElementById('add-stage-btn');
  const removeStageBtn = document.getElementById('remove-stage-btn');
  const MIN_STAGES = 3;
  const MAX_STAGES = 8;
  let activeColorMode = 'multicolor';

  // Caption Generator Elements
  const toneChips = document.querySelectorAll('.tone-chip');
  const captionPromptInput = document.getElementById('caption-prompt-input');
  const generateCaptionBtn = document.getElementById('generate-caption-btn');
  const generateCaptionText = document.getElementById('generate-caption-text');
  const copyCaptionBtn = document.getElementById('copy-caption-btn');
  const captionEditor = document.getElementById('caption-editor');
  const captionCharCount = document.getElementById('caption-char-count');
  const hashtagPills = document.querySelectorAll('.tag-pill');

  // n8n AI Agent Integration Elements
  const n8nStatusDot = document.getElementById('n8n-status-dot');
  const n8nStatusText = document.getElementById('n8n-status-text');
  const n8nWebhookUrlInput = document.getElementById('n8n-webhook-url-input');
  const n8nTestBtn = document.getElementById('n8n-test-btn');
  const modalN8nWebhookUrl = document.getElementById('modal-n8n-webhook-url');

  // Prompt Manager Modal Elements
  const openPromptManagerBtn = document.getElementById('open-prompt-manager-btn');
  const promptManagerModal = document.getElementById('prompt-manager-modal');
  const closePromptModalBtn = document.getElementById('close-prompt-modal-btn');
  const tmplPills = document.querySelectorAll('.tmpl-pill');
  const promptTemplateEditor = document.getElementById('prompt-template-editor');
  const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
  const savePromptsBtn = document.getElementById('save-prompts-btn');
  const resetPromptsBtn = document.getElementById('reset-prompts-btn');

  // n8n Webhook Configuration & LocalStorage Persistence
  const DEFAULT_N8N_WEBHOOK = 'https://a1wnjhu0.rcsrv.net/webhook/generate-linkedin-caption';
  let n8nWebhookUrl = DEFAULT_N8N_WEBHOOK;
  try {
    const savedWebhook = localStorage.getItem('vp_n8n_webhook_url');
    if (savedWebhook) n8nWebhookUrl = savedWebhook;
  } catch (_) {}

  if (n8nWebhookUrlInput) {
    n8nWebhookUrlInput.value = n8nWebhookUrl;
    n8nWebhookUrlInput.addEventListener('input', () => {
      n8nWebhookUrl = n8nWebhookUrlInput.value.trim();
      try { localStorage.setItem('vp_n8n_webhook_url', n8nWebhookUrl); } catch (_) {}
      if (modalN8nWebhookUrl) modalN8nWebhookUrl.value = n8nWebhookUrl;
    });
  }

  if (modalN8nWebhookUrl) {
    modalN8nWebhookUrl.value = n8nWebhookUrl;
    modalN8nWebhookUrl.addEventListener('input', () => {
      n8nWebhookUrl = modalN8nWebhookUrl.value.trim();
      try { localStorage.setItem('vp_n8n_webhook_url', n8nWebhookUrl); } catch (_) {}
      if (n8nWebhookUrlInput) n8nWebhookUrlInput.value = n8nWebhookUrl;
    });
  }

  if (n8nTestBtn) {
    n8nTestBtn.addEventListener('click', async () => {
      if (!n8nWebhookUrl) {
        showToast('Please enter an n8n Webhook URL first.');
        return;
      }
      if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot testing';
      if (n8nStatusText) n8nStatusText.textContent = 'Testing connection...';
      try {
        const res = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            archetype: 'shipping-log',
            description: 'Ping test from VisualProof Studio',
            url: targetUrlInput ? targetUrlInput.value.trim() : ''
          })
        });
        if (res.ok) {
          if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot';
          if (n8nStatusText) n8nStatusText.textContent = 'Active · gpt-4o';
          showToast('n8n Webhook connected successfully!');
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot offline';
        if (n8nStatusText) n8nStatusText.textContent = 'Offline (using fallback)';
        showToast(`n8n Webhook ping failed: ${err.message}`);
      }
    });
  }

  // LinkedIn Post Preview & Output Elements
  const liPreviewText = document.getElementById('li-preview-text');
  const previewPlaceholder = document.getElementById('preview-placeholder');
  const recordingProgress = document.getElementById('recording-progress');
  const previewDisplay = document.getElementById('preview-display');
  const progressStatusTitle = document.getElementById('progress-status-title');
  const progressStatusDesc = document.getElementById('progress-status-desc');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const gifResultImg = document.getElementById('gif-result-img');
  const videoResultPlayer = document.getElementById('video-result-player');
  const toggleViewGif = document.getElementById('toggle-view-gif');
  const toggleViewVideo = document.getElementById('toggle-view-video');
  const downloadGifBtn = document.getElementById('download-gif-btn');
  const downloadVideoBtn = document.getElementById('download-video-btn');
  const openNewTabBtn = document.getElementById('open-new-tab-btn');
  const outputMetaPills = document.getElementById('output-meta-pills');
  const metaDuration = document.getElementById('meta-duration');
  const metaFrames = document.getElementById('meta-frames');
  const metaRes = document.getElementById('meta-res');
  const demoNote = document.getElementById('demo-note');
  const metaSize = document.getElementById('meta-size');

  // LinkedIn Publish Action Buttons
  const publishLinkedinBtn = document.getElementById('publish-linkedin-btn');
  const quickPostBtn = document.getElementById('quick-post-btn');
  const studioToast = document.getElementById('studio-toast');
  const toastMessage = document.getElementById('toast-message');

  // Project Showcase & TEMPLATES.md Synthesizer Elements
  const appExplanationInput = document.getElementById('app-explanation-input');
  const synthesizeShowcaseBtn = document.getElementById('synthesize-showcase-btn');
  const archetypeChips = document.querySelectorAll('.archetype-chip');
  const presetClear = document.getElementById('preset-clear');

  const activeScenarioCard = document.getElementById('active-scenario-card');
  const activeScenarioBadge = document.getElementById('active-scenario-badge');
  const activeScenarioTargetBadge = document.getElementById('active-scenario-target-badge');
  const activeScenarioTitle = document.getElementById('active-scenario-title');
  const activeScenarioDesc = document.getElementById('active-scenario-desc');
  const toggleCustomizeBtn = document.getElementById('toggle-customize-btn');
  const customizeToggleText = document.getElementById('customize-toggle-text');
  const customizeChevron = document.getElementById('customize-chevron');
  const scenarioDetailsContainer = document.getElementById('scenario-details-container');

  // State
  let currentPlan = null;
  let activeTonePreset = 'launch';
  let activeTemplateKey = 'launch';
  let activeMediaResult = null;
  let activeArchetype = 'shipping'; // from TEMPLATES.md: shipping, decisions, craft, postmortem, contrarian

  // 1. SARI Script Auto-Assembly
  [sariSituation, sariAction, sariResult, sariInsight].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        generateSmartCaption();
      });
    }
  });

  // 2. Workflow Navigation
  function highlightStep(stepNum) {
    [navStep1, navStep2, navStep3].forEach((el, idx) => {
      if (el) el.classList.toggle('active', idx + 1 === stepNum);
    });
  }

  if (navStep1) navStep1.addEventListener('click', () => {
    cardStepVisual.scrollIntoView({ behavior: 'smooth', block: 'start' });
    highlightStep(1);
  });
  if (navStep2) navStep2.addEventListener('click', () => {
    cardStepCaption.scrollIntoView({ behavior: 'smooth', block: 'start' });
    highlightStep(2);
  });
  if (navStep3) navStep3.addEventListener('click', () => {
    linkedinPreviewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    highlightStep(3);
  });

  // 3. Collapsible Advanced Settings
  if (toggleAdvancedBtn && advancedSettingsBody && advancedChevron) {
    toggleAdvancedBtn.addEventListener('click', () => {
      const isHidden = advancedSettingsBody.classList.contains('hidden');
      advancedSettingsBody.classList.toggle('hidden', !isHidden);
      advancedChevron.classList.toggle('open', isHidden);
    });
  }

  // 4. Media Mode Tabs
  if (tabWalkthrough && tabFlowchart) {
    tabWalkthrough.addEventListener('click', () => {
      tabWalkthrough.classList.add('active');
      tabFlowchart.classList.remove('active');
      modeWalkthroughView.classList.remove('hidden');
      modeFlowchartView.classList.add('hidden');
    });

    tabFlowchart.addEventListener('click', () => {
      tabFlowchart.classList.add('active');
      tabWalkthrough.classList.remove('active');
      modeFlowchartView.classList.remove('hidden');
      modeWalkthroughView.classList.add('hidden');
    });
  }

  // 5. Flowchart Color Mode Toggle
  if (colorModeMulti && colorModeOne) {
    colorModeMulti.addEventListener('click', () => {
      colorModeMulti.classList.add('active');
      colorModeOne.classList.remove('active');
      activeColorMode = 'multicolor';
    });

    colorModeOne.addEventListener('click', () => {
      colorModeOne.classList.add('active');
      colorModeMulti.classList.remove('active');
      activeColorMode = 'onecolor';
    });
  }

  // Flowchart stage list (3-8 stages, in the order the arrows follow)
  function updateStageButtons() {
    const count = nodeList.children.length;
    addStageBtn.disabled = count >= MAX_STAGES;
    removeStageBtn.disabled = count <= MIN_STAGES;
  }

  function addStageRow(value = '') {
    if (nodeList.children.length >= MAX_STAGES) return;
    const idx = nodeList.children.length + 1;
    const row = document.createElement('div');
    row.className = 'node-editor-item';
    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = idx;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'node-input';
    input.value = value;
    input.placeholder = `Stage ${idx}`;
    input.setAttribute('aria-label', `Stage ${idx}`);
    row.append(num, input);
    nodeList.appendChild(row);
    updateStageButtons();
  }

  function resetStageRows() {
    nodeList.innerHTML = '';
    for (let i = 0; i < MIN_STAGES; i++) addStageRow();
  }

  function getStageValues() {
    return Array.from(nodeList.querySelectorAll('.node-input')).map(i => i.value.trim()).filter(Boolean);
  }

  if (nodeList && addStageBtn && removeStageBtn) {
    resetStageRows();
    addStageBtn.addEventListener('click', () => addStageRow());
    removeStageBtn.addEventListener('click', () => {
      if (nodeList.children.length > MIN_STAGES) nodeList.lastElementChild.remove();
      updateStageButtons();
    });
  }

  // 6. Showcase Synthesizer Engine (from TEMPLATES.md)
  function synthesizeShowcaseFromTemplate() {
    const url = targetUrlInput.value.trim() || 'https://your-production-app.vercel.app';
    const explanation = (appExplanationInput ? appExplanationInput.value.trim() : '');

    if (!explanation && !targetUrlInput.value.trim()) {
      showToast('Please enter your URL or simple app explanation above!');
      return;
    }

    const lower = (explanation + ' ' + url).toLowerCase();

    // Deduce differentiating features & technical angles
    let situation = '';
    let actionSteps = [];
    let result = '';
    let insight = '';

    if (lower.includes('pass') || lower.includes('crypto') || lower.includes('vault') || lower.includes('entropy')) {
      situation = 'Most security and utility tools send sensitive data over HTTP APIs or rely on static screenshots where users cannot verify cryptographic safety or live UX.';
      actionSteps = [
        '1. Inspect desktop split-panel with real-time entropy estimate.',
        '2. Execute one-tap generation with smooth cursor glide & ripple feedback.',
        '3. Toggle passphrase mode showing dictionary word separation.',
        '4. Open air-gapped QR code SVG modal for offline mobile transfer.',
        '5. Highlight responsive mobile viewport with sticky thumb-reach bar.'
      ];
      result = '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
      insight = '[Your real lesson learned, in one sentence]';
    } else if (lower.includes('ai') || lower.includes('rag') || lower.includes('llm') || lower.includes('vector')) {
      situation = 'Standard LLM interfaces hallucinate on domain knowledge and freeze the UI during heavy model inference.';
      actionSteps = [
        '1. Enter domain prompt in clean distraction-free workspace.',
        '2. Trigger top-K vector similarity search across indexed knowledge.',
        '3. Inspect dynamic context chunk injection into model prompt.',
        '4. Stream synthesized answers with verified inline source citations.'
      ];
      result = '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
      insight = '[Your real lesson learned, in one sentence]';
    } else if (lower.includes('queue') || lower.includes('worker') || lower.includes('kafka') || lower.includes('event')) {
      situation = 'Synchronous HTTP processing fails under sudden burst traffic, causing gateway timeouts and lost customer transactions.';
      actionSteps = [
        '1. Ingest webhook event payload with immediate 202 Accepted status.',
        '2. Push background task onto partition-backed message broker queue.',
        '3. Dynamically scale worker pool based on consumer topic lag.',
        '4. Broadcast completion state back to connected clients via WebSockets.'
      ];
      result = '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
      insight = '[Your real lesson learned, in one sentence]';
    } else if (lower.includes('mobile') || lower.includes('offline') || lower.includes('sync') || lower.includes('flutter')) {
      situation = 'Mobile users on unstable network connections suffer from frozen spinners and lost form drafts.';
      actionSteps = [
        '1. Commit user interactions immediately to local encrypted SQLite storage.',
        '2. Queue optimistic mutations with deterministic monotonic timestamps.',
        '3. Reconcile concurrent edits using state-based CRDT delta synchronization.',
        '4. Push background delta changes over GraphQL subscriptions upon reconnection.'
      ];
      result = '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
      insight = '[Your real lesson learned, in one sentence]';
    } else {
      const cleanDesc = explanation || 'interactive modern dashboard with real-time state feedback';
      situation = `Most showcases for ${cleanDesc} only show static images where users can’t feel the real-time speed, responsiveness, or core UX polish.`;
      actionSteps = [
        `1. Inspect clean viewport and initial layout for ${cleanDesc}.`,
        '2. Glide cursor and trigger primary action showing instantaneous visual feedback.',
        '3. Demonstrate core differentiating capability and real-time state recalculation.',
        '4. Switch viewports or open secondary modal to showcase responsive ergonomics.'
      ];
      result = '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
      insight = '[Your real lesson learned, in one sentence]';
    }

    // Populate SARI textareas
    if (sariSituation) sariSituation.value = situation;
    if (sariAction) sariAction.value = actionSteps.join('\n');
    if (sariResult) sariResult.value = result;
    if (sariInsight) sariInsight.value = insight;

    // Update Active Showcase Summary Card
    if (activeScenarioTitle) activeScenarioTitle.textContent = explanation ? (explanation.length > 50 ? explanation.substring(0, 47) + '...' : explanation) : 'Custom Dashboard Showcase';
    if (activeScenarioDesc) activeScenarioDesc.textContent = `Showcases ${actionSteps.length} differentiating scenes with authentic builder storytelling.`;
    if (activeScenarioBadge) activeScenarioBadge.textContent = `${activeArchetype.toUpperCase()} · ${ratioSelect ? ratioSelect.value : '1:1'}`;
    if (activeScenarioTargetBadge) activeScenarioTargetBadge.textContent = url;

    // Generate narrative caption using TEMPLATES.md archetypes
    generateSmartCaption();

    // Re-fetch timeline
    fetchPlan();

    showToast('✓ Synthesized unique scenes & story from TEMPLATES.md!');
  }

  if (synthesizeShowcaseBtn) {
    synthesizeShowcaseBtn.addEventListener('click', synthesizeShowcaseFromTemplate);
  }

  // Helper to sync archetype selections across Step 1 and Step 2
  function setStoryArchetype(archetype, skipGeneration = false) {
    activeArchetype = archetype || 'shipping';
    archetypeChips.forEach(c => {
      c.classList.toggle('active', c.dataset.archetype === activeArchetype);
    });
    toneChips.forEach(c => {
      c.classList.toggle('active', c.dataset.archetype === activeArchetype);
    });
    if (activeScenarioBadge) {
      activeScenarioBadge.textContent = `${activeArchetype.toUpperCase()} · ${ratioSelect ? ratioSelect.value : '1:1'}`;
    }
    if (!skipGeneration) {
      generateSmartCaption();
    }
  }

  // Archetype Chips Selection (Step 1)
  archetypeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      setStoryArchetype(chip.dataset.archetype);
      showToast(`Switched story archetype to: ${chip.textContent.trim()}`);
    });
  });

  // Collapsible Customization Accordion
  if (toggleCustomizeBtn && scenarioDetailsContainer && customizeChevron && customizeToggleText) {
    toggleCustomizeBtn.addEventListener('click', () => {
      const isCollapsed = scenarioDetailsContainer.classList.contains('collapsed');
      scenarioDetailsContainer.classList.toggle('collapsed', !isCollapsed);
      customizeChevron.classList.toggle('open', isCollapsed);
      customizeToggleText.textContent = isCollapsed ? 'Hide Details & Prompts' : 'Fine-Tune Story & Scene Steps';
    });
  }

  // URL Preset Quick Links
  if (presetExample1) {
    presetExample1.addEventListener('click', () => {
      presetExample1.classList.add('active');
      if (presetExample2) presetExample2.classList.remove('active');
      if (presetClear) presetClear.classList.remove('active');
      targetUrlInput.value = 'https://intelligent-curie-alpha.vercel.app/';
      if (appExplanationInput) {
        appExplanationInput.value = 'Real-time cryptographic password generator with client-side entropy calculation (~105 bits), passphrase mode, and air-gapped QR modal';
      }
      synthesizeShowcaseFromTemplate();
    });
  }

  if (presetExample2) {
    presetExample2.addEventListener('click', () => {
      presetExample2.classList.add('active');
      if (presetExample1) presetExample1.classList.remove('active');
      if (presetClear) presetClear.classList.remove('active');
      targetUrlInput.value = 'http://localhost:3000/demo';
      if (appExplanationInput) {
        appExplanationInput.value = 'Local interactive visual proof demo server with zero-latency entropy feedback and instant Playwright recording';
      }
      synthesizeShowcaseFromTemplate();
    });
  }

  if (presetClear) {
    presetClear.addEventListener('click', () => {
      presetClear.classList.add('active');
      if (presetExample1) presetExample1.classList.remove('active');
      if (presetExample2) presetExample2.classList.remove('active');
      targetUrlInput.value = '';
      if (appExplanationInput) appExplanationInput.value = '';
      if (sariSituation) sariSituation.value = '';
      if (sariAction) sariAction.value = '';
      if (sariResult) sariResult.value = '';
      if (sariInsight) sariInsight.value = '';
      if (instructionsInput) instructionsInput.value = '';
      if (captionPromptInput) captionPromptInput.value = '';
      if (flowchartTitleInput) flowchartTitleInput.value = '';
      if (flowchartFooterInput) flowchartFooterInput.value = '';
      if (nodeList) resetStageRows();
      if (activeScenarioBadge) activeScenarioBadge.textContent = 'Custom Project Showcase';
      if (activeScenarioTargetBadge) activeScenarioTargetBadge.textContent = 'Awaiting URL...';
      if (activeScenarioTitle) activeScenarioTitle.textContent = 'Ready for Your Dashboard';
      if (activeScenarioDesc) activeScenarioDesc.textContent = 'Enter your URL and explanation above, then click Synthesize to construct unique scenes and an organic builder story.';
      if (captionEditor) captionEditor.value = '';
      if (liPreviewText) liPreviewText.innerHTML = '<span style="color:#64748b; font-style:italic;">Enter your project URL and click Synthesize to preview your authentic LinkedIn post...</span>';
      if (stepTimeline) stepTimeline.innerHTML = '<div style="color:#64748b; font-size:0.8rem; padding:0.5rem 0;">Awaiting synthesis or manual steps...</div>';
      showToast('Studio cleared to blank slate.');
    });
  }

  // 7. Builder Story Archetypes (Step 2)
  toneChips.forEach(chip => {
    chip.addEventListener('click', () => {
      setStoryArchetype(chip.dataset.archetype);
      showToast(`Switched story archetype to: ${chip.textContent.trim()}`);
    });
  });

  generateCaptionBtn.addEventListener('click', () => generateSmartCaption());

  // Hashtag Pills Toggle
  hashtagPills.forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      const tag = pill.dataset.tag;
      let text = captionEditor.value;
      if (pill.classList.contains('active')) {
        if (!text.includes(tag)) {
          captionEditor.value = (text.trim() + ' ' + tag).trim();
        }
      } else {
        captionEditor.value = text.replace(new RegExp(tag + '\\b', 'g'), '').replace(/\s+/g, ' ').trim();
      }
      syncCaptionToPreview();
    });
  });

  function syncCaptionToPreview() {
    const raw = captionEditor.value;
    captionCharCount.textContent = `${raw.length} / 3000 chars`;
    const formatted = escapeHtml(raw).replace(/(#\w+)/g, '<span class="tag">$1</span>');
    liPreviewText.innerHTML = formatted || '<span style="color: #64748b;">(Generated LinkedIn caption will appear here...)</span>';
  }

  captionEditor.addEventListener('input', syncCaptionToPreview);

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Helper to remove any markdown code block fences if returned by the LLM
  function cleanMarkdownOutput(rawText) {
    if (!rawText) return '';
    let text = rawText.trim();
    if (text.startsWith('```markdown')) {
      text = text.slice(11);
    } else if (text.startsWith('```')) {
      text = text.slice(3);
    }
    if (text.endsWith('```')) {
      text = text.slice(0, -3);
    }
    return text.trim();
  }

  // Map internal archetype key to n8n AI Agent archetype names
  function mapArchetypeToAgentName(arch) {
    switch (arch) {
      case 'shipping': return 'shipping-log';
      case 'decisions': return 'why-x-over-y';
      case 'craft': return 'micro-interaction';
      case 'postmortem': return 'post-mortem';
      case 'contrarian': return 'contrarian';
      default: return 'shipping-log';
    }
  }

  // 8. Natural Builder Journey Caption Generator (n8n AI Agent with Local Fallback)
  async function generateSmartCaption() {
    const url = targetUrlInput ? targetUrlInput.value.trim() || 'https://my-app.vercel.app' : 'https://my-app.vercel.app';
    const explanation = appExplanationInput ? appExplanationInput.value.trim() : '';
    const customPrompt = captionPromptInput ? captionPromptInput.value.trim() : '';
    const situation = (sariSituation ? sariSituation.value.trim() : '') || 'Static screenshots weren’t cutting it — people see a GitHub link, but can’t feel the real-time latency or UX.';
    const action = (sariAction ? sariAction.value.trim() : '') || 'Engineered an authentic visual walkthrough with automated cursor tracking and real-time state feedback.';
    const result = (sariResult ? sariResult.value.trim() : '') || '[Your real result: only numbers you measured, e.g. "first answer in 1.2s"]';
    const insight = (sariInsight ? sariInsight.value.trim() : '') || '[Your real lesson learned, in one sentence]';

    // Attempt n8n AI Agent Webhook call if configured
    if (n8nWebhookUrl) {
      if (generateCaptionBtn) generateCaptionBtn.disabled = true;
      if (generateCaptionText) generateCaptionText.textContent = 'Generating with n8n AI Agent...';
      if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot testing';

      try {
        const flowchartNodes = getStageValues().join(' -> ');

        const isFlowchartActive = modeFlowchartView && !modeFlowchartView.classList.contains('hidden');

        const payload = {
          url: url,
          description: explanation || situation,
          prompt: customPrompt,
          archetype: mapArchetypeToAgentName(activeArchetype),
          flowchartSummary: flowchartNodes,
          metrics: result,
          attachedMedia: isFlowchartActive ? '2D Architecture Flowchart GIF' : '1080p Web Walkthrough GIF'
        };

        const res = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.caption) {
            const cleaned = cleanMarkdownOutput(data.caption);
            if (captionEditor) {
              captionEditor.value = cleaned;
            }
            syncCaptionToPreview();
            if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot';
            if (n8nStatusText) n8nStatusText.textContent = 'Active · gpt-4o';
            showToast('✓ Caption generated via n8n AI Agent (OpenAI gpt-4o)!');
            return;
          }
        }
        throw new Error(`Status ${res.status}`);
      } catch (err) {
        console.warn('n8n Webhook call failed, falling back to local template synthesizer:', err);
        if (n8nStatusDot) n8nStatusDot.className = 'n8n-status-dot offline';
        if (n8nStatusText) n8nStatusText.textContent = 'Offline (using fallback)';
        showToast('n8n Webhook unreachable. Switched to local TEMPLATES engine.');
      } finally {
        if (generateCaptionBtn) generateCaptionBtn.disabled = false;
        if (generateCaptionText) generateCaptionText.textContent = 'Generate Caption with n8n AI Agent';
      }
    }

    // Local Synthesis Fallback (TEMPLATES.md Archetypes)
    runLocalTemplateSynthesis(url, situation, action, result, insight);
  }

  function runLocalTemplateSynthesis(url, situation, action, result, insight) {
    const actionBullets = action.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.startsWith('•') || line.match(/^[0-9]+\./) ? line.replace(/^[0-9]+\.\s*/, '• ') : `• ${line}`)
      .join('\n');

    const activeTags = Array.from(document.querySelectorAll('.tag-pill.active'))
      .map(p => p.dataset.tag)
      .join(' ');

    let postText = '';

    // Archetype 1: The "Late-Night Shipping Log" (Raw Builder Journey)
    if (activeArchetype === 'shipping') {
      postText = `I spent [how long?] rewriting this one flow because static screenshots weren't cutting it.

Whenever I shared our progress, people would say: "Looks nice, what does it actually do?"
Links to GitHub got bookmarked and forgotten. Screenshots didn't show the real-time latency or the interaction feel.

So I sat down and built this:

[Attach Walkthrough GIF/Video]

Here is what is happening under the hood:
${actionBullets}

The biggest surprise during testing:
${insight}

The real result: ${result}

Live build is up here if you want to test it: ${url}

What’s one UI interaction you find yourself obsessively polishing?

${activeTags || '#BuildInPublic #IndieHacker #WebDev #NextJS #Frontend'}`;

    // Archetype 2: The "Why We Chose X Over Y" (Engineering Decision Journal)
    } else if (activeArchetype === 'decisions') {
      postText = `We almost went with [the option you didn't choose] for this project.
Then [what changed your mind].

Here is the actual pipeline we ended up building instead:

[Attach Flowchart / Walkthrough GIF]

${situation}

The decision came down to these architectural bets:
${actionBullets}

The takeaway:
${insight}

The measurable outcome: ${result}

Full system is live: ${url}

Engineers: What's your rule of thumb for deciding what lives client-side/edge vs. in the primary database?

${activeTags || '#SoftwareArchitecture #SystemDesign #EdgeComputing #BackendEngineering #DevOps'}`;

    // Archetype 3: The "Micro-Interaction Spotlight" (Obsessive Craft & UX)
    } else if (activeArchetype === 'craft') {
      postText = `Most users won’t notice this detail. But they’ll feel it.

[Attach Walkthrough Clip]

When building this interface, we kept running into the same frustration with standard web tools:
${situation}

So we rethought the interaction ergonomics:
${actionBullets}

Good software isn't just about clean code—it's about respecting the physical ergonomics of how people actually hold and interact with devices.

The difference: ${result}

💡 Core Insight:
${insight}

Try clicking through it live: ${url}

${activeTags || '#ProductDesign #UIUX #FrontendDev #WebDevelopment #DesignEngineering'}`;

    // Archetype 4: The "Unfiltered Post-Mortem / What Broke" (Honest Debugging Log)
    } else if (activeArchetype === 'postmortem') {
      postText = `This looked completely fine in local development.
Then we tested it on [how you tested it, e.g. a slow phone connection].

The issues became obvious immediately:
${situation}

Here is how we engineered around it:
${actionBullets}

The result: ${result}

💡 Hard-earned technical takeaway:
${insight}

See the live difference here: ${url}

What was the last bug that humbled you in production?

${activeTags || '#SoftwareEngineering #WebPerformance #Debugging #Frontend #FullStack'}`;

    // Archetype 5: The "Contrarian Take Backed by Visual Proof"
    } else if (activeArchetype === 'contrarian') {
      postText = `Unpopular opinion: You probably don't need heavy server roundtrips or complex databases for workflows that can run 100% in the user's browser.

Here is visual proof of what is possible with native browser APIs:

[Attach Walkthrough GIF/Video]

The friction with the standard way:
${situation}

What we built instead:
${actionBullets}

The outcome: ${result}

💡 The Architecture Gem:
${insight}

Test the live build and break it: ${url}

Where do you draw the line between client-side computation and server orchestration?

${activeTags || '#WebDevelopment #JavaScript #SoftwareArchitecture #IndieHacker #FullStack'}`;
    }

    if (captionEditor) {
      captionEditor.value = postText.trim();
    }
    syncCaptionToPreview();
  }

  // 9. Prompt Templates & Prompt Manager Modal Logic
  const DEFAULT_TEMPLATES = {
    launch: `I spent [how long?] building something I genuinely needed: {url}

{situation}

Whenever I shared progress, static screenshots never told the full story. So here is the actual walkthrough in action:

✨ Highlights:
{notes}

The real outcome: {result}

💡 The biggest engineering takeaway:
{insight}

Live build is up here if you want to test it: {url}
What is one UI or architecture detail you find yourself obsessively polishing?

#BuildInPublic #WebDevelopment #FrontendEngineering #NextJS #UIUX #SoftwareEngineering`,

    architecture: `Behind every smooth user experience is a pipeline someone thought hard about.

Here is how {url} actually works:

[Your real pipeline, e.g. Settings ➔ Secure Random ➔ Password]

{situation}

Why we engineered it this way:
• [Design choice 1 and why]
• [Design choice 2 and why]
• [Design choice 3 and why]

The result: {result}

💡 Architectural Takeaway:
{insight}

Engineers: How are you balancing edge computation vs centralized database transactions?
Explore the live app: {url}

#SoftwareArchitecture #SystemDesign #EdgeComputing #FullStack #BackendEngineering #DevOps`,

    buildinpublic: `Another milestone shipped in public: {url}

Building this came directly from real friction:
{situation}

Here is what went into this iteration:
{action}

The numbers so far: {result}

🔑 Lesson learned the hard way:
{insight}

Shipping in public forces extreme clarity on product priorities.
Try the build and break it: {url}

#IndieHacker #BuildInPublic #StartupLife #FullStack #WebDevelopment`,

    feature: `Most users won’t consciously notice this detail in {url}. But they will feel it.

{situation}

So we re-thought the viewport ergonomics:
• [Detail 1 you polished]
• [Detail 2 you polished]
• [Detail 3 you polished]

The difference: {result}

🎯 The Core Insight:
{insight}

Try clicking through it live: {url}

#ProductDesign #UIUX #FrontendDev #JavaScript #UserExperience`
  };

  let customTemplates = { ...DEFAULT_TEMPLATES };
  try {
    const saved = localStorage.getItem('vp_custom_templates');
    if (saved) customTemplates = { ...DEFAULT_TEMPLATES, ...JSON.parse(saved) };
  } catch (_) {}

  function loadTemplateToEditor(key) {
    if (promptTemplateEditor) {
      promptTemplateEditor.value = customTemplates[key] || DEFAULT_TEMPLATES[key] || '';
    }
  }

  tmplPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tmplPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeTemplateKey = pill.dataset.tmpl || 'launch';
      loadTemplateToEditor(activeTemplateKey);
    });
  });

  openPromptManagerBtn.addEventListener('click', () => {
    promptManagerModal.classList.remove('hidden');
    loadTemplateToEditor(activeTemplateKey);
  });

  closePromptModalBtn.addEventListener('click', () => {
    promptManagerModal.classList.add('hidden');
  });

  promptManagerModal.addEventListener('click', (e) => {
    if (e.target === promptManagerModal) {
      promptManagerModal.classList.add('hidden');
    }
  });

  savePromptsBtn.addEventListener('click', () => {
    if (promptTemplateEditor) {
      customTemplates[activeTemplateKey] = promptTemplateEditor.value;
      try {
        localStorage.setItem('vp_custom_templates', JSON.stringify(customTemplates));
      } catch (_) {}
    }
    promptManagerModal.classList.add('hidden');
    showToast('Prompt template saved & applied!');
    generateSmartCaption();
  });

  if (resetPromptsBtn) {
    resetPromptsBtn.addEventListener('click', () => {
      customTemplates = { ...DEFAULT_TEMPLATES };
      try {
        localStorage.removeItem('vp_custom_templates');
      } catch (_) {}
      loadTemplateToEditor(activeTemplateKey);
      showToast('Templates reset to SARI defaults.');
    });
  }

  // 10. Copy Caption Handler
  copyCaptionBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(captionEditor.value);
      showToast('Caption copied to clipboard!');
    } catch (_) {
      showToast('Failed to copy caption.');
    }
  });

  // 11. One-Click Post to LinkedIn
  async function handlePostToLinkedIn() {
    const textToCopy = captionEditor.value.trim();
    const targetUrl = targetUrlInput.value.trim() || 'https://kind-borg-pearl.vercel.app';

    // Never post template placeholders (or made-up example facts) by accident
    const placeholder = textToCopy.match(/\[[^\]\n]{2,}\]/);
    if (placeholder) {
      showToast(`Replace or delete ${placeholder[0].slice(0, 40)} and any other [bracketed] parts before posting.`);
      captionEditor.focus();
      return;
    }

    try {
      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy);
      }
      showToast('✓ Caption copied to clipboard! Opening LinkedIn...');
    } catch (_) {
      showToast('Opening LinkedIn share composer...');
    }

    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetUrl)}`;
    setTimeout(() => {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }, 350);
  }

  if (publishLinkedinBtn) publishLinkedinBtn.addEventListener('click', handlePostToLinkedIn);
  if (quickPostBtn) quickPostBtn.addEventListener('click', handlePostToLinkedIn);

  // Toast System
  let toastTimer = null;
  function showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    studioToast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      studioToast.classList.add('hidden');
    }, 4000);
  }

  // 12. Step Plan Fetcher: shows exactly what the recorder will do, or why it can't
  async function fetchPlan() {
    const prompt = instructionsInput.value.trim();
    const targetUrl = targetUrlInput.value.trim();
    currentPlan = null;

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, targetUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.plan) {
        currentPlan = data.plan;
        renderTimeline(data.plan.steps);
        return 'ok';
      }
      renderPlanError(data.error || 'The step planner could not read these steps.');
      return res.status === 400 ? 'invalid' : 'offline';
    } catch (_) {
      renderPlanError('The step planner is not reachable. Start the local studio with npm start.');
      return 'offline';
    }
  }

  function describeStepAction(step) {
    const action = step.click ? 'Click' : step.point ? 'Point' : 'View';
    const target = step.click || step.point;
    const what = !target ? '' : target.selector || target.text || `${target.role} "${target.name}"`;
    return `${step.viewport === 'mobile' ? 'Mobile · ' : ''}${action}${what ? `: ${what}` : ''}`;
  }

  function renderTimeline(steps) {
    if (!stepTimeline) return;
    stepTimeline.innerHTML = '';
    steps.forEach((step, idx) => {
      const item = document.createElement('div');
      item.className = 'step-item';
      const badge = document.createElement('span');
      badge.className = 'step-index-badge';
      badge.textContent = idx + 1;
      const desc = document.createElement('span');
      desc.className = 'step-item-desc';
      desc.textContent = step.caption;
      const action = document.createElement('span');
      action.className = 'step-item-duration';
      action.textContent = describeStepAction(step);
      item.append(badge, desc, action);
      stepTimeline.appendChild(item);
    });
  }

  function renderPlanError(message) {
    if (!stepTimeline) return;
    stepTimeline.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'step-plan-error';
    item.setAttribute('role', 'alert');
    item.textContent = message;
    stepTimeline.appendChild(item);
  }

  // 13. RECORD WALKTHROUGH GIF & VIDEO (Live Backend Execution)
  recordBtn.addEventListener('click', async () => {
    recordBtn.disabled = true;
    if (await fetchPlan() === 'invalid') {
      recordBtn.disabled = false;
      showToast('Fix the recording steps first (see the step list).');
      return;
    }

    startRecordingUI('Recording your walkthrough...');

    let progress = 15;
    const progressTimer = setInterval(() => {
      if (progress < 90) {
        progress += 10;
        progressBarFill.style.width = `${progress}%`;
        if (progress > 30 && progress < 65) {
          progressStatusTitle.textContent = 'Navigating & Executing Playwright Browser Script...';
          progressStatusDesc.textContent = 'Recording animated cursor motion, click ripples, and viewport resizes.';
        } else if (progress >= 65) {
          progressStatusTitle.textContent = 'Encoding GIF & Video...';
          progressStatusDesc.textContent = 'Building the GIF and MP4 from the recorded frames.';
        }
      }
    }, 1200);

    try {
      const targetUrl = targetUrlInput.value.trim();
      const res = await fetch('/api/generate-walkthrough', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: instructionsInput.value.trim(),
          targetUrl: targetUrl,
          duration: durationSelect.value ? parseInt(durationSelect.value, 10) : null,
          aspectRatio: ratioSelect ? ratioSelect.value : '1:1',
          badgePosition: badgePositionSelect ? badgePositionSelect.value : 'bottom'
        })
      });

      clearInterval(progressTimer);
      progressBarFill.style.width = '100%';

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.gifUrl) {
          showResultUI(data);
          return;
        }
      } else if (res.status === 400 || res.status === 422) {
        // Bad steps, unsafe URL, or a step that failed on the page: say so, never fake it
        const data = await res.json().catch(() => ({}));
        showFailureUI(data.error || 'Recording failed.');
        return;
      }
    } catch (err) {
      console.warn('Backend live generation error:', err);
    }

    clearInterval(progressTimer);
    progressBarFill.style.width = '100%';

    // Fallback to pre-generated asset matching the selected aspect ratio
    const chosenRatio = ratioSelect ? ratioSelect.value : '1:1';
    let fallbackUrl = '/samples/intelligent_curie_1x1.gif';
    let fallbackVideo = '/samples/intelligent_curie_1x1.webm';
    let fallbackSize = 1751120;
    let fallbackVidSize = 839168;
    let fallbackRes = '1080 × 1080';

    if (chosenRatio === '4:5') {
      fallbackUrl = '/samples/intelligent_curie_4x5.gif';
      fallbackVideo = '/samples/intelligent_curie_4x5.webm';
      fallbackSize = 1772140;
      fallbackVidSize = 1092800;
      fallbackRes = '1080 × 1350';
    } else if (chosenRatio === '1.91:1') {
      fallbackUrl = '/samples/intelligent_curie_landscape.gif';
      fallbackVideo = '/samples/intelligent_curie_landscape.webm';
      fallbackSize = 1457660;
      fallbackVidSize = 503600;
      fallbackRes = '1200 × 627';
    }

    showResultUI({
      gifUrl: fallbackUrl,
      videoUrl: fallbackVideo,
      gifFilename: `visualproof_${chosenRatio.replace(/[:.]/g, 'x')}.gif`,
      videoFilename: `visualproof_${chosenRatio.replace(/[:.]/g, 'x')}.webm`,
      durationSec: 17,
      frameCount: 34,
      size: fallbackSize,
      videoSize: fallbackVidSize,
      resolution: fallbackRes,
      aspectRatio: chosenRatio,
      demo: true
    });
  });

  // 14. GENERATE ARCHITECTURE FLOWCHART (Live Backend Execution)
  flowchartBtn.addEventListener('click', async () => {
    const stages = getStageValues();
    if (stages.length < MIN_STAGES || stages.length > MAX_STAGES) {
      showToast(`Please fill in ${MIN_STAGES}–${MAX_STAGES} stages (you have ${stages.length}).`);
      return;
    }

    startRecordingUI('Rendering your flowchart...');

    let progress = 20;
    const progressTimer = setInterval(() => {
      if (progress < 90) {
        progress += 12;
        progressBarFill.style.width = `${progress}%`;
      }
    }, 800);

    try {
      const res = await fetch('/api/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: flowchartTitleInput.value.trim(),
          footer: flowchartFooterInput ? flowchartFooterInput.value.trim() : '',
          colorMode: activeColorMode,
          stages
        })
      });

      clearInterval(progressTimer);
      progressBarFill.style.width = '100%';

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.gifUrl) {
          showResultUI(data);
          return;
        }
      } else if (res.status === 400) {
        // Input problem: tell the user instead of silently showing a sample
        const data = await res.json().catch(() => ({}));
        showFailureUI(data.error || 'The flowchart input was not accepted.', false);
        return;
      }
    } catch (err) {
      console.warn('Flowchart generation error:', err);
    }

    clearInterval(progressTimer);
    progressBarFill.style.width = '100%';

    const isOneColor = activeColorMode === 'onecolor';
    const flowGif = isOneColor ? '/samples/flowchart_onecolor.gif' : '/samples/flowchart_multicolor.gif';
    const flowVid = isOneColor ? '/samples/flowchart_onecolor.webm' : '/samples/flowchart_multicolor.webm';
    const flowSize = isOneColor ? 3614789 : 3639612;
    const flowVidSize = isOneColor ? 400962 : 543606;

    showResultUI({
      gifUrl: flowGif,
      videoUrl: flowVid,
      gifFilename: `flowchart_${activeColorMode}.gif`,
      videoFilename: `flowchart_${activeColorMode}.webm`,
      durationSec: 7,
      frameCount: 50,
      size: flowSize,
      videoSize: flowVidSize,
      resolution: '1080 × 740',
      aspectRatio: '1.46:1',
      demo: true
    });
  });

  function showFailureUI(message, showInSteps = true) {
    recordBtn.disabled = false;
    flowchartBtn.disabled = false;
    recordingProgress.classList.add('hidden');
    previewDisplay.classList.remove('hidden');
    if (showInSteps) renderPlanError(message);
    showToast(message.split('\n')[0]);
  }

  function startRecordingUI(titleText) {
    recordBtn.disabled = true;
    flowchartBtn.disabled = true;
    previewPlaceholder.classList.add('hidden');
    previewDisplay.classList.add('hidden');
    recordingProgress.classList.remove('hidden');
    progressStatusTitle.textContent = titleText;
    progressBarFill.style.width = '10%';
  }

  function showResultUI(data) {
    activeMediaResult = data;
    recordBtn.disabled = false;
    flowchartBtn.disabled = false;
    recordingProgress.classList.add('hidden');
    previewPlaceholder.classList.add('hidden');
    previewDisplay.classList.remove('hidden');

    // Add cache-busting timestamp query to ensure fresh image loads
    const cacheBust = `?t=${Date.now()}`;
    const safeGifUrl = data.gifUrl || '/samples/intelligent_curie_1x1.gif';
    const safeVideoUrl = data.videoUrl || (safeGifUrl.replace(/\.gif$/, '.webm'));

    gifResultImg.src = safeGifUrl + cacheBust;
    downloadGifBtn.href = safeGifUrl;
    downloadGifBtn.download = data.gifFilename || 'visual_proof.gif';

    if (downloadVideoBtn && safeVideoUrl) {
      downloadVideoBtn.style.display = 'inline-flex';
      downloadVideoBtn.href = safeVideoUrl;
      downloadVideoBtn.download = data.videoFilename || 'visual_proof.webm';
    } else if (downloadVideoBtn) {
      downloadVideoBtn.style.display = 'none';
    }

    if (videoResultPlayer && safeVideoUrl) {
      videoResultPlayer.src = safeVideoUrl + cacheBust;
    }

    // Default to GIF view
    if (toggleViewGif) toggleViewGif.classList.add('active');
    if (toggleViewVideo) toggleViewVideo.classList.remove('active');
    gifResultImg.classList.remove('hidden');
    if (videoResultPlayer) {
      videoResultPlayer.classList.add('hidden');
      videoResultPlayer.pause();
    }

    if (toggleViewGif && toggleViewVideo) {
      toggleViewGif.onclick = () => {
        toggleViewGif.classList.add('active');
        toggleViewVideo.classList.remove('active');
        gifResultImg.classList.remove('hidden');
        if (videoResultPlayer) {
          videoResultPlayer.classList.add('hidden');
          videoResultPlayer.pause();
        }
        updateSizeDisplay('gif', data);
      };

      toggleViewVideo.onclick = () => {
        toggleViewVideo.classList.add('active');
        toggleViewGif.classList.remove('active');
        gifResultImg.classList.add('hidden');
        if (videoResultPlayer) {
          videoResultPlayer.classList.remove('hidden');
          videoResultPlayer.play().catch(() => {});
        }
        updateSizeDisplay('video', data);
      };
    }

    openNewTabBtn.onclick = () => {
      const activeUrl = (toggleViewVideo && toggleViewVideo.classList.contains('active') && safeVideoUrl)
        ? safeVideoUrl
        : safeGifUrl;
      window.open(activeUrl, '_blank');
    };

    outputMetaPills.classList.remove('hidden');
    metaDuration.textContent = `${data.durationSec || 17}s`;
    metaFrames.textContent = `${data.frameCount || 34} frames`;

    if (metaRes) {
      metaRes.textContent = data.resolution || '1080 × 1080';
    }

    // Sample media (Vercel API or client fallback) is labelled so it is not mistaken for a real recording
    if (demoNote) demoNote.classList.toggle('hidden', !data.demo);

    updateSizeDisplay('gif', data);
    highlightStep(3);
    showToast('Visual Proof ready in LinkedIn Post Preview!');
  }

  function updateSizeDisplay(mode, data) {
    if (mode === 'video' && data.videoSize) {
      metaSize.textContent = `${(data.videoSize / 1024).toFixed(1)} KB (Video)`;
    } else {
      const bytes = typeof data.size === 'number' && !isNaN(data.size) ? data.size : 1751120;
      const sizeMb = (bytes / (1024 * 1024)).toFixed(2);
      metaSize.textContent = `${sizeMb} MB (GIF)`;
    }
  }

  // Pre-load default output on startup
  showResultUI({
    gifUrl: '/samples/intelligent_curie_1x1.gif',
    videoUrl: '/samples/intelligent_curie_1x1.webm',
    gifFilename: 'visual_proof_1x1.gif',
    videoFilename: 'visual_proof_1x1.webm',
    durationSec: 17,
    frameCount: 34,
    size: 1751120,
    videoSize: 839168,
    resolution: '1080 × 1080',
    aspectRatio: '1:1',
    demo: true
  });

  planBtn.addEventListener('click', fetchPlan);

  // Initialize
  fetchPlan();
  generateSmartCaption();
});
