// Connect Quick - LinkedIn Content Script
console.log('[Connect Quick] Extension loaded');

let messages = [];
let isProcessing = false;
let debugMode = false;
let hasClickedAddNote = false;
let activeField = null;
let fieldListenerAttached = false;
let lastEditableField = null;
let manualTriggerButton = null;
let autoOpenSuppressed = false;
let currentSelectorElement = null; // Track the current open selector
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'number']);

// Enable debug mode via console: window.connectQuickDebug = true
if (typeof window.connectQuickDebug !== 'undefined') {
  debugMode = window.connectQuickDebug;
}

// Load messages from storage
async function loadMessages() {
  try {
    const result = await chrome.storage.sync.get(['messages']);
    messages = result.messages || [];
    console.log('Loaded messages:', messages.length);
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// Initialize
loadMessages();

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.messages) {
    loadMessages();
  }
});

// Observe DOM for connect button clicks
function observeConnectButtons() {
  // Use MutationObserver to watch for modal dialogs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          checkForConnectionModal(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also check existing modals on page load
  setTimeout(() => {
    const existingModals = document.querySelectorAll('[role="dialog"]');
    existingModals.forEach(modal => checkForConnectionModal(modal));
  }, 1000);
}

// Check if a node is or contains a connection modal
function checkForConnectionModal(node) {
  if (isProcessing) return;

  // Check if it's a dialog/modal
  if (node.getAttribute && node.getAttribute('role') === 'dialog') {
    // Look for the connection invitation modal
    const isConnectionModal = checkIfConnectionModal(node);

    if (isConnectionModal) {
      // Check if there's an "Add a note" button - if so, click it first
      const addNoteButton = findAddNoteButton(node);
      if (addNoteButton && !hasClickedAddNote) {
        console.log('[Connect Quick] Auto-clicking "Add a note" button...');
        hasClickedAddNote = true;
        addNoteButton.click();
        // Wait for textarea to appear after clicking
        setTimeout(() => {
          handleConnectionModal(node);
          // Reset flag after handling
          hasClickedAddNote = false;
        }, 800);
      } else if (!addNoteButton) {
        // No "Add a note" button, textarea might already be visible
        setTimeout(() => handleConnectionModal(node), 500);
      }
    }
  }
}

// Find the "Add a note" button in a modal
function findAddNoteButton(modal) {
  const buttons = modal.querySelectorAll('button');
  for (const btn of buttons) {
    const btnText = btn.textContent || '';
    if (btnText.includes('Add a note') || btnText.includes('add a note')) {
      console.log('[Connect Quick] Found "Add a note" button');
      return btn;
    }
  }
  return null;
}

// Check if the modal is a connection invitation modal
function checkIfConnectionModal(modal) {
  // LinkedIn connection modals typically have specific text
  const modalText = modal.textContent || '';
  const modalHTML = modal.innerHTML || '';

  // Check for common connection modal indicators
  const hasConnectIndicator =
    modalText.includes('Add a note') ||
    modalText.includes('Personalize your invitation') ||
    modalText.includes('add a note') ||
    modalHTML.includes('send-invite') ||
    modalHTML.includes('invitation-modal') ||
    (modalText.includes('Connect') && modalText.includes('note'));

  if (hasConnectIndicator) {
    console.log('[Connect Quick] Connection modal detected!');
  }

  return hasConnectIndicator;
}

// Handle the connection modal
async function handleConnectionModal(modal) {
  if (isProcessing || messages.length === 0) return;

  isProcessing = true;

  try {
    console.log('[Connect Quick] Modal detected, searching for textarea...');

    // Try multiple selectors for the textarea
    let noteTextarea = null;

    // Common selectors used by LinkedIn
    const selectors = [
      'textarea[name="message"]',
      'textarea[id*="custom-message"]',
      'textarea[id*="message"]',
      'textarea[aria-label*="message"]',
      'textarea[aria-label*="note"]',
      'textarea.msg-form__textarea',
      'textarea.send-invite__custom-message',
      'textarea',
      'div[contenteditable="true"]' // LinkedIn sometimes uses contenteditable divs
    ];

    for (const selector of selectors) {
      noteTextarea = modal.querySelector(selector);
      if (noteTextarea) {
        console.log('[Connect Quick] Found textarea with selector:', selector);
        break;
      }
    }

    if (!noteTextarea) {
      console.log('[Connect Quick] No textarea in modal, searching entire document...');

      // Search the entire document for textareas (LinkedIn might place it outside the modal)
      const allTextareas = document.querySelectorAll('textarea');
      console.log('[Connect Quick] All textareas in document:', allTextareas.length);

      // Look for recently added or visible textareas that are empty
      for (const ta of allTextareas) {
        // Check if visible and empty
        const isVisible = ta.offsetParent !== null;
        const isEmpty = !ta.value || ta.value.trim() === '';

        if (isVisible && isEmpty) {
          noteTextarea = ta;
          console.log('[Connect Quick] Found visible empty textarea:', ta.name || ta.id || ta.className);
          break;
        }
      }

      if (!noteTextarea) {
        console.log('[Connect Quick] No suitable textarea found');
        isProcessing = false;
        return;
      }
    }

    // Check if textarea is already filled
    const currentValue = noteTextarea.value || noteTextarea.textContent || '';
    if (currentValue.trim().length > 0) {
      console.log('[Connect Quick] Textarea already has content, skipping autofill');
      isProcessing = false;
      return;
    }

    console.log('[Connect Quick] Showing message selector');
    // Show message selector UI
    showMessageSelector(noteTextarea, modal, { autoTriggered: true });

  } catch (error) {
    console.error('[Connect Quick] Error handling connection modal:', error);
  }

  isProcessing = false;
}

