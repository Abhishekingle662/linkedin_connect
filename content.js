(() => {
  const DEFAULTS = {
    enabled: true,
    // Connect
    autoSend: false,
    delayMs: 500,
    jitterMaxMs: 400,
    defaultConnectTemplate: 'alumni',
    recruiterTemplates: [
      "Hi {firstName}, I’m a recent CS grad passionate about scalable web & mobile systems. I’d love to connect and learn more about opportunities where I can contribute and grow.",
      "Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.",
      "Hi {firstName}, I’m a recent grad with experience creating scalable systems in web & mobile. Looking forward to connecting and exploring roles where I can bring value.",
      "Hello {firstName}, I just graduated in CS and have built scalable web & mobile applications. I’d be happy to connect and learn more about roles you’re hiring for."
    ],
    // Message mode
    messageFlowEnabled: true,
    messageAutoSend: false,
    messageTemplate: "Hi {firstName}, great to connect here! I’m a new‑grad SWE focused on full‑stack/ML. Would love a quick chat about {company} — open to a brief call?",
    // Alumni template
    alumniTemplate: "Hi {firstName}, I’m a fellow IU alum and a recent CS grad focusing on SWE roles. I’m very interested in {company} and was wondering if you might be open to referring me. I’d greatly appreciate your help and would also love to hear about your experience there!"
  };

  let settings = { ...DEFAULTS };

  // —— Utils ——
  const log = (...args) => console.debug('[AutoNote]', ...args);
  const debounce = (fn, wait) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  const clean = (s='') => s.replace(/\s+/g, ' ').trim();
  const textOf = (sel) => clean(document.querySelector(sel)?.textContent || '');

  // Buttons
  function isConnectButton(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (!el.matches('button, [role="button"], .artdeco-button, a[role="button"]')) return false;
    const txt = clean(el.textContent).toLowerCase();
    const aria = clean(el.getAttribute('aria-label') || '').toLowerCase();
    const haystacks = [txt, aria];
    return haystacks.some(t => (
      /\bconnect\b/i.test(t) ||
      /\bconectar|collegati|verbinden|connexion|connecter|connecte\b/i.test(t)
    ));
  }
  function isMessageButton(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (!el.matches('button, [role="button"], .artdeco-button, a[role="button"]')) return false;
    const txt = clean(el.textContent).toLowerCase();
    const aria = clean(el.getAttribute('aria-label') || '').toLowerCase();
    return /\bmessage\b/i.test(txt) || /\bmessage\b/i.test(aria) || /\bmensaje|nachricht|messagez|messaggio\b/i.test(txt);
  }
  const markBound = (el, key='autoNoteBound') => (el.dataset[key] = '1');
  const isBound = (el, key='autoNoteBound') => el.dataset[key] === '1';

  function waitForElement(selectors, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      (function scan() {
        for (const sel of selectors) {
          try { const node = document.querySelector(sel); if (node) return resolve(node); } catch {}
        }
        if (performance.now() - start > timeout) return reject(new Error('Timeout waiting for element'));
        requestAnimationFrame(scan);
      })();
    });
  }

  const capLinkedInLimit = (msg) => msg.length <= 300 ? msg : msg.slice(0, 299) + '\u2026';

  function extractFirstNameNear(el) {
    const h1 = document.querySelector('main h1');
    if (h1 && clean(h1.textContent)) return clean(h1.textContent).split(/\s+/)[0];
    let node = el;
    for (let d = 0; node && d < 5; d++, node = node.parentElement) {
      const cand = node.querySelector('a[href*="/in/"], span[dir="ltr"], span[aria-hidden="true"]');
      const t = clean(cand?.textContent || '');
      if (t && /[a-z]/i.test(t)) return t.split(/\s+/)[0];
    }
    const modalTitle = document.querySelector('.artdeco-modal__header h2, .send-invite__header');
    const t = clean(modalTitle?.textContent || '');
    if (t) return t.split(/\s+/)[0];
    return 'there';
  }

  function extractCompanyNear(el) {
    let node = el;
    for (let d = 0; node && d < 5; d++, node = node.parentElement) {
      const line = node.querySelector('div[dir="ltr"], .entity-result__primary-subtitle, .t-12.t-normal, .t-14.t-normal');
      const text = clean(line?.textContent || '');
      if (text && /[a-z]/i.test(text)) {
        const m = /(at|@)\s+([^•|,]+)/i.exec(text);
        if (m) return clean(m[2]);
        if (text.split(' ').length <= 6) return text;
      }
    }
    return 'your team';
  }

  function extractProfileContext() {
    const headline = textOf('main [class*="headline"], .entity-result__primary-subtitle');
    const location = textOf('main [class*="subline-level-2"], .entity-result__secondary-subtitle');
    const expLine = textOf('section[id*="experience"] li div[dir="ltr"], .entity-result__summary-info');
    const school = textOf('section[id*="education"] li div[dir="ltr"]');
    const mutualCount = textOf('[data-test-mutuals-count], .entity-result__simple-insight-text');
    const lastCompany = (/(?: at | @ )([^•|,]+)/i.exec(expLine) || [])[1]?.trim() || '';
    const role = (/^(.*?)(?: at | @ )/.exec(expLine) || [])[1]?.trim() || '';
    return { headline, location, lastCompany, role, school, mutualCount };
  }

  function fillTemplate(tpl, ctx){
    return tpl
      .replaceAll('{firstName}', ctx.firstName || 'there')
      .replaceAll('{company}', ctx.company || ctx.lastCompany || 'your team')
      .replaceAll('{headline}', ctx.headline || '')
      .replaceAll('{location}', ctx.location || '')
      .replaceAll('{lastCompany}', ctx.lastCompany || '')
      .replaceAll('{role}', ctx.role || '')
      .replaceAll('{school}', ctx.school || '')
      .replaceAll('{mutualCount}', ctx.mutualCount || '');
  }

  function pickAudienceTemplate(ctx){
    // Use the first available recruiter template as the audience-based default
    const list = Array.isArray(settings.recruiterTemplates) ? settings.recruiterTemplates : DEFAULTS.recruiterTemplates;
    const first = (list.find(t => (t || '').trim().length > 0)) || list[0] || '';
    return first;
  }

  async function nextRecruiterTemplate(){
    const list = (Array.isArray(settings.recruiterTemplates) && settings.recruiterTemplates.length)
      ? settings.recruiterTemplates
      : DEFAULTS.recruiterTemplates;
    const valid = list.filter(t => (t || '').trim().length > 0);
    const use = valid.length ? valid : list;
    const key = 'recruiter_idx_v1';
    const got = await chrome.storage.local.get(key);
    const idx = Number(got[key] || 0) % use.length;
    await chrome.storage.local.set({ [key]: (idx + 1) % use.length });
    return use[idx];
  }

  function toast(msg){
    const d = document.createElement('div');
    d.textContent = msg;
    Object.assign(d.style, { position:'fixed', zIndex:2147483647, right:'12px', bottom:'12px', padding:'10px 14px', background:'#0a66c2', color:'#fff', borderRadius:'10px', boxShadow:'0 6px 20px rgba(0,0,0,.2)', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Arial', fontSize:'14px' });
    document.body.appendChild(d); setTimeout(()=>d.remove(), 2400);
  }

  async function loadSettings(){
    return new Promise((resolve) => { chrome.storage.sync.get(null, data => { settings = { ...DEFAULTS, ...data }; resolve(settings); }); });
  }

  function waitJitter(){
    const ms = Math.max(0, Math.floor(Math.random() * (settings.jitterMaxMs || 0)));
    return new Promise(r => setTimeout(r, ms));
  }

  // —— Connect flow helpers ——
  function findAddNoteChoiceButton(){
    const roots = [document.querySelector('div[role="dialog"]'), document.querySelector('.artdeco-modal'), document.querySelector('.artdeco-dropdown__content'), document].filter(Boolean);
    const labelTests = [/^(add (a )?note)$/i, /^add note$/i, /^ajouter une note$/i, /^añadir( una)? nota$/i, /^hinzufügen.*notiz$/i];
    for (const root of roots) {
      const candidates = root.querySelectorAll('button, a[role="button"], .artdeco-button');
      for (const b of candidates) {
        const text = clean(b.textContent || '');
        const aria = clean(b.getAttribute('aria-label') || '');
        if (labelTests.some(re => re.test(text) || re.test(aria))) return b;
      }
    }
    return null;
  }
  async function ensureNoteEditorOpen(){
    const existing = document.querySelector('textarea[name="message"], textarea[id*="custom-message"], .send-invite__custom-message textarea, .artdeco-text-input--textarea textarea');
    if (existing) return existing;
    const choiceBtn = findAddNoteChoiceButton();
    if (choiceBtn) choiceBtn.click();
    return await waitForElement(['textarea[name="message"]','textarea[id*="custom-message"]','.send-invite__custom-message textarea','.artdeco-text-input--textarea textarea'], 8000);
  }

  function injectNoteHelper(textarea, ctx){
    const modalRoot = document.querySelector('div[role="dialog"], .artdeco-modal') || document.body;
    if (modalRoot.dataset.autoNoteUi) return;
    modalRoot.dataset.autoNoteUi = '1';

    const bar = document.createElement('div');
    bar.className = 'autoNote-helper-note';
    bar.innerHTML = `
      <span style="color:#fff;align-self:center;">Template:</span>
      <button data-act="cycle">Default</button>
  <button data-act="randomRecruiter" title="Insert a random recruiter template">Random Recruiter</button>
      <button data-act="replace">Replace</button>
      <button data-act="replaceSend">Replace & Send</button>
    `;
    Object.assign(bar.style, { position:'fixed', right:'12px', bottom:'140px', zIndex:2147483647, display:'flex', gap:'8px', background:'#0f1116', borderRadius:'12px', padding:'8px', boxShadow:'0 10px 30px rgba(0,0,0,.35)' });
    Array.from(bar.querySelectorAll('button')).forEach(btn => { Object.assign(btn.style, { border:0, borderRadius:'10px', padding:'8px 10px', background:'#0a66c2', color:'#fff', cursor:'pointer' }); });
    document.body.appendChild(bar);

    // Build template list for note flow
    const options = [];
    options.push({ key:'default', label:'Default', get: () => pickAudienceTemplate(ctx) });
    if (settings.alumniTemplate) options.push({ key:'alumni', label:'Alumni', get: () => settings.alumniTemplate });
    if (settings.referralTemplate) options.push({ key:'referral', label:'Referral', get: () => settings.referralTemplate });
    if (Array.isArray(settings.customTemplates)) {
      settings.customTemplates.forEach((t, idx) => {
        const title = (t?.title || '').trim();
        const body = (t?.body || '').trim();
        if (body) options.push({ key:`custom${idx+1}`, label:title || `Custom ${idx+1}`, get: () => body });
      });
    }
    let idx = 0;
    const cycleBtn = bar.querySelector('button[data-act="cycle"]');
    const updateLabel = () => { cycleBtn.textContent = options[idx]?.label || 'Default'; };
    updateLabel();

    const dispose = () => { bar.remove(); delete modalRoot.dataset.autoNoteUi; };
    const onClick = async (e) => {
      const act = e.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'cycle') { idx = (idx + 1) % options.length; updateLabel(); return; }
      if (act === 'randomRecruiter') {
        const list = (Array.isArray(settings.recruiterTemplates) && settings.recruiterTemplates.length)
          ? settings.recruiterTemplates
          : (Array.isArray(DEFAULTS.recruiterTemplates) ? DEFAULTS.recruiterTemplates : []);
        const valid = list.filter(t => (t || '').trim().length > 0);
        const use = valid.length ? valid : list;
        const tpl = use.length ? use[Math.floor(Math.random() * use.length)] : '';
        const msg = capLinkedInLimit(fillTemplate(tpl || '', ctx));
        try {
          textarea.focus();
          textarea.value = msg;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {}
        return;
      }
      const tpl = options[idx]?.get?.() || pickAudienceTemplate(ctx);
      const msg = capLinkedInLimit(fillTemplate(tpl, ctx));
      try {
        textarea.focus();
        textarea.value = msg;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } catch {}
      if (act === 'replaceSend') {
        const modal = document.querySelector('div[role="dialog"], .artdeco-modal') || document;
        const btns = Array.from(modal.querySelectorAll('button'));
        const send = btns.find(b => /^(send)$/i.test(clean(b.textContent || '')) || /^(send)$/i.test(clean(b.getAttribute('aria-label') || '')));
        if (send) send.click();
      }
    };
    bar.addEventListener('click', onClick);

    // Cleanup when modal closes
    const obs = new MutationObserver(() => {
      const stillThere = document.contains(textarea) && document.body.contains(bar);
      const openModal = document.querySelector('div[role="dialog"], .artdeco-modal');
      if (!stillThere || !openModal) { obs.disconnect(); dispose(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // —— Message flow helpers ——
  function findNearestMessageButton(from){
    const scan = (root) => Array.from(root.querySelectorAll('button, a[role="button"], .artdeco-button'));
    let node = from;
    for (let d = 0; node && d < 5; d++, node = node.parentElement) {
      const hit = scan(node).find(b => /message/i.test(clean(b.textContent||'')) || /message/i.test(clean(b.getAttribute('aria-label')||'')));
      if (hit) return hit;
    }
    return Array.from(document.querySelectorAll('button, a[role="button"], .artdeco-button')).find(b => /message/i.test(clean(b.textContent||'')) || /message/i.test(clean(b.getAttribute('aria-label')||'')));
  }

  async function ensureMessageComposerOpen(originBtn){
    const selectors = [
      'div.msg-form__contenteditable[contenteditable="true"]',
      'div[role="textbox"].msg-form__contenteditable',
      'section.msg-form__container div[contenteditable="true"]'
    ];
    const existing = document.querySelector(selectors.join(','));
    if (existing) return existing;

    // Phase 1: after the user's click, give LinkedIn a moment to open the composer
    try {
      return await waitForElement(selectors, 1500);
    } catch {}

    // Phase 2: if still not found, trigger a click (e.g., when handler was invoked programmatically)
    const trigger = originBtn ? findNearestMessageButton(originBtn) : null;
    if (trigger) trigger.click();

    return await waitForElement(selectors, 8000);
  }

  function insertIntoComposer(el, text){
    try {
      el.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges(); sel.addRange(range);
      // Prefer modern API if available
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
      } else {
        el.textContent = text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch(e){ log('insertIntoComposer failed', e); el.textContent = text; }
  }

  function injectComposerHelper(composer, getMessage){
    if (composer.dataset.autoNoteUi) return; // avoid duplicate
    composer.dataset.autoNoteUi = '1';
    const bar = document.createElement('div');
    bar.className = 'autoNote-helper';
    bar.innerHTML = `
      <button data-act="insert">Insert</button>
      <button data-act="send">Insert & Send</button>
      <button data-act="attach">Attach file</button>
      <span style="color:#fff;align-self:center;margin-left:8px;">Template:</span>
      <button data-act="cycle" title="Switch template">Message</button>
      <button data-act="insertSelected" title="Insert selected template">Insert Selected</button>
      <select data-act="followSel" style="margin-left:8px;background:#0a66c2;color:#fff;border:0;border-radius:8px;padding:6px;">
        <option value="">Follow-up…</option>
        <option value="followUpAcceptedAlumni">Accepted — Alumni</option>
        <option value="followUpAcceptedRecruiter">Accepted — Recruiter/HM</option>
        <option value="followUpPendingAlumni">Pending — Alumni</option>
        <option value="followUpPendingRecruiter">Pending — Recruiter/HM</option>
      </select>
      <button data-act="insertFollow">Insert Follow-up</button>
    `;
    Object.assign(bar.style, { position: 'fixed', right: '12px', bottom: '90px', zIndex: 2147483647, display: 'flex', gap: '8px', background: '#0f1116', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,.35)' });
    Array.from(bar.querySelectorAll('button')).forEach(btn => { Object.assign(btn.style, { border: 0, borderRadius: '10px', padding: '8px 10px', background: '#0a66c2', color: '#fff', cursor: 'pointer' }); });
    document.body.appendChild(bar);

    // Build template list
    const templateOptions = [];
    templateOptions.push({ key: 'message', label: 'Message', get: () => settings.messageTemplate });
    if (settings.alumniTemplate) templateOptions.push({ key: 'alumni', label: 'Alumni', get: () => settings.alumniTemplate });
    if (settings.referralTemplate) templateOptions.push({ key: 'referral', label: 'Referral', get: () => settings.referralTemplate });
    if (Array.isArray(settings.customTemplates)) {
      settings.customTemplates.forEach((t, idx) => {
        const title = (t?.title || '').trim();
        const body = (t?.body || '').trim();
        if (body) templateOptions.push({ key: `custom${idx+1}`, label: title || `Custom ${idx+1}`, get: () => body });
      });
    }
    let currentIdx = 0;
    const getSelectedTemplateText = () => templateOptions[currentIdx]?.get?.() || settings.messageTemplate;
    const cycleBtn = bar.querySelector('button[data-act="cycle"]');
    const updateCycleLabel = () => { cycleBtn.textContent = templateOptions[currentIdx]?.label || 'Message'; };
    updateCycleLabel();

    const dispose = () => { bar.remove(); delete composer.dataset.autoNoteUi; };
    const onClick = async (e) => {
      const act = e.target.getAttribute('data-act');
      if (!act) return;
      const ctxMsg = getMessage();
      const selectedMsg = fillTemplate(getSelectedTemplateText(), { ...extractProfileContext(), firstName: extractFirstNameNear(composer), company: extractCompanyNear(composer) });
      if (act === 'insert' || act === 'send') {
        insertIntoComposer(composer, ctxMsg);
        if (act === 'send' && settings.messageAutoSend) {
          const sendBtn = Array.from(document.querySelectorAll('button')).find(b => /^(send|send now)$/i.test(clean(b.textContent||'')) || /^(send|send now)$/i.test(clean(b.getAttribute('aria-label')||'')) || b.className.includes('msg-form__send-button'));
          if (sendBtn) sendBtn.click();
        }
      }
      if (act === 'attach') {
        const attachBtn = Array.from(document.querySelectorAll('button')).find(b => /(attach|file|upload)/i.test(clean(b.getAttribute('aria-label')||'')) && /msg-form__/.test(b.className) || /(attach|paperclip)/i.test(clean(b.textContent||'')));
        if (attachBtn) attachBtn.click();
      }
      if (act === 'cycle') {
        currentIdx = (currentIdx + 1) % templateOptions.length;
        updateCycleLabel();
      }
      if (act === 'insertSelected') {
        insertIntoComposer(composer, selectedMsg);
      }
      if (act === 'insertFollow') {
        const sel = bar.querySelector('select[data-act="followSel"]');
        const key = sel?.value || '';
        const txt = key && settings[key] ? settings[key] : '';
        if (txt) {
          const filled = fillTemplate(txt, { ...extractProfileContext(), firstName: extractFirstNameNear(composer), company: extractCompanyNear(composer) });
          insertIntoComposer(composer, filled);
        }
      }
    };
    bar.addEventListener('click', onClick);

    // Clean up when navigating away
    const obs = new MutationObserver(() => { if (!document.body.contains(composer)) { obs.disconnect(); dispose(); } });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // Lead log
  function currentProfileUrl(){ return location.href.split('?')[0]; }
  async function saveLead(entry){
    const { leads = [] } = await chrome.storage.local.get('leads');
    leads.push(entry); await chrome.storage.local.set({ leads });
  }

  // —— Handlers ——
  async function handleConnect(button){
    try {
      if (!settings.enabled) return;
      const firstName = extractFirstNameNear(button);
      const company = extractCompanyNear(button);
      const ctx = { firstName, company, ...extractProfileContext() };
      await new Promise(r => setTimeout(r, settings.delayMs));
  await waitJitter();
      const textarea = await ensureNoteEditorOpen();
      // Select template according to user preference
      let baseTpl;
      switch ((settings.defaultConnectTemplate || 'audience')) {
        case 'alumni': baseTpl = settings.alumniTemplate || pickAudienceTemplate(ctx); break;
        case 'referral': baseTpl = settings.referralTemplate || pickAudienceTemplate(ctx); break;
        case 'message': baseTpl = settings.messageTemplate || pickAudienceTemplate(ctx); break;
        case 'custom1': baseTpl = settings.customTemplates?.[0]?.body || pickAudienceTemplate(ctx); break;
        case 'custom2': baseTpl = settings.customTemplates?.[1]?.body || pickAudienceTemplate(ctx); break;
        case 'custom3': baseTpl = settings.customTemplates?.[2]?.body || pickAudienceTemplate(ctx); break;
        default: baseTpl = await nextRecruiterTemplate();
      }
  const variant = '';
  const message = capLinkedInLimit(fillTemplate(baseTpl, ctx));
      textarea.value = message;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
  // Offer quick template switcher for notes
  injectNoteHelper(textarea, ctx);
      if (variant) chrome.runtime.sendMessage({ type: 'metrics:bump', key: `insert_${variant}` });
      await saveLead({ name: firstName, url: currentProfileUrl(), company, variant: variant || 'base', ts: Date.now(), mode: 'connect' });
      if (settings.autoSend) {
        await new Promise(r => setTimeout(r, 200));
        const modal = document.querySelector('div[role="dialog"], .artdeco-modal') || document;
        const btns = Array.from(modal.querySelectorAll('button'));
        const send = btns.find(b => /^(send)$/i.test(clean(b.textContent || '')) || /^(send)$/i.test(clean(b.getAttribute('aria-label') || '')));
        if (send) send.click();
        if (variant) chrome.runtime.sendMessage({ type: 'metrics:bump', key: `send_${variant}` });
        toast('Invite note sent');
      } else {
        toast('Invite note inserted');
      }
    } catch (e) { log('handleConnect error', e); toast("Couldn't insert note"); }
  }

  async function handleMessage(button){
    try {
      if (!settings.enabled || !settings.messageFlowEnabled) return;
      const firstName = extractFirstNameNear(button);
      const company = extractCompanyNear(button);
      const ctx = { firstName, company, ...extractProfileContext() };
      await new Promise(r => setTimeout(r, settings.delayMs));
  await waitJitter();
      const composer = await ensureMessageComposerOpen(button);
      const msg = fillTemplate(settings.messageTemplate, ctx);
      insertIntoComposer(composer, msg);
      chrome.runtime.sendMessage({ type: 'metrics:bump', key: 'message_insert' });
      await saveLead({ name: firstName, url: currentProfileUrl(), company, variant: 'message', ts: Date.now(), mode: 'message' });
      injectComposerHelper(composer, () => fillTemplate(settings.messageTemplate, { firstName, company, ...extractProfileContext() }));

      if (settings.messageAutoSend) {
        await new Promise(r => setTimeout(r, 200));
        const send = Array.from(document.querySelectorAll('button')).find(b => /^(send|send now)$/i.test(clean(b.textContent||'')) || /^(send|send now)$/i.test(clean(b.getAttribute('aria-label')||'')) || b.className.includes('msg-form__send-button'));
        if (send) { send.click(); chrome.runtime.sendMessage({ type: 'metrics:bump', key: 'message_send' }); toast('Message sent'); }
        else toast('Inserted (no send button found)');
      } else {
        toast('Message inserted');
      }
    } catch(e){ log('handleMessage error', e); toast("Couldn't handle message"); }
  }

  // —— Binding ——
  const bindButtons = debounce(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"], .artdeco-button, a[role="button"]'));
    for (const b of btns) {
      if (!isBound(b) && isConnectButton(b)) { b.addEventListener('click', () => handleConnect(b), { capture: true }); markBound(b); }
      if (!isBound(b, 'autoNoteBoundMsg') && isMessageButton(b)) { b.addEventListener('click', () => handleMessage(b), { capture: true }); markBound(b, 'autoNoteBoundMsg'); }
    }
  }, 250);

  const mo = new MutationObserver(bindButtons);

  async function init(){
    await loadSettings();
    bindButtons();
    mo.observe(document.documentElement, { childList: true, subtree: true });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'autoNote:update') { Object.assign(settings, msg.payload || {}); if (msg.payload?.enabled !== undefined) toast(`Auto-Note ${settings.enabled ? 'enabled' : 'disabled'}`); }
      if (msg?.type === 'openNote') {
        const target = Array.from(document.querySelectorAll('button, [role="button"], .artdeco-button, a[role="button"]')).find(isConnectButton);
        if (target) target.click();
      }
      if (msg?.type === 'openMessage') {
        const target = Array.from(document.querySelectorAll('button, [role="button"], .artdeco-button, a[role="button"]')).find(isMessageButton);
        if (target) target.click();
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else window.addEventListener('DOMContentLoaded', init);
})();