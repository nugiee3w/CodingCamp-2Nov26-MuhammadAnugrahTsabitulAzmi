# Design Document

## Overview

The To-Do Life Dashboard is a single-page web application (SPA) delivered as three plain files — `index.html`, `css/style.css`, and `js/script.js` — with zero runtime dependencies. All application state lives in the browser's `localStorage` and is managed by a thin, module-like vanilla-JS architecture that groups related logic into clearly scoped objects. The visual shell is a purple-to-blue gradient page housing white rounded cards arranged in a responsive two-column grid that collapses to a single column below 768 px.

The design follows a deliberate constraint: everything must be expressible without a build step, a bundler, or a framework. This shapes every decision below — component boundaries are enforced by convention and file structure rather than by module graphs; reactivity is achieved by explicit re-render functions rather than a virtual DOM; and security is enforced by constructor-based DOM APIs rather than template strings.

---

## Architecture

The application is structured as a **controller-per-feature** pattern inside a single `js/script.js` file. Each feature area (Clock/Greeting, Timer, Tasks, QuickLinks, Theme) owns a self-contained object literal (`ClockController`, `TimerController`, `TaskController`, `QuickLinksController`, `ThemeController`) that exposes `init()`, event-handler methods, and a `render()` method. A top-level `App.init()` function bootstraps all controllers in dependency order after the DOM is ready.

```
index.html
│
├── css/style.css          (all styles, CSS variables in :root)
│
└── js/script.js
    ├── StorageService      (localStorage read/write + fallback)
    ├── ValidationService   (pure validation functions)
    ├── ClockController     (clock tick, greeting, userName)
    ├── TimerController     (countdown state machine)
    ├── TaskController      (CRUD + progress indicator)
    ├── QuickLinksController(shortcuts CRUD)
    ├── ThemeController     (light/dark toggle)
    └── App                 (bootstrap, wires controllers)
```

### Data Flow

```
User Action
    │
    ▼
DOM Event Listener (addEventListener only)
    │
    ▼
Controller handler method
    │
    ├─► ValidationService.validate*(input) ─► error display / early return
    │
    ├─► mutate in-memory state (controller's local array / object)
    │
    ├─► StorageService.save(key, value)    ─► localStorage (synchronous)
    │
    └─► controller.render()               ─► DOM update (textContent / createElement)
```

All reads from `localStorage` happen once at startup inside `StorageService.load()`; every subsequent read is from in-memory state. All writes are synchronous `localStorage.setItem()` calls that happen in the same execution frame as the state mutation.

### Interval / Timer Safety

`TimerController` tracks a single `intervalId` field. `start()` is a no-op when `intervalId !== null`, preventing double-intervals. `stop()` calls `clearInterval` and sets `intervalId = null`. `reset()` calls `stop()` then restores state.

### Theme-Flash Prevention

`ThemeController.applyEarly()` is a tiny inline `<script>` block placed in `<head>` **before** the `<link>` for `style.css`. It reads the saved theme key from `localStorage` and sets a `data-theme` attribute on `<html>` synchronously so CSS variables are correct before the first paint.

---

## Components and Interfaces

### HTML Structure

```
<html data-theme="light|dark">
  <head>
    <script>/* theme-flash-prevention inline */</script>
    <link rel="stylesheet" href="css/style.css">
  </head>
  <body>
    <div id="dashboard-container">
      <header id="header-card">
        <div id="clock-display">        <!-- HH:MM:SS -->
        <div id="date-display">         <!-- WEEKDAY, D MONTH YYYY -->
        <p  id="greeting-display">      <!-- "Good Morning, Alex" -->
        <div id="username-form">
          <input id="username-input" maxlength="50">
          <button id="username-confirm-btn">
      <button id="theme-toggle-btn" aria-label="Toggle theme">

      <main id="main-grid">
        <section id="left-column">
          <article id="timer-card">
            <div id="timer-display">    <!-- MM:SS -->
            <div id="timer-controls">
              <button id="timer-start-btn">
              <button id="timer-stop-btn">
              <button id="timer-reset-btn">
            <div id="timer-banner" hidden>  <!-- session-complete -->

          <article id="quicklinks-card">
            <ul id="quicklinks-list">
              <!-- <li> per shortcut -->
            <div id="quicklinks-form">
              <input id="link-name-input">
              <input id="link-url-input">
              <button id="add-link-btn">
            <p id="link-error">          <!-- inline error -->

        <section id="right-column">
          <article id="tasks-card">
            <div id="task-form">
              <input id="task-input" maxlength="200">
              <button id="add-task-btn">
            <p id="task-add-error">      <!-- inline error -->
            <p id="progress-indicator">  <!-- "X of Y tasks completed" -->
            <ul id="task-list">
              <!-- <li> per task -->
    </div>
  </body>
</html>
```

