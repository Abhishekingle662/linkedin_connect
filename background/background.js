// Connect Quick - Background Service Worker

// Initialize default messages on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Connect Quick installed');

    // Set up default messages
    const defaultMessages = [
      {
        id: 'default-1',
        name: 'General Professional',
        text: "Hi [FirstName], I'd love to connect with you and expand my professional network. Looking forward to staying in touch!",
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'default-2',
        name: 'Industry Interest',
        text: "Hi [FirstName], I noticed you work at [Company]. I'd appreciate the opportunity to connect and learn from your experience in the field!",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    try {
      await chrome.storage.sync.set({ messages: defaultMessages });
      console.log('Default messages initialized');
    } catch (error) {
      console.error('Error initializing default messages:', error);
    }
  }

  if (details.reason === 'update') {
    console.log('Connect Quick updated to version', chrome.runtime.getManifest().version);
  }
});

// One-time migration of leads from sync -> local to avoid sync quota
function migrateLeadsSyncToLocal() {
  chrome.storage.local.get(['leads', 'leadsMigratedFromSync'], (localRes) => {
    const alreadyMigrated = Boolean(localRes.leadsMigratedFromSync);
    const localLeads = localRes.leads || [];

    chrome.storage.sync.get(['leads'], async (syncRes) => {
      const syncLeads = syncRes.leads || [];

      if (alreadyMigrated || syncLeads.length === 0) {
        return;
      }

      try {
        // Merge without duplicate ids (prefer local entries if collision)
        const byId = new Map();
        localLeads.forEach((lead) => {
          if (lead && lead.id) {
            byId.set(lead.id, lead);
          }
        });
        syncLeads.forEach((lead) => {
          if (lead && lead.id && !byId.has(lead.id)) {
            byId.set(lead.id, lead);
          }
        });

        const merged = Array.from(byId.values());
        await chrome.storage.local.set({ leads: merged, leadsMigratedFromSync: true });

        // Attempt to clear sync leads to free quota (best-effort)
        chrome.storage.sync.set({ leads: [] }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[Connect Quick CRM][BG] Unable to clear sync leads after migration:', chrome.runtime.lastError.message);
          }
        });

        console.log('[Connect Quick CRM][BG] Migrated leads from sync to local', {
          migrated: syncLeads.length,
          totalLocal: merged.length
        });
      } catch (error) {
        console.error('[Connect Quick CRM][BG] Lead migration failed:', error);
      }
    });
  });
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMessages') {
    chrome.storage.sync.get(['messages'], (result) => {
      sendResponse({ messages: result.messages || [] });
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'saveLead') {
    console.log('[Connect Quick CRM][BG] saveLead request received', {
      from: sender?.tab?.url || sender?.url || 'unknown',
      hasData: Boolean(request?.data),
      messagePreview: request?.data?.messageUsed?.substring?.(0, 40) || ''
    });

    chrome.storage.local.get(['leads'], (result) => {
      (async () => {
        try {
          let leads = result.leads || [];

          const newLead = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            firstName: request.data?.firstName || '',
            lastName: request.data?.lastName || '',
            email: request.data?.email || '',
            company: request.data?.company || '',
            title: request.data?.title || '',
            profileUrl: request.data?.profileUrl || '',
            messageUsed: request.data?.messageUsed || '',
            timestamp: Date.now(),
            notes: request.data?.notes || ''
          };

          leads.push(newLead);
          await chrome.storage.local.set({ leads });

          console.log('[Connect Quick CRM][BG] Lead saved', {
            name: `${newLead.firstName} ${newLead.lastName}`.trim(),
            company: newLead.company,
            title: newLead.title
          });
          sendResponse({ success: true });
        } catch (error) {
          console.error('[Connect Quick CRM][BG] Error saving lead:', error);
          sendResponse({ success: false, error: error?.message || 'unknown error' });
        }
      })();
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'logEvent') {
    console.log('[Content Script]', request.event, request.data);
  }
});

// Run migration on startup/load
migrateLeadsSyncToLocal();
chrome.runtime.onStartup.addListener(migrateLeadsSyncToLocal);

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.messages) {
    console.log('Messages updated:', changes.messages.newValue?.length || 0, 'messages');
  }
});

console.log('Connect Quick background service worker loaded');
