/**
 * To-Do Life Dashboard — Main Script
 *
 * Architecture: controller-per-feature pattern.
 * Each controller owns its DOM region, in-memory state, and render logic.
 * No external libraries are loaded; this file is the only runtime JS asset.
 */

// ---------------------------------------------------------------------------
// StorageService
// Wraps localStorage reads/writes with safe fallbacks.
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
// ---------------------------------------------------------------------------

const StorageService = {
  /**
   * Reads and parses a JSON value from localStorage.
   * Returns `defaultValue` when:
   *   - the key is absent (getItem returns null)
   *   - the stored string is not valid JSON (SyntaxError)
   *   - localStorage is inaccessible from this origin (SecurityError)
   *
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*} parsed value or defaultValue
   */
  load(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      // getItem returns null when the key does not exist
      if (raw === null) {
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch (err) {
      // SyntaxError  – stored string is corrupt / unparseable JSON
      // SecurityError – origin is not allowed to access localStorage
      return defaultValue;
    }
  },

  /**
   * Serializes `value` to JSON and writes it to localStorage.
   * Swallows QuotaExceededError silently — the data is already in memory
   * and the UI remains functional even when the write is rejected.
   *
   * @param {string} key
   * @param {*} value
   */
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // QuotaExceededError – storage quota has been reached; ignore silently.
      // SecurityError      – origin restrictions; also safe to ignore here.
    }
  },
};

// ---------------------------------------------------------------------------
// ValidationService
// Pure validation functions — never touch the DOM.
// Requirements: 1.7, 6.3, 6.4, 6.5, 7.5, 7.6, 10.3, 10.4, 10.5
// ---------------------------------------------------------------------------

const ValidationService = {
  /**
   * Validates a task name before adding or editing.
   *
   * Rules:
   *  1. Trim whitespace from both ends first.
   *  2. Reject if the trimmed result is empty (covers whitespace-only input).
   *  3. Reject if the trimmed result exceeds 200 characters.
   *  4. Reject if the trimmed name, compared case-insensitively, matches any
   *     existing task's name — except the task identified by `excludeId`
   *     (used during an edit to allow the task to keep its own name).
   *
   * @param {string}   name          - Raw input from the user.
   * @param {Array}    existingTasks - Current task array; each item has { id, name }.
   * @param {string}  [excludeId]   - Task id to skip in the duplicate check (edit mode).
   * @returns {{ valid: boolean, error: string }}
   */
  validateTaskName(name, existingTasks, excludeId) {
    const trimmed = name.trim();

    // Empty or whitespace-only after trimming
    if (trimmed.length === 0) {
      return { valid: false, error: 'Task name cannot be empty.' };
    }

    // Length exceeds maximum allowed characters
    if (trimmed.length > 200) {
      return { valid: false, error: 'Task name cannot exceed 200 characters.' };
    }

    // Case-insensitive duplicate check against existing tasks.
    // When editing, skip the task being edited (excludeId) so it does not
    // flag itself as a duplicate of its own current name.
    const lowerTrimmed = trimmed.toLowerCase();
    const isDuplicate = existingTasks.some(
      (task) => task.id !== excludeId && task.name.trim().toLowerCase() === lowerTrimmed
    );
    if (isDuplicate) {
      return { valid: false, error: 'A task with this name already exists.' };
    }

    return { valid: true, error: '' };
  },

  /**
   * Validates a quick-link display name.
   *
   * Rules:
   *  1. Must be between 1 and 50 characters (after no trimming — length is
   *     checked on the raw value as the user typed it).
   *  2. May contain only Unicode letters, Unicode digits, spaces, hyphens (-),
   *     and underscores (_).
   *
   * Regex breakdown for LINK_NAME_PATTERN:
   *   ^          – start of string
   *   [\p{L}     – any Unicode letter (covers accented chars, CJK, etc.)
   *    \p{N}     – any Unicode decimal digit
   *    \s        – any whitespace character (space, tab — user-visible space is fine)
   *    \-        – literal hyphen
   *    _]        – literal underscore
   *   {1,50}     – between 1 and 50 of the above characters
   *   $          – end of string
   *   (u flag)   – enables Unicode property escapes (\p{L}, \p{N})
   *
   * @param {string} name
   * @returns {{ valid: boolean, error: string }}
   */
  validateLinkName(name) {
    if (name.length === 0) {
      return { valid: false, error: 'Link name cannot be empty.' };
    }

    if (name.length > 50) {
      return { valid: false, error: 'Link name cannot exceed 50 characters.' };
    }

    // Unicode-aware pattern: allows letters, digits, whitespace, hyphens, underscores.
    // The `u` flag is required for \p{L} and \p{N} Unicode property escapes.
    const LINK_NAME_PATTERN = /^[\p{L}\p{N}\s\-_]{1,50}$/u;
    if (!LINK_NAME_PATTERN.test(name)) {
      return {
        valid: false,
        error: 'Link name may only contain letters, digits, spaces, hyphens, and underscores.',
      };
    }

    return { valid: true, error: '' };
  },

  /**
   * Validates a URL submitted for a quick-link shortcut.
   *
   * Rules:
   *  1. Must begin with "http://" or "https://" (scheme check).
   *  2. After the scheme, must contain a non-empty hostname.
   *  3. Must contain no unencoded whitespace anywhere in the string.
   *
   * Regex breakdown for WHITESPACE_PATTERN:
   *   \s   – matches any whitespace character (space, tab, newline, etc.)
   *   The test rejects the URL if any such character is found.
   *
   * Hostname extraction relies on the built-in URL constructor, which
   * correctly parses scheme, authority (hostname + port), path, and query.
   * Using URL() is safer than a hand-rolled hostname regex because it handles
   * edge cases such as IPv6 addresses and international domain names (IDN).
   *
   * @param {string} url
   * @returns {{ valid: boolean, error: string }}
   */
  validateUrl(url) {
    // Scheme check: must start with http:// or https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, error: 'URL must begin with http:// or https://.' };
    }

    // Whitespace check: no unencoded spaces, tabs, or newlines allowed.
    // \s matches [ \t\r\n\f\v] and Unicode whitespace.
    const WHITESPACE_PATTERN = /\s/;
    if (WHITESPACE_PATTERN.test(url)) {
      return { valid: false, error: 'URL must not contain unencoded whitespace.' };
    }

    // Hostname check: attempt to parse with the URL constructor, which throws
    // a TypeError for malformed URLs (e.g., "https://" with no hostname).
    try {
      const parsed = new URL(url);
      // parsed.hostname is the empty string when no host is present
      if (!parsed.hostname) {
        return { valid: false, error: 'URL must contain a valid hostname.' };
      }
    } catch (_err) {
      // URL constructor threw — the string is not a well-formed URL
      return { valid: false, error: 'URL is not valid. Please enter a well-formed URL.' };
    }

    return { valid: true, error: '' };
  },

  /**
   * Validates the user's display name shown in the greeting.
   *
   * Rules:
   *  1. Must be non-empty after trimming (rejects empty string and
   *     whitespace-only values such as "   ").
   *  2. Must be between 1 and 50 characters (trimmed length).
   *
   * No character-class restriction is applied to user names — any printable
   * character combination is acceptable as long as the length rule is met.
   *
   * @param {string} name
   * @returns {{ valid: boolean, error: string }}
   */
  validateUserName(name) {
    const trimmed = name.trim();

    // Rejects empty string or whitespace-only input
    if (trimmed.length === 0) {
      return { valid: false, error: 'Name cannot be empty or whitespace only.' };
    }

    // Maximum length check on trimmed value
    if (trimmed.length > 50) {
      return { valid: false, error: 'Name cannot exceed 50 characters.' };
    }

    return { valid: true, error: '' };
  },
};