### JavaScript Controller Interfaces

#### `StorageService`

| Method | Signature | Notes |
|---|---|---|
| `load(key, defaultValue)` | `(string, any) → any` | Returns parsed JSON or `defaultValue` on missing / corrupt key |
| `save(key, value)` | `(string, any) → void` | `JSON.stringify` + `setItem`; swallows `QuotaExceededError` gracefully |

#### `ValidationService`

| Method | Signature | Notes |
|---|---|---|
| `validateTaskName(name, existingTasks, excludeId?)` | `(string, Task[], string?) → {valid, error}` | Trims, checks length 1–200, case-insensitive duplicate check |
| `validateLinkName(name)` | `(string) → {valid, error}` | 1–50 chars, allowed characters |
| `validateUrl(url)` | `(string) → {valid, error}` | Must start with `http://` or `https://`, valid hostname, no unencoded whitespace |
| `validateUserName(name)` | `(string) → {valid, error}` | 1–50 chars, non-whitespace-only |

All validation functions are **pure** — they receive data and return a result object; they never touch the DOM.

#### `ClockController`

| Method | Description |
|---|---|
| `init()` | Reads saved userName from storage, starts `setInterval` tick every 1 000 ms |
| `tick()` | Updates `#clock-display`, `#date-display`, and `#greeting-display` |
| `renderGreeting()` | Chooses greeting string based on current hour |
| `handleUserNameConfirm()` | Validates input, saves, re-renders greeting |

#### `TimerController`

| Method | Description |
|---|---|
| `init()` | Sets `remainingSeconds = 1500`, `intervalId = null`, renders |
| `start()` | No-op if `intervalId !== null`; else starts interval |
| `stop()` | `clearInterval`, `intervalId = null`, renders |
| `reset()` | Calls `stop()`, restores `remainingSeconds = 1500`, hides banner, renders |
| `tick()` | Decrements `remainingSeconds`; at 0 calls `stop()`, shows banner |
| `render()` | Formats MM:SS, updates `#timer-display` |

#### `TaskController`

| Method | Description |
|---|---|
| `init()` | Loads tasks from storage, renders list and progress |
| `addTask(name)` | Validates, creates Task object, saves, renders |
| `toggleTask(id)` | Flips `completed`, saves, renders |
| `beginEdit(id)` | Swaps display row for edit row |
| `confirmEdit(id, newName)` | Validates, mutates, saves, renders |
| `cancelEdit(id)` | Restores display row |
| `deleteTask(id)` | Removes from array, saves, renders |
| `render()` | Rebuilds `#task-list` via `createElement`, updates progress |

#### `QuickLinksController`

| Method | Description |
|---|---|
| `init()` | Loads shortcuts; if none, seeds defaults, renders |
| `addLink(name, url)` | Validates, checks 20-cap, saves, renders |
| `removeLink(id)` | Removes, saves, renders |
| `render()` | Rebuilds `#quicklinks-list` via `createElement` |

#### `ThemeController`

| Method | Description |
|---|---|
| `applyEarly()` | Inline `<script>` in `<head>` — reads `localStorage` key, sets `data-theme` on `<html>` |
| `init()` | Reads saved theme or OS preference, attaches toggle listener |
| `toggle()` | Flips `data-theme`, saves to `localStorage` |

### CSS Architecture

All color and spacing tokens are declared as custom properties on `:root` and overridden by `[data-theme="dark"]`. Layout uses CSS Grid for the two-column main area and Flexbox for card internals. No styles are generated via JavaScript; JS only changes the `data-theme` attribute.

```css
:root {
  /* spacing */
  --gap-card: 20px;
  --gap-inner: 12px;
  --radius-card: 12px;
  /* light theme colors */
  --color-bg-gradient-start: #7c3aed;
  --color-bg-gradient-end:   #3b82f6;
  --color-card-bg:           #ffffff;
  --color-text-primary:      #1e1e2e;
  --color-text-secondary:    #6b7280;
  --color-accent:            #7c3aed;
  /* ...additional tokens */
}

[data-theme="dark"] {
  --color-card-bg:      #1e1e2e;
  --color-text-primary: #e2e8f0;
  /* ...overrides */
}

#main-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;  /* left:right ratio */
  gap: var(--gap-card);
}

@media (max-width: 767px) {
  #main-grid { grid-template-columns: 1fr; }
}
```

