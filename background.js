// Background (service worker)
const DEFAULTS = {
  enabled: true,
  // Connect
  autoSend: false,
  delayMs: 500,
  jitterMaxMs: 400,
  // Recruiter templates (2 variants)
  recruiterTpl1: "Hi {firstName}, I'm a recent CS grad passionate about scalable web & mobile systems. I'd love to connect and learn more about opportunities where I can contribute and grow.",
  recruiterTpl2: "Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.",
  // Alumni template
  alumniTemplate: "Hi {firstName}, I'm a fellow IU alum and a recent CS grad focusing on SWE roles. I'm very interested in working at {company} and was wondering if you might be open to referring me. I'd greatly appreciate your help and would also love to hear about your experience there!",
  // 0.1% Elite messages
  eliteMessageA: "Hey {firstName}, LOVE what you're building at {company}. Would love to connect and stay in touch. \n~ Abhishek",
  eliteMessageB: "Hey {firstName}, I'm Abhishek,\n- MS in CS\n- Expertise in Python, Javascript, AWS, React, SQL, etc.\n\nI'm quite interested in the SWE role.\n\nfancy a quick chat this week?",
  // Post-application follow-up
  postApplicationFollowUp: "Hi {firstName},\n\nI'm Abhishek, a New Grad SWE. Just applied for the {role} at {company}. Given my background in [TOP DIFFERENTIATOR], I believe I'm a great fit to maybe join your team. What would be the best next steps to kick off this process?\n\nBest,\nAbhishek",
  // Message mode (for backwards compatibility)
  messageFlowEnabled: true,
  messageAutoSend: false
};

const METRICS_KEY = 'metrics_v1';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({ ...DEFAULTS, ...existing });
  await migrateTemplates();
});

chrome.runtime.onStartup.addListener(async () => {
  await migrateTemplates();
});

// Gentle migration: update templates if needed
async function migrateTemplates() {
  try {
    const sync = await chrome.storage.sync.get(null);
    const patch = {};
    
    // Migrate old recruiterTemplates array to new individual template format
    if (Array.isArray(sync.recruiterTemplates)) {
      patch.recruiterTpl1 = sync.recruiterTemplates[0] || DEFAULTS.recruiterTpl1;
      patch.recruiterTpl2 = sync.recruiterTemplates[1] || DEFAULTS.recruiterTpl2;
      delete patch.recruiterTemplates;
    }
    
    // Ensure new templates exist
    if (!sync.recruiterTpl1) patch.recruiterTpl1 = DEFAULTS.recruiterTpl1;
    if (!sync.recruiterTpl2) patch.recruiterTpl2 = DEFAULTS.recruiterTpl2;
    if (!sync.eliteMessageA) patch.eliteMessageA = DEFAULTS.eliteMessageA;
    if (!sync.eliteMessageB) patch.eliteMessageB = DEFAULTS.eliteMessageB;
    if (!sync.postApplicationFollowUp) patch.postApplicationFollowUp = DEFAULTS.postApplicationFollowUp;
    
    const curAlumni = sync.alumniTemplate;
    if (!curAlumni || /\[[^\]]+\]/.test(curAlumni) || /I am an IU alum and I am connecting/.test(curAlumni)) {
      patch.alumniTemplate = DEFAULTS.alumniTemplate;
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
    if (cmd === 'open-hiring-finder') chrome.tabs.sendMessage(tabs[0].id, { type: 'openHiringFinder' });
  });
});