// ---------------------------------------------------------------------------
// ClockController
// Manages the live clock, date display, time-based greeting, and user name.
// Requirements: 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12
// ---------------------------------------------------------------------------

const ClockController = {
  /** @type {string} The display name shown in the greeting. */
  userName: '',

  /**
   * Bootstraps the controller:
   *  - Reads saved settings from localStorage via StorageService.
   *  - Initialises userName from the stored value (defaults to empty string).
   *  - Fires an immediate tick so the clock is visible before the first interval.
   *  - Starts a 1-second interval that calls tick() on every subsequent beat.
   *  - Attaches input-confirm event listeners.
   */
  init() {
    // Load persisted settings; fall back to defaults when key is absent or corrupt.
    const settings = StorageService.load('tld_settings', { theme: 'light', userName: '' });
    this.userName = settings.userName || '';

    // Attach the confirm-name listeners (button click and Enter key on input).
    const confirmBtn = document.getElementById('username-confirm-btn');
    const nameInput = document.getElementById('username-input');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleUserNameConfirm());
    }

    if (nameInput) {
      nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.handleUserNameConfirm();
        }
      });
    }

    // Prevent the <form> from triggering a page reload on implicit submission
    // (e.g. pressing Enter in the name input while the browser treats it as a
    // form submit event). The controller handles the action via keydown + click.
    const usernameForm = document.getElementById('username-form');
    if (usernameForm) {
      usernameForm.addEventListener('submit', (event) => event.preventDefault());
    }

    // Render immediately so the clock appears without a 1-second delay.
    this.tick();

    // Start the 1-second interval.
    setInterval(this.tick.bind(this), 1000);
  },

  /**
   * Called every second by the interval.
   * Updates the clock display, date display, and greeting.
   */
  tick() {
    const now = new Date();

    // --- Clock display: HH:MM:SS ---
    // padStart(2, '0') ensures single-digit values are zero-padded (e.g. "09").
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const clockEl = document.getElementById('clock-display');
    if (clockEl) {
      clockEl.textContent = `${hh}:${mm}:${ss}`;
    }

    // --- Date display: "WEEKDAY_NAME, D MONTH_NAME YYYY" ---
    // e.g. "Monday, 6 November 2026"
    const WEEKDAY_NAMES = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ];
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const weekday = WEEKDAY_NAMES[now.getDay()];
    const day = now.getDate();            // no zero-padding per spec ("D", not "DD")
    const month = MONTH_NAMES[now.getMonth()];
    const year = now.getFullYear();

    const dateEl = document.getElementById('date-display');
    if (dateEl) {
      dateEl.textContent = `${weekday}, ${day} ${month} ${year}`;
    }

    // --- Greeting: time-band dependent ---
    this.renderGreeting();
  },

  /**
   * Maps the current hour to one of four greeting strings and updates
   * the #greeting-display element via textContent (never innerHTML).
   *
   * Time bands (requirement 4.3 – 4.6):
   *   05:00 – 11:59  →  "Good Morning"
   *   12:00 – 17:59  →  "Good Afternoon"
   *   18:00 – 20:59  →  "Good Evening"
   *   21:00 – 04:59  →  "Good Night"
   *
   * Falls back to "User" when userName is empty (requirement 4.12).
   */
  renderGreeting() {
    const hour = new Date().getHours();
    const displayName = this.userName.trim() || 'User';

    // Determine greeting prefix based on the time band.
    let prefix;
    if (hour >= 5 && hour <= 11) {
      prefix = 'Good Morning';
    } else if (hour >= 12 && hour <= 17) {
      prefix = 'Good Afternoon';
    } else if (hour >= 18 && hour <= 20) {
      prefix = 'Good Evening';
    } else {
      // Covers 21:00 – 23:59 and 00:00 – 04:59 (Good Night).
      prefix = 'Good Night';
    }

    const greetingEl = document.getElementById('greeting-display');
    if (greetingEl) {
      greetingEl.textContent = `${prefix}, ${displayName}`;
    }
  },

  /**
   * Handles the "confirm name" action triggered by the button click or
   * pressing Enter inside #username-input.
   *
   * Behaviour:
   *  - Validates the raw input value using ValidationService.validateUserName.
   *  - On valid, non-empty input: trims the value, persists it inside
   *    tld_settings in StorageService, updates this.userName, re-renders greeting.
   *  - On empty / whitespace-only input: silently retains the current userName
   *    without touching localStorage (requirement 4.10).
   */
  handleUserNameConfirm() {
    const nameInput = document.getElementById('username-input');
    if (!nameInput) return;

    const rawValue = nameInput.value;

    // validateUserName rejects empty / whitespace-only and names > 50 chars.
    const { valid } = ValidationService.validateUserName(rawValue);

    if (!valid) {
      // Empty or whitespace-only: retain current name silently (req 4.10).
      // Nothing to save; just leave the greeting as-is.
      return;
    }

    const trimmedName = rawValue.trim();

    // Persist the updated userName inside the tld_settings object.
    // Load the existing settings first so we do not overwrite theme or other fields.
    const settings = StorageService.load('tld_settings', { theme: 'light', userName: '' });
    settings.userName = trimmedName;
    StorageService.save('tld_settings', settings);

    // Update in-memory state and refresh the greeting immediately.
    this.userName = trimmedName;
    this.renderGreeting();
  },
};

