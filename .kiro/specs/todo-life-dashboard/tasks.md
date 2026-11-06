# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a single-page productivity dashboard as three plain files (`index.html`, `css/style.css`, `js/script.js`) plus a `README.md`, with zero runtime dependencies. The implementation follows the controller-per-feature architecture defined in the design: `StorageService`, `ValidationService`, and five feature controllers bootstrapped by a top-level `App.init()`. All automated tests live in a `tests/` directory using Vitest and fast-check as dev-only dependencies (not bundled into the app).

## Tasks

- [x] 1. Scaffold project structure and set up testing framework
  - Create `index.html` with the full semantic HTML shell: `<html data-theme="light">`, `<head>` with inline theme-flash-prevention `<script>`, `<link>` to `css/style.css`, and `<script defer src="js/script.js">`, plus all landmark elements (`<header>`, `<main>`, `<section>`, `<article>`) with the IDs specified in the design (`#dashboard-container`, `#header-card`, `#main-grid`, `#left-column`, `#right-column`, `#timer-card`, `#quicklinks-card`, `#tasks-card`)
  - Create `css/style.css` as an empty file with a `:root {}` block placeholder and a `[data-theme="dark"] {}` block placeholder
  - Create `js/script.js` as an empty file with a top-level `document.addEventListener('DOMContentLoaded', () => App.init())` stub
  - Create `README.md` describing project purpose, file structure, and how to run / test
  - Run `npm init -y` and install dev dependencies: `vitest@^1.6.0`, `fast-check@^3.19.0`; add `"test": "vitest --run"` to `package.json` scripts
  - Create `tests/` directory with a `.gitkeep` placeholder
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2_

- [x] 2. Implement CSS custom properties, layout, and visual design
  - [x] 2.1 Define all CSS custom properties and base styles
    - Declare all color tokens (gradient, card background, text primary/secondary, accent) and spacing tokens (`--gap-card`, `--gap-inner`, `--radius-card`) in `:root`; add `[data-theme="dark"]` overrides for every color token; use only `var()` references outside `:root` — no hard-coded color or spacing literals
    - Set `body` background to `linear-gradient(135deg, var(--color-bg-gradient-start), var(--color-bg-gradient-end))`
    - Style `#dashboard-container` as a centred wrapper with `max-width` and auto horizontal margins
    - _Requirements: 1.5, 8.5, 9.1, 9.2_

  - [x] 2.2 Implement responsive two-column grid and card styles
    - Style `#main-grid` with `display: grid; grid-template-columns: 1fr 2fr; gap: var(--gap-card)`
    - Add `@media (max-width: 767px)` rule that sets `grid-template-columns: 1fr` so all cards stack vertically
    - Style each card (`#header-card`, `#timer-card`, `#quicklinks-card`, `#tasks-card`) with `background: var(--color-card-bg)`, `border-radius: var(--radius-card)` (≥ 4 px), and a `box-shadow`
    - Ensure uniform card gap ≥ 16 px, body font ≥ 14 px, and at least two visually distinct heading levels
    - _Requirements: 9.2, 9.3, 9.5, 9.6, 9.7_

  - [x] 2.3 Style interactive controls for accessibility
    - Set minimum `min-height` and `min-width` of 44 px on all `<button>` and `<input>` elements
    - Ensure visible `:focus` outlines on all focusable elements
    - _Requirements: 9.8, 10.6_

