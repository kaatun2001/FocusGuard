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

## ✨ What's New in v2

| Feature | Details |
|---|---|
| 🔔 Sound alerts | Real chime tones on session completion (Web Audio API) |
| ⚡ Auto-start | Optionally auto-advance breaks and focus sessions |
| ⌨️ Keyboard shortcuts | **Space** = play/pause · **R** = reset · **S** = skip |
| 🏳️ Task priority | Low / Medium / High with color-coded flags |
| 📅 28-day heatmap | GitHub-style activity calendar |
| 🎯 Daily goal | Set a daily pomodoro target with live progress |
| 📊 Focus Score | Arc gauge with letter grade (S / A / B / C / D) |
| 🔥 Longest streak | Tracks your all-time best focus streak |
| 🏅 Best day | Shows your most productive single day |
| 🕒 Badge countdown | Toolbar badge shows minutes remaining (e.g. "23m") |
| 🌬️ Blocked page | Includes a breathing exercise + motivational quote |
| 🔇 Volume slider | Fine-tune the chime volume |

---

## 🧩 Features

### ⏱️ Pomodoro Timer
- 25-min focus sessions (fully customizable)
- Short & long breaks with automatic session counting
- Pause / Resume / Skip / Reset
- Glowing ring animation while running

### ✅ Task Manager
- Add tasks with custom pomodoro targets
- Priority levels: Low / Medium / High
- Filter tasks by priority
- Pomodoro dot tracker per task
- Link active task to timer session

### 🚫 Website Blocking
- Blocks distracting sites **only during focus sessions**
- Fully customizable blocklist
- Beautiful blocked page with live countdown
- Distraction attempts logged to stats

### 📊 Statistics
- Focus Score (0–100) with letter grade
- Weekly bar chart
- 28-day activity heatmap
- Daily goal progress
- Current & longest streak
- Total pomodoros, focus hours, distractions
- Best day tracking
- Task completion rate

### ⚙️ Settings
- Timer durations (focus / short break / long break)
- Sessions before long break
- Auto-start breaks & focus
- Daily pomodoro goal
- Sound on/off + volume
- Notifications on/off
- Blocked sites manager

---

## 🏗️ Tech Stack

- **React 18** + **Vite 5** — UI & build
- **Tailwind CSS** — styling
- **Recharts** — weekly bar chart
- **Lucide React** — icons
- **Chrome Extension MV3** — platform
- **chrome.storage.local** — data (no login needed)
- **chrome.alarms** — reliable background timer
- **chrome.webNavigation** — website interception
- **chrome.offscreen** — audio playback from service worker
- **Web Audio API** — programmatic chime sounds

---

## ⌨️ Keyboard Shortcuts (in popup)

| Key | Action |
|---|---|
| `Space` | Start / Pause timer |
| `R` | Reset timer |
| `S` | Skip to next session |

---

## 🗂️ Project Structure

```
focusguard/
├── public/
│   ├── manifest.json         # Chrome MV3 config
│   └── icons/                # Extension icons
├── src/
│   ├── background/index.js   # Service worker (timer + blocking)
│   ├── offscreen/index.js    # Audio playback (Web Audio API)
│   ├── popup/
│   │   ├── App.jsx           # Main app + daily goal header
│   │   ├── index.css         # Design system (CSS variables)
│   │   └── components/
│   │       ├── Timer.jsx     # Pomodoro timer UI
│   │       ├── Tasks.jsx     # Task manager
│   │       ├── Stats.jsx     # Dashboard + heatmap
│   │       ├── Settings.jsx  # All settings
│   │       └── Nav.jsx       # Bottom navigation
│   ├── blocked/
│   │   └── BlockedPage.jsx   # Full-page block screen
│   └── utils/storage.js      # Shared helpers & defaults
├── popup.html
├── blocked.html
├── offscreen.html            # Hidden page for audio
└── vite.config.js
```

---

## 🔮 Future Improvements

- 🤖 AI productivity insights
- ☁️ Cloud sync (Firebase)
- 📱 Cross-device tracking
- 🎵 Ambient focus sounds
- 🏆 Achievement badges
- 📤 Export stats as CSV
