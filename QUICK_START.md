# Quick Start Guide

## What You Have

Your **Connect Quick** Chrome extension is ready! Here's what was built:

### Core Extension Files
- ✅ `manifest.json` - Extension configuration (Manifest V3)
- ✅ `popup/` - User interface for managing messages
- ✅ `content/` - Scripts that run on LinkedIn pages
- ✅ `background/` - Service worker for extension lifecycle
- ✅ `icons/` - Extension icons (need to be generated)

### Key Features Implemented

1. **Message Library Management**
   - Add, edit, and delete custom messages
   - 300-character limit (LinkedIn's requirement)
   - Real-time character counter
   - Data stored in Chrome sync storage

2. **Smart Placeholders** 🎯
   - Use `[Name]`, `[FirstName]`, `[LastName]` in your messages
   - Automatically extracts and fills in the person's actual info
   - Also supports `[Company]` and `[Title]`
   - Example: "Hi [FirstName], I noticed you work at [Company]..."

3. **LinkedIn Integration**
   - Detects when you click "Connect" on LinkedIn
   - Automatically clicks "Add a note" button
   - Shows your message library in a popup
   - One-click autofill with automatic personalization
   - Works across LinkedIn's single-page app navigation

3. **Chrome Extension Compliance**
   - Follows all Chrome Web Store policies
   - Minimal permissions (storage, activeTab, LinkedIn only)
   - No external API calls or tracking
   - No obfuscated code
   - XSS protection with HTML escaping

## Installation (3 Steps)

### Step 1: Generate Icons
```
1. Open icons/create-icons.html in your browser
2. Right-click each canvas → "Save image as..."
3. Save as icon16.png, icon48.png, icon128.png in the icons/ folder
```

### Step 2: Load Extension
```
1. Open Chrome → chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select this folder (mesage-chrome-ext)
```

### Step 3: Test It
```
1. Click the extension icon in your toolbar
2. Add a test message
3. Go to LinkedIn and click "Connect" on any profile
4. See your messages appear!
```

## Usage Tips

### Creating Good Message Templates

Use smart placeholders that auto-fill:
- `Hi [FirstName], I'd love to connect...` → "Hi John, I'd love to connect..."
- `Hi [Name], I noticed you work at [Company]...` → "Hi John Smith, I noticed you work at Google..."
- `[FirstName], your role as [Title] is impressive!` → "John, your role as Senior Engineer is impressive!"

### Message Ideas

Create templates for different scenarios:
- **General Professional**: Generic networking message
- **Industry Peer**: For people in your field
- **Recruiter**: For talent acquisition professionals
- **Alumni**: For fellow school graduates
- **Event Connection**: For people you met at events

### Character Limit

LinkedIn limits connection notes to 300 characters:
- The extension shows a real-time character counter
- Messages over 300 chars can't be added
- Keep templates concise but personal

## Project Structure

```
mesage-chrome-ext/
├── manifest.json              # Extension config
├── popup/
│   ├── popup.html            # Message management UI
│   ├── popup.css             # Popup styling
│   └── popup.js              # Message CRUD operations
├── content/
│   ├── content.js            # LinkedIn page detection
│   └── content.css           # Injected overlay styles
├── background/
│   └── background.js         # Extension lifecycle
├── icons/
│   ├── create-icons.html     # Icon generator
│   ├── icon16.png           # (generate this)
│   ├── icon48.png           # (generate this)
│   └── icon128.png          # (generate this)
├── README.md                 # Full documentation
├── INSTALLATION.md           # Detailed install guide
├── CLAUDE.md                # Developer guide
└── QUICK_START.md           # This file
```

## Technical Details

### Storage
- Uses `chrome.storage.sync` (syncs across devices)
- Max 100KB total storage
- Each message stored with: id, name, text, timestamps

### LinkedIn Detection
- Monitors DOM for connection modals
- Looks for `[role="dialog"]` with "Add a note" text
- Injects custom message selector overlay
- Handles LinkedIn's SPA navigation

### Security
- All user input is HTML-escaped
- No external requests
- Data stays in Chrome storage
- Follows principle of least privilege

## Troubleshooting

**Extension doesn't load:**
- Check all icon files are generated
- Verify Developer mode is enabled
- Look for errors in chrome://extensions/

**Not working on LinkedIn:**
- Refresh LinkedIn after installing
- Must be on linkedin.com (not subdomains)
- Check browser console for errors

**Messages not saving:**
- Check Chrome sync is enabled
- Verify storage permissions granted
- Try reopening the popup

## Next Steps

1. ✅ Generate icons (Step 1 above)
2. ✅ Load extension in Chrome
3. ✅ Add your first messages
4. ✅ Test on LinkedIn
5. 📝 Customize default messages in background.js if desired
6. 📝 Publish to Chrome Web Store (optional)

## Publishing to Chrome Web Store (Optional)

If you want to publish this extension:

1. Create a developer account ($5 one-time fee)
2. Prepare store listing assets:
   - Screenshots of the extension
   - Promotional images
   - Privacy policy (template provided in README)
3. Zip the extension folder (exclude .git, node_modules)
4. Upload to Chrome Web Store Developer Dashboard
5. Wait for review (usually 1-3 days)

---

**You're all set!** Follow the 3 installation steps above and start using Connect Quick on LinkedIn.

For detailed information, see:
- `README.md` - Complete feature documentation
- `INSTALLATION.md` - Detailed installation guide
- `CLAUDE.md` - Developer/architecture guide
