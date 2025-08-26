const DEFAULTS = {
  enabled: true,
  delayMs: 500,
  jitterMaxMs: 400,
  // Connect
  autoSend: false,
  recruiterTemplates: [
    "Hi {firstName}, I’m a recent CS grad passionate about scalable web & mobile systems. I’d love to connect and learn more about opportunities where I can contribute and grow.",
    "Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.",
    "Hi {firstName}, I’m a recent grad with experience creating scalable systems in web & mobile. Looking forward to connecting and exploring roles where I can bring value.",
    "Hello {firstName}, I just graduated in CS and have built scalable web & mobile applications. I’d be happy to connect and learn more about roles you’re hiring for."
  ],
  // Which template to use for Connect by default
  defaultConnectTemplate: 'alumni',
  // Message
  messageFlowEnabled: true,
  messageAutoSend: false,
  messageTemplate: "Hi {firstName}, great to connect here! I’m a new‑grad SWE focused on full‑stack/ML. Would love a quick chat about {company} — open to a brief call?",
  referralTemplate: "",
  // Alumni
  alumniTemplate: "Hi {firstName}, I’m a fellow IU alum and a recent CS grad focusing on SWE roles. I’m very interested in {company} and was wondering if you might be open to referring me. I’d greatly appreciate your help and would also love to hear about your experience there!",
  // Custom templates
  customTemplates: [
    { title: '', body: '' },
    { title: '', body: '' },
    { title: '', body: '' }
  ],
  // Follow-up templates
  followUpAcceptedAlumni: "Hi {firstName} — thanks for connecting! I’m an IU alum and recent CS grad (F‑1 OPT) interested in {company}. If you’re open, could you refer me for [Job Title/ID]? I’d really appreciate it.",
  followUpAcceptedRecruiter: "Hi {firstName}, thanks for connecting. I’m a recent CS grad (F‑1 OPT) seeking full‑time SWE roles. I’ve built scalable web and mobile apps and would love to learn about any new openings at {company}.",
  followUpPendingAlumni: "Hi {firstName} — IU alum here. I’m very interested in {company}. If you’re open, could you refer me for [Job Title/ID]? Would really appreciate it. Thanks!",
  followUpPendingRecruiter: "Hi {firstName}, I sent a connect request. I’m a recent CS grad (F‑1 OPT) seeking full‑time SWE roles. I’ve built scalable web and mobile apps and would love to learn about any openings at {company}. Thanks!"
};

const $ = (id) => document.getElementById(id);

async function load(){
  const data = await chrome.storage.sync.get(null);
  const cfg = { ...DEFAULTS, ...data };
  $('enabled').checked = cfg.enabled;
  $('delayMs').value = cfg.delayMs;
  $('jitterMaxMs').value = cfg.jitterMaxMs;
  $('autoSend').checked = cfg.autoSend;
  // Load recruiter templates into the 4 fields
  for (let i=1; i<=4; i++) {
    const el = document.getElementById(`recruiterTpl${i}`);
    if (el) el.value = (cfg.recruiterTemplates?.[i-1]) || DEFAULTS.recruiterTemplates[i-1];
  }
  if (document.getElementById('defaultConnectTemplate')) {
    $('defaultConnectTemplate').value = cfg.defaultConnectTemplate || 'alumni';
  }
  $('messageFlowEnabled').checked = cfg.messageFlowEnabled;
  $('messageAutoSend').checked = cfg.messageAutoSend;
  $('messageTemplate').value = cfg.messageTemplate;
  if (document.getElementById('referralTemplate')) {
    $('referralTemplate').value = cfg.referralTemplate || '';
  }
  if (document.getElementById('alumniTemplate')) {
    $('alumniTemplate').value = cfg.alumniTemplate || DEFAULTS.alumniTemplate;
  }
  // Follow-ups
  const fuIds = ['AcceptedAlumni','AcceptedRecruiter','PendingAlumni','PendingRecruiter'];
  fuIds.forEach(suf => {
    const id = 'followUp'+suf;
    const el = document.getElementById(id);
    if (el) el.value = cfg[id] || DEFAULTS[id];
  });
  // Load custom templates
  const ct = cfg.customTemplates || DEFAULTS.customTemplates;
  for (let i=1; i<=3; i++) {
    const t = ct[i-1] || { title:'', body:'' };
    if (document.getElementById(`customTitle${i}`)) {
      document.getElementById(`customTitle${i}`).value = t.title || '';
    }
    if (document.getElementById(`customBody${i}`)) {
      document.getElementById(`customBody${i}`).value = t.body || '';
    }
  }
}