// Show message selector overlay
function showMessageSelector(targetElement, modalContext = null, options = {}) {
  const { allowNonEmpty = false, autoTriggered = false, forceShow = false } = options;

  if (autoOpenSuppressed && !forceShow) {
    return;
  }

  if (!allowNonEmpty) {
    const currentValue = getFieldValue(targetElement);
    if (currentValue && currentValue.trim().length > 0) {
      console.log('[Connect Quick] Target already has content, aborting selector');
      return;
    }
  }

  activeField = targetElement;

  const existingSelector = document.getElementById('cq-message-selector');
  if (existingSelector) {
    existingSelector.remove();
    currentSelectorElement = null;
    updateManualTriggerButtonText();
  }

  const selector = document.createElement('div');
  selector.id = 'cq-message-selector';
  selector.className = 'cq-selector';
  currentSelectorElement = selector;

  const selectorContent = `
    <div class="cq-header">
      <div class="cq-title">Select a message template</div>
      <button class="cq-close" aria-label="Close">&times;</button>
    </div>
    <div class="cq-messages">
      ${messages.map((msg, index) => `
        <div class="cq-message-option" data-index="${index}">
          <div class="cq-message-name">${escapeHtml(msg.name)}</div>
          <div class="cq-message-preview">${escapeHtml(msg.text.substring(0, 60))}${msg.text.length > 60 ? '...' : ''}</div>
        </div>
      `).join('')}
    </div>
    <div class="cq-footer">
      <button class="cq-skip-btn">Skip autofill</button>
    </div>
  `;

  selector.innerHTML = selectorContent;
  document.body.appendChild(selector);
  updateManualTriggerButtonText();

  const markSuppressed = () => {
    if (autoTriggered) {
      autoOpenSuppressed = true;
      console.log('[Connect Quick] Auto-open disabled for this page');
    }
  };

  const baseCleanup = () => {
    if (selector.parentElement) {
      selector.remove();
    }
    if (currentSelectorElement === selector) {
      currentSelectorElement = null;
    }
    updateManualTriggerButtonText();
    if (activeField === targetElement) {
      activeField = null;
    }
    document.removeEventListener('keydown', handleKeyDown);
  };
  const dragCleanup = makeSelectorDraggable(selector);

  const cleanup = (suppress = false) => {
    if (suppress) {
      markSuppressed();
    }
    dragCleanup();
    baseCleanup();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      cleanup(autoTriggered);
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  const closeButton = selector.querySelector('.cq-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => cleanup(autoTriggered));
  }

  const skipButton = selector.querySelector('.cq-skip-btn');
  if (skipButton) {
    skipButton.addEventListener('click', () => cleanup(false));
  }

  selector.querySelectorAll('.cq-message-option').forEach((option) => {
    option.addEventListener('click', () => {
      const index = parseInt(option.dataset.index);
      const selectedMessage = messages[index];

      if (selectedMessage) {
        fillMessage(targetElement, selectedMessage.text, modalContext);
      }
      cleanup(false);
    });
  });

}

function makeSelectorDraggable(selector) {
  const header = selector.querySelector('.cq-header');
  if (!header) return () => {};

  header.style.cursor = 'grab';
  let isDragging = false;
  const dragState = {
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    offsetX: 0,
    offsetY: 0
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    selector.style.right = 'auto';
    const rect = selector.getBoundingClientRect();
    selector.style.left = `${rect.left}px`;
    selector.style.top = `${rect.top}px`;
    selector.style.transform = 'none';
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.startLeft = rect.left;
    dragState.startTop = rect.top;
    dragState.offsetX = event.clientX - rect.left;
    dragState.offsetY = event.clientY - rect.top;
    isDragging = true;
    header.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    const newLeft = event.clientX - dragState.offsetX;
    const newTop = event.clientY - dragState.offsetY;
    selector.style.right = 'auto';
    selector.style.left = `${newLeft}px`;
    selector.style.top = `${newTop}px`;
    selector.style.transform = 'none';
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = 'grab';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  header.addEventListener('mousedown', handleMouseDown);

  return () => {
    header.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}

function getFieldValue(field) {
  if (!field) return '';
  if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
    return field.value || '';
  }
  if (field.isContentEditable) {
    return field.textContent || '';
  }
  return '';
}

function getEditableFieldFromElement(element) {
  if (!element || !(element instanceof HTMLElement)) return null;

  const field = element.closest('textarea, input, [contenteditable="true"]');
  if (!field) return null;
  if (field.closest('#cq-message-selector')) return null;
  if (field.disabled || field.readOnly) return null;

  if (field.matches('input')) {
    const type = (field.getAttribute('type') || 'text').toLowerCase();
    if (!TEXT_INPUT_TYPES.has(type)) {
      return null;
    }
  }

  if (field.getAttribute('aria-hidden') === 'true') {
    return null;
  }

  return field;
}

function handleEditableFieldFocus(event) {
  if (autoOpenSuppressed) return;
  if (messages.length === 0) return;
  const field = getEditableFieldFromElement(event.target);
  if (!field) return;
  if (activeField === field) return;

  lastEditableField = field;

  const value = getFieldValue(field);
  if (value && value.trim().length > 0) {
    return;
  }

  showMessageSelector(field, null, { autoTriggered: true });
}

function initEditableFieldListener() {
  if (fieldListenerAttached) return;
  fieldListenerAttached = true;
  document.addEventListener('focusin', handleEditableFieldFocus, true);
}

function handleManualTriggerClick(event) {
  event.preventDefault();
  
  // Check if selector is already open
  if (currentSelectorElement && document.body.contains(currentSelectorElement)) {
    // Close the selector
    currentSelectorElement.remove();
    currentSelectorElement = null;
    updateManualTriggerButtonText();
    return;
  }

  if (messages.length === 0) {
    flashManualTrigger('No templates');
    return;
  }

  const target = findManualTargetField();
  if (!target) {
    flashManualTrigger('Focus a text box');
    return;
  }

  lastEditableField = target;
  const modalContext = target.closest('[role="dialog"]');
  showMessageSelector(target, modalContext, { allowNonEmpty: true, forceShow: true });
}

function findManualTargetField() {
  const activeFieldCandidate = getEditableFieldFromElement(document.activeElement);
  if (activeFieldCandidate) {
    return activeFieldCandidate;
  }

  if (lastEditableField && document.contains(lastEditableField)) {
    return lastEditableField;
  }

  const fallback = document.querySelector('textarea:not([readonly]):not([disabled]), [contenteditable="true"]:not([aria-hidden="true"])');
  return getEditableFieldFromElement(fallback);
}

function flashManualTrigger(message) {
  if (!manualTriggerButton) return;
  const original = manualTriggerButton.textContent;
  manualTriggerButton.textContent = message;
  manualTriggerButton.disabled = true;
  setTimeout(() => {
    manualTriggerButton.textContent = original;
    manualTriggerButton.disabled = false;
  }, 1400);
}

function updateManualTriggerButtonText() {
  if (!manualTriggerButton) return;
  const isSelectorOpen = currentSelectorElement && document.body.contains(currentSelectorElement);
  if (isSelectorOpen) {
    manualTriggerButton.innerText = 'Hide templates';
    manualTriggerButton.title = 'Close Connect Quick message picker';
  } else {
    manualTriggerButton.innerText = 'Show templates';
    manualTriggerButton.title = 'Open Connect Quick message picker';
  }
}

function createManualTriggerButton() {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', createManualTriggerButton, { once: true });
    return;
  }

  if (manualTriggerButton && document.body.contains(manualTriggerButton)) return;

  manualTriggerButton = document.createElement('button');
  manualTriggerButton.id = 'cq-manual-trigger';
  manualTriggerButton.type = 'button';
  manualTriggerButton.innerText = 'Show templates';
  manualTriggerButton.title = 'Open Connect Quick message picker';
  manualTriggerButton.className = 'cq-manual-trigger';
  manualTriggerButton.addEventListener('click', handleManualTriggerClick);

  document.body.appendChild(manualTriggerButton);
}

// Extract profile information
function extractProfileInfo(modalContext = null) {
  const info = {
    name: '',
    firstName: '',
    lastName: '',
    company: '',
    title: ''
  };

  const modalName = extractNameFromModal(modalContext);
  if (modalName) {
    info.name = modalName;
  }

  // Try to get name from various LinkedIn selectors
  const nameSelectors = [
    'h1.text-heading-xlarge',
    'h1.inline.t-24',
    '.pv-text-details__left-panel h1',
    '.ph5.pb5 h1',
    'div.mt2 h1'
  ];

  if (!info.name) {
    for (const selector of nameSelectors) {
      const nameElement = document.querySelector(selector);
      if (nameElement && nameElement.textContent.trim()) {
        info.name = nameElement.textContent.trim();
        break;
      }
    }
  }

  // Extract first and last name from full name
  if (info.name) {
    const nameParts = info.name.split(' ');
    info.firstName = nameParts[0] || '';
    info.lastName = nameParts.slice(1).join(' ') || '';
  }

  // Try to get company
  const companySelectors = [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    'div.mt2 div.text-body-medium'
  ];

  for (const selector of companySelectors) {
    const companyElement = document.querySelector(selector);
    if (companyElement && companyElement.textContent.includes('at ')) {
      const companyText = companyElement.textContent.trim();
      const atIndex = companyText.indexOf(' at ');
      if (atIndex > -1) {
        info.company = companyText.substring(atIndex + 4).trim();
      }
      break;
    }
  }

  // Try to get title
  const titleSelectors = [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium'
  ];

  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim() && !titleElement.textContent.includes('at ')) {
      info.title = titleElement.textContent.trim();
      break;
    }
  }

  console.log('[Connect Quick] Extracted profile info:', info);
  return info;
}