- [x] 3. Implement `StorageService` and `ValidationService`
  - [x] 3.1 Implement `StorageService`
    - Write `StorageService.load(key, defaultValue)`: wraps `JSON.parse(localStorage.getItem(key))` in `try/catch`; returns `defaultValue` on `null`, `SyntaxError`, or `SecurityError`
    - Write `StorageService.save(key, value)`: wraps `JSON.stringify` + `localStorage.setItem` in `try/catch`; swallows `QuotaExceededError` silently
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Implement `ValidationService`
    - Write `validateTaskName(name, existingTasks, excludeId?)`: trim input; reject if empty/whitespace-only or length > 200; reject on case-insensitive duplicate against `existingTasks` (skipping `excludeId`); return `{ valid: boolean, error: string }`
    - Write `validateLinkName(name)`: 1–50 chars, Unicode letters/digits/spaces/hyphens/underscores only; return `{ valid, error }`
    - Write `validateUrl(url)`: must begin with `http://` or `https://`, have a hostname, contain no unencoded whitespace; return `{ valid, error }`
    - Write `validateUserName(name)`: non-empty, non-whitespace-only, 1–50 chars; return `{ valid, error }`
    - All functions are pure — they never touch the DOM; add code comments explaining every regex used
    - _Requirements: 1.7, 6.3, 6.4, 6.5, 7.5, 7.6, 10.3, 10.4, 10.5_

  - [ ]* 3.3 Write property-based tests for `ValidationService`
    - **Property 1: Task name validation rejects all invalid inputs** — generate empty strings, whitespace-only strings, and strings > 200 chars; assert `valid === false`
    - **Property 2: Task name validation accepts all valid inputs** — generate strings 1–200 chars with at least one non-whitespace char; assert `valid === true`
    - **Property 3: Case-insensitive duplicate detection** — generate a valid task name, build a single-item task list, assert that the same name in uppercase, lowercase, and mixed case all return `valid === false`
    - **Property 7: URL validation accepts only http/https** — generate strings not starting with `http://` or `https://`; assert `valid === false`
    - **Property 8: URL validation accepts all well-formed http/https URLs** — generate well-formed `http(s)://hostname` strings; assert `valid === true`
    - **Validates: Requirements 6.3, 6.4, 6.5, 7.5, 10.3, 10.4**
    - _File: `tests/validation.test.js`_

  - [ ]* 3.4 Write unit tests for `StorageService`
    - Test `load` with missing key returns default, corrupt JSON returns default, valid JSON round-trips correctly
    - Mock `localStorage` using a simple in-memory object
    - _File: `tests/storage.test.js`_
    - _Requirements: 2.3, 2.4_

- [x] 4. Checkpoint — run all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `ClockController` (greeting, clock, date, user name)
  - [x] 5.1 Add clock/greeting HTML elements to `index.html`
    - Inside `#header-card`: add `<div id="clock-display">`, `<div id="date-display">`, `<p id="greeting-display">`, a `<div id="username-form">` containing `<input id="username-input" maxlength="50" aria-label="Your name">` and `<button id="username-confirm-btn">Set Name</button>`, and `<button id="theme-toggle-btn" aria-label="Toggle theme">` — all using `textContent`/`setAttribute` only; no `innerHTML`
    - _Requirements: 4.1, 4.2, 4.8, 8.1_

  - [x] 5.2 Implement `ClockController`
    - `init()`: reads `tld_settings` from `StorageService`; sets `this.userName`; calls `tick()` immediately; starts `setInterval(this.tick.bind(this), 1000)`
    - `tick()`: updates `#clock-display` (HH:MM:SS), `#date-display` ("WEEKDAY, D MONTH YYYY"), and calls `renderGreeting()`
    - `renderGreeting()`: maps current hour to one of four greeting strings ("Good Morning/Afternoon/Evening/Night, [userName]"); updates `#greeting-display` via `textContent`; uses "User" if `userName` is empty
    - `handleUserNameConfirm()`: calls `validateUserName`; on valid non-empty input saves to `tld_settings` in `StorageService`, updates `this.userName`, calls `renderGreeting()`; on empty/whitespace retains current name silently
    - Attaches click listener to `#username-confirm-btn` and keydown Enter listener to `#username-input` — both using `addEventListener`
    - _Requirements: 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [ ]* 5.3 Write unit tests for `ClockController.renderGreeting`
    - Test all four greeting bands at boundary hours: 5, 11, 12, 17, 18, 20, 21, 0, 4
    - _File: `tests/clock.test.js`_
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.4 Write property-based test for greeting coverage
    - **Property 9: Time-based greeting is total and non-overlapping** — generate integers 0–23; assert exactly one greeting condition matches
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
    - _File: `tests/clock.test.js`_

