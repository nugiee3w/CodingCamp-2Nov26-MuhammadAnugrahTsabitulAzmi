# Requirements Document

## Introduction

The To-Do List Life Dashboard is a personal productivity web application built as a 5-day software engineering mini project. The application runs entirely in the browser using HTML5, CSS3, and vanilla JavaScript with no backend server or external frameworks. It helps users organize daily activities through four core features: a greeting panel with a live digital clock, a focus timer, a to-do list manager, and a quick links panel for favorite websites. All user data persists via the browser's Local Storage API. The visual design features a purple-blue gradient background, white rounded cards, and a responsive two-column layout suitable for desktop, tablet, and mobile viewports.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Clock**: The live digital time display that updates every second.
- **Greeting**: The time-sensitive salutation displayed alongside the user's name.
- **Focus_Timer**: The countdown timer component with Start, Stop, and Reset controls.
- **Task**: A single to-do item managed by the to-do list component.
- **Task_List**: The ordered collection of all Tasks displayed in the dashboard.
- **Quick_Links**: The panel of user-defined website shortcuts.
- **Shortcut**: A single Quick_Links entry consisting of a link name and a URL.
- **Local_Storage**: The browser's ``localStorage`` Web API used to persist all application data client-side.
- **Theme**: The active visual color scheme — either light or dark.
- **User_Name**: The customizable display name shown in the Greeting.
- **Progress_Indicator**: The text summary showing how many Tasks are completed out of the total.
- **Dashboard_Container**: The centred wrapper element that holds all cards.

---

## Requirements

### Requirement 1: Project Structure and Technology Stack

**User Story:** As a developer, I want the application to use only HTML5, CSS3, and vanilla JavaScript with a defined folder structure, so that the project remains simple, dependency-free, and easy to maintain.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML5, CSS3, and vanilla JavaScript, and SHALL NOT load any external libraries, frameworks, or third-party scripts, whether via CDN-hosted ``<script>`` or ``<link>`` tags, inline imports, or package manager dependencies.
2. THE Dashboard SHALL include exactly one CSS file located at ``css/style.css`` and exactly one JavaScript file located at ``js/script.js``.
3. THE Dashboard SHALL reference no additional CSS or JavaScript files beyond ``css/style.css`` and ``js/script.js``.
4. THE Dashboard SHALL use semantic HTML5 elements (``<header>``, ``<nav>``, ``<main>``, ``<section>``, ``<article>``, ``<aside>``, ``<footer>``) for all major structural regions of the page, and SHALL NOT use generic ``<div>`` or ``<span>`` elements as substitutes for these structural roles.
5. THE Dashboard SHALL define all color values and all spacing values (margin, padding, gap) used for layout and theming as CSS custom properties (variables) declared in the ``:root`` selector, and SHALL NOT use hard-coded color or spacing literals outside of that declaration block.
6. THE Dashboard SHALL use ``addEventListener`` for all JavaScript event handling.
7. IF the Dashboard displays user-generated text, THEN THE Dashboard SHALL use only ``textContent``, ``document.createElement``, or ``setAttribute`` to insert that content into the DOM, and SHALL NOT use ``innerHTML``, ``outerHTML``, or ``document.write`` to render user-generated content.

---

### Requirement 2: Data Persistence

**User Story:** As a user, I want my tasks, shortcuts, name, and settings to be saved automatically, so that my data is still available after I refresh or reopen the browser.

#### Acceptance Criteria

1. THE Dashboard SHALL store the tasks list, shortcuts list, user name, and settings object exclusively in Local_Storage on the client side, requiring no backend server.
2. WHEN the Dashboard loads, THE Dashboard SHALL read the tasks list, shortcuts list, user name, and settings object from Local_Storage and restore each field to its last-saved value so that the UI reflects the state from before the reload.
3. IF Local_Storage does not contain a key for tasks, shortcuts, user name, or settings, THEN THE Dashboard SHALL initialise that key with its default value (empty list for tasks and shortcuts, empty string for user name, and the default settings object) and SHALL NOT throw an unhandled error.
4. IF Local_Storage contains an unparseable JSON string for any key among tasks, shortcuts, user name, or settings, THEN THE Dashboard SHALL discard that entry, initialise that key with its default value (empty list for tasks and shortcuts, empty string for user name, and the default settings object), and SHALL NOT throw an unhandled error.
5. WHEN any change is made to the tasks list, shortcuts list, user name, or settings object, THE Dashboard SHALL write the updated value to Local_Storage synchronously within the same execution frame as the change so that a subsequent page reload restores the updated state.

