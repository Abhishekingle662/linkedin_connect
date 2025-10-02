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
    ],
    // Message mode
    messageFlowEnabled: true,
    messageAutoSend: false,
    messageTemplate: "Hi {firstName}, great to connect here! I’m a new‑grad SWE focused on full‑stack/ML. Would love a quick chat about {company} — open to a brief call?",
    // Alumni template
    alumniTemplate: "Hi {firstName}, I’m a fellow IU alum and a recent CS grad focusing on SWE roles. I’m very interested in {company} and was wondering if you might be open to referring me. I’d greatly appreciate your help and would also love to hear about your experience there!"
  };

  let settings = { ...DEFAULTS };

  // Abhishek 0.1% outreach templates
  const Abhishek_Templates = {
    connectA: `Hey {firstName}, LOVE what you’re building at {company}. Would love to connect and stay in touch. 
~ Abhishek`,
    connectB: `Hey {firstName}, I’m Abhishek,
- MS in CS
- Expertise in [challenge most relevant to them]

I’m quite interested in X role.

fancy a quick chat this week?`
   ,
    messageA: `Thanks for connecting, {firstName}! I’m working on [X] and thought it could be relevant to what you’re building at {company}. Happy to share a quick idea if useful.`,
    messageB: `Appreciate the connect, {firstName}! Curious — what’s keeping you busy these days at {company}?`
  };

  // —— Utils ——
  const log = (...args) => console.debug('[AutoNote]', ...args);
  const debounce = (fn, wait) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };
  const clean = (s='') => s.replace(/\s+/g, ' ').trim();
  const textOf = (sel) => clean(document.querySelector(sel)?.textContent || '');
  
  // Debug helper - expose globally for console testing
  window.AutoNoteDebug = {
    showWidget: () => {
      log('🔧 Manual widget trigger');
      const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
      sessionStorage.removeItem(dismissKey);
      const existing = document.getElementById('hiring-team-widget');
      if (existing) existing.remove();
      const jobData = extractJobData();
      log('Job data:', jobData);
      if (jobData.companyName && jobData.companyName !== 'Company') {
        createHiringTeamWidget(jobData);
      } else {
        log('❌ Cannot create widget - invalid job data');
      }
    },
    clearDismissal: () => {
      const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
      sessionStorage.removeItem(dismissKey);
      log('✅ Cleared dismissal flag');
    },
    checkStatus: () => {
      const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
      log('📊 Widget Status:', {
        isJobPage: isJobPostingPage(),
        portal: getJobPortal(),
        widgetExists: !!document.getElementById('hiring-team-widget'),
        wasDismissed: sessionStorage.getItem(dismissKey) === 'true',
        url: location.href,
        jobData: extractJobData()
      });
    }
  };

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
    // Try multiple selectors for headline with more comprehensive LinkedIn selectors
    const headlineSelectors = [
      'main [class*="headline"]',
      '.entity-result__primary-subtitle',
      '.pv-text-details__left-panel h2',
      '.text-body-medium.break-words',
      '.entity-result__summary',
      '[data-field="headline"]',
      '.pv-entity__summary-info h2',
      '.pv-top-card--list-bullet .text-body-medium',
      '.pv-entity__summary-info .text-body-medium',
      '.pv-top-card .text-body-medium',
      '.artdeco-entity-lockup__subtitle',
      '.entity-result__content .text-body-small'
    ];
    
    let headline = '';
    for (const selector of headlineSelectors) {
      headline = textOf(selector);
      if (headline) break;
    }
    
    // Fallback: try to find headline near the name
    if (!headline) {
      const nameElement = document.querySelector('main h1, .pv-text-details__left-panel h1, .entity-result__title a, .pv-top-card__name');
      if (nameElement) {
        const parent = nameElement.closest('.pv-text-details__left-panel, .entity-result__item, .entity-result__content, .pv-top-card, .pv-entity__summary-info');
        if (parent) {
          const headlineEl = parent.querySelector('.text-body-medium, .entity-result__primary-subtitle, .pv-entity__summary-info h2, .break-words, .artdeco-entity-lockup__subtitle');
          headline = clean(headlineEl?.textContent || '');
        }
      }
    }
    
    // Additional fallback: look for any element that might contain professional title
    if (!headline) {
      const possibleHeadlines = document.querySelectorAll('.text-body-medium, .entity-result__primary-subtitle, .break-words, .artdeco-entity-lockup__subtitle');
      for (const el of possibleHeadlines) {
        const text = clean(el.textContent || '');
        if (text && text.length > 10 && text.length < 200 && (text.includes('at ') || text.includes('Engineer') || text.includes('Manager') || text.includes('Director') || text.includes('Analyst') || text.includes('Developer') || text.includes('Specialist'))) {
          headline = text;
          break;
        }
      }
    }
    
    const location = textOf('main [class*="subline-level-2"], .entity-result__secondary-subtitle');
    const expLine = textOf('section[id*="experience"] li div[dir="ltr"], .entity-result__summary-info');
    const school = textOf('section[id*="education"] li div[dir="ltr"]');
    const mutualCount = textOf('[data-test-mutuals-count], .entity-result__simple-insight-text');
    const lastCompany = (/(?: at | @ )([^•|,]+)/i.exec(expLine) || [])[1]?.trim() || '';
    const role = (/^(.*?)(?: at | @ )/.exec(expLine) || [])[1]?.trim() || '';
    console.log('[AutoNote] Extracted headline:', headline); // Debug log
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
      <span style="color:#fff;align-self:center;margin-right:6px;font-weight:500;">Insert:</span>
      <button data-act="recruiter" title="Toggle between 2 recruiter templates">Recruiter 1</button>
      <button data-act="alumni" title="Insert alumni template">Alumni</button>
      <button data-act="elite" title="Toggle between Elite A/B templates">Elite A</button>
      <button data-act="postApp" title="Insert post-application follow-up">Follow-up</button>
      <button data-act="send" style="background:#222;border:1px solid #222;margin-left:4px;" title="Send current message">✓ Send</button>
    `;
    Object.assign(bar.style, { position:'fixed', right:'12px', bottom:'140px', zIndex:2147483647, display:'flex', gap:'6px', background:'linear-gradient(135deg, #222, #333)', borderRadius:'8px', padding:'10px 12px', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', alignItems:'center', border:'1px solid rgba(255,255,255,0.1)' });
    Array.from(bar.querySelectorAll('button')).forEach(btn => { 
      Object.assign(btn.style, { 
        border:'1px solid rgba(255,255,255,0.2)', 
        borderRadius:'6px', 
        padding:'7px 12px', 
        background:'rgba(255,255,255,0.1)', 
        color:'#fff', 
        cursor:'pointer', 
        fontSize:'12px', 
        fontWeight:'500',
        whiteSpace:'nowrap',
        transition:'all 0.2s'
      }); 
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.2)';
        btn.style.borderColor = 'rgba(255,255,255,0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.getAttribute('data-act') === 'send') {
          btn.style.background = '#222';
          btn.style.borderColor = '#222';
        } else {
          btn.style.background = 'rgba(255,255,255,0.1)';
          btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }
      });
    });
    document.body.appendChild(bar);

    // Track toggle states
    let recruiterIdx = 0; // 0 or 1 for recruiterTpl1/2
    let eliteIdx = 0; // 0 or 1 for eliteA/B
    
    const recruiterBtn = bar.querySelector('button[data-act="recruiter"]');
    const eliteBtn = bar.querySelector('button[data-act="elite"]');

    const dispose = () => { bar.remove(); delete modalRoot.dataset.autoNoteUi; };
    
    const onClick = async (e) => {
      const act = e.target.getAttribute('data-act');
      if (!act) return;
      
      let tpl = '';
      
      if (act === 'recruiter') {
        // Toggle between recruiter templates
        const templates = [
          settings.recruiterTpl1 || DEFAULTS.recruiterTpl1,
          settings.recruiterTpl2 || DEFAULTS.recruiterTpl2
        ];
        tpl = templates[recruiterIdx];
        recruiterIdx = (recruiterIdx + 1) % 2;
        recruiterBtn.textContent = `Recruiter ${recruiterIdx + 1}`;
      } 
      else if (act === 'alumni') {
        tpl = settings.alumniTemplate || DEFAULTS.alumniTemplate;
      } 
      else if (act === 'elite') {
        // Toggle between elite templates
        const templates = [
          settings.eliteMessageA || DEFAULTS.eliteMessageA,
          settings.eliteMessageB || DEFAULTS.eliteMessageB
        ];
        tpl = templates[eliteIdx];
        eliteIdx = (eliteIdx + 1) % 2;
        eliteBtn.textContent = `Elite ${eliteIdx === 0 ? 'A' : 'B'}`;
      } 
      else if (act === 'postApp') {
        tpl = settings.postApplicationFollowUp || DEFAULTS.postApplicationFollowUp;
      }
      else if (act === 'send') {
        // Send current message
        const modal = document.querySelector('div[role="dialog"], .artdeco-modal') || document;
        const btns = Array.from(modal.querySelectorAll('button'));
        const send = btns.find(b => /^(send)$/i.test(clean(b.textContent || '')) || /^(send)$/i.test(clean(b.getAttribute('aria-label') || '')));
        if (send) send.click();
        return;
      }
      
      // Insert template into textarea
      if (tpl) {
        const msg = capLinkedInLimit(fillTemplate(tpl, ctx));
        try {
          textarea.focus();
          textarea.value = msg;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (err) {
          log('Failed to insert template:', err);
        }
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
  <button data-act="ckMsg" title="Insert CK 0.1% template (toggles A/B)">0.1% A</button>
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
  let ckIdxMsg = 0; // 0 => A, 1 => B
    const getSelectedTemplateText = () => templateOptions[currentIdx]?.get?.() || settings.messageTemplate;
    const cycleBtn = bar.querySelector('button[data-act="cycle"]');
  const ckMsgBtn = bar.querySelector('button[data-act="ckMsg"]');
    const updateCycleLabel = () => { cycleBtn.textContent = templateOptions[currentIdx]?.label || 'Message'; };
    updateCycleLabel();

    const dispose = () => { bar.remove(); delete composer.dataset.autoNoteUi; };
    const onClick = async (e) => {
      const act = e.target.getAttribute('data-act');
      if (!act) return;
      const ctxMsg = getMessage();
      const selectedMsg = fillTemplate(getSelectedTemplateText(), { ...extractProfileContext(), firstName: extractFirstNameNear(composer), company: extractCompanyNear(composer) });
      if (act === 'ckMsg') {
        const tpl = ckIdxMsg === 0 ? Abhishek_Templates.messageA : Abhishek_Templates.messageB;
        const filled = fillTemplate(tpl, { ...extractProfileContext(), firstName: extractFirstNameNear(composer), company: extractCompanyNear(composer) });
        insertIntoComposer(composer, filled);
        ckIdxMsg = (ckIdxMsg + 1) % 2;
        if (ckMsgBtn) ckMsgBtn.textContent = `0.1% ${ckIdxMsg === 0 ? 'A' : 'B'}`;
        return;
      }
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
    console.log('[AutoNote] Saving lead:', entry); // Debug log
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
      await saveLead({ name: firstName, url: currentProfileUrl(), company, headline: ctx.headline, ts: Date.now() });
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
      injectComposerHelper(composer, () => fillTemplate(settings.messageTemplate, { firstName, company, ...extractProfileContext() }));
      chrome.runtime.sendMessage({ type: 'metrics:bump', key: 'message_insert' });
      await saveLead({ name: firstName, url: currentProfileUrl(), company, headline: ctx.headline, ts: Date.now() });

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

  // —— Job Posting Feature ——
  function isJobPostingPage() {
    const hostname = location.hostname.toLowerCase();
    const pathname = location.pathname.toLowerCase();
    
    return (
      // LinkedIn job pages
      (hostname.includes('linkedin.com') && (pathname.includes('/jobs/view/') || pathname.includes('/jobs/search/'))) ||
      
      // Greenhouse job pages
      hostname.includes('greenhouse.io') ||
      
      // Ashby job pages (jobs.ashbyhq.com/company/job-id pattern)
      (hostname === 'jobs.ashbyhq.com' && pathname.match(/^\/[^\/]+\/[^\/]+$/)) ||
      hostname.includes('ashbyhq.com') || 
      (hostname.endsWith('.ashbyhq.com')) ||
      
      // Wellfound/AngelList job pages
      hostname.includes('wellfound.com') ||
      hostname.includes('angel.co') ||
      
      // Lever job pages
      hostname.includes('lever.co') ||
      
      // Workable job pages
      (hostname.includes('workable.com') && (pathname.includes('/j/') || pathname.includes('/jobs/'))) ||
      
      // Workday job pages
      hostname.includes('myworkdayjobs.com')
    );
  }

  function getJobPortal() {
    if (location.hostname.includes('linkedin.com')) return 'linkedin';
    if (location.hostname.includes('greenhouse.io')) return 'greenhouse';
    if (location.hostname.includes('ashbyhq.com') || location.hostname.includes('.ashbyhq.com')) return 'ashby';
    if (location.hostname.includes('wellfound.com') || location.hostname.includes('angel.co')) return 'wellfound';
    if (location.hostname.includes('lever.co')) return 'lever';
    if (location.hostname.includes('workable.com')) return 'workable';
    if (location.hostname.includes('myworkdayjobs.com')) return 'workday';
    return 'unknown';
  }

  // Helper function to capitalize words
  function capitalizeWords(str) {
    if (!str) return 'Company';
    // Handle special cases for company names
    return str.replace(/\b\w/g, l => l.toUpperCase())
              .replace(/\bAnd\b/g, 'and')
              .replace(/\bThe\b/g, 'the')
              .replace(/\bOf\b/g, 'of')
              .replace(/\bFor\b/g, 'for');
  }

  // Helper function to extract company name from Ashby pages
  function extractCompanyFromAshby() {
    // Try to find company name in various Ashby-specific places
    const ashbyElements = document.querySelectorAll('[class*="company"], [class*="organization"], [class*="brand"], header');
    for (const element of ashbyElements) {
      const text = element.textContent?.trim();
      if (text && text.length > 2 && text.length < 50 && !text.toLowerCase().includes('job') && !text.toLowerCase().includes('position')) {
        return text;
      }
    }
    
    // For jobs.ashbyhq.com/company-slug/job-id pattern
    if (location.hostname === 'jobs.ashbyhq.com') {
      const pathParts = location.pathname.split('/').filter(p => p);
      if (pathParts.length >= 1) {
        const companySlug = pathParts[0];
        if (companySlug && companySlug.length > 1) {
          return capitalizeWords(companySlug.replace(/-/g, ' '));
        }
      }
    }
    
    // Try to extract from subdomain patterns
    // Ashby URLs are like: company-name.ashbyhq.com
    const hostname = location.hostname;
    if (hostname.includes('.ashbyhq.com')) {
      const subdomain = hostname.replace('.ashbyhq.com', '');
      if (subdomain && subdomain !== 'jobs' && subdomain !== 'www') {
        return capitalizeWords(subdomain.replace(/-/g, ' '));
      }
    }
    
    return 'Company';
  }

  // Helper function to extract company name from Workday pages
  function extractCompanyFromWorkday() {
    // Priority 1: Extract from Workday URL pattern first (most reliable)
    if (location.hostname.includes('.myworkdayjobs.com')) {
      const subdomain = location.hostname.split('.')[0];
      if (subdomain && subdomain.length > 1) {
        // Handle special company name formatting
        let companyName = subdomain.replace(/-/g, ' ');
        
        // Special case handling for common patterns
        if (companyName.toLowerCase() === 'ehealthinsurance') {
          return 'eHealthInsurance';
        }
        
        // Convert subdomain to proper company name
        return capitalizeWords(companyName);
      }
    }
    
    // Priority 2: Try to find company name in page content (but avoid generic terms)
    const workdayElements = document.querySelectorAll('[data-automation-id*="company"], .company-name, .employer-name');
    for (const element of workdayElements) {
      const text = element.textContent?.trim();
      if (text && text.length > 2 && text.length < 50 && 
          !text.toLowerCase().includes('job') && 
          !text.toLowerCase().includes('position') && 
          !text.toLowerCase().includes('workday') && 
          !text.toLowerCase().includes('career') &&
          !text.toLowerCase().includes('home') &&
          text.toLowerCase() !== 'careers') {
        return text;
      }
    }
    
    // Priority 3: Try to extract from page title (but avoid generic terms)
    const title = document.title;
    if (title.includes(' - ')) {
      const parts = title.split(' - ');
      for (const part of parts) {
        const cleanPart = part.trim();
        if (cleanPart && 
            !cleanPart.toLowerCase().includes('workday') && 
            !cleanPart.toLowerCase().includes('career') &&
            cleanPart.toLowerCase() !== 'careers' &&
            cleanPart.length > 2 && cleanPart.length < 50) {
          return cleanPart;
        }
      }
    }
    
    return 'Company';
  }

  // Helper function to extract company name from Workable pages
  function extractCompanyFromWorkable() {
    // Try to find company name in various Workable-specific places
    const workableElements = document.querySelectorAll('.company-name, .employer-name, [data-testid*="company"], .job-header-company, .company-title, h1, h2');
    for (const element of workableElements) {
      const text = element.textContent?.trim();
      if (text && text.length > 2 && text.length < 50 && !text.toLowerCase().includes('job') && !text.toLowerCase().includes('position') && !text.toLowerCase().includes('apply')) {
        return text;
      }
    }
    
    // For apply.workable.com/company-name/j/job-id pattern
    if (location.hostname === 'apply.workable.com') {
      const pathParts = location.pathname.split('/').filter(p => p);
      if (pathParts.length >= 1) {
        const companySlug = pathParts[0];
        if (companySlug && companySlug.length > 1) {
          return capitalizeWords(companySlug.replace(/-/g, ' '));
        }
      }
    }
    
    // For company.workable.com pattern
    if (location.hostname.includes('.workable.com')) {
      const subdomain = location.hostname.replace('.workable.com', '');
      if (subdomain && subdomain !== 'apply' && subdomain !== 'www') {
        return capitalizeWords(subdomain.replace(/-/g, ' '));
      }
    }
    
    return 'Company';
  }

  // Helper function to extract company name from Greenhouse pages
  function extractCompanyFromGreenhouse() {
    // Try to find company name in page content
    const headers = document.querySelectorAll('h1, h2, h3, .header, .company, [class*="company"]');
    for (const header of headers) {
      const text = header.textContent?.trim();
      if (text && text.length > 2 && text.length < 50 && !text.toLowerCase().includes('job') && !text.toLowerCase().includes('position')) {
        return text;
      }
    }
    
    // Try to extract from meta tags
    const description = document.querySelector('meta[name="description"]')?.content;
    if (description) {
      const match = description.match(/at ([^,.-]+)/i);
      if (match) return match[1].trim();
    }
    
    // Last resort: try hostname but clean it up
    const hostname = location.hostname.replace('boards.', '').replace('.greenhouse.io', '');
    if (hostname && hostname !== 'job' && !hostname.includes('.')) {
      return hostname.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Company';
  }

  function extractJobData() {
    try {
      const portal = getJobPortal();
      log('🔍 Extracting job data from portal:', portal);
      let jobTitle = '';
      let companyName = '';
      let jobLocation = '';
      let jobId = '';

      switch (portal) {
      case 'linkedin':
        jobTitle = textOf('h1.job-details-jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title a, .jobs-unified-top-card__job-title');
        companyName = textOf('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name');
        jobLocation = textOf('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
        jobId = location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || '';
        break;

      case 'greenhouse':
        // More robust Greenhouse selectors
        jobTitle = textOf('h1[data-testid="job-title"], .job-post-title h1, .posting-headline h1, .app-title, h1') ||
                  document.querySelector('title')?.textContent?.split(' - ')[0];
        
        // Better company name extraction for Greenhouse
        companyName = textOf('.company-name, [data-testid="company-name"], .header-company-name, .company-header') || 
                     textOf('a[href*="greenhouse.io"] img')?.alt ||
                     document.title.split(' - ')[1]?.split(' |')[0] ||
                     document.title.split(' at ')[1]?.split(' -')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content ||
                     extractCompanyFromGreenhouse();
        
        jobLocation = textOf('.location, [data-testid="job-location"], .job-location, .posting-location');
        jobId = location.pathname.match(/jobs\/(\d+)/)?.[1] || '';
        break;

      case 'ashby':
        // Improved Ashby selectors
        jobTitle = textOf('h1, .job-title, [data-testid="job-title"], .posting-job-title, [data-cy="job-title"], .job-posting-title') ||
                  document.querySelector('title')?.textContent?.split(' - ')[0];
        
        companyName = textOf('.company-name, [data-testid="company-name"], .company-header, .company-title, [data-cy="company-name"], .job-posting-company') || 
                     textOf('.ashby-job-posting-company, .ashby-company-name') ||
                     document.title.split(' at ')[1]?.split(' |')[0]?.split(' -')[0] ||
                     document.title.split(' - ')[1]?.split(' |')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content ||
                     extractCompanyFromAshby();
        
        jobLocation = textOf('.location, [data-testid="location"], .job-location, .posting-location, [data-cy="location"]');
        // Handle Ashby URL pattern: jobs.ashbyhq.com/company-slug/job-id
        jobId = location.pathname.split('/').pop() || location.pathname.match(/jobs\/([^\/\?]+)/)?.[1] || '';
        break;

      case 'wellfound':
        jobTitle = textOf('h1, .job-title, [data-testid="JobTitle"], .title, .job-listing-title');
        companyName = textOf('.company-name, [data-testid="company-name"], .startup-link, .company-link, .company-title') ||
                     document.title.split(' at ')[1]?.split(' |')[0]?.split(' -')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content ||
                     capitalizeWords(location.pathname.split('/')[2]?.replace(/-/g, ' ') || 'Company');
        jobLocation = textOf('.location, [data-testid="location"], .job-location, .location-text');
        jobId = location.pathname.match(/jobs\/(\d+)/)?.[1] || '';
        break;

      case 'lever':
        jobTitle = textOf('h1, .posting-headline h2, [data-qa="posting-name"], .posting-name');
        companyName = textOf('.company-name, [data-qa="company-name"], .posting-company, .company-title') ||
                     document.title.split(' - ')[1]?.split(' |')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content ||
                     capitalizeWords(location.hostname.split('.')[0].replace(/-/g, ' '));
        jobLocation = textOf('.location, [data-qa="posting-location"], .sort-by-location, .posting-location');
        jobId = location.pathname.match(/([^\/]+)$/)?.[1] || '';
        break;

      case 'workable':
        // Workable job data extraction
        jobTitle = textOf('h1, .job-title, .position-title, [data-testid="job-title"], .job-header-title') ||
                  document.querySelector('title')?.textContent?.split(' - ')[0]?.split(' at ')[0];
        
        companyName = textOf('.company-name, .employer-name, .job-header-company, [data-testid*="company"], .company-title') ||
                     document.title.split(' at ')[1]?.split(' |')[0]?.split(' -')[0] ||
                     document.title.split(' - ')[1]?.split(' |')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content ||
                     extractCompanyFromWorkable();
        
        jobLocation = textOf('.location, .job-location, [data-testid*="location"], .location-info');
        // Handle Workable URL patterns: apply.workable.com/company/j/job-id or company.workable.com/jobs/job-id
        jobId = location.pathname.match(/\/j\/([^\/\?]+)/)?.[1] || 
                location.pathname.match(/\/jobs\/([^\/\?]+)/)?.[1] || 
                location.pathname.split('/').pop() || '';
        break;

      case 'workday':
        // Workday job data extraction
        jobTitle = textOf('h1, [data-automation-id*="jobTitle"], .jobTitle, [data-automation-id*="jobPostingHeader"]') ||
                  document.querySelector('title')?.textContent?.split(' - ')[0];
        
        // Prioritize URL-based company extraction for Workday
        companyName = extractCompanyFromWorkday() ||
                     textOf('[data-automation-id*="company"], .company-name, .companyName') ||
                     document.title.split(' - ')[1]?.split(' |')[0] ||
                     document.querySelector('meta[property="og:site_name"]')?.content;
        
        jobLocation = textOf('[data-automation-id*="location"], .location, .jobLocation');
        // Handle Workday URL pattern: company.wd5.myworkdayjobs.com/en-US/CompanyName/job/Location/Title_JobID
        jobId = location.pathname.match(/_([^\/\?]+)$/)?.[1] || 
                location.pathname.split('/').pop() || '';
        break;
    }
    
    // Clean up and validate company name
    if (companyName) {
      companyName = companyName.trim();
      // Remove common unwanted text
      companyName = companyName.replace(/\s*-\s*careers?$/i, '')
                              .replace(/\s*jobs?$/i, '')
                              .replace(/\s*hiring$/i, '')
                              .replace(/^at\s+/i, '')
                              .trim();
    }

    const result = {
      jobTitle: jobTitle || 'Position',
      companyName: companyName || 'Company',
      jobLocation: jobLocation || '',
      jobId,
      jobUrl: location.href.split('?')[0],
      portal
    };
    
    log('📊 Extracted job data:', result);
    return result;
    } catch (error) {
      console.log('[AutoNote] Error extracting job data:', error);
      // Better fallback extraction
      const fallbackCompany = document.title.split(' - ')[1] || 
                             document.title.split(' at ')[1] || 
                             document.querySelector('meta[property="og:site_name"]')?.content ||
                             'Company';
      return {
        jobTitle: 'Position',
        companyName: fallbackCompany.split(' |')[0].trim(),
        jobLocation: '',
        jobId: '',
        jobUrl: location.href.split('?')[0],
        portal: getJobPortal()
      };
    }
  }

  function createHiringTeamWidget(jobData) {
    log('🎯 createHiringTeamWidget called with:', jobData);
    
    if (document.getElementById('hiring-team-widget')) {
      log('⚠️ Widget already exists, skipping creation');
      return; // Avoid duplicates
    }
    
    // Validate job data
    if (!jobData || !jobData.companyName || jobData.companyName === 'Company') {
      log('❌ Invalid job data, skipping widget creation:', {
        hasData: !!jobData,
        companyName: jobData?.companyName,
        isDefault: jobData?.companyName === 'Company'
      });
      return;
    }
    
    log('✅ Creating hiring team widget for:', jobData.companyName);

    const widget = document.createElement('div');
    widget.id = 'hiring-team-widget';
    widget.innerHTML = `
      <div class="hiring-widget-header">
        <h3>🎯 Hiring Team Finder</h3>
        <button class="hiring-widget-close" aria-label="Close">×</button>
      </div>
      <div class="hiring-widget-content">
        
        
        <div class="hiring-section">
          <h4>👥 Your Network at ${jobData.companyName}</h4>
          <div id="network-connections" class="loading">Scanning your connections...</div>
        </div>
        
        <div class="hiring-section">
          <h4>🔍 Hiring Team</h4>
          <div class="hiring-actions">
            <button id="find-recruiters" class="action-btn">🎯 Search Recruiters</button>
            <button id="find-managers" class="action-btn">👨‍💼 Search Managers</button>
          </div>
          <div id="hiring-team-results" class="results-container"></div>
        </div>
      </div>
    `;

    // Styling - Minimal black/white/gray design
    Object.assign(widget.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '350px',
      maxHeight: '80vh',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      fontSize: '14px',
      overflowY: 'auto'
    });

    // Add CSS styles with CSP-safe approach - Minimal black/white/gray design
    const style = document.createElement('style');
    style.setAttribute('data-hiring-finder', 'true');
    style.textContent = `
      #hiring-team-widget .hiring-widget-header {
        background: linear-gradient(135deg, #222, #333);
        color: white;
        padding: 14px 16px;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #hiring-team-widget .hiring-widget-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
      #hiring-team-widget .hiring-widget-close {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        font-size: 18px;
        cursor: pointer;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        line-height: 1;
      }
      #hiring-team-widget .hiring-widget-close:hover {
        background: rgba(255,255,255,0.2);
        border-color: rgba(255,255,255,0.3);
      }
      #hiring-team-widget .hiring-widget-content {
        padding: 16px;
      }
      #hiring-team-widget .job-info {
        margin-bottom: 16px;
        padding: 12px;
        background: #f7f7f7;
        border: 1px solid #eee;
        border-radius: 6px;
      }
      #hiring-team-widget .job-title {
        font-weight: 600;
        color: #222;
        margin-bottom: 4px;
        font-size: 14px;
      }
      #hiring-team-widget .company-name {
        color: #666;
        font-size: 13px;
      }
      #hiring-team-widget .job-portal {
        color: #999;
        font-size: 11px;
        font-weight: 500;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #hiring-team-widget .hiring-section {
        margin-bottom: 16px;
      }
      #hiring-team-widget .hiring-section h4 {
        margin: 0 0 10px 0;
        font-size: 13px;
        font-weight: 600;
        color: #222;
        letter-spacing: -0.01em;
      }
      #hiring-team-widget .hiring-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      #hiring-team-widget .action-btn {
        flex: 1;
        padding: 9px 12px;
        background: #222;
        color: white;
        border: 1px solid #222;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      #hiring-team-widget .action-btn:hover {
        background: #000;
        border-color: #000;
      }
      #hiring-team-widget .loading {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 20px;
        font-size: 13px;
      }
      #hiring-team-widget .connection-card {
        display: flex;
        align-items: center;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-bottom: 8px;
        background: white;
        transition: all 0.2s;
      }
      #hiring-team-widget .connection-card:hover {
        border-color: #999;
        background: #fafafa;
      }
      #hiring-team-widget .connection-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 10px;
        background: #ddd;
      }
      #hiring-team-widget .connection-info {
        flex: 1;
      }
      #hiring-team-widget .connection-name {
        font-weight: 500;
        font-size: 13px;
        color: #222;
      }
      #hiring-team-widget .connection-title {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }
      #hiring-team-widget .connection-actions {
        display: flex;
        gap: 4px;
      }
      #hiring-team-widget .mini-btn {
        padding: 5px 10px;
        font-size: 11px;
        border: 1px solid #ddd;
        background: white;
        color: #222;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }
      #hiring-team-widget .mini-btn:hover {
        background: #222;
        color: white;
        border-color: #222;
      }
    `;
    document.head.appendChild(style);

    try {
      document.body.appendChild(widget);
    } catch (error) {
      console.log('[AutoNote] Error adding widget to page:', error);
      return;
    }

    // Event listeners with error handling
    try {
      widget.querySelector('.hiring-widget-close').addEventListener('click', () => {
        widget.remove();
        // Mark this page as dismissed so widget doesn't reappear
        const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
        sessionStorage.setItem(dismissKey, 'true');
        
        // Show a small "Show Hiring Finder" button in case user wants it back
        setTimeout(() => {
          if (!document.getElementById('hiring-finder-restore')) {
            const restoreBtn = document.createElement('div');
            restoreBtn.id = 'hiring-finder-restore';
            restoreBtn.innerHTML = `
              <button style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #222;
                color: white;
                border: 1px solid #222;
                border-radius: 8px;
                width: 48px;
                height: 48px;
                font-size: 16px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 2147483646;
                transition: all 0.2s;
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
              " title="Show Hiring Team Finder">👥</button>
            `;
            
            restoreBtn.querySelector('button').addEventListener('mouseenter', (e) => {
              e.target.style.background = '#000';
              e.target.style.borderColor = '#000';
              e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            });
            
            restoreBtn.querySelector('button').addEventListener('mouseleave', (e) => {
              e.target.style.background = '#222';
              e.target.style.borderColor = '#222';
              e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            });
            
            restoreBtn.querySelector('button').addEventListener('click', () => {
              sessionStorage.removeItem(dismissKey);
              restoreBtn.remove();
              const jobData = extractJobData();
              if (jobData.companyName && jobData.companyName !== 'Company') {
                createHiringTeamWidget(jobData);
              }
            });
            
            document.body.appendChild(restoreBtn);
            
            // Auto-remove restore button after 10 seconds
            setTimeout(() => {
              if (document.getElementById('hiring-finder-restore')) {
                restoreBtn.remove();
              }
            }, 10000);
          }
        }, 500);
      });
    } catch (error) {
      console.log('[AutoNote] Error setting up widget event listeners:', error);
    }

    widget.querySelector('#find-recruiters').addEventListener('click', () => {
      findHiringTeam(jobData, 'recruiter');
    });

    widget.querySelector('#find-managers').addEventListener('click', () => {
      findHiringTeam(jobData, 'manager');
    });

    // Start scanning for network connections
    scanNetworkConnections(jobData);
  }

  async function scanNetworkConnections(jobData) {
    const networkDiv = document.getElementById('network-connections');
    if (!networkDiv) return;

    networkDiv.innerHTML = '<div class="loading">Scanning your network...</div>';
    
    try {
      // Build proper LinkedIn search URLs
      const companyQuery = encodeURIComponent(`"${jobData.companyName}"`);
      
      const searchUrls = {
        connections: `https://www.linkedin.com/search/results/people/?keywords=${companyQuery}&network=%5B%22F%22%5D&origin=FACETED_SEARCH`,
        secondDegree: `https://www.linkedin.com/search/results/people/?keywords=${companyQuery}&network=%5B%22S%22%5D&origin=FACETED_SEARCH`,
        peopleAtCompany: `https://www.linkedin.com/search/results/people/?keywords=${companyQuery}&origin=GLOBAL_SEARCH_HEADER`,
        companySearch: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(jobData.companyName)}&origin=GLOBAL_SEARCH_HEADER`
      };
      // Wait and then provide actual search links
      setTimeout(() => {
        networkDiv.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p style="margin-bottom: 16px; color: #666; font-size: 13px;">
              Search for people at ${jobData.companyName}
            </p>
            <button class="action-btn network-search-connections" style="margin-bottom: 8px;">
              🔍 Search Your 1st Connections
            </button>
            <button class="action-btn network-search-second" style="margin-bottom: 8px;">
              👥 Search 2nd Connections
            </button>
            <button class="action-btn network-search-all" style="margin-bottom: 8px;">
              🏢 Search All Employees
            </button>
            <button class="action-btn network-search-company" style="margin-bottom: 8px;">
              🔍 Find Company Page
            </button>
            ${jobData.portal !== 'linkedin' ? `
            <button class="action-btn network-search-job" style="margin-top: 12px;">
              📋 View Original Job Post
            </button>` : ''}
          </div>
        `;
        
        // Add event listeners for network search buttons
        setTimeout(() => {
          try {
            networkDiv.querySelector('.network-search-connections')?.addEventListener('click', () => window.open(searchUrls.connections, '_blank'));
            networkDiv.querySelector('.network-search-second')?.addEventListener('click', () => window.open(searchUrls.secondDegree, '_blank'));
            networkDiv.querySelector('.network-search-all')?.addEventListener('click', () => window.open(searchUrls.peopleAtCompany, '_blank'));
            networkDiv.querySelector('.network-search-company')?.addEventListener('click', () => window.open(searchUrls.companySearch, '_blank'));
            if (jobData.portal !== 'linkedin') {
              networkDiv.querySelector('.network-search-job')?.addEventListener('click', () => window.open(jobData.jobUrl, '_blank'));
            }
          } catch (error) {
            console.log('[AutoNote] Error setting up network search listeners:', error);
          }
        }, 50);
      }, 800);
      
    } catch (error) {
      console.log('[AutoNote] Error scanning network:', error);
      networkDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #666; margin-bottom: 12px;">Search your network manually:</p>
          <button class="action-btn" onclick="window.open('https://www.linkedin.com/search/results/people/?company=${encodeURIComponent(jobData.companyName)}', '_blank')">
            🔍 Search All Employees
          </button>
        </div>
      `;
    }
  }

  async function findHiringTeam(jobData, type) {
    const resultsDiv = document.getElementById('hiring-team-results');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '<div class="loading">Searching for hiring team...</div>';

    const searchTerms = type === 'recruiter' 
      ? ['recruiter', 'talent acquisition', 'talent partner', 'hiring']
      : ['hiring manager', 'engineering manager', 'director', 'vp'];

    try {
      // Build proper LinkedIn search URLs with correct encoding
      const companyQuery = encodeURIComponent(`"${jobData.companyName}"`);
      const keywordQuery = encodeURIComponent(searchTerms[0]); // Use primary search term
      
      const searchUrls = {
        main: `https://www.linkedin.com/search/results/people/?keywords=${keywordQuery}&origin=GLOBAL_SEARCH_HEADER&page=1`,
        company: `https://www.linkedin.com/search/results/people/?keywords=${keywordQuery}%20${companyQuery}&origin=GLOBAL_SEARCH_HEADER`,
        connections: `https://www.linkedin.com/search/results/people/?keywords=${keywordQuery}%20${companyQuery}&network=%5B%22F%22%2C%22S%22%5D&origin=FACETED_SEARCH`,
        companySearch: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(jobData.companyName)}&origin=GLOBAL_SEARCH_HEADER`,
        peopleAtCompany: `https://www.linkedin.com/search/results/people/?keywords=${companyQuery}&origin=GLOBAL_SEARCH_HEADER`
      };

      setTimeout(() => {
        const isRecruiter = type === 'recruiter';
        const title = isRecruiter ? 'Recruiters & Talent Team' : 'Hiring Managers';
        
        resultsDiv.innerHTML = `
          <div style="padding: 16px;">
            <h4 style="margin: 0 0 16px 0; color: #333; font-size: 14px;">Find ${title} at ${jobData.companyName}</h4>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
              <button class="action-btn hiring-search-company">
                🎯 Search ${isRecruiter ? 'Recruiters' : 'Managers'} at Company
              </button>
              
              <button class="action-btn hiring-search-all">
                🔍 Search All ${isRecruiter ? 'Recruiters' : 'Managers'}
              </button>
              
              <button class="action-btn hiring-search-network">
                👥 Search in Your Network
              </button>
              
              <button class="action-btn hiring-search-hiring">
                💼 Search "Hiring" + Company
              </button>
            </div>
            
            <div style="margin-top: 16px;">
              <button class="action-btn hiring-find-company" style="background: #222; border-color: #222;">
                🏢 Find Company Page
              </button>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background: #f0f8ff; border-radius: 6px; font-size: 12px; color: #0066cc;">
              💡 <strong>Search Strategy:</strong><br>
              • Start with "Search at Company" for best results<br>
              • "Find Company Page" will help you locate the official company page<br>
              • Then you can browse employees from the company page
            </div>
          </div>
        `;
        
        // Add event listeners for hiring team search buttons
        setTimeout(() => {
          try {
            resultsDiv.querySelector('.hiring-search-company')?.addEventListener('click', () => window.open(searchUrls.company, '_blank'));
            resultsDiv.querySelector('.hiring-search-all')?.addEventListener('click', () => window.open(searchUrls.main, '_blank'));
            resultsDiv.querySelector('.hiring-search-network')?.addEventListener('click', () => window.open(searchUrls.connections, '_blank'));
            resultsDiv.querySelector('.hiring-search-hiring')?.addEventListener('click', () => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent('hiring ' + jobData.companyName)}&origin=GLOBAL_SEARCH_HEADER`, '_blank'));
            resultsDiv.querySelector('.hiring-find-company')?.addEventListener('click', () => window.open(`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(jobData.companyName)}&origin=GLOBAL_SEARCH_HEADER`, '_blank'));
          } catch (error) {
            console.log('[AutoNote] Error setting up hiring team search listeners:', error);
          }
        }, 50);
      }, 800);
      
    } catch (error) {
      console.log('[AutoNote] Error in findHiringTeam:', error);
      // Fallback to simple search
      const simpleSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(type === 'recruiter' ? 'recruiter ' + jobData.companyName : 'manager ' + jobData.companyName)}`;
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="color: #666; margin-bottom: 12px;">Simple search:</p>
          <button class="action-btn fallback-search-type">
            🔍 Search ${type === 'recruiter' ? 'Recruiters' : 'Managers'}
          </button>
          <button class="action-btn fallback-search-all" style="margin-top: 8px;">
            🏢 Search All Employees
          </button>
        </div>
      `;
      
      // Add event listeners for fallback buttons
      setTimeout(() => {
        try {
          resultsDiv.querySelector('.fallback-search-type')?.addEventListener('click', () => window.open(simpleSearch, '_blank'));
          resultsDiv.querySelector('.fallback-search-all')?.addEventListener('click', () => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(jobData.companyName)}`, '_blank'));
        } catch (error) {
          console.log('[AutoNote] Error setting up fallback search listeners:', error);
        }
      }, 50);
    }
  }

  // —— Binding ——
  const bindButtons = debounce(() => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"], .artdeco-button, a[role="button"]'));
    for (const b of btns) {
      if (!isBound(b) && isConnectButton(b)) { b.addEventListener('click', () => handleConnect(b), { capture: true }); markBound(b); }
      if (!isBound(b, 'autoNoteBoundMsg') && isMessageButton(b)) { b.addEventListener('click', () => handleMessage(b), { capture: true }); markBound(b, 'autoNoteBoundMsg'); }
    }
    
    // Initialize job posting widget if on job page (with delay for dynamic content)
    if (isJobPostingPage()) {
      const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
      const wasDismissed = sessionStorage.getItem(dismissKey) === 'true';
      
      log('📍 On job posting page:', {
        url: location.href,
        portal: getJobPortal(),
        dismissed: wasDismissed,
        widgetExists: !!document.getElementById('hiring-team-widget')
      });
      
      if (!wasDismissed && !document.getElementById('hiring-team-widget')) {
        // Try multiple times with increasing delays to handle dynamic content
        const tryCreateWidget = (attempt = 1) => {
          setTimeout(() => {
            try {
              if (document.getElementById('hiring-team-widget')) {
                log('Widget already created, skipping attempt', attempt);
                return;
              }
              
              const jobData = extractJobData();
              log(`Attempt ${attempt} - Job data:`, jobData);
              
              if (jobData && jobData.companyName && jobData.companyName !== 'Company') {
                createHiringTeamWidget(jobData);
              } else if (attempt < 3) {
                log(`❌ Invalid data on attempt ${attempt}, retrying...`);
                tryCreateWidget(attempt + 1);
              } else {
                log('❌ Failed to extract valid job data after 3 attempts');
              }
            } catch (error) {
              log('❌ Error initializing job widget:', error);
              if (attempt < 3) tryCreateWidget(attempt + 1);
            }
          }, attempt * 1000); // 1s, 2s, 3s delays
        };
        
        tryCreateWidget();
      }
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
      if (msg?.type === 'openHiringFinder') {
        if (isJobPostingPage()) {
          const existing = document.getElementById('hiring-team-widget');
          if (existing) {
            existing.remove();
          } else {
            // Clear dismissal flag when manually opening
            const dismissKey = `hiring-widget-dismissed-${location.href.split('?')[0]}`;
            sessionStorage.removeItem(dismissKey);
            
            const jobData = extractJobData();
            if (jobData.companyName && jobData.companyName !== 'Company') {
              createHiringTeamWidget(jobData);
            }
          }
        }
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else window.addEventListener('DOMContentLoaded', init);
})();