- [x] 6. Implement `ThemeController` (light/dark toggle)
  - [x] 6.1 Add inline theme-flash-prevention script to `index.html`
    - In `<head>`, before the `<link>` tag, add an inline `<script>` that reads `tld_settings` from `localStorage`, parses the JSON, and sets `document.documentElement.setAttribute('data-theme', ...)` synchronously; fall back to `'light'` on any error
    - _Requirements: 8.7_

  - [x] 6.2 Implement `ThemeController`
    - `init()`: reads saved theme from `tld_settings` via `StorageService`; if none, reads `window.matchMedia('(prefers-color-scheme: dark)')` to determine default; applies theme by setting `data-theme` on `<html>`; attaches click listener to `#theme-toggle-btn`
    - `toggle()`: reads current `data-theme`, flips it, sets `data-theme` on `<html>`, saves updated `tld_settings` to `StorageService`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ]* 6.3 Write unit tests for `ThemeController`
    - Test that `toggle()` switches `'light'` → `'dark'` and `'dark'` → `'light'`
    - Test that `init()` falls back to `'light'` when `localStorage` is empty and OS preference is not dark
    - _File: `tests/theme.test.js`_
    - _Requirements: 8.2, 8.8_

- [x] 7. Implement `TimerController` (focus countdown)
  - [x] 7.1 Add timer HTML elements to `index.html`
    - Inside `#timer-card`: add `<div id="timer-display">25:00</div>`, a `<div id="timer-controls">` with `<button id="timer-start-btn">Start</button>`, `<button id="timer-stop-btn">Stop</button>`, `<button id="timer-reset-btn">Reset</button>`, and `<div id="timer-banner" hidden>Session complete!</div>`
    - _Requirements: 5.1, 5.7_

  - [x] 7.2 Implement `TimerController`
    - `init()`: sets `this.remainingSeconds = 1500`, `this.intervalId = null`; calls `render()`; attaches click listeners (via `addEventListener`) to the three buttons
    - `start()`: no-op if `this.intervalId !== null`; else `this.intervalId = setInterval(this.tick.bind(this), 1000)`
    - `stop()`: calls `clearInterval(this.intervalId)`; sets `this.intervalId = null`; calls `render()`
    - `reset()`: calls `stop()`; sets `this.remainingSeconds = 1500`; hides `#timer-banner` (sets `hidden = true`); calls `render()`
    - `tick()`: if `this.remainingSeconds > 0` decrements by 1; if now 0 calls `stop()` and shows `#timer-banner` (removes `hidden`); calls `render()`
    - `render()`: formats `this.remainingSeconds` as MM:SS; updates `#timer-display` via `textContent`
    - _Requirements: 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 7.3 Write unit tests for `TimerController` state machine
    - Test: start from idle starts interval; start while running is a no-op (idempotence); stop clears interval; reset restores 1500 and hides banner; tick decrements; tick at 0 stays at 0 and shows banner
    - _File: `tests/timer.test.js`_
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 7.4 Write property-based tests for `TimerController`
    - **Property 10: Timer never goes below zero** — generate start value 0–1500 and tick count 0–2000; simulate tick loop; assert `remainingSeconds >= 0`
    - **Property 11: Timer start is idempotent while running** — start timer, call `start()` N more times (N generated 1–100); assert `intervalId` is unchanged
    - **Validates: Requirements 5.6, 5.7, 5.8**
    - _File: `tests/timer.test.js`_