---

### Requirement 3: Browser Compatibility

**User Story:** As a user, I want the application to work correctly on all major modern browsers, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE Dashboard SHALL load fully, render all UI components, and allow user interactions on the latest stable release of Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari.
2. THE Dashboard SHALL produce no JavaScript console errors during page load, navigation between views, data display, and form submission on any of the supported browsers listed in criterion 1.
3. THE Dashboard SHALL display all UI components without layout breakage, overlapping elements, or missing content on any of the supported browsers listed in criterion 1.

---

### Requirement 4: Greeting and Digital Clock

**User Story:** As a user, I want to see a live clock, the current date, and a personalized time-based greeting, so that I always know the time and feel welcomed by the dashboard.

#### Acceptance Criteria

1. THE Clock SHALL display the current local time in HH:MM:SS format and SHALL update every second without requiring a page reload.
2. THE Dashboard SHALL display the current local date below the Clock in the format "WEEKDAY_NAME, D MONTH_NAME YYYY" (for example "Monday, 6 November 2026").
3. WHEN the local time is between 05:00 and 11:59, THE Greeting SHALL read "Good Morning, [User_Name]".
4. WHEN the local time is between 12:00 and 17:59, THE Greeting SHALL read "Good Afternoon, [User_Name]".
5. WHEN the local time is between 18:00 and 20:59, THE Greeting SHALL read "Good Evening, [User_Name]".
6. WHEN the local time is between 21:00 and 04:59, THE Greeting SHALL read "Good Night, [User_Name]".
7. WHEN the local time changes such that a new greeting period begins, THE Greeting SHALL update automatically without requiring a page reload.
8. THE Dashboard SHALL display a User_Name input field, accepting between 1 and 50 characters, and a confirm action (button press or Enter key) that allows the user to set or change the User_Name displayed in the Greeting.
9. WHEN the user submits a non-empty User_Name of 1 to 50 characters, THE Dashboard SHALL persist the User_Name in Local_Storage and update the Greeting within 1 second.
10. IF the user submits an empty or whitespace-only User_Name, THEN THE Dashboard SHALL retain the current User_Name in the Greeting and in Local_Storage without modification.
11. WHEN the Dashboard loads and Local_Storage contains a saved User_Name, THE Dashboard SHALL display that saved User_Name in the Greeting.
12. IF the Dashboard loads and Local_Storage contains no saved User_Name, THEN THE Dashboard SHALL display "User" as the default placeholder name in the Greeting.

---

### Requirement 5: Focus Timer

**User Story:** As a user, I want a countdown timer that I can start, stop, and reset, so that I can use the Pomodoro technique to focus on tasks without distraction.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the remaining time in MM:SS format.
2. WHEN the Dashboard loads, THE Focus_Timer SHALL initialise to 25:00 by default.
3. WHEN the user activates the Start button, THE Focus_Timer SHALL begin counting down one second at a time.
4. WHILE the Focus_Timer is running and the user activates the Stop button, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Reset button, THE Focus_Timer SHALL restore the remaining time to 25:00, stop any active countdown, and dismiss the session-complete notification banner if it is currently visible.
6. IF the user activates the Start button while the Focus_Timer is already running, THEN THE Focus_Timer SHALL NOT start an additional countdown interval.
7. WHEN the Focus_Timer countdown reaches 00:00, THE Dashboard SHALL stop the countdown and display a visible in-page notification banner indicating the session is complete.
8. WHEN the Focus_Timer countdown reaches 00:00, THE Focus_Timer SHALL remain at 00:00 until the user activates the Reset button.
9. IF the user activates the Stop button while the Focus_Timer is not running, THEN THE Focus_Timer SHALL remain in its current state without modifying the displayed time.

---

### Requirement 6: To-Do List

**User Story:** As a user, I want to add, edit, complete, and delete tasks in a persistent list, so that I can track and manage my daily activities effectively.

#### Acceptance Criteria

