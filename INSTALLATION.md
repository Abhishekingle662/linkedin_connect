# Installation Guide for Connect Quick

## Step 1: Generate Icons

Before loading the extension, you need to generate the icon files:

1. Open the file `icons/create-icons.html` in your web browser
2. You'll see three canvases with generated icons
3. Right-click on each canvas and select "Save image as..."
4. Save them with these exact names in the `icons/` folder:
   - First canvas → `icon16.png`
   - Second canvas → `icon48.png`
   - Third canvas → `icon128.png`

## Step 2: Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click the "Load unpacked" button
5. Navigate to and select the `mesage-chrome-ext` folder
6. The extension should now appear in your extensions list

## Step 3: Verify Installation

1. You should see the Connect Quick icon in your Chrome toolbar
2. Click the icon to open the popup
3. You should see two default messages already loaded
4. Try adding a new message to test the functionality

## Step 4: Test on LinkedIn

1. Go to https://www.linkedin.com
2. Find a profile you'd like to connect with
3. Click the "Connect" button
4. When the connection modal appears, you should see the Connect Quick message selector
5. Click on a message to autofill it

## Troubleshooting

### Icons not showing
- Make sure you saved all three icon files (icon16.png, icon48.png, icon128.png) in the `icons/` folder
- Check that the filenames are exactly as specified

### Extension not appearing
- Confirm Developer mode is enabled in chrome://extensions/
- Check for any error messages in the extensions page
- Try reloading the extension by clicking the refresh icon

### Not working on LinkedIn
- Refresh the LinkedIn page after installing the extension
- Check that you're on linkedin.com (not a subdomain)
- Open the browser console (F12) to check for any errors
- Make sure the extension is enabled

### Messages not saving
- Check your Chrome sync settings
- Try reopening the popup
- Check the browser console for storage errors

## Next Steps

Once installed:
1. Customize the default messages or add your own
2. Create templates for different types of connections
3. Use placeholders like [Name] or [Company] to remind yourself to personalize

Enjoy using Connect Quick!