function extractNameFromModal(modal) {
  const dialog = modal || document.querySelector('[role="dialog"]');
  if (!dialog) {
    return '';
  }

  const selectorList = [
    '.invitation-card__name',
    '.send-invite__header h2',
    '.artdeco-modal__header h2',
    '.artdeco-modal__content h1',
    '.artdeco-modal__content h2',
    '.artdeco-modal__content h3',
    'h1',
    'h2',
    'h3',
    'strong',
    'span[dir="auto"]'
  ];

  const candidates = dialog.querySelectorAll(selectorList.join(','));

  for (const candidate of candidates) {
    const text = (candidate.textContent || '').trim();
    if (isLikelyName(text)) {
      return text;
    }
  }

  return '';
}

function isLikelyName(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  if (/connect|note|invitation|message|add|personalize/i.test(trimmed)) return false;
  const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-\.\s]+$/;
  return namePattern.test(trimmed);
}

// Replace placeholders in message
function replacePlaceholders(text, modalContext = null) {
  const profileInfo = extractProfileInfo(modalContext);

  let result = text;
  const fallbackName = profileInfo.name || profileInfo.firstName || 'there';
  result = result.replace(/\[Name\]/g, fallbackName);
  result = result.replace(/\[FirstName\]/g, profileInfo.firstName || fallbackName);
  result = result.replace(/\[LastName\]/g, profileInfo.lastName || '');
  result = result.replace(/\[Company\]/g, profileInfo.company || '');
  result = result.replace(/\[Title\]/g, profileInfo.title || '');

  if (result !== text) {
    console.log('[Connect Quick] Replaced placeholders:', { original: text.substring(0, 50), result: result.substring(0, 50) });
  }

  return result;
}

