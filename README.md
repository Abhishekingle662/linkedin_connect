# Connect Quick

A Chrome extension that helps you quickly send personalized connection messages on LinkedIn using your custom message library.

## Features

- **Custom Message Library**: Create and manage your own collection of connection messages
- **Easy Message Management**: Add, edit, and delete messages through a simple popup interface
- **Smart Autofill**: Automatically detects LinkedIn connection modals and offers your saved messages
- **Character Counter**: Stay within LinkedIn's 300-character limit for connection notes
- **Sync Across Devices**: Messages are stored using Chrome's sync storage

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. Generate icons:
## Migration Note
- Existing leads previously stored in sync won’t auto-migrate. If you need them, we can add a one-time migration from sync → local.
   - Open `icons/create-icons.html` in your browser
   - Right-click each canvas and save as PNG with the correct filename (icon16.png, icon48.png, icon128.png)
   - Save all icons in the `icons/` directory

## Usage

### Managing Messages

1. Click the Connect Quick extension icon in your Chrome toolbar
2. Enter a name for your message template (e.g., "Tech Professional", "Industry Colleague")
3. Type your connection message (max 300 characters)
4. Use placeholders for automatic personalization:
   - `[Name]` - Full name (e.g., "John Smith")
   - `[FirstName]` - First name only (e.g., "John")
   - `[LastName]` - Last name only (e.g., "Smith")
   - `[Company]` - Their company name
   - `[Title]` - Their job title
5. Click "Add Message"
6. Your messages will appear in the list below
7. Edit or delete messages as needed

**Example message:** `Hi [FirstName], I noticed you work at [Company]. Would love to connect!`

### Using Messages on LinkedIn

1. Navigate to LinkedIn and find someone you want to connect with
2. Click the "Connect" button
3. The extension will automatically click "Add a note"
4. Connect Quick will show your message library
5. Click on any message to autofill it
6. Placeholders like `[Name]` will be automatically replaced with the person's actual information
7. Review the message and click "Send"

## Privacy & Permissions

Connect Quick only requires:
- **Storage**: To save your message library
- **Active Tab**: To interact with LinkedIn pages
- **LinkedIn Access**: Only works on linkedin.com

Your messages are stored locally in your Chrome browser using Chrome's sync storage. No data is sent to external servers.

## Chrome Extension Policies Compliance

This extension follows all Chrome Web Store policies:
- Minimal permissions requested
- No obfuscated code
- Clear privacy practices
- No ads or tracking
- User data stays local

## Development

### Project Structure

```
mesage-chrome-ext/
├── manifest.json           # Extension configuration
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── content/
│   ├── content.js         # LinkedIn page interaction
│   └── content.css        # Injected styles
├── background/
│   └── background.js      # Background service worker
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

## Tips

- **Smart Placeholders**: Use `[Name]`, `[FirstName]`, `[Company]`, `[Title]`, etc. - they're automatically replaced!
- Keep messages under 300 characters (LinkedIn's limit)
- Create different message templates for different scenarios (recruiters, peers, industry leaders, etc.)
- The extension automatically personalizes messages, but always review before sending
- If a placeholder can't be found, it remains as-is (e.g., `[Company]` if company info isn't visible)

## Troubleshooting

**Extension not working on LinkedIn:**
- Make sure you're on linkedin.com (not a subdomain)
- Refresh the LinkedIn page after installing the extension
- Check that the extension is enabled in chrome://extensions/

**Messages not saving:**
- Check your Chrome sync settings
- Make sure you have enough storage space
- Try refreshing the extension popup

**Autofill not appearing:**
- LinkedIn's interface may have changed - the extension looks for connection note modals
- Make sure you have at least one message saved
- Try clicking "Add a note" when sending a connection request

## License

MIT License - Feel free to use and modify as needed.

## Contributing

This is a personal project, but suggestions and improvements are welcome!