async function save(){
  const cfg = {
    enabled: $('enabled').checked,
    delayMs: Math.max(0, parseInt($('delayMs').value || '0', 10)),
    jitterMaxMs: Math.max(0, parseInt($('jitterMaxMs').value || '0', 10)),
  autoSend: $('autoSend').checked,
  defaultConnectTemplate: (document.getElementById('defaultConnectTemplate') ? $('defaultConnectTemplate').value : 'alumni'),
    messageFlowEnabled: $('messageFlowEnabled').checked,
    messageAutoSend: $('messageAutoSend').checked,
    messageTemplate: $('messageTemplate').value.trim()
  };
  if (document.getElementById('referralTemplate')) cfg.referralTemplate = $('referralTemplate').value.trim();
  if (document.getElementById('alumniTemplate')) cfg.alumniTemplate = $('alumniTemplate').value.trim();
  // Save recruiter templates
  cfg.recruiterTemplates = [];
  for (let i=1; i<=4; i++) {
    const el = document.getElementById(`recruiterTpl${i}`);
    if (el) cfg.recruiterTemplates.push(el.value.trim());
  }
  // Save custom templates
  const customTemplates = [];
  for (let i=1; i<=3; i++) {
    const titleEl = document.getElementById(`customTitle${i}`);
    const bodyEl = document.getElementById(`customBody${i}`);
    if (titleEl || bodyEl) {
      customTemplates.push({ title: (titleEl?.value || '').trim(), body: (bodyEl?.value || '').trim() });
    }
  }
  if (customTemplates.length) cfg.customTemplates = customTemplates;
  // Save follow-ups
  ['AcceptedAlumni','AcceptedRecruiter','PendingAlumni','PendingRecruiter'].forEach(suf => {
    const id = 'followUp'+suf;
    const el = document.getElementById(id);
    if (el) cfg[id] = el.value.trim();
  });
  
  try {
    await chrome.storage.sync.set(cfg);
    $('status').textContent = '✅ Settings saved successfully';
    $('status').style.color = 'var(--success)';
    setTimeout(() => $('status').textContent = '', 3000);
    chrome.runtime.sendMessage({ type: 'autoNote:update', payload: cfg });
  } catch (error) {
    $('status').textContent = '❌ Failed to save settings';
    $('status').style.color = 'var(--danger)';
    setTimeout(() => $('status').textContent = '', 3000);
  }
}

async function reset(){
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }
  
  try {
    await chrome.storage.sync.set(DEFAULTS);
    await load();
    $('status').textContent = '✅ Settings reset to defaults';
    $('status').style.color = 'var(--success)';
    setTimeout(() => $('status').textContent = '', 3000);
    chrome.runtime.sendMessage({ type: 'autoNote:update', payload: DEFAULTS });
  } catch (error) {
    $('status').textContent = '❌ Failed to reset settings';
    $('status').style.color = 'var(--danger)';
    setTimeout(() => $('status').textContent = '', 3000);
  }
}

function renderPreview(){
  const mode = $('pType').value;
  let tpl;
  if (mode === 'message') {
    tpl = $('messageTemplate').value;
  } else {
    // Use Alumni or first recruiter template for preview
    if ((document.getElementById('defaultConnectTemplate')?.value || 'alumni') === 'alumni') {
      tpl = $('alumniTemplate')?.value || DEFAULTS.alumniTemplate;
    } else {
      tpl = document.getElementById('recruiterTpl1')?.value || DEFAULTS.recruiterTemplates[0];
    }
  }
  const msg = tpl
    .replaceAll('{firstName}', $('pFirst').value || 'there')
    .replaceAll('{company}', $('pCompany').value || 'your team')
    .replaceAll('{headline}', $('pHeadline').value || '')
    .replaceAll('{location}', '')
    .replaceAll('{lastCompany}', '')
    .replaceAll('{role}', '')
    .replaceAll('{school}', '')
    .replaceAll('{mutualCount}', '');
  $('preview').textContent = msg.slice(0, 300);
}

$('export').addEventListener('click', async () => {
  const { leads = [] } = await chrome.storage.local.get('leads');
  const csv = ['name,url,company,variant,mode,timestamp', ...leads.map(l => `${JSON.stringify(l.name)},${l.url},${JSON.stringify(l.company)},${l.variant},${l.mode||''},${new Date(l.ts).toISOString()}`)].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'leads.csv', saveAs: true });
});

window.addEventListener('DOMContentLoaded', () => {
  load();
  $('save').addEventListener('click', save);
  $('reset').addEventListener('click', reset);
  $('render').addEventListener('click', renderPreview);
});