// Fill the message into the textarea
function fillMessage(element, text, modalContext = null) {
  console.log('[Connect Quick] Filling message:', text.substring(0, 50) + '...');

  const finalText = replacePlaceholders(text, modalContext);

  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    element.value = finalText;
  } else if (element.isContentEditable || element.getAttribute('role') === 'textbox') {
    setContentEditableValue(element, finalText);
  } else {
    element.textContent = finalText;
  }

  triggerInputEvents(element, finalText);

  element.focus();

  if (element.setSelectionRange && typeof element.value === 'string') {
    element.setSelectionRange(finalText.length, finalText.length);
  } else {
    moveCursorToEnd(element);
  }

  element.classList.add('cq-filled');
  setTimeout(() => {
    element.classList.remove('cq-filled');
  }, 1000);

  // Save lead information to CRM
  saveLead(finalText, modalContext);

  console.log('[Connect Quick] Message autofilled successfully');
}

// Save lead data to CRM
function saveLead(messageText, modalContext = null) {
  try {
    const profileInfo = extractProfileInfo(modalContext);
    
    const leadData = {
      firstName: profileInfo.firstName || '',
      lastName: profileInfo.lastName || '',
      email: extractEmail() || '',
      company: profileInfo.company || '',
      title: profileInfo.title || '',
      profileUrl: window.location.href || '',
      messageUsed: messageText || '',
      notes: ''
    };

    // Only skip if we somehow have no message content
    if (!leadData.messageUsed || !leadData.messageUsed.trim()) {
      return;
    }

    // Send lead data to popup/background via message
    chrome.runtime.sendMessage({
      action: 'saveLead',
      data: leadData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Connect Quick CRM] Message send failed:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        console.log('[Connect Quick CRM] Lead saved successfully');
      } else {
        console.error('[Connect Quick CRM] Lead save failed or no response', response);
      }
    });
  } catch (error) {
    console.error('[Connect Quick CRM] Error saving lead:', error);
  }
}

