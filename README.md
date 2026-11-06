# To-Do Life Dashboard

A single-page personal productivity dashboard built with plain HTML5, CSS3, and vanilla JavaScript — no frameworks, no build step, no runtime dependencies.

## Features

- **Live clock & greeting** — Displays the current time (HH:MM:SS), date, and a time-sensitive greeting ("Good Morning / Afternoon / Evening / Night, [Your Name]").
- **Focus Timer** — A 25-minute (Pomodoro-style) countdown with Start, Stop, and Reset controls.
- **To-Do List** — Add, edit, complete, and delete tasks. Progress is tracked with a live counter.
- **Quick Links** — Save up to 20 website shortcuts that open in a new tab. Three defaults are seeded on first load (Google, Gmail, Google Calendar).
- **Light / Dark Theme** — Toggle between light and dark modes; preference is persisted and applied before first paint to prevent a flash.
- **LocalStorage persistence** — All tasks, shortcuts, user name, and theme preference survive page reloads.

## File Structure

```
Kiro/
├── index.html          # Single HTML file — full semantic shell
├── css/
│   └── style.css       # All styles; CSS variables drive theming
├── js/
│   └── script.js       # All application logic; zero external imports
├── tests/
│   ├── validation.test.js   # ValidationService unit + property tests
│   ├── storage.test.js      # StorageService unit tests
│   ├── clock.test.js        # ClockController greeting tests
│   ├── timer.test.js        # TimerController state-machine tests
│   ├── tasks.test.js        # TaskController CRUD tests
│   └── quicklinks.test.js   # QuickLinksController tests
├── package.json        # Dev dependencies only (vitest, fast-check)
└── README.md           # This file
```

> **Important:** `package.json`, `node_modules/`, and the `tests/` directory are development tooling only. The app deliverables are `index.html`, `css/style.css`, and `js/script.js`.

## How to Run

No build step is required. Open `index.html` directly in any modern browser:

```
# Option 1 — file:// protocol (simplest)
Open index.html in Chrome, Firefox, Edge, or Safari.

# Option 2 — local HTTP server (recommended to avoid any file:// restrictions)
npx serve .
# Then open http://localhost:3000
```

## How to Test

The automated test suite uses [Vitest](https://vitest.dev/) for unit tests and [fast-check](https://fast-check.io/) for property-based tests. These are **dev dependencies only** and are never bundled into the app.

### Install dependencies

```bash
npm install
```

### Run all tests

```bash
npm test
```

This runs `vitest --run`, which executes every `*.test.js` file in the `tests/` directory and exits with a non-zero code if any test fails.

## Browser Support

| Browser       | Minimum version |
|---------------|-----------------|
| Google Chrome | Latest stable   |
| Mozilla Firefox | Latest stable |
| Microsoft Edge | Latest stable  |
| Safari        | Latest stable   |

## Architecture Notes

- All application state lives in `localStorage` (keys: `tld_tasks`, `tld_shortcuts`, `tld_settings`).
- JavaScript is structured as plain object literals (`StorageService`, `ValidationService`, `ClockController`, `TimerController`, `TaskController`, `QuickLinksController`, `App`) scoped to the file — no globals are leaked onto `window`.
- DOM manipulation uses only `createElement`, `textContent`, and `setAttribute` — never `innerHTML` or `document.write` — to prevent XSS from user-supplied content.
- Event handling uses `addEventListener` exclusively.
- The inline `<script>` in `<head>` is the only code that runs before `DOMContentLoaded`; its sole purpose is theme-flash prevention.
