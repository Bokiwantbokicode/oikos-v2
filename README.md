# OIKOS v2 — Personal Economy
### *οἶκος · Your household. Your ledger. Your mind.*

---

## TABLE OF CONTENTS
1. [What is Oikos](#what-is-oikos)
2. [How to Install](#how-to-install)
3. [How to Update](#how-to-update)
4. [File Structure](#file-structure)
5. [Section-by-Section Function Guide](#section-by-section-function-guide)
6. [Data Model](#data-model)
7. [GitHub Sync Setup](#github-sync-setup)
8. [AI Developer Prompt](#ai-developer-prompt)

---

## What is Oikos

Oikos is a personal finance tracker that runs entirely in your browser. No server. No subscription. No app store. Your data lives in your browser (localStorage) and optionally syncs to a private GitHub repository as a JSON file.

It tracks:
- Cash in and out across multiple wallets (GCash, bank, cash, etc.)
- Shared expenses and debts per person
- Savings goals with progress and deadline forecasting
- Daily mood and journal entries to connect emotional state to spending
- A sealed vault for frustrations that reopens after 30 days
- AI-ready prompts that summarize your financial and emotional data

---

## How to Install

### Step 1 — Create a GitHub repository
1. Go to [github.com](https://github.com) and sign in
2. Click **+** → **New repository**
3. Name it exactly: `oikos-v2` (all lowercase)
4. Set it to **Public**
5. Click **Create repository**

### Step 2 — Upload the files
Upload this exact folder structure:
```
oikos-v2/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── utils.js
│   ├── db.js
│   ├── quotes.js
│   ├── home.js
│   ├── entry.js
│   ├── ledger.js
│   ├── charts.js
│   ├── mind.js
│   └── settings.js
├── assets/
│   ├── oikos-icon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

To upload on GitHub:
- Open the repo → click **Add file** → **Upload files**
- Drag all files and folders in
- Click **Commit changes**

> ⚠️ Folders must be uploaded with their files inside. GitHub will create the folder automatically when you upload a file with a path like `css/main.css`.

### Step 3 — Enable GitHub Pages
1. Go to your repo → **Settings** (top menu, inside the repo)
2. Scroll to **Pages** in the left sidebar
3. Under **Branch** → select `main` → folder `/ (root)`
4. Click **Save**
5. Wait 2–3 minutes
6. Your app is live at: `https://YOUR-USERNAME.github.io/oikos-v2/`

### Step 4 — Add to Home Screen (Android Chrome)
1. Open the URL in Chrome
2. Tap the **3-dot menu** (top right)
3. Tap **Add to Home Screen**
4. Tap **Add**

The app icon will appear on your home screen and open full-screen.

### Step 5 — First Launch (Onboarding)
The app will walk you through 4 steps:
1. Your name
2. Monthly income target (default ₱45,000 — change to yours)
3. Wallet names (GCash, BDO, Wallet — rename as needed)
4. Current balances in each wallet (opening balance — enter what you actually have right now)

After that, you're in.

---

## How to Update

When a file is changed or improved, you only need to replace that one file on GitHub.

### To update a single file:
1. Go to your GitHub repo
2. Navigate to the file (e.g. `js/home.js`)
3. Click the **pencil icon** (Edit)
4. Delete all content, paste the new content
5. Click **Commit changes**

### To update multiple files:
1. Go to your repo → **Add file** → **Upload files**
2. Upload only the changed files
3. GitHub will replace them automatically

### After updating:
- On your phone, open the app URL in Chrome
- Pull down to refresh (or tap the address bar and press Enter)
- The new version loads immediately

> If the old version still shows: Chrome menu → **More tools** → **Clear browsing data** → clear **Cached images and files** → refresh.

---

## File Structure

```
index.html      Shell of the app. Contains all HTML, modals, onboarding,
                bottom nav, and the script load order. Edit here to add
                new modals or change page layout.

css/main.css    All visual design: colors, spacing, typography, components.
                Edit here to change how anything looks.

js/utils.js     Shared helper functions used by all modules.
                U.fmt(), U.toast(), U.openModal(), U.uid(), etc.
                Edit here to change formatting or add global utilities.

js/db.js        Data layer. Loads/saves localStorage. Handles GitHub sync.
                Contains DB.data (the full app state), DB.save(),
                DB.load(), DB.syncToGitHub(), DB.walletBalance(), etc.
                Edit here to change data structure or sync behavior.

js/quotes.js    365 daily quotes shown on the Home screen.
                Edit here to add, remove, or change quotes.
                getDailyQuote() picks by day of year.

js/home.js      Home screen logic. Wallet cards, month summary,
                weekly limit bar, cost calculator, warnings, insight
                card, daily quote, recent activity feed.
                Edit here to change the Home screen.

js/entry.js     Transaction entry modal. Handles Cash In, Cash Out,
                Transfer. Validates input, saves to DB, links to people
                and goals. Also renders transaction rows and detail view.
                Edit here to change how transactions are entered or shown.

js/ledger.js    Ledger screen. Three tabs: Transactions, People, Goals.
                Transactions: search, date range filter, wallet filter.
                People: per-person debt timeline, settlements.
                Goals: list view, calendar view, add/delete/move funds.
                Edit here to change the Ledger screen.

js/charts.js    Charts screen. Monthly donut + trend, weekly bar + day
                breakdown, daily bar + mood correlation. AI prompt
                builder and response parser.
                Edit here to change charts or the AI prompt logic.

js/mind.js      Mind screen. Breath pacer with SVG arc, stone drop
                ripple, focus jar particle animation. Journal with
                backdating. Vault: write, seal, reveal after 30 days.
                Edit here to change wellness features.

js/settings.js  Settings page. Wallet editor (add/rename/recolor/
                opening balance). Category editor. GitHub sync config.
                CSV and JSON export. Clear data.
                Edit here to change settings or export behavior.
```

---

## Section-by-Section Function Guide

### HOME SCREEN — `js/home.js`

| Function | What it does |
|---|---|
| `Home.render()` | Runs all home sub-renders in order |
| `Home.renderWallets()` | Draws wallet cards from DB. Tapping filters Ledger |
| `Home.renderSummary()` | Shows month In / Out / Net. Tapping opens month list |
| `Home.showMonthList(filter)` | Slide-up modal with all transactions for the month |
| `Home.renderWeeklyBar()` | Weekly spend vs ceiling bar + cost calculator |
| `Home.calcCost(ceil, spent)` | Takes an input amount, shows % of weekly limit |
| `Home.renderWarnings()` | Shows goal deadline warnings (within 30 days) |
| `Home.renderInsight()` | Shows last AI insight card if one is saved |
| `Home.renderQuote()` | Shows vault reveal prompt OR daily quote |
| `Home.renderActivity()` | Last 8 transactions as activity feed |

### ENTRY MODAL — `js/entry.js`

| Function | What it does |
|---|---|
| `Entry.open(editId)` | Opens modal. Pass an ID to edit existing transaction |
| `Entry.setType(type)` | Switches between 'out', 'in', 'xfr'. Shows/hides relevant fields |
| `Entry.setNec(el)` | Sets necessity tag: needed / avoid / wasteful |
| `Entry.setMood(btn)` | Sets mood emoji on transaction |
| `Entry.toggleRecur()` | Toggles monthly recurring flag |
| `Entry.onAmountChange()` | Shows breath reminder if amount > 8% of monthly income |
| `Entry.handlePhoto(input)` | Reads photo file, stores as base64 |
| `Entry.save()` | Validates and saves transaction. Creates person debt if linked |
| `Entry.txnRow(t)` | Renders a single transaction as an activity row (used everywhere) |
| `Entry.openDetail(id)` | Opens transaction detail modal with edit/delete buttons |
| `Entry.confirmDelete(id)` | Soft-deletes a transaction (sets deleted:true) |

### LEDGER — `js/ledger.js`

| Function | What it does |
|---|---|
| `Ledger.switchTab(tab)` | Switches between txn / people / goals tabs |
| `Ledger.renderTxns()` | Renders filtered transaction list (search + date range + wallet) |
| `Ledger.filterWallet(id)` | Filters transactions to one wallet, navigates to Ledger |
| `Ledger.clearWalletFilter()` | Removes wallet filter |
| `Ledger.openAddPerson()` | Opens add person modal |
| `Ledger.savePerson()` | Saves new person to DB |
| `Ledger.openPerson(id)` | Opens person detail: balance, timeline, settle buttons |
| `Ledger.openSettle(id,mode)` | Opens settlement modal (received / paid / other) |
| `Ledger.saveSettle()` | Records settlement, applies to debts FIFO |
| `Ledger.renderGoals()` | Renders goals in list or calendar view |
| `Ledger.switchGoalsView(view)` | Switches list / calendar |
| `Ledger.openAddGoal()` | Opens goal creation modal |
| `Ledger.saveGoal()` | Saves goal to DB |
| `Ledger.openGoal(id)` | Opens goal detail with progress, suggestions, actions |
| `Ledger.addToGoal(id)` | Adds savings contribution to a goal |
| `Ledger.moveGoal(id)` | Moves funds from one goal to another |
| `Ledger.deleteGoal(id)` | Requires typing goal name to confirm deletion |
| `Ledger.calNav(dir)` | Navigates calendar month forward/back |
| `Ledger.calReset()` | Returns calendar to current month |

### CHARTS — `js/charts.js`

| Function | What it does |
|---|---|
| `Charts.switchTab(tab)` | Switches monthly / weekly / daily |
| `Charts.render()` | Destroys old Chart.js instances, renders current tab |
| `Charts._monthly(el)` | Category donut + 6-month trend bar + regret cards |
| `Charts._weekly(el)` | Weekly bar vs ceiling + day-of-week breakdown |
| `Charts._daily(el)` | Day-by-day bar + top expensive days + mood correlation |
| `Charts.openPrompt()` | Opens AI prompt modal, builds prompt |
| `Charts._buildPrompt()` | Assembles prompt from selected layers |
| `Charts.togglePromptLayer(el)` | Toggles a data layer in/out of the prompt |
| `Charts.copyPrompt()` | Copies prompt to clipboard |
| `Charts.parseResponse()` | Parses AI response for INSIGHT:, REMINDER:, GOAL: |
| `Charts.openExport()` | Opens export (only after AI report is saved) |

### MIND — `js/mind.js`

| Function | What it does |
|---|---|
| `Mind.switchTab(tab)` | Switches focus / journal / vault |
| `Mind.toggleBreath()` | Starts/stops breath pacer |
| `Mind._runBreath()` | Cycles through inhale/hold/exhale phases with SVG arc |
| `Mind._setArc(offset, color)` | Animates the SVG arc progress ring |
| `Mind.dropStone(e)` | Creates ripple animation at tap point |
| `Mind.shakeJar()` | Shakes focus jar particles |
| `Mind.saveJournal()` | Saves journal entry (supports any date, backdating) |
| `Mind.editJournal(date)` | Scrolls to top and fills form with past entry for editing |
| `Mind.openVent()` | Opens vault write modal |
| `Mind.toggleVentTag(el)` | Toggles emotional trigger tag |
| `Mind.sealVent()` | Saves vent entry, sets reveal date to +30 days |
| `Mind.openReveal(id)` | Opens sealed entry for reflection |
| `Mind.setResolution(el, val)` | Sets resolution chip (resolved/still/grew/unresolved) |
| `Mind.submitReveal()` | Saves resolution and reflection |

### SETTINGS — `js/settings.js`

| Function | What it does |
|---|---|
| `Settings.render()` | Populates all settings fields from DB |
| `Settings.save(key, val)` | Saves a single setting key to DB |
| `Settings.updateWallet(i)` | Updates wallet icon, label, opening balance |
| `Settings.setWalletColor(i, cls)` | Changes wallet color theme |
| `Settings.addWallet()` | Adds a new wallet to the list |
| `Settings.removeWallet(i)` | Removes a wallet (transactions remain) |
| `Settings.renameCat(i, val)` | Renames an expense category |
| `Settings.deleteCat(i)` | Removes an expense category |
| `Settings.addCat()` | Adds a new expense category via prompt |
| `Settings.testGitHub()` | Tests GitHub API connection |
| `Settings.syncNow()` | Forces immediate sync to GitHub |
| `Settings.toggleJournalSync()` | Toggles whether journal/vault syncs to GitHub |
| `Settings.exportCSV()` | Downloads all transactions as CSV |
| `Settings.exportJSON()` | Downloads full DB as JSON backup |
| `Settings.clearData()` | Wipes all localStorage data after double confirmation |

### DATA LAYER — `js/db.js`

| Function | What it does |
|---|---|
| `DB.load()` | Reads from localStorage, merges with default schema |
| `DB.save()` | Writes to localStorage, schedules GitHub sync (30s debounce) |
| `DB.syncToGitHub(force)` | Pushes oikos-data.json to GitHub repo via REST API |
| `DB.checkAutoSync()` | Syncs if last sync was more than 6 hours ago |
| `DB.testConnection()` | Tests GitHub token and repo without writing |
| `DB.walletBalance(walletId)` | Opening balance + all In - all Out for one wallet |
| `DB.monthTxns(month)` | Returns all non-deleted transactions for a YYYY-MM string |
| `DB.personBalance(personId)` | Sum of all unpaid debt shares for a person |
| `DB.goalSaved(goalId)` | Sum of all contributions to a goal |
| `DB.addTxn(txn)` | Adds a transaction with ID, timestamp, changelog |
| `DB.updateTxn(id, updates)` | Updates a transaction and logs the edit |
| `DB.deleteTxn(id)` | Soft-deletes a transaction (deleted: true) |

---

## Data Model

All data lives in `localStorage` under key `oikos_v2` as a single JSON object.

```json
{
  "transactions": [
    {
      "id": "abc123",
      "type": "out",
      "amount": 250,
      "walletId": "w1",
      "category": "Food & Dining",
      "necessity": "needed",
      "mood": "😐",
      "note": "Jollibee with Kuya",
      "personId": "p1",
      "goalId": "",
      "toWalletId": "",
      "recurring": false,
      "photoData": "",
      "date": "2025-04-25",
      "createdAt": "2025-04-25T10:30:00.000Z",
      "deleted": false,
      "changelog": [{ "action": "created", "at": "2025-04-25T10:30:00.000Z" }]
    }
  ],
  "people": [
    {
      "id": "p1",
      "name": "Kuya Charles",
      "relationship": "Family",
      "debts": [
        { "id": "d1", "txnId": "abc123", "amount": 125, "paid": 0, "note": "Split Jollibee", "date": "2025-04-25" }
      ],
      "settlements": [],
      "createdAt": "2025-04-20T00:00:00.000Z",
      "deleted": false
    }
  ],
  "goals": [
    {
      "id": "g1",
      "name": "Palawan Trip",
      "category": "trip",
      "target": 8000,
      "targetDate": "2025-07-01",
      "personId": "",
      "note": "With college friends",
      "repeat": "yearly",
      "contributions": [{ "amount": 2000, "date": "2025-04-25" }],
      "createdAt": "2025-04-01T00:00:00.000Z",
      "deleted": false
    }
  ],
  "journal": [
    { "id": "j1", "date": "2025-04-25", "text": "Stressful day at work.", "mood": "😩", "createdAt": "..." }
  ],
  "vents": [
    {
      "id": "v1", "text": "Full frustration text here.", "tags": ["Work"],
      "intensity": 4, "date": "2025-04-25", "revealDate": "2025-05-25",
      "sealed": true, "resolution": null, "reflection": null
    }
  ],
  "reports": [],
  "settings": {
    "userName": "Boki",
    "monthlyIncome": 45000,
    "wallets": [
      { "id": "w1", "label": "GCash",  "icon": "💳", "color": "cg", "opening": 8500 },
      { "id": "w2", "label": "BDO",    "icon": "🏦", "color": "cb", "opening": 12000 },
      { "id": "w3", "label": "Wallet", "icon": "👛", "color": "ca", "opening": 1200 }
    ],
    "categories": {
      "income": ["Salary", "Allowance", "Freelance", "Business", "Gift", "Refund", "Other"],
      "expense": ["Food & Dining", "Transport", "Bills & Utilities", "..."]
    },
    "ghToken": "ghp_...",
    "ghRepo": "username/oikos-data",
    "syncJournal": false,
    "lastSync": "2025-04-25T09:00:00.000Z",
    "aiInsight": "Your food spend is 34% of income...",
    "aiInsightDate": "2025-04-25",
    "onboarded": true
  }
}
```

---

## GitHub Sync Setup

### Create the data repo (separate from the app repo)
1. Create a **new private repo** named `oikos-data`
2. Leave it empty — Oikos will create the file automatically on first sync

### Generate a Personal Access Token
1. GitHub → profile photo → **Settings**
2. Scroll to **Developer settings** (bottom of left sidebar)
3. **Fine-grained personal access tokens** → **Generate new token**
4. Name: `oikos-sync`
5. Expiration: 1 year (or no expiration)
6. Repository access: **Only select repositories** → select `oikos-data`
7. Permissions → **Contents** → **Read and write**
8. Click **Generate token**
9. **Copy the token immediately** — you cannot see it again

### Enter in the app
1. Open Oikos → ⚙️ Settings → GitHub Sync
2. Paste your token in **Personal Access Token**
3. Enter your repo as `username/oikos-data`
4. Tap **Test Connection** — you should see ✅ GitHub connected!

### How sync works
- Syncs automatically when you open the app (if last sync was 6+ hours ago)
- Syncs 30 seconds after any transaction is saved (debounced)
- Manual sync via **Sync Now** button in Settings
- Each sync writes one file: `oikos-data.json` in your private repo
- Every sync = one git commit = full version history
- To recover old data: go to GitHub repo → `oikos-data.json` → **History** → pick any commit

---

## AI Developer Prompt

> Use this prompt when asking an AI agent (Claude, ChatGPT, etc.) to help you modify the app. Copy and paste this entire block, then describe your change at the end.

---

```
You are helping me modify Oikos v2, a personal finance web app.

TECH STACK:
- Pure HTML, CSS, vanilla JavaScript (no build tools, no frameworks)
- Hosted on GitHub Pages at: https://USERNAME.github.io/oikos-v2/
- Data stored in localStorage under key "oikos_v2" as JSON
- Optional sync to a private GitHub repo via REST API
- Charts use Chart.js 4.4.0 (loaded from CDN)
- Fonts: Cinzel (headers), DM Sans (body), DM Mono (numbers)

FILE STRUCTURE:
- index.html     — App shell, all modals, onboarding, script load order
- css/main.css   — All styles and design tokens (CSS variables in :root)
- js/utils.js    — Shared helpers: U.fmt(), U.toast(), U.openModal(), U.uid()
- js/db.js       — Data layer: DB.data, DB.save(), DB.load(), GitHub sync
- js/quotes.js   — 365 daily quotes, getDailyQuote() function
- js/home.js     — Home screen: Home.render() and all sub-renders
- js/entry.js    — Transaction entry modal: Entry.open(), Entry.save()
- js/ledger.js   — Ledger tabs: Ledger.switchTab(), people, goals logic
- js/charts.js   — Charts: Charts.render(), AI prompt builder/parser
- js/mind.js     — Mind screen: breath, journal, vault logic
- js/settings.js — Settings: wallet editor, categories, GitHub, export

DATA MODEL (DB.data):
- transactions[]  — All financial entries (type: in/out/xfr)
- people[]        — Debt ledger per person (debts[], settlements[])
- goals[]         — Savings targets (contributions[], targetDate, repeat)
- journal[]       — Daily entries (date, text, mood)
- vents[]         — Vault entries (sealed, revealDate, resolution)
- settings{}      — User config (wallets[], categories{}, ghToken, etc.)

KEY RULES:
1. Each JS file is one module (Home, Entry, Ledger, Charts, Mind, Settings, DB, U)
2. All modules call DB.save() after mutating DB.data
3. After any save, call App.refreshAll() to re-render the current page
4. Soft-delete only: set deleted:true, never splice transactions
5. Wallet balance = opening + all Cash In - all Cash Out (computed in DB.walletBalance)
6. Charts destroy old Chart.js instances before re-rendering (Charts._instances)
7. All modals use U.openModal(id) and U.closeModal(id)
8. Money formatted with U.fmt() (₱1,234.56) or U.fmtShort() (₱1.2K)
9. Dates stored as YYYY-MM-DD strings, U.today() returns today

DESIGN TOKENS (CSS variables):
--green: #2ea84f   (income, positive, goals)
--blue:  #1f6feb   (transfers, neutral actions)
--red:   #f85149   (expenses, debt, warnings)
--amber: #d29922   (vault, warnings, could-avoid)
--bg-1 to --bg-4   (dark surface layers)
--txt, --txt-2, --txt-3  (text hierarchy)

TO MAKE A CHANGE: tell me which file to edit, what function to change,
and what the new behavior should be. I will give you the exact replacement
code for only that file or function.

MY CHANGE REQUEST:
[DESCRIBE YOUR CHANGE HERE]
```

---

*Oikos v2 — Built for clarity. One peso, one day, one decision at a time.*