// Extract email from LinkedIn profile
function extractEmail() {
  try {
    // Try various selectors for email
    const emailSelectors = [
      'a[href^="mailto:"]',
      '.ci-email-address',
      '.pv-contact-info__email'
    ];

    for (const selector of emailSelectors) {
      const emailElement = document.querySelector(selector);
      if (emailElement) {
        const href = emailElement.getAttribute('href');
        if (href && href.startsWith('mailto:')) {
          return href.substring(7); // Remove "mailto:" prefix
        }
        const text = emailElement.textContent.trim();
        if (text && text.includes('@')) {
          return text;
        }
      }
    }

    // If on profile page, try to look in common email display patterns
    const mainContent = document.querySelector('.pv-contact-info__contact-type');
    if (mainContent) {
      const links = mainContent.querySelectorAll('a');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('mailto:')) {
          return href.substring(7);
        }
      }
    }
  } catch (error) {
    console.error('[Connect Quick] Error extracting email:', error);
  }
  return '';
}

function setContentEditableValue(element, text) {
  if (!element) return;
  element.focus();

  const selection = window.getSelection();
  if (!selection) {
    element.innerHTML = '';
    element.appendChild(document.createTextNode(text));
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  range.deleteContents();

  const inserted = document.execCommand('insertText', false, text);
  if (!inserted) {
    element.innerHTML = '';
    element.appendChild(document.createTextNode(text));
  }

  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}
function moveCursorToEnd(element) {
  if (!element) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function triggerInputEvents(element, text) {
  if (!element) return;

  const inputTypes = ['beforeinput', 'input', 'textInput'];
  inputTypes.forEach((type) => {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    };
    let event;
    try {
      event = new InputEvent(type, eventInit);
    } catch (err) {
      event = new Event(type, { bubbles: true, cancelable: true });
    }
    element.dispatchEvent(event);
  });

  ['change', 'keyup', 'keydown', 'paste'].forEach((eventType) => {
    element.dispatchEvent(new Event(eventType, { bubbles: true }));
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start observing
observeConnectButtons();
initEditableFieldListener();
createManualTriggerButton();

// Re-initialize on navigation (LinkedIn is a SPA)
let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('[Connect Quick] LinkedIn navigation detected, re-initializing');
      setTimeout(() => {
        loadMessages();
        observeConnectButtons();
        initEditableFieldListener();
        createManualTriggerButton();
      }, 1000);
    }
}).observe(document.body, { childList: true, subtree: true });

// Manual debug function - call from console: window.connectQuickDebug()
window.connectQuickDebug = function() {
  console.log('[Connect Quick] === DEBUG INFO ===');
  console.log('Messages loaded:', messages.length);
  console.log('Is processing:', isProcessing);

  const modals = document.querySelectorAll('[role="dialog"]');
  console.log('Modals found:', modals.length);

  modals.forEach((modal, index) => {
    console.log(`\nModal ${index + 1}:`);
    console.log('Text content (first 200 chars):', modal.textContent.substring(0, 200));

    const textareas = modal.querySelectorAll('textarea');
    console.log('Textareas in this modal:', textareas.length);

    textareas.forEach((ta, i) => {
      console.log(`  Textarea ${i + 1}:`, {
        name: ta.name,
        id: ta.id,
        className: ta.className,
        value: ta.value
      });
    });

    const contentEditables = modal.querySelectorAll('[contenteditable="true"]');
    console.log('Contenteditable elements:', contentEditables.length);
  });

  console.log('\n=== Attempting to show message selector ===');
  if (modals.length > 0) {
    // Try to manually trigger on the first modal
    checkForConnectionModal(modals[0]);
  } else {
    console.log('No modals found. Open a connection modal first!');
  }
};

console.log('[Connect Quick] Ready! Type window.connectQuickDebug() in console to debug.');
