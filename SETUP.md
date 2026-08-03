# 📝 Work Documentation - Setup Guide

A personal work tracking tool that logs your daily work, scrum notes, reflections, memories, and day ratings into Google Sheets.

---

## 📁 Project Files

| File | Purpose |
|------|---------|
| `index.html` | Frontend UI (open in browser) |
| `GoogleAppsScript.gs` | Backend script (paste into Google Apps Script) |
| `SETUP.md` | This setup guide |

---

## 🔐 Login Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | `abhishekranjan@monocept.com` | `India@123` | Full access to all tabs |
| HR | `ranjan@status` | `Monocept@123` | View-only: Work Log + Scrum Notes |

### HR Restrictions:
- ❌ Cannot see: Reflection, Yaad Hai, Day Rating, Learnings, Extra Notes
- ✅ Can see: Work Done, Jira Tickets, Blockers, Time Reason, Scrum Notes
- ✅ Can export visible data to CSV

---

## 🗂️ App Tabs (Admin Navigation)

| Tab | Purpose |
|-----|---------|
| 💼 Work Log | Daily work, Jira tickets, blockers, learnings |
| ⚡ Quick Note | Quick notes during meetings/calls (multiple per day) |
| 📋 Scrum | Scrum meeting notes, today's plan, blockers raised |
| 🪞 Reflection | What went well, what could be better, goals |
| 🧠 Yaad Hai | Important talks, feedback, things people said |
| ⭐ Rate Day | Half-star rating (0.5 to 5) with reason |
| 📊 History | Filter past entries by week/month/quarter |

---

## 📊 Google Sheet Setup

### Step 1: Create Spreadsheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ Blank spreadsheet**
3. Name it: `My Work Documentation`

### Step 2: Open Apps Script

1. In spreadsheet → **Extensions → Apps Script**
2. Delete existing code in `Code.gs`
3. Copy-paste the entire content of `GoogleAppsScript.gs`

### Step 3: Run Setup (Creates All Sheets)

1. Select function **`setup`** from the dropdown (top bar)
2. Click **▶ Run**
3. First time → **Review Permissions → Allow**
4. Check your spreadsheet — 5 new tabs appear at the bottom

### Step 4: Deploy as Web App

1. In Apps Script → **Deploy → New Deployment**
2. Click ⚙️ gear → select **Web app**
3. Settings:
   - Description: `Work Doc API`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** → Copy the URL

### Step 5: Paste URL in index.html

Find this line in the `<script>` section:
```javascript
const SCRIPT_URL = '';
```
Replace with your URL:
```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfyc.../exec';
```

---

## 📋 Google Sheets Structure

The `setup()` function creates **6 sheet tabs** (like clicking + at the bottom of Google Sheets):

---

### Sheet 1: `WorkLog`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Selected date (YYYY-MM-DD) |
| C | Work Done | What was worked on |
| D | Jira Ticket | Ticket numbers/URLs (pipe-separated if multiple) |
| E | Blockers | Blockers faced |
| F | Time Reason | Why something took more time |
| G | Learnings | What was learnt today |
| H | Extra Notes | Any additional notes |

---

### Sheet 2: `QuickNotes`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Date of the note (YYYY-MM-DD) |
| C | Time | Time when note was taken (e.g., 02:30 PM) |
| D | Note | The quick note content |
| E | Tag | Optional tag (meeting, call, idea, etc.) |

---

### Sheet 3: `ScrumNotes`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Selected date (YYYY-MM-DD) |
| C | Scrum Notes | Discussion points from scrum |
| D | Today Plan | What's planned for today |
| E | Scrum Blockers | Blockers raised in scrum |

---

### Sheet 4: `Reflection`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Selected date (YYYY-MM-DD) |
| C | Went Well | What went well today |
| D | Could Be Better | What could have been improved |
| E | Do Tomorrow | What to do differently tomorrow |
| F | Goals Track | Progress on weekly/monthly goals |

---

### Sheet 5: `YaadHai`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Selected date (YYYY-MM-DD) |
| C | Who | Person who said it |
| D | What | What was said / feedback / important talk |
| E | Context | Situation context (meeting, 1:1, Slack, etc.) |

---

### Sheet 6: `DayRating`

| Column | Header | Description |
|--------|--------|-------------|
| A | Timestamp | Auto-generated ISO timestamp |
| B | Date | Selected date (YYYY-MM-DD) |
| C | Rating | Day rating (0.5 to 5, supports half stars) |
| D | Reason | Why this rating was given |

---

## ⚠️ Important Notes

- **Don't rename** any sheet tab — script matches exact names
- You can safely delete the default `Sheet1` tab (setup does this automatically)
- Multiple Jira tickets are stored as: `PROJ-123 | PROJ-456 | https://...`
- Rating supports half values: 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
- Data is saved in **both** localStorage (offline backup) and Google Sheets

---

## 🔄 Re-deploy After Code Changes

If you update the Apps Script code:
1. **Deploy → Manage Deployments** → click ✏️
2. **Version:** select **New version**
3. Click **Deploy** (URL stays the same)

---

## 🧪 Testing (Inside Apps Script Editor)

Before deploying, you can test:
1. Run **`testPost`** → adds a test row to WorkLog sheet
2. Run **`testGet`** → check Logs (View → Execution Log) for JSON output

---

## 📅 Filter Options (Indian Financial Year)

| Filter | Period |
|--------|--------|
| This Week | Monday to Sunday (current week) |
| This Month | 1st to last day of current month |
| Q1 | April – June |
| Q2 | July – September |
| Q3 | October – December |
| Q4 | January – March |

---

## 🛡️ Data Privacy

| Data | Admin Sees | HR Sees |
|------|-----------|---------|
| Work Done | ✅ | ✅ |
| Jira Tickets | ✅ | ✅ |
| Blockers | ✅ | ✅ |
| Time Reason | ✅ | ✅ |
| Scrum Notes | ✅ | ✅ |
| Quick Notes | ✅ | ❌ |
| Learnings | ✅ | ❌ |
| Extra Notes | ✅ | ❌ |
| Reflection | ✅ | ❌ |
| Yaad Hai | ✅ | ❌ |
| Day Rating | ✅ | ❌ |

---

## 💡 Tips

- Bookmark `index.html` for quick daily access
- Fill in entries at end of day before you forget
- Use "Quick Note" tab during meetings to capture things instantly
- Use "Yaad Hai" tab immediately when someone gives feedback
- Rate your day honestly — it's private and helps track patterns
- Use the History tab to review before weekly standups or 1:1s