1. THE Task_List SHALL display all Tasks in a vertical list, each row containing a checkbox, the task name, an Edit button, and a Delete button.
2. WHEN the user submits a new task name of 1 to 200 characters (after trimming) and activates the Add button, THE Task_List SHALL add the new Task and save the updated Task_List to Local_Storage.
3. IF the user submits an empty task name, a task name consisting only of whitespace, or a task name exceeding 200 characters after trimming, THEN THE Task_List SHALL reject the submission and SHALL NOT add a Task.
4. THE Task_List SHALL trim leading and trailing whitespace from all task name inputs before processing.
5. IF the user submits a task name that, after trimming, matches an existing Task name using a case-insensitive comparison, THEN THE Task_List SHALL reject the submission, display a duplicate-detected message to the user, and SHALL NOT add the Task.
6. WHEN the user activates the checkbox of a Task, THE Task_List SHALL toggle the completed state of that Task and SHALL apply a strikethrough style to the task name of completed Tasks and remove the strikethrough style from the task name of incomplete Tasks.
7. WHEN the user activates the Edit button of a Task, THE Task_List SHALL replace the task name display with an editable input pre-filled with the current task name, a Confirm button, and a Cancel button.
8. WHEN the user activates the Confirm button during an edit, THE Task_List SHALL trim the updated name, validate it is non-empty and not a duplicate of another existing Task name (case-insensitive), save the updated Task_List to Local_Storage, and replace the editable input with the updated task name display.
9. IF the user edits a Task to a name that, after trimming, matches another existing Task name using a case-insensitive comparison, THEN THE Task_List SHALL reject the edit and display a duplicate-detected message.
10. WHEN the user activates the Delete button of a Task, THE Task_List SHALL remove that Task from the list and save the updated Task_List to Local_Storage.
11. THE Dashboard SHALL display a Progress_Indicator showing the count of completed Tasks and the total Task count in the format "[completed] of [total] tasks completed".
12. WHEN the Task_List changes, THE Progress_Indicator SHALL update to reflect the current counts within 100 milliseconds of the change.
13. WHEN the Dashboard loads, THE Task_List SHALL restore all Tasks saved in Local_Storage, including each Task's name and completed state.
14. WHEN the user activates the Cancel button during an edit, THE Task_List SHALL discard all changes and restore the original task name display without modifying the Task or Local_Storage.

---

### Requirement 7: Quick Links

**User Story:** As a user, I want to save and open favorite website shortcuts from the dashboard, so that I can access frequently visited sites with a single click.

#### Acceptance Criteria