---

## Data Models

All models are plain JavaScript objects serialized to / from JSON via `JSON.stringify` / `JSON.parse`.

### `Task`

```js
{
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  name:      string,   // trimmed, 1–200 chars
  completed: boolean,  // toggled by checkbox
  createdAt: number    // Date.now() timestamp (ms)
}
```

### `Shortcut`

```js
{
  id:   string,  // crypto.randomUUID() or Date.now().toString()
  name: string,  // 1–50 chars, display label
  url:  string   // 1–2048 chars, must start with http:// or https://
}
```

### `Settings`

```js
{
  theme:    "light" | "dark",  // active theme
  userName: string             // display name, default ""
}
```

### `localStorage` Keys

| Key | Type | Default |
|---|---|---|
| `tld_tasks` | `Task[]` | `[]` |
| `tld_shortcuts` | `Shortcut[]` | `[]` (seeded to defaults on first load) |
| `tld_settings` | `Settings` | `{ theme: "light", userName: "" }` |

> `userName` and `theme` are stored inside a single `tld_settings` object to minimize the number of `localStorage` keys and to make atomic updates simpler.

### Timer State (in-memory only)

The timer state is intentionally **not** persisted to `localStorage`. The focus timer resets to 25:00 on each page load, which is the correct behavior for a session-based tool.

```js
{
  remainingSeconds: number,  // 0–1500
  intervalId:       number | null
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task name validation rejects all invalid inputs

*For any* string that is empty, consists entirely of whitespace, or exceeds 200 characters after trimming, `ValidationService.validateTaskName` SHALL return `{ valid: false }`.

**Validates: Requirements 6.3, 6.4**

### Property 2: Task name validation accepts all valid inputs

*For any* string of 1–200 non-whitespace-only characters, `ValidationService.validateTaskName` (given an empty existing task list) SHALL return `{ valid: true }`.

**Validates: Requirements 6.2, 6.4**

### Property 3: Case-insensitive duplicate detection

*For any* existing task list containing a task with name N, and *for any* string S such that `S.trim().toLowerCase() === N.trim().toLowerCase()`, `ValidationService.validateTaskName(S, existingTasks)` SHALL return `{ valid: false }`.

**Validates: Requirements 6.5, 6.9**

### Property 4: Settings serialization round-trip

*For any* valid `Settings` object, serializing it with `JSON.stringify` and deserializing it with `JSON.parse` SHALL produce an object deeply equal to the original.

**Validates: Requirements 2.1, 2.5**

### Property 5: Task list serialization round-trip

*For any* array of valid `Task` objects, serializing it with `JSON.stringify` and deserializing it with `JSON.parse` SHALL produce an array deeply equal to the original, preserving each task's `id`, `name`, `completed`, and `createdAt` fields.

**Validates: Requirements 2.1, 2.5, 6.13**

### Property 6: Shortcut list serialization round-trip

*For any* array of valid `Shortcut` objects, serializing it with `JSON.stringify` and deserializing it with `JSON.parse` SHALL produce an array deeply equal to the original, preserving each shortcut's `id`, `name`, and `url` fields.

**Validates: Requirements 2.1, 2.5, 7.8**

### Property 7: URL validation accepts only http/https

*For any* string that does not begin with `http://` or `https://`, `ValidationService.validateUrl` SHALL return `{ valid: false }`.

**Validates: Requirements 7.5, 10.4**

### Property 8: URL validation accepts all well-formed http/https URLs

*For any* string of the form `http(s)://hostname[/path][?query]` with no unencoded whitespace, `ValidationService.validateUrl` SHALL return `{ valid: true }`.

**Validates: Requirements 7.5, 10.4**

### Property 9: Time-based greeting is total and non-overlapping

*For any* integer hour H in 0–23, exactly one of the greeting conditions (Morning: 5–11, Afternoon: 12–17, Evening: 18–20, Night: 21–23 and 0–4) SHALL match.

**Validates: Requirements 4.3, 4.4, 4.5, 4.6**

### Property 10: Timer never goes below zero

