// Background (service worker)
const DEFAULTS = {
  enabled: true,
  // Connect
  autoSend: false,
  delayMs: 500,
  jitterMaxMs: 400,
  recruiterTemplates: [
    "Hi {firstName}, I’m a recent CS grad passionate about scalable web & mobile systems. I’d love to connect and learn more about opportunities where I can contribute and grow.",
    "Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.",
    "Hi {firstName}, I’m a recent grad with experience creating scalable systems in web & mobile. Looking forward to connecting and exploring roles where I can bring value.",
    "Hello {firstName}, I just graduated in CS and have built scalable web & mobile applications. I’d be happy to connect and learn more about roles you’re hiring for."
  ],
  // Message mode
  messageFlowEnabled: true,
  messageAutoSend: false,
  messageTemplate: "Hi {firstName}, great to connect here! I'm a new‑grad SWE focused on full‑stack/ML. Would love a quick chat about {company} — open to a brief call?",
  // Alumni template
  alumniTemplate: "Hi {firstName}, I’m a fellow IU alum and a recent CS grad focusing on SWE roles. I’m very interested in working at {company} and was wondering if you might be open to referring me. I’d greatly appreciate your help and would also love to hear about your experience there!",
  // Custom templates
  customTemplates: [
    { title: '', body: '' },
    { title: '', body: '' },
    { title: '', body: '' }
  ]
};

const METRICS_KEY = 'metrics_v1';
// No daily cap anymore

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({ ...DEFAULTS, ...existing });
  await migrateTemplates();
});

chrome.runtime.onStartup.addListener(async () => {
  await migrateTemplates();
});

// No alarms needed now that daily cap is removed

// Gentle migration: set Alumni template and default connect template if missing or still using placeholder-y text
async function migrateTemplates() {
  try {
    const sync = await chrome.storage.sync.get(null);
    const patch = {};
    const curAlumni = sync.alumniTemplate;
    // Update if empty or if it contains bracket placeholders from old template
    if (!curAlumni || /\[[^\]]+\]/.test(curAlumni) || /I am an IU alum and I am connecting/.test(curAlumni)) {
      patch.alumniTemplate = DEFAULTS.alumniTemplate;
    }
    if (!sync.defaultConnectTemplate) {
      patch.defaultConnectTemplate = 'alumni';
    }
    if (!Array.isArray(sync.recruiterTemplates)) {
      patch.recruiterTemplates = DEFAULTS.recruiterTemplates;
    }
    if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
  } catch { /* noop */ }
}

async function bumpMetric(key) {
  const m = (await chrome.storage.local.get(METRICS_KEY))[METRICS_KEY] || {};
  m[key] = (m[key] || 0) + 1;
  await chrome.storage.local.set({ [METRICS_KEY]: m });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'metrics:bump') bumpMetric(msg.key);
});

chrome.commands.onCommand.addListener((cmd) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    if (cmd === 'open-note') chrome.tabs.sendMessage(tabs[0].id, { type: 'openNote' });
    if (cmd === 'open-message') chrome.tabs.sendMessage(tabs[0].id, { type: 'openMessage' });
  });
});
