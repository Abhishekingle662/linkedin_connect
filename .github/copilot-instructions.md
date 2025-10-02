# LinkedIn Auto-Note Connect + Hiring Team Finder

## Architecture Overview

This is a **Chrome Manifest V3 extension** with two major features:
1. **LinkedIn automation** - Auto-fills connection/message templates with personalized tokens
2. **Multi-portal hiring team finder** - Extracts job data from 7+ job portals and helps find hiring managers/recruiters

### Key Components

- **`background.js`** - Service worker handling settings initialization, metrics tracking, and keyboard command routing (`Ctrl+Shift+N/M/H`)
- **`content.js`** - Core automation logic (1430 lines). Runs on LinkedIn + 7 job portals. Handles button detection, template injection, and hiring widget creation
- **`options.js/html`** - Full settings page with template management, timing controls, and CSV export
- **`popup.js/html`** - Quick-access popup for toggling features and viewing activity metrics

### Data Flow

1. **Settings Storage**: `chrome.storage.sync` (templates, delays) + `chrome.storage.local` (metrics)
2. **Message Passing**: `background.js` routes commands → `content.js` executes DOM manipulation
3. **Button Binding**: MutationObserver watches for Connect/Message buttons, binds click handlers on detection
4. **Template System**: `fillTemplate()` replaces `{firstName}`, `{company}`, etc. with scraped profile/job data

## Critical Patterns

### Template Injection Flow (Connect)
```javascript
// content.js workflow:
1. Detect Connect button click → handleConnect()
2. Wait for "Add a note" modal → findAddNoteChoiceButton()
3. Inject helper UI with template picker → injectNoteHelper()
4. Fill textarea with capLinkedInLimit(fillTemplate(template, context))
5. Optional auto-send if settings.autoSend enabled
```

**Key Selectors** (LinkedIn changes these frequently):
- Note textarea: `textarea[name="message"]`, `textarea[id*="custom-message"]`
- Message composer: `.msg-form__contenteditable[contenteditable="true"]`
- Connect button: Match by text `connect` in multiple languages

### Multi-Portal Job Detection
`extractJobData()` supports 7 portals with fallback extraction:
- **LinkedIn**: Standard selectors
- **Greenhouse**: `boards.greenhouse.io/*/jobs/*` - extracts from meta tags
- **Ashby**: `jobs.ashbyhq.com/*/*` - company from URL slug
- **Wellfound**: `wellfound.com/company/*/jobs/*`
- **Lever**: `jobs.lever.co/*` - company from hostname
- **Workable**: `apply.workable.com/*/j/*` - URL pattern `extractCompanyFromWorkable()`
- **Workday**: `*.myworkdayjobs.com/*/*` - URL pattern `extractCompanyFromWorkday()`

### Hiring Widget Lifecycle
```javascript
// content.js: ~line 920-1400
1. isJobPostingPage() → detect job portal
2. extractJobData() → scrape title/company/location
3. createHiringTeamWidget() → inject fixed-position widget
4. scanNetwork() → search for 1st/2nd connections at company
5. findHiringTeam() → build LinkedIn search URLs for recruiters/managers
```

## Development Workflows

### Testing Extension Locally
1. **Load unpacked**: `chrome://extensions` → Developer mode → Load unpacked → select folder
2. **Reload on changes**: Click refresh icon OR `Ctrl+R` on extension in `chrome://extensions`
3. **Debug**: 
   - Content script: F12 on LinkedIn page → Console shows `[AutoNote]` logs
   - Background: `chrome://extensions` → extension Details → Inspect views: service worker
   - Popup: Right-click popup → Inspect

### Adding New Job Portal
1. **`manifest.json`**: Add URL pattern to `content_scripts.matches[]`
2. **`content.js`**: 
   - Add case in `getJobPortal()` to detect domain
   - Add extraction logic in `extractJobData()` switch statement
   - Create helper function like `extractCompanyFromWorkday()` for URL parsing