*For any* sequence of `tick()` calls starting from any `remainingSeconds` value in 0–1500, `remainingSeconds` SHALL never become negative.

**Validates: Requirements 5.7, 5.8**

### Property 11: Timer start is idempotent while running

*For any* running timer state (intervalId ≠ null), calling `start()` any number of additional times SHALL leave `intervalId` unchanged (no additional intervals are created).

**Validates: Requirements 5.6**

### Property 12: Progress indicator accuracy

*For any* task list of length N with C completed tasks, the `renderProgress()` function SHALL produce the string `"${C} of ${N} tasks completed"`.

**Validates: Requirements 6.11, 6.12**

---

## Error Handling

### localStorage Failures

`StorageService.load(key, default)` wraps `JSON.parse(localStorage.getItem(key))` in a `try/catch`. On any error (missing key → `null`, `SyntaxError` from corrupt JSON, `SecurityError` from a restricted origin), it silently returns `defaultValue`. `StorageService.save` wraps `setItem` in a `try/catch` and swallows `QuotaExceededError` — data is already in memory and the UI remains functional.

### Input Validation Errors

All validation errors are surfaced **inline** next to the triggering input field using a dedicated error `<p>` element. Error text is set via `textContent`. Error elements are cleared on the next valid submission or when the user modifies the relevant input field (via an `input` event listener). No `alert()` or `confirm()` dialogs are used.

### Duplicate Task / Shortcut Names

A dedicated error message ("A task with this name already exists") is displayed inline. The submission is rejected without mutating state or writing to `localStorage`.

### URL Validation

If the submitted URL does not pass `ValidationService.validateUrl`, a message is displayed in `#link-error`. The error is cleared when the user edits `#link-url-input`.

### Timer Already Running

`TimerController.start()` silently no-ops if `intervalId !== null`. No error is shown to the user; the duplicate click simply has no effect.

### Corrupt / Missing localStorage Keys

If `tld_settings` is missing or unparseable, `StorageService.load` returns `{ theme: "light", userName: "" }`. The dashboard initialises normally with defaults and overwrites the corrupt entry on the next save.

---

## Testing Strategy

### Overview

