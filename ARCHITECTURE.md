# Architecture Guide: Static HTML + Google Sheets Backend

A reference architecture for building lightweight web apps using a single HTML file as frontend and Google Apps Script + Google Sheets as backend. No hosting, no server, no database needed.

---

## Overview

```
┌──────────────────┐         POST/GET          ┌─────────────────────────┐
│   index.html     │ ──────────────────────────▶│  Google Apps Script     │
│   (Frontend)     │                            │  (Backend Logic)        │
│                  │◀────────────────────────── │                         │
│  - Tailwind CSS  │        JSON Response       │  - doPost() / doGet()   │
│  - localStorage  │                            │  - Auth (USERS config)  │
│  - fetch API     │                            │  - LockService          │
└──────────────────┘                            │  - Sheet CRUD           │
                                                └────────────┬────────────┘
                                                             │
                                                             ▼
                                                ┌─────────────────────────┐
                                                │   Google Sheets         │
                                                │   (Database)            │
                                                │                         │
                                                │  - Multiple sheet tabs  │
                                                │  - Each tab = 1 table   │
                                                │  - Row 1 = headers      │
                                                └─────────────────────────┘
```

---

## Core Principles

1. **Zero infrastructure** — No server, no hosting, no domain needed. Open HTML file directly in browser.
2. **Credentials on server only** — Never store passwords in frontend code. Keep USERS config in `.gs` file.
3. **localStorage as primary + Sheet as sync** — App works offline via localStorage. Google Sheet is the persistent backup.
4. **Single-file frontend** — One `index.html` with embedded CSS/JS. Easy to share, no build tools.
5. **Role-based access** — Different users see different data based on `role` returned from server auth.

---

## Project Structure

```
project/
├── index.html              # Frontend (open in browser)
├── GoogleAppsScript.gs     # Backend (paste into Google Apps Script)
├── SETUP.md                # Setup instructions
└── ARCHITECTURE.md         # This file
```

---

## Authentication Pattern

### Server-side (GoogleAppsScript.gs)

```javascript
var USERS = {
  admin: { email: 'user@company.com', password: 'SecurePass', role: 'admin' },
  viewer: { email: 'viewer@company.com', password: 'ViewPass', role: 'viewer' }
};
```

### How login works

```
Frontend                          Backend (.gs)
   │                                  │
   │  POST { action:'login',          │
   │         email, password }        │
   │─────────────────────────────────▶│
   │                                  │  Check USERS object
   │                                  │  Match email + password
   │  { status:'success',             │
   │    role:'admin' }                │
   │◀─────────────────────────────────│
   │                                  │
   │  Save to localStorage            │
   │  Show role-specific UI           │
   │                                  │
```

### Rules

- Credentials exist ONLY in `.gs` file (server-side)
- Frontend sends email + password to server for verification
- Server returns role on success, error on failure
- Session is saved in `localStorage` (auto-login on refresh)
- Logout clears `localStorage`
- If server is unreachable, show error (no local fallback)

---

## Data Flow Pattern

### Writing data

```
User fills form → Save to localStorage → POST to Google Apps Script → appendRow to Sheet
```

- localStorage is written first (instant, offline-safe)
- Google Sheet write happens async in background
- If fetch fails, entry goes into a retry queue (`pendingSheetQueue` in localStorage)
- Retry queue processes on next page load

### Reading data (History/Filters)

```
Read from localStorage → Filter by date → Render in UI
```

- All reads come from localStorage (fast, offline)
- Google Sheet is the backup/sync layer, not the read source
- HR/viewer reads can optionally call `doGet()` to fetch from sheet

---

## Google Apps Script Structure

### doPost(e) — handles all writes + login

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  // Route by action
  if (data.action === 'login') {
    // Verify credentials, return role
  }
  
  // Route by sheetName
  var sheetName = data.sheetName;
  // Build row array, appendRow to correct sheet
}
```

### doGet(e) — handles reads with role-based filtering

```javascript
function doGet(e) {
  var role = e.parameter.role;
  
  if (role === 'hr') {
    // Return only permitted columns/sheets
  }
  // Admin gets everything
}
```

### Key patterns used

| Pattern | Purpose |
|---------|---------|
| `LockService.getScriptLock()` | Prevent race conditions on concurrent writes |
| `SpreadsheetApp.flush()` | Force immediate write (Sheets can be slow) |
| `waitLock(30000)` | Wait up to 30s if another write is in progress |
| `switch(sheetName)` | Route data to correct sheet tab |
| `ContentService.createTextOutput()` | Return JSON responses |

---

## Frontend Structure

### Tech stack (all CDN, no install)

| Library | Purpose |
|---------|---------|
| Tailwind CSS (CDN) | Styling |
| Font Awesome (CDN) | Icons |
| Native fetch API | HTTP calls |
| localStorage | Offline data + session |

### UI pattern: Tab-based SPA

```html
<!-- Navigation tabs -->
<button onclick="switchTab('tabname')">Tab</button>