- [x] 8. Checkpoint — run all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `TaskController` (to-do list CRUD)
  - [x] 9.1 Add task list HTML elements to `index.html`
    - Inside `#tasks-card`: add `<div id="task-form">` containing `<input id="task-input" maxlength="200" aria-label="New task name">` and `<button id="add-task-btn">Add</button>`, `<p id="task-add-error"></p>`, `<p id="progress-indicator"></p>`, and `<ul id="task-list"></ul>`
    - _Requirements: 6.1, 6.11_

  - [x] 9.2 Implement `TaskController` — core CRUD
    - `init()`: loads `tld_tasks` array from `StorageService`; calls `render()` and `renderProgress()`; attaches click listener to `#add-task-btn` and keydown Enter listener to `#task-input`
    - `addTask(name)`: calls `validateTaskName`; on error sets `#task-add-error` via `textContent`; on valid creates `{ id: crypto.randomUUID(), name: trimmed, completed: false, createdAt: Date.now() }`, pushes to array, calls `StorageService.save('tld_tasks', this.tasks)`, calls `render()` and `renderProgress()`; clears input and error
    - `toggleTask(id)`: flips `task.completed`, saves, calls `render()` and `renderProgress()`
    - `deleteTask(id)`: splices task from array, saves, calls `render()` and `renderProgress()`
    - `render()`: clears `#task-list`; for each task creates `<li>` with `<input type="checkbox">`, `<span>` for name (strikethrough if completed via CSS class), `<button>Edit</button>`, `<button>Delete</button>` — all via `createElement`/`setAttribute`/`textContent`; attaches event listeners
    - `renderProgress()`: counts completed tasks; updates `#progress-indicator` via `textContent` as `"${completed} of ${total} tasks completed"`
    - _Requirements: 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.6, 6.10, 6.11, 6.12, 6.13_

  - [x] 9.3 Implement `TaskController` — inline edit flow
    - `beginEdit(id)`: replaces the task's display `<li>` content with `<input>` pre-filled with current name, `<button>Confirm</button>`, `<button>Cancel</button>` — all via `createElement`; attaches listeners for confirm and cancel
    - `confirmEdit(id, newName)`: calls `validateTaskName(newName, this.tasks, id)`; on error shows error inline next to edit input via `textContent`; on valid mutates `task.name`, saves, calls `render()` and `renderProgress()`
    - `cancelEdit(id)`: calls `render()` (rebuilds list without mutating state)
    - _Requirements: 6.7, 6.8, 6.9, 6.14_

  - [ ]* 9.4 Write unit tests for `TaskController`
    - Test `addTask` with empty name (rejected), whitespace-only (rejected), >200 chars (rejected), duplicate (rejected), valid (added)
    - Test `toggleTask` flips `completed` flag
    - Test `deleteTask` removes item from array
    - Test `confirmEdit` with duplicate name (rejected), valid new name (accepted)
    - Test `cancelEdit` does not mutate task
    - _File: `tests/tasks.test.js`_
    - _Requirements: 6.2, 6.3, 6.5, 6.7, 6.8, 6.9, 6.14_

  - [ ]* 9.5 Write property-based test for progress indicator
    - **Property 12: Progress indicator accuracy** — generate array of tasks with random `completed` booleans; assert `renderProgress` returns `"${completed} of ${total} tasks completed"` exactly
    - **Validates: Requirements 6.11, 6.12**
    - _File: `tests/tasks.test.js`_

  - [ ]* 9.6 Write property-based tests for task serialization
    - **Property 5: Task list serialization round-trip** — generate arrays of valid `Task` objects; assert `JSON.parse(JSON.stringify(tasks))` deeply equals original
    - **Validates: Requirements 2.1, 2.5, 6.13**
    - _File: `tests/tasks.test.js`_