// ---------------------------------------------------------------------------
// ThemeController
// Manages light/dark theme toggling, persistence, and OS-preference detection.
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9
// ---------------------------------------------------------------------------

const ThemeController = {
  /**
   * Bootstraps the theme controller:
   *  - Reads saved theme from tld_settings via StorageService.
   *  - If no saved theme, detects the OS colour-scheme preference via
   *    window.matchMedia('(prefers-color-scheme: dark)'); falls back to
   *    'light' when matchMedia is unavailable (req 8.8, 8.9).
   *  - Applies the resolved theme to <html> via data-theme attribute.
   *  - Updates the toggle button icon to reflect the active theme.
   *  - Attaches a click listener to #theme-toggle-btn.
   */
  init() {
    // Determine the theme to apply:
    //  1. Prefer the value saved in tld_settings.
    //  2. Fall back to OS preference.
    //  3. Fall back to 'light' when neither is available (req 8.9).
    const settings = StorageService.load('tld_settings', { theme: 'light', userName: '' });

    let theme;
    if (settings.theme === 'dark' || settings.theme === 'light') {
      // A saved preference exists — use it (req 8.7).
      theme = settings.theme;
    } else {
      // No saved preference — probe the OS colour-scheme preference (req 8.8).
      // window.matchMedia may throw in restricted environments (req 8.9).
      try {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      } catch (_err) {
        // matchMedia unavailable or threw a SecurityError — default to light.
        theme = 'light';
      }
    }

    // Apply the resolved theme to <html> (req 8.6, 8.7).
    this._applyTheme(theme);

    // Attach click listener to the toggle button (req 1.6, 8.2).
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  },

  /**
   * Toggles the active theme between 'light' and 'dark':
   *  - Reads the current data-theme from <html>.
   *  - Flips it to the opposite value.
   *  - Applies the new theme to <html>.
   *  - Persists the updated tld_settings to StorageService (req 8.6).
   */
  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // Apply new theme to the DOM.
    this._applyTheme(newTheme);

    // Persist the updated theme inside tld_settings, merging with any
    // existing settings so userName and other fields are not overwritten.
    const settings = StorageService.load('tld_settings', { theme: 'light', userName: '' });
    settings.theme = newTheme;
    StorageService.save('tld_settings', settings);
  },

  /**
   * Applies `theme` to the document and updates the toggle button icon.
   *
   * The toggle button icon convention:
   *   Light mode is active → show 🌙 (clicking will switch to dark).
   *   Dark  mode is active → show ☀️  (clicking will switch to light).
   *
   * @param {'light'|'dark'} theme
   */
  _applyTheme(theme) {
    // Set data-theme on <html> so CSS variables respond immediately (req 8.6).
    document.documentElement.setAttribute('data-theme', theme);

    // Update the toggle button icon to indicate the action that will occur.
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },
};