### Template Token System
**Available tokens** (see `fillTemplate()` in `content.js` ~line 400-450):
- Profile: `{firstName}`, `{company}`, `{headline}`, `{location}`, `{lastCompany}`, `{role}`, `{school}`, `{mutualCount}`
- Job context: Uses `extractProfileContext()` + `extractCompanyNear()` for dynamic extraction

**Add new token**:
```javascript
// In fillTemplate() function
ctx.newToken = extractNewDataFunction();
tpl = tpl.replace(/\{newToken\}/g, ctx.newToken);
```

## Important Constraints

### LinkedIn Rate Limits
- Extension adds `delayMs` + `jitterMaxMs` random delay before actions
- Default: 500ms + 0-400ms jitter to avoid detection
- **LinkedIn 300-char limit** for connection notes → `capLinkedInLimit()` truncates with ellipsis

### Chrome MV3 Service Worker
- **No persistent background page** - `background.js` must be stateless
- Event listeners must be registered synchronously at top-level
- Storage operations are async → always use `chrome.storage.sync.get()`

### DOM Observation Strategy
```javascript
// content.js uses debounced MutationObserver
const mo = new MutationObserver(bindButtons);
mo.observe(document.documentElement, { childList: true, subtree: true });
```
- Debounce at 250ms to reduce CPU on dynamic pages
- Marks bound elements with `data-autoNoteBound="1"` to prevent double-binding

## Settings Architecture

**3-tier template system**:
1. **Default templates** - Hardcoded in `DEFAULTS` object (background.js, content.js, options.js)
2. **Audience-based** - `defaultConnectTemplate` toggles between `alumni` vs rotating `recruiterTemplates[1-3]`
3. **Custom templates** - User-defined `customTemplates[]` with title/body pairs

**Migration pattern** (background.js):
```javascript
// Gentle migration preserves user data while updating defaults
async function migrateTemplates() {
  const sync = await chrome.storage.sync.get(null);
  const patch = {};
  if (!curAlumni || /\[[^\]]+\]/.test(curAlumni)) { // Detect old format
    patch.alumniTemplate = DEFAULTS.alumniTemplate;
  }
  if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
}
```

## File Organization

- **No build process** - Pure vanilla JS, load directly in Chrome
- **Shared CSS** - `styles.css` used by options.html, popup.html, generate-icons.html
- **Icons** - `icons/` folder with 16/32/48/128px PNGs + source `icon.svg`
- **Documentation** - `README.md` (user guide), `HIRING_TEAM_FINDER.md` (feature docs)

## Key Debugging Techniques

**Check button detection**:
```javascript
console.log('Connect buttons:', Array.from(document.querySelectorAll('button')).filter(isConnectButton));
```

**Test template filling**:
```javascript
const ctx = extractProfileContext();
console.log('Context:', ctx);
console.log('Filled:', fillTemplate(settings.alumniTemplate, ctx));
```

**Widget visibility**:
```javascript
// Check if widget exists
document.getElementById('hiring-team-widget');
// Check dismissal state
sessionStorage.getItem(`hiring-widget-dismissed-${location.href.split('?')[0]}`);
```

## Common Pitfalls

1. **LinkedIn selector changes** - LinkedIn frequently updates class names. Use multiple fallback selectors.
2. **Async race conditions** - Always use `waitForElement()` instead of direct `querySelector()` after clicks
3. **Service worker timeout** - Background tasks must complete within 30s or Chrome terminates the worker
4. **Storage quota** - `chrome.storage.sync` has 100KB limit, 8KB per item. Use `local` for metrics.
5. **Content script injection timing** - `run_at: "document_idle"` ensures DOM is ready but delays initial load

## Testing Checklist

- [ ] Connect flow on profile page (with/without auto-send)
- [ ] Message flow from profile + search results
- [ ] Hiring widget appears on all 7 job portals
- [ ] Template tokens replaced correctly for various profile layouts
- [ ] Settings persist after browser restart
- [ ] Keyboard shortcuts work (`Ctrl+Shift+N/M/H`)
- [ ] Widget closes/reopens correctly
- [ ] Network scanning shows 1st/2nd degree connections