- [x] 10. Implement `QuickLinksController` (shortcuts panel)
  - [x] 10.1 Add quick links HTML elements to `index.html`
    - Inside `#quicklinks-card`: add `<ul id="quicklinks-list"></ul>`, a `<div id="quicklinks-form">` containing `<input id="link-name-input" aria-label="Link name">`, `<input id="link-url-input" aria-label="Link URL">`, `<button id="add-link-btn">Add Shortcut</button>`, and `<p id="link-error"></p>`
    - _Requirements: 7.1, 7.5, 7.6_

  - [x] 10.2 Implement `QuickLinksController`
    - `init()`: loads `tld_shortcuts` from `StorageService`; if empty, seeds `[{Google, https://www.google.com}, {Gmail, https://mail.google.com}, {Google Calendar, https://calendar.google.com}]` and saves; calls `render()`; attaches click listener to `#add-link-btn`
    - `addLink(name, url)`: validates `name` with `validateLinkName` and `url` with `validateUrl`; if total shortcuts ≥ 20 shows cap error in `#link-error`; on valid creates `{ id: crypto.randomUUID(), name, url }`, pushes, saves `tld_shortcuts`, calls `render()`; clears error
    - `removeLink(id)`: splices shortcut, saves, calls `render()`
    - `render()`: clears `#quicklinks-list`; for each shortcut creates `<li>` with an `<a>` (using `setAttribute('href', url)`, `setAttribute('target', '_blank')`, `setAttribute('rel', 'noopener noreferrer')`), a `<span>` for name, and `<button>Remove</button>` — all via `createElement`; attaches remove listener; attaches `input` listener to `#link-url-input` that clears `#link-error`
    - _Requirements: 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 10.3 Write unit tests for `QuickLinksController`
    - Test default seeding when storage is empty
    - Test `addLink` with invalid URL (rejected with error), empty name (rejected), valid link (added), 20-cap enforcement
    - Test `removeLink` removes item including default shortcuts
    - _File: `tests/quicklinks.test.js`_
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.9_

  - [ ]* 10.4 Write property-based test for shortcut serialization
    - **Property 6: Shortcut list serialization round-trip** — generate arrays of valid `Shortcut` objects; assert `JSON.parse(JSON.stringify(shortcuts))` deeply equals original
    - **Validates: Requirements 2.1, 2.5, 7.8**
    - _File: `tests/quicklinks.test.js`_

- [x] 11. Checkpoint — run all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Wire all controllers together in `App.init()` and finalize `index.html`
  - [x] 12.1 Implement `App.init()` and bootstrap sequence
    - Write top-level `App` object with `init()` that calls controllers in this order: `ThemeController.init()`, `ClockController.init()`, `TimerController.init()`, `TaskController.init()`, `QuickLinksController.init()`
    - Attach the entire `App.init()` call to `document.addEventListener('DOMContentLoaded', App.init.bind(App))` — the only global event listener in the file
    - Ensure no unnecessary global variables are exposed; wrap all controller objects as `const` declarations at module scope (not `window.*`)
    - _Requirements: 1.6, 10.1, 10.2_

  - [x] 12.2 Verify `index.html` semantic structure and security hygiene
    - Audit `index.html`: confirm every major region uses a semantic element (`<header>`, `<main>`, `<section>`, `<article>`) and no `<div>`/`<span>` is used as a structural substitute
    - Confirm the file contains zero `innerHTML`, `outerHTML`, or `document.write` calls
    - Confirm all icon-only buttons have `aria-label` attributes
    - Confirm no external `<script>` or `<link>` tags reference CDN resources
    - _Requirements: 1.1, 1.3, 1.4, 1.7, 9.9, 10.6_

  - [ ]* 12.3 Write property-based tests for settings serialization
    - **Property 4: Settings serialization round-trip** — generate valid `Settings` objects `{ theme: 'light'|'dark', userName: string }`; assert `JSON.parse(JSON.stringify(settings))` deeply equals original
    - **Validates: Requirements 2.1, 2.5**
    - _File: `tests/storage.test.js`_

- [x] 13. Final checkpoint — run full test suite and verify output files
  - Run `npm test` (which executes `vitest --run`) and confirm all tests pass
  - Confirm the only deliverable files are `index.html`, `css/style.css`, `js/script.js`, and `README.md` (plus `tests/` for dev testing, `package.json` and `node_modules/` for tooling — not app deliverables)
  - Confirm `js/script.js` loads no external scripts and `css/style.css` contains no `@import` of external resources
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 4, 8, 11, and 13 ensure incremental validation
- Property tests validate universal correctness properties from the design's Correctness Properties section (Properties 1–12)
- Unit tests validate specific examples and edge cases
- Vitest and fast-check are dev dependencies only — they are never imported or bundled into `index.html` / `js/script.js`
- The inline theme script in `<head>` (task 6.1) is the only exception to the "one JS file" rule — it is a synchronous inline block, not a separate file

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.1", "6.1", "7.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "7.2", "9.2", "10.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "6.3", "7.3", "7.4", "9.3", "10.3", "10.4"] },
    { "id": 6, "tasks": ["9.4", "9.5", "9.6", "12.1"] },
    { "id": 7, "tasks": ["12.2", "12.3"] }
  ]
}
```