// ---------------------------------------------------------------------------
// TimerController
// Manages the Pomodoro-style 25-minute countdown timer.
// Requirements: 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
// ---------------------------------------------------------------------------

const TimerController = {
  /** @type {number} Remaining time in seconds (initialised to 1500 = 25:00). */
  remainingSeconds: 0,

  /** @type {number|null} ID returned by setInterval, or null when not running. */
  intervalId: null,

  /**
   * Bootstraps the controller:
   *  - Sets remainingSeconds to 1500 (25:00) and intervalId to null.
   *  - Calls render() so the display shows 25:00 immediately.
   *  - Attaches click listeners to the Start, Stop, and Reset buttons.
   */
  init() {
    this.remainingSeconds = 1500;
    this.intervalId = null;

    // Render the initial state before the user interacts.
    this.render();

    // Attach click listeners via addEventListener (req 1.6).
    const startBtn = document.getElementById('timer-start-btn');
    const stopBtn = document.getElementById('timer-stop-btn');
    const resetBtn = document.getElementById('timer-reset-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.start());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stop());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
  },

  /**
   * Starts the countdown interval.
   * No-op when the timer is already running (intervalId !== null) — prevents
   * multiple simultaneous intervals (req 5.6).
   */
  start() {
    // Guard: already running — do nothing (req 5.6).
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = setInterval(this.tick.bind(this), 1000);
  },

  /**
   * Pauses the countdown:
   *  - Clears the interval.
   *  - Sets intervalId to null.
   *  - Calls render() to keep the display in sync.
   *
   * Safe to call when not running — clearInterval on an invalid id is a no-op
   * and setting intervalId = null is idempotent (req 5.9 — no state change).
   */
  stop() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.render();
  },

  /**
   * Resets the timer to its initial state:
   *  - Stops any active countdown via stop().
   *  - Restores remainingSeconds to 1500.
   *  - Hides the session-complete banner (#timer-banner).
   *  - Calls render() to update the display (req 5.5).
   */
  reset() {
    this.stop();
    this.remainingSeconds = 1500;

    // Dismiss the completion banner if it was shown (req 5.5).
    const banner = document.getElementById('timer-banner');
    if (banner) {
      banner.hidden = true;
    }

    this.render();
  },

  /**
   * Called every second by the interval.
   *  - Decrements remainingSeconds by 1 if it is above 0.
   *  - When remainingSeconds reaches 0: stops the interval and shows the
   *    session-complete banner (req 5.7, 5.8).
   *  - Calls render() to update the display.
   */
  tick() {
    if (this.remainingSeconds > 0) {
      this.remainingSeconds -= 1;
    }

    // When the countdown reaches exactly 0, stop and show the banner (req 5.7).
    if (this.remainingSeconds === 0) {
      // stop() clears the interval so no further ticks fire (req 5.8).
      this.stop();

      const banner = document.getElementById('timer-banner');
      if (banner) {
        banner.hidden = false;
      }
    }

    this.render();
  },

  /**
   * Formats remainingSeconds as MM:SS and updates #timer-display via
   * textContent (never innerHTML — req 1.7).
   *
   * Example: 90 seconds → "01:30"
   */
  render() {
    const totalSeconds = this.remainingSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Zero-pad both parts to always produce two digits (e.g. "05:04").
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    const displayEl = document.getElementById('timer-display');
    if (displayEl) {
      displayEl.textContent = `${mm}:${ss}`;
    }
  },
};

// ---------------------------------------------------------------------------
// TaskController
// Manages the to-do list: add, toggle, delete, render, and progress indicator.
// Requirements: 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.6, 6.10, 6.11, 6.12, 6.13
// ---------------------------------------------------------------------------