<!-- Content sections (show/hide) -->
<div id="tab-tabname" class="tab-content">...</div>
```

- Only one tab visible at a time
- Each tab has its own form + submit button
- Each submit saves to a different localStorage key + different Sheet tab

### localStorage keys

| Key | Contains |
|-----|----------|
| `loggedInUser` | Session (email, role) |
| `workEntries` | Array of work log entries |
| `scrumEntries` | Array of scrum entries |
| `reflectionEntries` | Array of reflection entries |
| `yaadEntries` | Array of memory entries |
| `quickNoteEntries` | Array of quick notes |
| `ratingEntries` | Array of day ratings |
| `pendingSheetQueue` | Failed writes to retry |

---

## Role-Based Access Control

### Define roles in .gs USERS config

```javascript
var USERS = {
  admin: { email: '...', password: '...', role: 'admin' },
  hr: { email: '...', password: '...', role: 'hr' }
};
```

### Frontend: Show/hide UI based on role

```javascript
function showAppForRole(role) {
  if (role === 'admin') showAdminUI();
  else if (role === 'hr') showHRUI();
}
```

### Backend: Filter data based on role in doGet

```javascript
if (role === 'hr') {
  // Return only WorkLog + ScrumNotes
  // Exclude private columns (Learnings, Extra Notes)
}
```

### Access matrix example

| Data | Admin | HR/Viewer |
|------|-------|-----------|
| Work Done | ✅ Read/Write | ✅ Read only |
| Blockers | ✅ Read/Write | ✅ Read only |
| Private Notes | ✅ Read/Write | ❌ Hidden |
| Ratings | ✅ Read/Write | ❌ Hidden |

---

## Google Sheets as Database

### Design rules

1. **One sheet tab = one table** (like DB tables)
2. **Row 1 = column headers** (always)
3. **Format as Table** in Excel-like manner (for structured access)
4. **Freeze Row 1** (for readability)
5. **Column A = Timestamp** (for ordering/debugging)
6. **Column B = Date** (for filtering)
7. **Never rename sheet tabs** — script matches by exact name

### setup() function pattern

```javascript
var SHEETS = {
  SheetName1: ['Col1', 'Col2', 'Col3'],
  SheetName2: ['Col1', 'Col2']
};

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var name in SHEETS) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
    sheet.setFrozenRows(1);
  }
}
```

---

## Offline & Retry Strategy

```javascript
// Save locally first (always succeeds)
localStorage.setItem(key, JSON.stringify(entries));

// Then try server
fetch(URL, { method: 'POST', body: JSON.stringify(data) })
  .catch(() => {
    // Queue for retry
    pendingQueue.push(data);
    localStorage.setItem('pendingSheetQueue', JSON.stringify(pendingQueue));
  });

// On page load, retry pending items
setTimeout(retryPendingQueue, 3000);
```

---

## Deployment Checklist

1. [ ] Create Google Sheet
2. [ ] Open Extensions → Apps Script
3. [ ] Paste `.gs` code
4. [ ] Update `USERS` with actual credentials
5. [ ] Run `setup()` to create sheet tabs
6. [ ] Run `testPost()` to verify write works
7. [ ] Deploy → New Deployment → Web App (Anyone, Execute as Me)
8. [ ] Copy URL → paste into `SCRIPT_URL` in `index.html`
9. [ ] Open `index.html` in browser → login → test

---

## Updating After Changes

### If you change .gs code:
1. Deploy → Manage Deployments → ✏️ Edit
2. Version → **New version**
3. Deploy (URL stays same)

### If you add a new sheet/table:
1. Add to `SHEETS` config in `.gs`
2. Add `case` in `doPost` switch
3. Run `setup()` again (safe — only creates missing sheets)
4. Add localStorage key + form + submit in frontend

### If you add a new user:
1. Add to `USERS` in `.gs` file
2. Re-deploy with new version
3. No frontend change needed

---

## Limitations & Trade-offs

| Limitation | Workaround |
|-----------|------------|
| Google Sheets is slow (2-5s writes) | localStorage for instant UI, async sheet sync |
| No real-time sync between devices | Refresh to see latest from localStorage on that device |
| CORS issues with no-cors mode | Use `text/plain` content-type, can't read response for data writes |
| Login uses `fetch` (needs CORS) | Login call uses regular fetch (Apps Script supports it for doPost) |
| 6 min execution limit in Apps Script | LockService with 30s timeout prevents long waits |
| No edit/delete on Google Sheet from frontend | Manage edits in localStorage; Sheet is append-only log |
| Passwords in plain text in .gs | Acceptable for personal/small team tool; not for production |

---

## When to Use This Architecture

✅ **Good for:**
- Personal productivity tools
- Internal team trackers (small teams)
- Prototypes / MVPs
- Tools that need a spreadsheet as source of truth
- No-budget projects

❌ **Not suitable for:**
- Multi-user concurrent editing (use a real DB)
- Apps needing real-time sync
- Public-facing apps with many users
- Apps handling sensitive/financial data
- Apps needing complex queries or relations

---

## Template for New Projects

When starting a new app with this architecture:

1. Define your **sheets** (tables) and their columns
2. Define your **roles** and what each can see
3. Create the `.gs` file with `USERS`, `SHEETS`, `setup()`, `doPost()`, `doGet()`
4. Create `index.html` with login screen, tab navigation, forms, localStorage logic
5. Add `sendToSheet()` with retry queue
6. Test locally with localStorage, then deploy `.gs` and connect
