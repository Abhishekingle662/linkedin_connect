# LinkedIn Auto-Note Connect (MV3) — v1.4 (Message Mode)

**What it does**
- **Connect flow:** When you click **Connect**, it opens **Add a note**, inserts your personalized message, and (optionally) auto-sends.
- **Message flow:** When you click **Message**, it opens the composer, inserts your **Message template**, and (optionally) auto-sends. A tiny helper also appears with **Insert**, **Insert & Send**, and **Attach file**.

**Install (Developer Mode)**
1. Put these files in a folder.
2. Visit `chrome://extensions` → enable **Developer mode**.
3. Click **Load unpacked** → select the folder.
4. Open the extension’s **Options** to set your templates and pacing.

**Usage**
- On profiles, search cards, My Network, or the messaging page:
  - Click **Connect** → note opens and is filled automatically.
  - Click **Message** → composer opens and your message is inserted.
- Hotkeys: **⌘/Ctrl+Shift+N** opens Add a note. **⌘/Ctrl+Shift+M** opens the Message composer.

**Tokens**
Use anywhere: `{firstName} {company} {headline} {location} {lastCompany} {role} {school} {mutualCount}`.

**Leads CSV**
- Options → **Export CSV** to download a log (`mode` includes `connect` or `message`).

**Tips**
- Keep it concise (LinkedIn trims around ~300 chars in notes; messaging supports more but concise wins).
- If the UI renders slowly on your machine, increase **Delay** in Options.

**Heads‑up**
- Automation can conflict with LinkedIn’s ToS. The default is insert‑only; enable auto‑send at your discretion.