Because this project has no build system or package manager, testing uses vanilla-JS-compatible tooling. The recommended approach is [Vitest](https://vitest.dev/) (zero-config, runs in Node, supports ES modules) for unit and property tests, and manual cross-browser smoke tests for UI rendering.

All `ValidationService` and `StorageService` functions are pure or easily mockable, making them the primary targets for automated testing.

### Unit Tests

Unit tests use Vitest with `describe` / `it` / `expect`. Each test file mirrors the controller it targets (e.g., `tests/validation.test.js`, `tests/storage.test.js`).

**Coverage targets:**
- `ValidationService.validateTaskName` — empty string, whitespace-only, >200 chars, valid 1-char, valid 200-char, duplicate detection (case variants)
- `ValidationService.validateUrl` — missing scheme, `ftp://`, bare hostname, valid `http://`, valid `https://`, URL with path and query
- `ValidationService.validateUserName` — empty, whitespace-only, 1-char valid, 50-char valid, 51-char invalid
- `StorageService.load` — missing key returns default, corrupt JSON returns default, valid JSON round-trips
- `ClockController.renderGreeting` — all four time bands (hour 5, 11, 12, 17, 18, 20, 21, 0, 4)
- `TimerController` state machine — start from idle, start while running (idempotence), stop, reset, tick to zero

### Property-Based Tests

Property tests use [fast-check](https://fast-check.io/) (installable as a dev dependency; tests run in Node, not bundled into the app).

Each property below corresponds to a Correctness Property in the design. Each test runs a minimum of **100 iterations**.

> Tag format used in comments: `// Feature: todo-life-dashboard, Property N: <property_text>`

**Property 1 & 2 — Task name validation boundaries:**
```
// Feature: todo-life-dashboard, Property 1: Task name validation rejects all invalid inputs
fc.assert(fc.property(
  fc.oneof(
    fc.constant(""),
    fc.stringOf(fc.constantFrom(" ","\t","\n"), {minLength:1}),
    fc.string({ minLength: 201 })
  ),
  (name) => ValidationService.validateTaskName(name, []).valid === false
), { numRuns: 100 });

// Feature: todo-life-dashboard, Property 2: Task name validation accepts all valid inputs
fc.assert(fc.property(
  fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  (name) => ValidationService.validateTaskName(name, []).valid === true
), { numRuns: 100 });
```

**Property 3 — Case-insensitive duplicate detection:**
```
// Feature: todo-life-dashboard, Property 3: Case-insensitive duplicate detection
fc.assert(fc.property(
  fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  (name) => {
    const tasks = [{ id: "1", name: name.trim(), completed: false, createdAt: 0 }];
    const variants = [name.trim().toUpperCase(), name.trim().toLowerCase(), name.trim()];
    return variants.every(v => ValidationService.validateTaskName(v, tasks).valid === false);
  }
), { numRuns: 100 });
```

**Properties 4, 5, 6 — Serialization round-trips:**
```
// Feature: todo-life-dashboard, Property 5: Task list serialization round-trip
fc.assert(fc.property(
  fc.array(fc.record({
    id: fc.uuidV(4),
    name: fc.string({ minLength: 1, maxLength: 200 }),
    completed: fc.boolean(),
    createdAt: fc.integer({ min: 0 })
  })),
  (tasks) => {
    const result = JSON.parse(JSON.stringify(tasks));
    return JSON.stringify(result) === JSON.stringify(tasks);
  }
), { numRuns: 100 });
```

**Properties 7 & 8 — URL validation:**
```
// Feature: todo-life-dashboard, Property 7: URL validation accepts only http/https
fc.assert(fc.property(
  fc.string().filter(s => !s.startsWith("http://") && !s.startsWith("https://")),
  (url) => ValidationService.validateUrl(url).valid === false
), { numRuns: 100 });
```

**Property 9 — Greeting total and non-overlapping:**
```
// Feature: todo-life-dashboard, Property 9: Time-based greeting is total and non-overlapping
fc.assert(fc.property(
  fc.integer({ min: 0, max: 23 }),
  (hour) => {
    const greetings = [
      hour >= 5 && hour <= 11,   // morning
      hour >= 12 && hour <= 17,  // afternoon
      hour >= 18 && hour <= 20,  // evening
      (hour >= 21 || hour <= 4)  // night
    ];
    return greetings.filter(Boolean).length === 1;
  }
), { numRuns: 24 });
```

**Property 10 — Timer never goes below zero:**
```
// Feature: todo-life-dashboard, Property 10: Timer never goes below zero
fc.assert(fc.property(
  fc.integer({ min: 0, max: 1500 }),
  fc.integer({ min: 0, max: 2000 }),
  (startSeconds, ticks) => {
    let remaining = startSeconds;
    for (let i = 0; i < ticks; i++) {
      if (remaining > 0) remaining--;
    }
    return remaining >= 0;
  }
), { numRuns: 100 });
```

**Property 11 — Timer start idempotence:**
```
// Feature: todo-life-dashboard, Property 11: Timer start is idempotent while running
fc.assert(fc.property(
  fc.integer({ min: 1, max: 100 }),
  (extraStarts) => {
    const timer = createTestTimer();
    timer.start();
    const firstId = timer.intervalId;
    for (let i = 0; i < extraStarts; i++) timer.start();
    return timer.intervalId === firstId;
  }
), { numRuns: 100 });
```

**Property 12 — Progress indicator accuracy:**
```
// Feature: todo-life-dashboard, Property 12: Progress indicator accuracy
fc.assert(fc.property(
  fc.array(fc.record({ completed: fc.boolean() })),
  (tasks) => {
    const completed = tasks.filter(t => t.completed).length;
    const result = renderProgress(tasks);
    return result === `${completed} of ${tasks.length} tasks completed`;
  }
), { numRuns: 100 });
```

### Cross-Browser Smoke Tests (Manual)

For each supported browser (Chrome, Firefox, Edge, Safari):
1. Load `index.html` — verify no console errors, correct layout, clock ticking
2. Add a task, refresh — verify task persists
3. Toggle theme, refresh — verify theme persists, no flash
4. Add a shortcut with invalid URL — verify inline error appears
5. Add 20 shortcuts — verify the 21st is rejected
6. Resize viewport to <768 px — verify single-column layout

### Accessibility Checks

- Run [axe DevTools](https://www.deque.com/axe/) on the loaded page in Chrome
- Verify all icon-only buttons have `aria-label`
- Tab through entire page — verify all interactive elements are reachable and activatable via Enter/Space
- Verify minimum 44 × 44 px touch targets with browser DevTools device emulation
