# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Connect Quick is a Manifest V3 Chrome extension that helps users manage and autofill LinkedIn connection messages. Users can create a library of reusable message templates through a popup UI, and the extension automatically offers these messages when they click "Connect" on LinkedIn profiles.

## Architecture

### Core Components

**Manifest V3 Structure:**
- Uses service worker for background tasks (background/background.js)
- Content scripts inject into LinkedIn pages (content/content.js + content.css)
- Popup UI for message management (popup/popup.html, popup.js, popup.css)

**Data Flow:**
1. User manages messages via popup → stored in chrome.storage.sync
2. Content script loads messages from storage when LinkedIn page loads
3. Content script observes DOM for connection modals
4. When modal detected, shows message selector overlay
5. Selected message autofills into LinkedIn's textarea

### Storage Schema

Messages stored in `chrome.storage.sync` with this structure:
```javascript
{
  messages: [
    {
      id: string,           // Unique ID (timestamp + random)
      name: string,         // Display name for the message
      text: string,         // Message content (max 300 chars) - can include placeholders
      createdAt: number,    // Timestamp
      updatedAt: number     // Timestamp
    }
  ]
}
```

### Placeholder System

Messages support automatic personalization via placeholders:
- `[Name]` - Full name (e.g., "John Smith")
- `[FirstName]` - First name only (e.g., "John")
- `[LastName]` - Last name only (e.g., "Smith")
- `[Company]` - Their company name
- `[Title]` - Their job title

Placeholders are replaced when the message is autofilled:
1. `extractProfileInfo()` scrapes the LinkedIn profile page for name, company, title
2. `replacePlaceholders()` performs the replacements using regex
3. If a value can't be found, the placeholder remains unchanged

### Content Script Logic

The content script (content/content.js) uses:
- **MutationObserver** to detect when LinkedIn's connection modal appears
- Modal detection looks for `[role="dialog"]` with text indicators like "Add a note"
- When found, injects a custom message selector overlay
- Selector uses custom CSS classes prefixed with `cq-` to avoid conflicts
- Autofill triggers native input/change events to ensure LinkedIn recognizes the change

### LinkedIn Compatibility

LinkedIn is a Single Page Application (SPA), so:
- Content script monitors URL changes via MutationObserver
- Re-initializes when navigation detected
- Uses `run_at: "document_idle"` in manifest for proper timing
- Targets LinkedIn's textarea elements: `textarea[name="message"]` or `textarea[id*="custom-message"]`

## Development Commands

**Load Extension:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select project directory

**Generate Icons:**
- Open `icons/create-icons.html` in browser
- Right-click each canvas → Save as PNG
- Save as icon16.png, icon48.png, icon128.png in icons/ directory

**Testing Changes:**
- After code changes, go to chrome://extensions/
- Click refresh button on Connect Quick extension
- Reload LinkedIn page to test content script changes
- Reopen popup to test popup changes

## Important Constraints

**Chrome Extension Policies:**
- No external API calls (all data stays local)
- Minimal permissions (only storage, activeTab, linkedin.com)
- No obfuscated code
- No tracking or analytics
- XSS prevention: always escape user input with escapeHtml() before rendering

**LinkedIn Limitations:**
- Connection messages limited to 300 characters
- Modal structure may change (content script must be resilient)
- Extension only works on https://www.linkedin.com/* (not mobile.linkedin.com or other subdomains)

**Storage Limits:**
- chrome.storage.sync has a quota (100KB total, 8KB per item)
- Each message should be kept reasonably short
- No limit enforcement needed as 300-char messages won't exceed quota for reasonable usage

## Code Patterns

**HTML Escaping:**
Always escape user content before innerHTML:
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Event Triggering for Autofill:**
LinkedIn requires native events to recognize programmatic input:
```javascript
textarea.value = text;
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```

**Unique ID Generation:**
```javascript
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
```

## File Modifications

**When adding new message fields:**
- Update storage schema in background.js initialization
- Update popup.js form handling
- Update content.js message display

**When adding new placeholders:**
- Add extraction logic in `extractProfileInfo()` in content.js
- Add replacement in `replacePlaceholders()` in content.js
- Update README.md and CLAUDE.md documentation
- Consider LinkedIn's HTML structure changes

**When updating LinkedIn selectors:**
- Modify `checkIfConnectionModal()` in content.js
- Test on various LinkedIn pages (search results, profile pages, "My Network")
- Update textarea selector in `handleConnectionModal()`

**When changing UI:**
- Popup dimensions: 400px width max (set in popup.css body)
- Use LinkedIn blue (#0077b5) for brand consistency
- All custom CSS classes in content.css use `cq-` prefix
- High z-index (10000) for selector overlay to appear above LinkedIn modals
