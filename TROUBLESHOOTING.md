# Troubleshooting Guide

## Issue: Autofill Not Working

If the extension is loaded but autofill isn't working, follow these steps:

### Step 1: Check Console Logs

1. Open LinkedIn
2. Press F12 to open Chrome DevTools
3. Go to the "Console" tab
4. Look for messages starting with `[Connect Quick]`

You should see:
- `[Connect Quick] Extension loaded`
- `[Connect Quick] Loaded messages: X` (where X is your message count)

### Step 2: Test the Connection Flow

1. On LinkedIn, find someone to connect with
2. Click the "Connect" button
3. Watch the console for these messages:
   - `[Connect Quick] Connection modal detected!`
   - `[Connect Quick] Modal detected, searching for textarea...`
   - `[Connect Quick] Found textarea with selector: ...`

### Step 3: Use the Debug Function

If the autofill still doesn't work, run the debug function:

1. Open the connection modal on LinkedIn (click "Connect" and then "Add a note" if needed)
2. In the console, type: `window.connectQuickDebug()`
3. Press Enter

This will show:
- How many messages are loaded
- How many modals are found
- What textareas exist in each modal
- Whether the extension can detect the connection modal

### Step 4: Common Issues

**"No textarea found in connection modal"**
- LinkedIn might have changed their HTML structure
- Try clicking "Add a note" button in the connection modal first
- Check the debug output to see what textareas exist
- The modal might not be a connection modal

**"chrome-extension://invalid/" errors**
- These can be ignored - they're from another extension or LinkedIn's code
- They don't affect Connect Quick

**No console messages at all**
- Extension might not be loaded
- Go to chrome://extensions/ and check if Connect Quick is enabled
- Try reloading the extension
- Refresh LinkedIn after enabling the extension

### Step 5: Manual Trigger

If the modal detection isn't working, you can manually check:

1. Open a connection modal on LinkedIn
2. Look at the console output from `window.connectQuickDebug()`
3. Check if any textareas are found
4. If textareas exist but selector doesn't appear, there might be a timing issue

### Step 6: LinkedIn Structure Changed

LinkedIn frequently updates their interface. If the extension stops working:

1. Run `window.connectQuickDebug()` in the console
2. Copy the console output
3. Share it so we can update the selectors

## Common Solutions

### Solution 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find Connect Quick
3. Click the reload icon
4. Refresh LinkedIn

### Solution 2: Clear Console Filters
1. In DevTools console, make sure no filters are active
2. Look for a filter icon or dropdown
3. Set to show "All levels"

### Solution 3: Check Permissions
1. Go to `chrome://extensions/`
2. Click "Details" on Connect Quick
3. Scroll to "Site access"
4. Make sure it says "On specific sites" and includes linkedin.com

### Solution 4: Disable Other Extensions
Sometimes other LinkedIn extensions interfere:
1. Temporarily disable other LinkedIn-related extensions
2. Test if Connect Quick works
3. Re-enable extensions one by one to find conflicts

## Debug Output Example

When you run `window.connectQuickDebug()`, you should see output like:

```
[Connect Quick] === DEBUG INFO ===
Messages loaded: 2
Is processing: false
Modals found: 1

Modal 1:
Text content (first 200 chars): Connect with John DoeAdd a note...
Textareas in this modal: 1
  Textarea 1: {name: "message", id: "custom-message", className: "...", value: ""}
Contenteditable elements: 0

=== Attempting to show message selector ===
[Connect Quick] Connection modal detected!
[Connect Quick] Modal detected, searching for textarea...
[Connect Quick] Found textarea with selector: textarea[name="message"]
```

If your output looks different, that indicates where the problem is.

## Still Not Working?

If none of these solutions work:

1. Copy the output from `window.connectQuickDebug()`
2. Note what version of LinkedIn you're using (desktop/mobile site)
3. Check if LinkedIn recently updated their interface
4. The selectors in content.js might need updating

## Advanced: Updating Selectors

If you're comfortable with code, you can update the selectors in `content/content.js`:

Find this section (around line 95):
```javascript
const selectors = [
  'textarea[name="message"]',
  'textarea[id*="custom-message"]',
  // ... more selectors
];
```

Add new selectors based on what you find in the debug output.

---

**Quick Test**: After any changes, reload the extension and LinkedIn, then try the connection flow again.
