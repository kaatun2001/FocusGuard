# 🛡️ FocusGuard v2 – Chrome Extension

> Pomodoro timer · Task manager · Website blocker · Productivity analytics

---

## 🚀 Setup (3 commands)

```bash
npm install
npm run build
# Load the dist/ folder at chrome://extensions/ with Developer Mode ON
```

### Load into Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Pin the 🛡️ icon in your toolbar

---

## ✨ Features

### ⏱️ Pomodoro Timer
- 25-min focus sessions (fully customizable)
- Short & long breaks with automatic session counting
- Pause / Resume / Skip / Reset
- Glowing ring animation while running
- Keyboard shortcuts: **Space** play/pause · **R** reset · **S** skip

### ✅ Task Manager
- Add tasks with custom pomodoro targets
- Category tags: 💼 Work · 📚 Study · 🏃 Personal · 🎨 Creative · 🔧 Other
- Colored category badge on each task card
- Pomodoro dot progress tracker per task
- Link active task to timer — notification shows task name + progress

### 🚫 Website Blocking
- Blocks distracting sites **only during focus sessions**
- Fully customizable blocklist
- Beautiful blocked page with live countdown
- Distraction attempts logged to stats

### 📊 Statistics & Export
- Focus Score (0–100) with letter grade (S / A / B / C / D)
- Weekly bar chart + 28-day activity heatmap
- **This Week vs Last Week** comparison — pomodoros, focus hours, distractions, daily avg with ↑↓ trend arrows and % change
- Daily goal progress, current & longest streak
- Total pomodoros, focus hours, distractions, best day
- Task completion rate
- **Export CSV** — daily data + summary, downloads as `focusguard-stats.csv`
- **Export PDF** — clean report with summary cards + 28-day table via browser print

### 🎨 Dark / Light Mode
- Sun/Moon toggle in the header
- Full light theme (`--bg: #f5f5f5`, white cards, dark text)
- Theme preference saved to `chrome.storage.local`

### 🔔 Notifications
- Session complete notification with active task name and progress `(3/4)`
- Action buttons: **Start Break** after focus · **Start Focus** after break
- Clicking the button sends `START_TIMER` to the background

### 🏷️ Toolbar Badge
- Shows live countdown (`24m`, `23m` …) while popup is open
- Shows `⏸N` when paused
- Shows duration ready-to-start when idle
- Updates via popup's 500ms interval — no unreliable alarms

### ☁️ Cloud Sync (Firebase)
- Sign in with Google to sync tasks and stats across browsers
- Real-time sync on storage changes with debounce
- Merge-on-login resolves conflicts

### ⚙️ Settings
- Timer durations (focus / short break / long break)
- Sessions before long break
- Auto-start breaks & focus
- Daily pomodoro goal
- Sound on/off + volume
- Notifications on/off
- Blocked sites manager

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start / Pause timer |
| `R` | Reset timer |
| `S` | Skip to next session |
| `Alt+Shift+A` | Open FocusGuard from anywhere |

---

## 🏗️ Tech Stack

- **React 18** + **Vite 5** — UI & build
- **Tailwind CSS** — styling utilities
- **Recharts** — weekly bar chart
- **Lucide React** — icons
- **Firebase Auth + Firestore** — cloud sync
- **Chrome Extension MV3** — platform
- `chrome.storage.local` — local data persistence
- `chrome.alarms` — reliable background timer
- `chrome.webNavigation` — website interception
- `chrome.offscreen` — audio playback from service worker
- `chrome.notifications` — session complete alerts with action buttons

---

## 🗂️ Project Structure

```
focusguard/
├── public/
│   ├── manifest.json         # Chrome MV3 config + keyboard shortcut
│   └── icons/                # Extension icons
├── src/
│   ├── background/index.js   # Service worker (timer, blocking, notifications)
│   ├── offscreen/index.js    # Audio playback (Web Audio API)
│   ├── popup/
│   │   ├── App.jsx           # Main app, header, theme toggle, sync
│   │   ├── index.css         # Design system (CSS variables, dark + light)
│   │   └── components/
│   │       ├── Timer.jsx     # Pomodoro timer UI + badge updates
│   │       ├── Tasks.jsx     # Task manager with categories
│   │       ├── Stats.jsx     # Dashboard, heatmap, CSV/PDF export
│   │       ├── Settings.jsx  # All settings
│   │       └── Nav.jsx       # Bottom navigation (fixed)
│   ├── blocked/
│   │   └── BlockedPage.jsx   # Full-page block screen
│   └── utils/
│       ├── storage.js        # Shared helpers & defaults
│       ├── firebase.js       # Firebase init
│       └── sync.js           # Cloud push/merge logic
├── popup.html
├── blocked.html
├── offscreen.html            # Hidden page for audio
└── vite.config.js
```
