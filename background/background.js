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

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMessages') {
    chrome.storage.sync.get(['messages'], (result) => {
      sendResponse({ messages: result.messages || [] });
    });
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'logEvent') {
    console.log('[Content Script]', request.event, request.data);
  }
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.messages) {
    console.log('Messages updated:', changes.messages.newValue?.length || 0, 'messages');
  }
});

console.log('Connect Quick background service worker loaded');
