const $ = (id) => document.getElementById(id);

async function load(){
  try {
    const data = await chrome.storage.sync.get(null);
    $('enabled').checked = !!data.enabled;
    $('autoSend').checked = !!data.autoSend;
    $('messageFlowEnabled').checked = !!data.messageFlowEnabled;
    $('messageAutoSend').checked = !!data.messageAutoSend;
    await loadMetrics();
  } catch (error) {
    console.error('[Popup] Error loading settings:', error);
    $('stats').textContent = 'Error loading extension data. Please try reloading.';
  }
}

async function loadMetrics(){
  try {
    const { metrics_v1:m = {} } = await chrome.storage.local.get('metrics_v1');
    const hasData = Object.keys(m).length > 0;
    
    if (hasData) {
      $('stats').textContent = JSON.stringify(m, null, 2);
      const total = Object.values(m).reduce((a,b)=>a+Number(b||0),0);
      if (total > 0) {
        $('badge').textContent = `Top 0.1%`;
        $('badge').style.display = 'inline-flex';
      }
    } else {
      $('stats').textContent = 'No activity data yet.\nStart using the extension to see statistics here.';
    }
  } catch (error) {
    console.error('[Popup] Error loading metrics:', error);
    $('stats').textContent = 'Error loading activity data.';
  }
}

async function savePatch(){
  try {
    const payload = {
      enabled: $('enabled').checked,
      autoSend: $('autoSend').checked,
      messageFlowEnabled: $('messageFlowEnabled').checked,
      messageAutoSend: $('messageAutoSend').checked
    };
    await chrome.storage.sync.set(payload);
    
    // Send message to background script with error handling
    try {
      await chrome.runtime.sendMessage({ type: 'autoNote:update', payload });
    } catch (msgError) {
      // Message sending might fail if background script is not ready, but that's okay
      console.log('[Popup] Background script not ready for message, settings still saved');
    }
  } catch (error) {
    console.error('[Popup] Error saving settings:', error);
  }
}

// Event handlers with error handling
function handleOpenOptions() {
  try {
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('[Popup] Error opening options:', error);
  }
}

function handleHotkeyNote() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('linkedin.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'openNote' }).catch(err => {
          console.log('[Popup] Content script not ready for note hotkey');
        });
      } else {
        console.log('[Popup] Not on LinkedIn page');
      }
    });
  } catch (error) {
    console.error('[Popup] Error with note hotkey:', error);
  }
}

function handleHotkeyMessage() {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('linkedin.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'openMessage' }).catch(err => {
          console.log('[Popup] Content script not ready for message hotkey');
        });
      } else {
        console.log('[Popup] Not on LinkedIn page');
      }
    });
  } catch (error) {
    console.error('[Popup] Error with message hotkey:', error);
  }
}

// Set up event listeners
$('openOptions').addEventListener('click', handleOpenOptions);
['enabled','autoSend','messageFlowEnabled','messageAutoSend'].forEach(id => {
  $(id).addEventListener('change', savePatch);
});
$('hotkeyNote').addEventListener('click', handleHotkeyNote);
$('hotkeyMsg').addEventListener('click', handleHotkeyMessage);

window.addEventListener('DOMContentLoaded', load);