const TaskController = {
  /** @type {Array<{id: string, name: string, completed: boolean, createdAt: number}>} */
  tasks: [],

  /**
   * Bootstraps the controller:
   *  - Loads the persisted tasks array from localStorage via StorageService.
   *  - Calls render() to populate the task list immediately.
   *  - Calls renderProgress() to show the initial progress indicator.
   *  - Attaches a click listener to #add-task-btn.
   *  - Attaches a keydown Enter listener to #task-input.
   */
  init() {
    // Load persisted tasks; default to an empty array when key is absent or corrupt.
    this.tasks = StorageService.load('tld_tasks', []);

    // Render the initial state from storage.
    this.render();
    this.renderProgress();

    // Attach event listeners via addEventListener (req 1.6).
    const addBtn = document.getElementById('add-task-btn');
    const taskInput = document.getElementById('task-input');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const input = document.getElementById('task-input');
        if (input) {
          this.addTask(input.value);
        }
      });
    }

    if (taskInput) {
      taskInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.addTask(taskInput.value);
        }
      });
    }

    // Prevent the <form> from triggering a page reload on implicit submission.
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', (event) => event.preventDefault());
    }
  },

  /**
   * Adds a new task after validating the supplied name.
   *
   * On validation failure:
   *  - Sets #task-add-error textContent to the error message.
   *
   * On success:
   *  - Creates a new Task object with a UUID id, trimmed name, completed = false,
   *    and createdAt timestamp.
   *  - Appends the task to this.tasks.
   *  - Persists the updated array to localStorage.
   *  - Re-renders the list and progress indicator.
   *  - Clears the input field and any previous error message.
   *
   * @param {string} name - Raw input from the user.
   */
  addTask(name) {
    const errorEl = document.getElementById('task-add-error');
    const input = document.getElementById('task-input');

    // Validate the raw input (ValidationService trims internally; req 6.3, 6.4, 6.5).
    const { valid, error } = ValidationService.validateTaskName(name, this.tasks);

    if (!valid) {
      // Display the inline error message (req 1.7 — textContent only, never innerHTML).
      if (errorEl) {
        errorEl.textContent = error;
      }
      return;
    }

    // Build the new Task object (data model from design).
    const trimmed = name.trim();
    const task = {
      id: crypto.randomUUID(),
      name: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    // Append to in-memory array and persist synchronously (req 2.5).
    this.tasks.push(task);
    StorageService.save('tld_tasks', this.tasks);

    // Refresh the UI.
    this.render();
    this.renderProgress();

    // Clear the input field and dismiss the error message.
    if (input) {
      input.value = '';
    }
    if (errorEl) {
      errorEl.textContent = '';
    }
  },

  /**
   * Flips the completed state of the task identified by `id`.
   * Persists the change and re-renders list and progress indicator.
   *
   * @param {string} id - The task's UUID.
   */
  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    // Flip the boolean flag (req 6.6).
    task.completed = !task.completed;

    // Persist and refresh the UI.
    StorageService.save('tld_tasks', this.tasks);
    this.render();
    this.renderProgress();
  },

  /**
   * Removes the task identified by `id` from the array.
   * Persists the change and re-renders list and progress indicator.
   *
   * @param {string} id - The task's UUID.
   */
  deleteTask(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    // Remove one element at the found index (req 6.10).
    this.tasks.splice(index, 1);

    // Persist and refresh the UI.
    StorageService.save('tld_tasks', this.tasks);
    this.render();
    this.renderProgress();
  },

  /**
   * Rebuilds the entire #task-list from this.tasks.
   *
   * Each <li> contains (in order):
   *   1. <input type="checkbox"> — checked when task.completed is true.
   *   2. <span>                  — task name; CSS class "completed" applied when
   *                               task.completed is true to apply strikethrough (req 6.6).
   *   3. <button>Edit</button>   — placeholder for task 9.3.
   *   4. <button>Delete</button> — triggers deleteTask(id).
   *
   * All DOM nodes are created via createElement / setAttribute / textContent —
   * never innerHTML — to prevent XSS with user-supplied content (req 1.7).
   */
  render() {
    const listEl = document.getElementById('task-list');
    if (!listEl) return;

    // Clear existing list items before rebuilding.
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    this.tasks.forEach((task) => {
      // --- <li> container ---
      const li = document.createElement('li');
      li.setAttribute('data-task-id', task.id);

      // --- Checkbox (req 6.1, 6.6) ---
      const checkbox = document.createElement('input');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('aria-label', `Mark "${task.name}" as ${task.completed ? 'incomplete' : 'complete'}`);
      // Set the checked property directly (not via setAttribute) so the DOM reflects the boolean.
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => this.toggleTask(task.id));

      // --- Name span (req 6.6: strikethrough CSS class for completed tasks) ---
      const nameSpan = document.createElement('span');
      nameSpan.textContent = task.name;
      // Apply CSS class "completed" when the task is done; remove it when not.
      // The CSS rule `.completed { text-decoration: line-through; }` provides the
      // visual strikethrough without needing any inline styles.
      if (task.completed) {
        nameSpan.setAttribute('class', 'task-name completed');
      } else {
        nameSpan.setAttribute('class', 'task-name');
      }

      // --- Edit button (req 6.7) ---
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', `Edit task: ${task.name}`);
      editBtn.setAttribute('class', 'task-edit-btn');
      editBtn.addEventListener('click', () => this.beginEdit(task.id));

      // --- Delete button (req 6.10) ---
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.name}`);
      deleteBtn.setAttribute('class', 'task-delete-btn');
      deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

      // Assemble the <li>.
      li.appendChild(checkbox);
      li.appendChild(nameSpan);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);

      listEl.appendChild(li);
    });
  },

  /**
   * Updates #progress-indicator with the count of completed tasks out of the total.
   *
   * Format (req 6.11): "${completed} of ${total} tasks completed"
   * Example: "3 of 5 tasks completed"
   *
   * Updates within the same execution frame as any list change, satisfying
   * the <100 ms update requirement (req 6.12).
   */
  renderProgress() {
    const progressEl = document.getElementById('progress-indicator');
    if (!progressEl) return;

    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;

    // Use textContent — never innerHTML — to set user-visible text (req 1.7).
    progressEl.textContent = `${completed} of ${total} tasks completed`;
  },

  /**
   * Replaces a task row's static display with an inline edit form.
   *
   * The <li> identified by `id` is cleared and rebuilt (via createElement)
   * to contain:
   *   1. <input type="text"> — pre-filled with the current task name.
   *   2. <button>Confirm</button> — calls confirmEdit(id, input.value).
   *   3. <button>Cancel</button> — calls cancelEdit(id).
   *   4. <span role="alert"> — initially empty; used to show inline errors.
   *
   * Requirements: 6.7
   *
   * @param {string} id - The task's UUID.
   */
  beginEdit(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    const li = document.querySelector(`[data-task-id="${id}"]`);
    if (!li) return;

    // Clear the existing <li> content before rebuilding (req 6.7).
    while (li.firstChild) {
      li.removeChild(li.firstChild);
    }

    // --- Edit input (req 6.7: pre-filled with current task name) ---
    const editInput = document.createElement('input');
    editInput.setAttribute('type', 'text');
    editInput.setAttribute('class', 'task-edit-input');
    editInput.setAttribute('aria-label', `Edit name for task: ${task.name}`);
    // Pre-fill with the current task name (req 6.7).
    editInput.value = task.name;

    // --- Confirm button (req 6.7) ---
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.setAttribute('class', 'task-confirm-btn');
    confirmBtn.addEventListener('click', () => this.confirmEdit(id, editInput.value));

    // Allow pressing Enter inside the input to confirm (convenience UX).
    editInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.confirmEdit(id, editInput.value);
      }
    });

    // --- Cancel button (req 6.7, 6.14) ---
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('class', 'task-cancel-btn');
    cancelBtn.addEventListener('click', () => this.cancelEdit(id));

    // Allow pressing Escape inside the input to cancel (convenience UX).
    editInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.cancelEdit(id);
      }
    });

    // --- Inline error span (req 6.8: show validation errors next to input) ---
    const errorSpan = document.createElement('span');
    errorSpan.setAttribute('class', 'task-edit-error');
    errorSpan.setAttribute('role', 'alert');
    // id-based reference so confirmEdit can locate this span without re-querying the full list.
    errorSpan.setAttribute('data-edit-error-for', id);

    // Assemble the edit form inside the <li>.
    li.appendChild(editInput);
    li.appendChild(confirmBtn);
    li.appendChild(cancelBtn);
    li.appendChild(errorSpan);

    // Focus the input immediately so the user can type right away.
    editInput.focus();
  },

  /**
   * Confirms an in-progress edit: validates the new name and, if valid,
   * mutates the task, persists, and re-renders.
   *
   * Validation uses ValidationService.validateTaskName with the current task's
   * `id` as `excludeId` so the task is not flagged as a duplicate of itself.
   *
   * On error: sets the inline error span's textContent (req 6.8, 6.9).
   * On success: updates task.name, saves, calls render() and renderProgress().
   *
   * Requirements: 6.8, 6.9
   *
   * @param {string} id      - The task's UUID.
   * @param {string} newName - Raw value from the edit input.
   */
  confirmEdit(id, newName) {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return;

    // Validate: exclude the current task id so it cannot clash with its own name
    // (case-insensitive duplicate check per req 6.9).
    const { valid, error } = ValidationService.validateTaskName(newName, this.tasks, id);

    if (!valid) {
      // Show the error inline next to the edit input (req 6.8).
      const errorSpan = document.querySelector(`[data-edit-error-for="${id}"]`);
      if (errorSpan) {
        errorSpan.textContent = error;
      }
      return;
    }

    // Validation passed: mutate the task name (trimmed) and persist (req 6.8).
    task.name = newName.trim();
    StorageService.save('tld_tasks', this.tasks);

    // Re-render both the list and the progress indicator (req 6.8).
    this.render();
    this.renderProgress();
  },

  /**
   * Cancels an in-progress edit by calling render(), which rebuilds the entire
   * list from this.tasks — restoring the original task name display without
   * touching any task data or localStorage (req 6.14).
   *
   * Requirements: 6.14
   *
   * @param {string} id - The task's UUID (unused beyond logging; render() is authoritative).
   */
  cancelEdit(id) {
    // Re-render the full list from the unchanged in-memory tasks array.
    // No mutation, no save — the original state is preserved (req 6.14).
    this.render();
  },
};

// ---------------------------------------------------------------------------
// QuickLinksController
// Manages the quick-links shortcuts panel: seeding, adding, removing, rendering.
// Requirements: 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9
// ---------------------------------------------------------------------------

const QuickLinksController = {
  /** @type {Array<{id: string, name: string, url: string}>} */
  shortcuts: [],

  /**
   * Bootstraps the controller:
   *  - Loads the `tld_shortcuts` array from StorageService.
   *  - If the loaded array is empty, seeds three default shortcuts and saves them
   *    (req 7.3: default shortcuts only seeded when localStorage has no shortcuts).
   *  - Calls render() to display the initial list.
   *  - Attaches a click listener to #add-link-btn.
   */
  init() {
    // Load persisted shortcuts; default to an empty array when key is absent or corrupt.
    this.shortcuts = StorageService.load('tld_shortcuts', []);

    // Seed default shortcuts ONLY when storage is empty (req 7.3, 7.9).
    // Each default gets a unique UUID so it is individually removable (req 7.9).
    if (this.shortcuts.length === 0) {
      this.shortcuts = [
        { id: crypto.randomUUID(), name: 'Google', url: 'https://www.google.com' },
        { id: crypto.randomUUID(), name: 'Gmail', url: 'https://mail.google.com' },
        { id: crypto.randomUUID(), name: 'Google Calendar', url: 'https://calendar.google.com' },
      ];
      StorageService.save('tld_shortcuts', this.shortcuts);
    }

    // Render the initial state from storage.
    this.render();

    // Attach click listener to the "Add Shortcut" button (req 1.6).
    const addBtn = document.getElementById('add-link-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('link-name-input');
        const urlInput = document.getElementById('link-url-input');
        const name = nameInput ? nameInput.value : '';
        const url = urlInput ? urlInput.value : '';
        this.addLink(name, url);
      });
    }

    // Prevent the <form> from triggering a page reload on implicit submission.
    const quicklinksForm = document.getElementById('quicklinks-form');
    if (quicklinksForm) {
      quicklinksForm.addEventListener('submit', (event) => event.preventDefault());
    }
  },

  /**
   * Validates the supplied name and URL, then adds a new shortcut.
   *
   * Validation order:
   *  1. Validate name with ValidationService.validateLinkName.
   *  2. Validate url with ValidationService.validateUrl.
   *  3. If shortcuts count ≥ 20, show cap error (req 7.7).
   *
   * On success:
   *  - Creates { id: crypto.randomUUID(), name, url }.
   *  - Pushes to this.shortcuts.
   *  - Saves to localStorage via StorageService.
   *  - Calls render().
   *  - Clears the error element and the input fields.
   *
   * @param {string} name - Raw link name from the input.
   * @param {string} url  - Raw URL from the input.
   */
  addLink(name, url) {
    const errorEl = document.getElementById('link-error');

    // --- Step 1: Validate the link name (req 7.5, 7.6) ---
    const nameResult = ValidationService.validateLinkName(name);
    if (!nameResult.valid) {
      if (errorEl) {
        errorEl.textContent = nameResult.error;
      }
      return;
    }

    // --- Step 2: Validate the URL (req 7.5, 7.6) ---
    const urlResult = ValidationService.validateUrl(url);
    if (!urlResult.valid) {
      if (errorEl) {
        errorEl.textContent = urlResult.error;
      }
      return;
    }

    // --- Step 3: Enforce the 20-shortcut cap (req 7.7) ---
    if (this.shortcuts.length >= 20) {
      if (errorEl) {
        errorEl.textContent = 'You have reached the maximum of 20 shortcuts.';
      }
      return;
    }

    // --- All checks passed: create and store the new shortcut ---
    const shortcut = {
      id: crypto.randomUUID(),
      name,
      url,
    };

    this.shortcuts.push(shortcut);
    StorageService.save('tld_shortcuts', this.shortcuts);

    // Refresh the UI.
    this.render();

    // Clear the error element and both input fields.
    if (errorEl) {
      errorEl.textContent = '';
    }
    const nameInput = document.getElementById('link-name-input');
    const urlInput = document.getElementById('link-url-input');
    if (nameInput) {
      nameInput.value = '';
    }
    if (urlInput) {
      urlInput.value = '';
    }
  },

  /**
   * Removes the shortcut identified by `id`.
   * Persists the updated array and re-renders the list (req 7.4, 7.9).
   *
   * @param {string} id - The shortcut's UUID.
   */
  removeLink(id) {
    const index = this.shortcuts.findIndex((s) => s.id === id);
    if (index === -1) return;

    // Remove one element at the found index.
    this.shortcuts.splice(index, 1);

    // Persist and refresh the UI.
    StorageService.save('tld_shortcuts', this.shortcuts);
    this.render();
  },

  /**
   * Rebuilds the entire #quicklinks-list from this.shortcuts.
   *
   * Each <li> contains (in order):
   *   1. <a>     — href set via setAttribute (req 7.2: target="_blank" + rel="noopener noreferrer").
   *   2. <span>  — link name via textContent (req 1.7 — never innerHTML).
   *   3. <button>Remove</button> — triggers removeLink(id).
   *
   * Also attaches an `input` listener to #link-url-input so that any
   * modification to the URL field clears #link-error immediately (req 7.5).
   *
   * All DOM nodes are created via createElement / setAttribute / textContent —
   * never innerHTML — to prevent XSS with user-supplied content (req 1.7).
   */
  render() {
    const listEl = document.getElementById('quicklinks-list');
    if (!listEl) return;

    // Clear existing list items before rebuilding.
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    this.shortcuts.forEach((shortcut) => {
      // --- <li> container ---
      const li = document.createElement('li');
      li.setAttribute('data-shortcut-id', shortcut.id);

      // --- <a> link (req 7.1, 7.2) ---
      // Use setAttribute for all attributes — never assign href directly on the
      // object property — to stay consistent with the createElement/setAttribute pattern.
      const anchor = document.createElement('a');
      anchor.setAttribute('href', shortcut.url);
      // Opens in a new tab (req 7.2).
      anchor.setAttribute('target', '_blank');
      // Prevents the new page from reading document.referrer and removes the
      // opener reference, satisfying the "no referrer info" security requirement (req 7.2).
      anchor.setAttribute('rel', 'noopener noreferrer');

      // --- <span> for name (req 1.7 — textContent, never innerHTML) ---
      const nameSpan = document.createElement('span');
      nameSpan.textContent = shortcut.name;

      // Append name span inside the anchor.
      anchor.appendChild(nameSpan);

      // --- Remove button (req 7.4, 7.9) ---
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('aria-label', `Remove shortcut: ${shortcut.name}`);
      removeBtn.setAttribute('class', 'quicklink-remove-btn');
      removeBtn.addEventListener('click', () => this.removeLink(shortcut.id));

      // Assemble the <li>.
      li.appendChild(anchor);
      li.appendChild(removeBtn);

      listEl.appendChild(li);
    });

    // Attach `input` listener to #link-url-input so any change to the URL
    // field immediately clears #link-error (req 7.5).
    // Re-attach each render to ensure the listener is always fresh (re-attached
    // is safe because the element is not re-created — only the list is rebuilt).
    const urlInput = document.getElementById('link-url-input');
    const errorEl = document.getElementById('link-error');
    if (urlInput && errorEl) {
      // Remove any previously attached listener by cloning the node is avoided
      // here because it is not re-created; instead we use a named property to
      // track whether a listener has already been attached and skip re-attaching.
      if (!urlInput._errorClearListenerAttached) {
        urlInput.addEventListener('input', () => {
          errorEl.textContent = '';
        });
        // Mark as attached so subsequent render() calls do not stack duplicate listeners.
        urlInput._errorClearListenerAttached = true;
      }
    }
  },
};

// ---------------------------------------------------------------------------
// App
// Top-level bootstrap object.
// Calls every feature controller's init() in the correct order so that
// shared dependencies (theme, clock) are ready before task/link controllers
// that may rely on them.
// Requirements: 1.6, 10.1, 10.2
// ---------------------------------------------------------------------------

const App = {
  /**
   * Initialises every feature controller in dependency order:
   *  1. ThemeController  — applies saved colour scheme before any paint
   *  2. ClockController  — starts the live clock display
   *  3. TimerController  — restores and starts the countdown timer
   *  4. TaskController   — loads persisted tasks and renders the list
   *  5. QuickLinksController — loads persisted links and renders the grid
   */
  init() {
    ThemeController.init();
    ClockController.init();
    TimerController.init();
    TaskController.init();
    QuickLinksController.init();
  },
};

// ---------------------------------------------------------------------------
// Bootstrap
// Single global event listener — the only entry point for runtime startup.
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', App.init.bind(App));