1. THE Quick_Links panel SHALL display all saved Shortcuts, each showing the link name and a clickable element that opens the URL.
2. WHEN the user activates a Shortcut, THE Dashboard SHALL open the associated URL in a new browser tab without passing referrer information or granting the opened page access to the originating page.
3. WHEN the Dashboard first loads and Local_Storage contains no saved Shortcuts, THE Quick_Links panel SHALL populate with three default Shortcuts: Google (https://www.google.com), Gmail (https://mail.google.com), and Google Calendar (https://calendar.google.com).
4. WHEN the user provides a link name of 1 to 50 characters and a URL of 1 to 2048 characters and activates the Add Shortcut action, and the total number of saved Shortcuts is fewer than 20, THE Quick_Links panel SHALL add the new Shortcut and save the updated Shortcuts list to Local_Storage.
5. IF the user submits a URL that does not begin with ``http://`` or ``https://``, THEN THE Quick_Links panel SHALL reject the submission, SHALL NOT add a Shortcut, and SHALL display a URL validation error message inline below the URL input field; the error message SHALL be cleared when the user modifies the URL input field.
6. IF the user submits an empty link name or an empty URL, THEN THE Quick_Links panel SHALL reject the submission, SHALL NOT add a Shortcut, and SHALL display a validation error message indicating which field is empty.
7. WHEN the user activates the Remove button of a Shortcut, THE Quick_Links panel SHALL remove that Shortcut, including any of the three default Shortcuts, and save the updated Shortcuts list to Local_Storage.
8. WHEN the Dashboard loads and Local_Storage contains saved Shortcuts, THE Quick_Links panel SHALL restore and display those Shortcuts.
9. IF the total number of saved Shortcuts is 20 and the user activates the Add Shortcut action, THEN THE Quick_Links panel SHALL reject the submission, SHALL NOT add a Shortcut, and SHALL display an error message indicating the maximum number of Shortcuts has been reached.

---

### Requirement 8: Light / Dark Mode

**User Story:** As a user, I want to toggle between light and dark themes, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a theme toggle button located within the header element that is visible in both light and dark themes.
2. WHEN the user activates the theme toggle button, THE Dashboard SHALL switch the active Theme between light and dark.
3. WHILE the dark Theme is active, THE Dashboard SHALL apply dark-mode color values to all visible UI elements such that all text-to-background color combinations meet a minimum contrast ratio of 4.5:1.
4. WHILE the light Theme is active, THE Dashboard SHALL apply light-mode color values to all visible UI elements such that all text-to-background color combinations meet a minimum contrast ratio of 4.5:1.
5. THE Dashboard SHALL use CSS variables to control all theme-related colors.
6. WHEN the user switches the Theme, THE Dashboard SHALL update all theme-related CSS variables without requiring a page reload, and THE Dashboard SHALL save the selected Theme to Local_Storage.
7. WHEN the Dashboard loads and a Theme value is present in Local_Storage, THE Dashboard SHALL apply the saved Theme by updating the CSS variables before the first paint, such that no Theme transition is visible during page load.
8. WHEN the Dashboard loads and no Theme value is present in Local_Storage, THE Dashboard SHALL apply the Theme that matches the operating system color-scheme preference if detectable, otherwise apply the light Theme by default.
9. IF Local_Storage is unavailable when the Dashboard attempts to read or write the Theme, THEN THE Dashboard SHALL apply the light Theme as the default and continue functioning without saving the Theme preference.

---

### Requirement 9: Visual Design and Layout

**User Story:** As a user, I want the dashboard to have a clean, modern appearance that works on desktop, tablet, and mobile, so that I can use it comfortably on any device.

#### Acceptance Criteria

1. THE Dashboard SHALL display a purple-to-blue gradient as the page background.
2. THE Dashboard SHALL use a centred Dashboard_Container that holds all content cards.
3. THE Dashboard SHALL render each feature section (Header, Focus_Timer, Task_List, Quick_Links) inside a white card with a border radius of at least 4 pixels and a visible drop shadow.
4. THE Dashboard SHALL display a full-width header card containing the Clock, current date, Greeting, User_Name input, and theme toggle button.
5. WHILE the viewport width is 768 pixels or greater, THE Dashboard SHALL display the Focus_Timer card and Quick_Links card in the left column and the Task_List card in the right column.
6. WHILE the viewport width is less than 768 pixels, THE Dashboard SHALL stack all cards vertically in a single column and ensure that no content overflows the viewport horizontally.
7. THE Dashboard SHALL use a uniform gap of at least 16 pixels between cards, a minimum body text size of 14 pixels, and at least two visually distinct heading levels across all cards in both the light and dark Themes.
8. THE Dashboard SHALL render all interactive controls — buttons and input fields — with a minimum tap target size of 44 x 44 pixels and ensure that each control is reachable via the Tab key and activatable via the Enter or Space key.
9. THE Dashboard SHALL provide accessible labels or ``aria-label`` attributes for all icon-only buttons.

---

### Requirement 10: Code Quality and Security

**User Story:** As a developer, I want the codebase to follow consistent quality and security standards, so that the application is maintainable, readable, and safe against common client-side vulnerabilities.

#### Acceptance Criteria

1. THE Dashboard SHALL use camelCase naming convention for all JavaScript functions and variables, where each name is at least two words or a single descriptive word of five or more characters, except for standard loop indices.
2. THE Dashboard SHALL avoid unnecessary global JavaScript variables and SHALL encapsulate logic within functions or closures.
3. WHEN a user submits a task name or Shortcut name, THE Dashboard SHALL reject the input and display an error message indicating the validation failure if the value is empty, exceeds 100 characters, or contains characters outside of Unicode letters, digits, spaces, hyphens, and underscores.
4. WHEN a user submits a URL value, THE Dashboard SHALL reject the input and display an error message indicating the validation failure if the value does not match a well-formed URL containing a valid scheme (http or https), a hostname, and no unencoded whitespace characters.
5. THE Dashboard SHALL include code comments at all logic sections containing bitwise operations, regular expressions, or non-standard algorithm patterns to explain the intent of that section.
6. THE Dashboard SHALL ensure that all button elements have a discernible accessible name, either through visible text or an ``aria-label`` attribute.
