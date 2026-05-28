(() => {
  const STORAGE_KEY = 'linkedinAutoNote_settings';
  const TEMPLATE_KEY = 'linkedinAutoNote_templateLibrary';
  const DEFAULT_TEMPLATE_LIBRARY = [
    {
      id: 'connect_recruiter_a',
      type: 'connect',
      title: 'Connect — Recruiter 1',
      body: "Hi {firstName}, I'm a recent CS grad passionate about scalable web & mobile systems. I'd love to connect and learn more about opportunities where I can contribute and grow."
    },
    {
      id: 'connect_recruiter_b',
      type: 'connect',
      title: 'Connect — Recruiter 2',
      body: 'Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.'
    },
    {
      id: 'connect_alumni_default',
      type: 'connect',
      title: 'Connect — Alumni',
      body: "Hi {firstName}, I'm a fellow IU alum and a recent CS grad focusing on SWE roles. I'm very interested in working at {company} and was wondering if you might be open to referring me. I'd greatly appreciate your help and would also love to hear about your experience there!"
    },
    {
      id: 'message_primary',
      type: 'message',
      title: 'Message — Primary',
      body: "Hi {firstName}, great to connect here! I’m a new‑grad SWE focused on full‑stack/ML. Would love a quick chat about {company} — open to a brief call?"
    },
    {
      id: 'followup_post_application',
      type: 'followup',
      title: 'Follow-up — Post Application',
      body: "Hi {firstName},\n\nI'm Abhishek, a New Grad SWE. Deeply Interested in joining {company}. Hands-on with React/Node.js/Python/SQL + AI tools, and I care about speed, quality, and real usage. Could you guide me with next steps?\nBest,\nAbhishek"
    }
  ];

  let templateLibrary = [];

  const templateSelectEl = document.getElementById('templateSelector');
  templateSelectEl?.addEventListener('change', function onTemplateSelectChange() {
    const selected = this.value;
    document.querySelectorAll('.template-section').forEach(section => {
      section.classList.remove('active');
    });
    if (selected) {
      document.getElementById(`${selected}-section`)?.classList.add('active');
    }
  });

  async function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        document.getElementById('enabled').checked = settings.enabled !== false;
        document.getElementById('recruiterTpl1').value = settings.recruiterTpl1 || "Hi {firstName}, I'm a recent CS grad passionate about scalable web & mobile systems. I'd love to connect and learn more about opportunities where I can contribute and grow.";
        document.getElementById('recruiterTpl2').value = settings.recruiterTpl2 || "Hello {firstName}, I recently graduated in CS and have hands-on experience building production-level web & mobile apps. Excited to connect and stay on your radar for open roles.";
        document.getElementById('alumniTemplate').value = settings.alumniTemplate || "Hi {firstName}, I'm a fellow IU alum and a recent CS grad focusing on SWE roles. I'm very interested in working at {company} and was wondering if you might be open to referring me. I'd greatly appreciate your help and would also love to hear about your experience there!";
        document.getElementById('eliteMessageA').value = settings.eliteMessageA || "Hey {firstName}, LOVE what you're building at {company}. Would love to connect and stay in touch. \n~ Abhishek";
        document.getElementById('eliteMessageB').value = settings.eliteMessageB || "Hey {firstName}, I'm Abhishek,\n- MS in CS\n- Expertise in Python, Javascript, AWS, React, SQL, etc.\n\nI'm quite interested in the SWE role.\n\nfancy a quick chat this week?";
        document.getElementById('postApplicationFollowUp').value = settings.postApplicationFollowUp || "Hi {firstName},\n\nI'm Abhishek, a New Grad SWE. Deeply Interested in joining {company}. Hands-on with React/Node.js/Python/SQL + AI tools, and I care about speed, quality, and real usage. Could you guide me with next steps?\nBest,\nAbhishek";
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    } else {
      document.getElementById('enabled').checked = true;
    }

    await loadLeadCount();
    await loadTemplateLibrary();
  }

  async function loadTemplateLibrary() {
    console.log('[Templates] Loading template library…');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { templateLibrary: stored = [] } = await chrome.storage.sync.get('templateLibrary');
        templateLibrary = Array.isArray(stored) ? stored : [];
        console.log('[Templates] Loaded from chrome.storage:', templateLibrary.length);
      } else {
        templateLibrary = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]');
        if (!Array.isArray(templateLibrary)) templateLibrary = [];
        console.log('[Templates] Loaded from localStorage:', templateLibrary.length);
      }
    } catch (err) {
      console.error('Failed to load template library:', err);
      templateLibrary = [];
    }

    if (!templateLibrary.length) {
      templateLibrary = getDefaultTemplateLibrary();
      await persistTemplateLibrary();
    }

    console.log('[Templates] Final library count:', templateLibrary.length);
    renderTemplateLibrary();
  }

  function getDefaultTemplateLibrary() {
    return DEFAULT_TEMPLATE_LIBRARY.map(item => ({ ...item }));
  }

  async function persistTemplateLibrary() {
    console.log('[Templates] Persisting library (items:', templateLibrary.length, ')');
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templateLibrary));
    } catch (err) {
      console.warn('Local template cache failed:', err);
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ templateLibrary }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Templates] chrome.storage.sync.set failed:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          console.log('[Templates] chrome.storage.sync.set complete');
          resolve();
        });
      });
    }
  }

  function renderTemplateLibrary() {
    console.log('[Templates] Rendering library UI…');
    const container = document.getElementById('templateList');
    if (!container) return;
    container.innerHTML = '';

    if (!templateLibrary.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 18px; margin-bottom: 8px;">✍️</p>
          <p>No saved templates yet</p>
          <p style="font-size: 12px; margin-top: 4px;">Add one above to reuse it in the extension.</p>
        </div>
      `;
      return;
    }

    templateLibrary.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.dataset.id = tpl.id;
      card.innerHTML = `
        <div class="row" style="gap:12px; align-items:flex-start;">
          <label style="flex:1;">
            <span>Title</span>
            <input type="text" class="template-title" value="${escapeHtml(tpl.title || '')}" />
          </label>
          <label style="flex:0.5;">
            <span>Type</span>
            <select class="template-type">
              <option value="connect"${tpl.type === 'connect' ? ' selected' : ''}>Connection</option>
              <option value="message"${tpl.type === 'message' ? ' selected' : ''}>Message</option>
              <option value="followup"${tpl.type === 'followup' ? ' selected' : ''}>Follow-up</option>
            </select>
          </label>
        </div>
        <label style="margin-top:8px; display:block;">
          <span>Message</span>
          <textarea class="template-body" rows="4">${escapeHtml(tpl.body || '')}</textarea>
        </label>
        <small>Tokens: {firstName}, {company}, {headline}, {role}, {school}</small>
        <div class="template-actions">
          <button data-action="save" type="button">Save</button>
          <button data-action="delete" type="button" class="ghost">Delete</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function showTemplateNotice(message, tone = 'muted') {
    const el = document.getElementById('templateNotice');
    if (!el) return;
    const prefix = tone === 'error' ? '⚠️ ' : tone === 'success' ? '✅ ' : tone === 'info' ? 'ℹ️ ' : '';
    el.textContent = message ? prefix + message : '';
    el.style.color = tone === 'error' ? '#b3261e' : tone === 'success' ? '#1a7f37' : '#5f6b7c';
  }

  function generateTemplateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `tpl_${Math.random().toString(36).slice(2, 10)}`;
  }

  async function handleAddTemplate() {
    console.log('[Templates] Add template clicked');
    const titleInput = document.getElementById('templateTitle');
    const bodyInput = document.getElementById('templateBody');
    const typeSelect = document.getElementById('templateType');
    const title = (titleInput.value || '').trim();
    const body = (bodyInput.value || '').trim();
    const type = typeSelect.value;

    if (!body) {
      console.warn('[Templates] Attempted to save empty template body');
      showTemplateNotice('Please enter a message before saving.', 'error');
      return;
    }

    const button = document.getElementById('addTemplate');
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving…';
    }
    showTemplateNotice('Saving template…', 'info');

    try {
      const newTemplate = { id: generateTemplateId(), title, type, body, updatedAt: Date.now() };
      templateLibrary = [newTemplate, ...templateLibrary];
      await persistTemplateLibrary();
      renderTemplateLibrary();
      showTemplateNotice('Template saved and synced', 'success');
      titleInput.value = '';
      bodyInput.value = '';
    } catch (err) {
      console.error('[Templates] Failed to add template:', err);
      showTemplateNotice('Failed to save template. Check console for details.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '➕ Add Template';
      }
    }
  }

  async function handleTemplateListClick(event) {
    const action = event.target?.dataset?.action;
    if (!action) return;
    const card = event.target.closest('.template-card');
    if (!card) return;
    const id = card.dataset.id;
    const idx = templateLibrary.findIndex(t => t.id === id);
    if (idx === -1) return;

    if (action === 'delete') {
      console.log('[Templates] Deleting template', id);
      if (!confirm('Delete this template?')) return;
      showTemplateNotice('Removing template…', 'info');
      templateLibrary.splice(idx, 1);
      await persistTemplateLibrary();
      renderTemplateLibrary();
      showTemplateNotice('Template removed.', 'success');
      return;
    }

    if (action === 'save') {
      console.log('[Templates] Saving existing template', id);
      const title = card.querySelector('.template-title').value.trim();
      const type = card.querySelector('.template-type').value;
      const body = card.querySelector('.template-body').value.trim();
      if (!body) {
        showTemplateNotice('Message cannot be empty.', 'error');
        return;
      }
      showTemplateNotice('Updating template…', 'info');
      templateLibrary[idx] = { ...templateLibrary[idx], title, type, body, updatedAt: Date.now() };
      await persistTemplateLibrary();
      showTemplateNotice('Template updated.', 'success');
    }
  }

  async function loadLeadCount() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const { leads = [] } = await chrome.storage.local.get('leads');
        const count = leads.length;
        const countEl = document.getElementById('leadCount');

        if (countEl) {
          countEl.textContent = count === 0 ? 'No leads yet' : `${count} lead${count === 1 ? '' : 's'}`;
          countEl.style.background = count > 0 ? '#e8f4fd' : '#f5f5f5';
          countEl.style.color = count > 0 ? 'var(--primary)' : 'var(--muted)';
        }

        const tableContainer = document.getElementById('leadsTable');
        if (tableContainer) renderLeadsTable(leads);
      }
    } catch (err) {
      console.error('❌ Failed to load lead count:', err);
      const container = document.getElementById('leadsTable');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p style="color: red;">❌ Error loading leads</p>
            <p style="font-size: 12px;">${err.message}</p>
          </div>
        `;
      }
    }
  }

  function renderLeadsTable(leads) {
    const container = document.getElementById('leadsTable');
    if (!container) return;

    if (!leads.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 18px; margin-bottom: 8px;">📭</p>
          <p>No leads saved yet</p>
          <p style="font-size: 12px; margin-top: 4px;">Start connecting with people on LinkedIn!</p>
        </div>
      `;
      return;
    }

    const sorted = [...leads].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    container.innerHTML = sorted.map(lead => {
      const date = lead.ts ? new Date(lead.ts).toLocaleDateString() : 'Unknown date';
      const time = lead.ts ? new Date(lead.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const url = lead.url || '#';
      const name = lead.name || 'Unknown';
      const company = lead.company || 'No company';
      const headline = lead.headline || 'No headline';

      return `
        <div class="lead-card">
          <div class="lead-name">${escapeHtml(name)}</div>
          <div class="lead-company">${escapeHtml(company)}</div>
          <div class="lead-headline">${escapeHtml(headline)}</div>
          <div class="lead-meta">
            <span>${date} ${time}</span>
            <a href="${url}" target="_blank" class="lead-link">View Profile →</a>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function saveSettings() {
    const settings = {
      enabled: document.getElementById('enabled').checked,
      recruiterTpl1: document.getElementById('recruiterTpl1').value.trim(),
      recruiterTpl2: document.getElementById('recruiterTpl2').value.trim(),
      alumniTemplate: document.getElementById('alumniTemplate').value.trim(),
      eliteMessageA: document.getElementById('eliteMessageA').value.trim(),
      eliteMessageB: document.getElementById('eliteMessageB').value.trim(),
      postApplicationFollowUp: document.getElementById('postApplicationFollowUp').value.trim()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set(settings);
      }
      alert('✅ Settings saved!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('❌ Failed to save settings');
    }
  }

  function resetSettings() {
    if (!confirm('Reset all settings to defaults?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TEMPLATE_KEY);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.clear();
    }
    location.reload();
  }

  async function clearAllLeads() {
    if (!confirm('⚠️ Delete all saved leads? This cannot be undone.')) return;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove('leads');
        await loadLeadCount();
        alert('✅ All leads cleared!');
      }
    } catch (err) {
      console.error('Failed to clear leads:', err);
      alert('❌ Failed to clear leads');
    }
  }

  async function testSaveLead() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const testLead = {
          name: `Test User ${Date.now()}`,
          url: 'https://linkedin.com/in/testuser',
          company: 'Test Company',
          headline: 'Test Software Engineer',
          ts: Date.now()
        };

        const { leads = [] } = await chrome.storage.local.get('leads');
        leads.push(testLead);
        await chrome.storage.local.set({ leads });
        await loadLeadCount();
        alert('✅ Test lead saved! Check the list above.');
      }
    } catch (err) {
      console.error('Failed to save test lead:', err);
      alert(`❌ Failed to save test lead: ${err.message}`);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    document.getElementById('save').addEventListener('click', saveSettings);
    document.getElementById('reset').addEventListener('click', resetSettings);
    document.getElementById('clearLeads').addEventListener('click', clearAllLeads);
    document.getElementById('testLead').addEventListener('click', testSaveLead);
    document.getElementById('addTemplate').addEventListener('click', handleAddTemplate);
    document.getElementById('templateList').addEventListener('click', handleTemplateListClick);
  });
})();
