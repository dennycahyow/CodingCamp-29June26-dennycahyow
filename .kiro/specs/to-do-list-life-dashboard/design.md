# Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a single-page web application that combines task management, time tracking, and quick navigation features into a unified productivity interface. Built entirely with vanilla web technologies (HTML, CSS, JavaScript), the application runs client-side with no backend dependencies and uses browser Local Storage for data persistence.

The design emphasizes simplicity, maintainability, and zero external dependencies. All interactive behavior is implemented in pure JavaScript, and all styling is contained in a single CSS file. The modular architecture separates concerns into distinct feature components while maintaining a lightweight implementation suitable for deployment as static files.

### Key Design Goals

1. **Zero Dependencies**: No frameworks, libraries, or build tools—only native browser APIs
2. **Modular Architecture**: Clear separation between greeting, timer, task management, links, and theme components
3. **Data Integrity**: Robust error handling for Local Storage operations with graceful degradation
4. **Performance**: Instant UI responsiveness with efficient DOM updates and storage operations
5. **Accessibility**: WCAG AA compliance with keyboard navigation and screen reader support

## Architecture

### System Architecture

The application follows a component-based architecture where each feature module operates independently but shares a common data persistence layer and event-driven communication mechanism.

```
┌─────────────────────────────────────────────────────────┐
│                    index.html                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │            Single Page Dashboard UI               │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
  ┌──────────┐                      ┌──────────┐
  │ style.css│                      │  app.js  │
  └──────────┘                      └──────────┘
                                          │
        ┌─────────────┬─────────────┬────┴────┬─────────────┐
        ▼             ▼             ▼         ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Greeting │  │ Pomodoro │  │   Task   │  │  Quick   │  │  Theme   │
  │  Module  │  │  Timer   │  │ Manager  │  │  Links   │  │ Switcher │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
        │             │             │             │             │
        └─────────────┴─────────────┴─────────────┴─────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ Storage Manager  │
                          └──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │  Local Storage   │
                          │  (Browser API)   │
                          └──────────────────┘
```

### Component Responsibilities

**Greeting Module**

- Displays current time (updates every second)
- Displays current date
- Determines and displays time-based greeting (morning/afternoon/evening)
- Manages custom name input and display
- Persists custom name to storage

**Pomodoro Timer**

- Manages countdown timer state (running, paused, stopped)
- Handles start, stop, reset controls
- Displays timer completion indicator
- Allows duration configuration (1-120 minutes)
- Persists duration setting to storage

**Task Manager**

- CRUD operations for tasks (create, read, update, delete)
- Task status toggle (pending ↔ completed)
- Input validation (length, duplicates, empty values)
- Task sorting (pending first, then alphabetically)
- Persists task list to storage

**Quick Links Manager**

- CRUD operations for quick links
- URL validation (http/https protocol)
- Renders clickable link buttons
- Opens links in new tabs
- Persists links list to storage

**Theme Switcher**

- Toggles between light and dark modes
- Applies theme CSS classes
- Persists theme preference to storage

**Storage Manager**

- Centralized interface to Local Storage API
- JSON serialization/deserialization
- Error handling for quota exceeded, parse errors
- Graceful degradation when storage unavailable
- In-memory fallback for session continuity

## Components and Interfaces

### Component Structure

Each feature component follows a consistent pattern:

```javascript
const ComponentName = {
	state: {
		/* component-specific state */
	},

	init() {
		/* initialize component, load from storage, attach event listeners */
	},

	render() {
		/* update DOM to reflect current state */
	},

	handleUserAction() {
		/* process user input, validate, update state */
	},

	save() {
		/* persist state to storage */
	},

	load() {
		/* retrieve state from storage */
	},
};
```

### Greeting Module Interface

```javascript
GreetingModule = {
  state: {
    currentTime: Date,
    customName: string | null
  },

  init(): void
  // Initialize time update interval, load custom name, render initial state

  updateTime(): void
  // Called every second to refresh time, date, and greeting

  getGreetingPrefix(): string
  // Returns "Good Morning", "Good Afternoon", or "Good Evening" based on hour

  setCustomName(name: string): boolean
  // Validates and saves custom name. Returns true if valid, false otherwise

  validateName(name: string): { valid: boolean, error?: string }
  // Checks 1-50 chars, letters/spaces/hyphens/apostrophes only

  render(): void
  // Updates greeting text and time display in DOM
}
```

### Pomodoro Timer Interface

```javascript
PomodoroTimer = {
  state: {
    duration: number,        // in seconds
    remaining: number,       // in seconds
    isRunning: boolean,
    intervalId: number | null
  },

  init(): void
  // Load duration from storage, render initial state, attach button listeners

  start(): void
  // Begin countdown, update display every second

  stop(): void
  // Pause countdown, preserve remaining time

  reset(): void
  // Restore remaining time to configured duration

  setDuration(minutes: number): boolean
  // Validate 1-120 range, save to storage, reset timer

  tick(): void
  // Decrement remaining time, check for completion, update display

  showCompletion(): void
  // Display completion indicator (visual change, could be audio)

  render(): void
  // Update timer display (MM:SS format)
}
```

### Task Manager Interface

```javascript
TaskManager = {
  state: {
    tasks: Array<{
      id: string,           // UUID or timestamp-based unique ID
      text: string,         // 1-500 chars, trimmed
      completed: boolean,
      createdAt: number     // timestamp for stable sort
    }>
  },

  init(): void
  // Load tasks from storage, render task list, attach event listeners

  addTask(text: string): { success: boolean, error?: string }
  // Validate, check duplicates, add task, sort, save, render

  editTask(id: string, newText: string): { success: boolean, error?: string }
  // Validate, check duplicates (excluding self), update, sort, save, render

  deleteTask(id: string): void
  // Remove task, save, render

  toggleTaskStatus(id: string): void
  // Flip completed flag, sort, save, render

  validateTaskText(text: string): { valid: boolean, error?: string }
  // Check length 1-500 after trimming, not whitespace-only

  isDuplicate(text: string, excludeId?: string): boolean
  // Case-insensitive, trimmed comparison

  sortTasks(): void
  // Pending first, then completed; alphabetical within each group

  render(): void
  // Update task list in DOM with sorted tasks
}
```

### Quick Links Manager Interface

```javascript
QuickLinksManager = {
  state: {
    links: Array<{
      id: string,           // UUID or timestamp-based unique ID
      title: string,        // 1-100 chars
      url: string          // up to 2000 chars, http(s) protocol
    }>
  },

  init(): void
  // Load links from storage, render link buttons, attach listeners

  addLink(title: string, url: string): { success: boolean, error?: string }
  // Validate, add link, save, render

  editLink(id: string, title: string, url: string): { success: boolean, error?: string }
  // Validate, update link, save, render

  deleteLink(id: string): void
  // Remove link, save, render

  openLink(url: string): void
  // Open URL in new tab (window.open with noopener, noreferrer)

  validateUrl(url: string): { valid: boolean, error?: string }
  // Check starts with http:// or https://, length <= 2000

  validateTitle(title: string): { valid: boolean, error?: string }
  // Check length 1-100

  render(): void
  // Update link buttons in DOM
}
```

### Theme Switcher Interface

```javascript
ThemeSwitcher = {
  state: {
    currentTheme: 'light' | 'dark'
  },

  init(): void
  // Load theme from storage, apply theme, attach toggle listener

  toggle(): void
  // Switch between light and dark, save, apply

  applyTheme(theme: string): void
  // Add/remove CSS classes on document root or body element

  render(): void
  // Update toggle button state/icon
}
```

### Storage Manager Interface

```javascript
StorageManager = {
  isAvailable: boolean,

  init(): void
  // Check if Local Storage is available and writable

  get(key: string, defaultValue: any): any
  // Retrieve and parse JSON, return defaultValue on error

  set(key: string, value: any): boolean
  // Stringify and save, return success status

  remove(key: string): void
  // Delete item from storage

  handleQuotaExceeded(): void
  // Display user notification, continue in-memory

  handleParseError(key: string): void
  // Log error, return default value, continue gracefully
}
```

### Storage Keys

```javascript
const STORAGE_KEYS = {
	CUSTOM_NAME: "dashboard_custom_name",
	POMODORO_DURATION: "dashboard_pomodoro_duration",
	TASKS: "dashboard_tasks",
	QUICK_LINKS: "dashboard_quick_links",
	THEME: "dashboard_theme",
};
```

## Data Models

### Task Model

```javascript
{
  id: string,              // UUID v4 or timestamp-based (e.g., `task_${Date.now()}_${Math.random()}`)
  text: string,            // Trimmed, 1-500 characters
  completed: boolean,      // false = pending, true = completed
  createdAt: number        // Unix timestamp (milliseconds), for stable sort
}
```

**Validation Rules:**

- `text`: After trimming, length must be 1-500 characters
- `text`: Cannot be whitespace-only
- `text`: Duplicate check is case-insensitive on trimmed values
- `createdAt`: Set once on creation, never modified

### Quick Link Model

```javascript
{
  id: string,              // UUID v4 or timestamp-based
  title: string,           // 1-100 characters
  url: string             // Must start with http:// or https://, max 2000 chars
}
```

**Validation Rules:**

- `title`: Length 1-100 characters (no trimming specified, but recommended)
- `url`: Must match regex `^https?://`
- `url`: Length <= 2000 characters

### Settings Model

```javascript
{
  customName: string | null,       // 1-50 chars: [a-zA-Z '-]+
  pomodoroDuration: number,        // 1-120 (minutes)
  theme: 'light' | 'dark'
}
```

**Validation Rules:**

- `customName`: Regex `^[a-zA-Z ''-]{1,50}$` (letters, spaces, hyphens, apostrophes)
- `pomodoroDuration`: Integer in range [1, 120]
- `theme`: Enum ('light' or 'dark')

### Local Storage Schema

Each data model is stored separately under its own key:

```
localStorage = {
  'dashboard_custom_name': '"John Doe"',  // JSON string
  'dashboard_pomodoro_duration': '25',    // JSON number
  'dashboard_tasks': '[{...}, {...}]',    // JSON array of task objects
  'dashboard_quick_links': '[{...}]',     // JSON array of link objects
  'dashboard_theme': '"dark"'             // JSON string
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Greeting Selection Covers All Hours

_For any_ hour value in the range 0–23, the greeting prefix function SHALL return exactly "Good Morning" for hours 5–11, "Good Afternoon" for hours 12–17, and "Good Evening" for hours 18–23 and 0–4, with no hour producing an unexpected result.

**Validates: Requirements 1.3, 1.4, 1.5**

### Property 2: Custom Name Always Appears in Greeting

_For any_ valid custom name string (meeting the 1–50 character, letters/spaces/hyphens/apostrophes constraint), the rendered greeting message SHALL contain the custom name as a substring.

**Validates: Requirements 1.7**

### Property 3: Custom Name Validation Accepts Valid Names and Rejects Invalid Names

_For any_ string input to the custom name field, the validator SHALL accept the input if and only if the string length is between 1 and 50 characters and every character is a letter (a–z, A–Z), space, hyphen, or apostrophe. Any string that fails this criterion SHALL be rejected with an error, and no string that passes SHALL be rejected.

**Validates: Requirements 1.8, 1.9**

### Property 4: Pomodoro Duration Validation Accepts Exactly the Range [1, 120]

_For any_ integer input to the Pomodoro duration field, the validator SHALL accept the input if and only if it is in the inclusive range [1, 120]. Any value below 1 or above 120 SHALL be rejected, and every value in [1, 120] SHALL be accepted.

**Validates: Requirements 2.2**

### Property 5: Task Text Validation Accepts Non-Empty, Non-Whitespace-Only Text up to 500 Characters

_For any_ string submitted as a task description, the validator SHALL accept the input if and only if the trimmed version has length between 1 and 500 characters. A string composed entirely of whitespace characters SHALL always be rejected. A string with trimmed length greater than 500 characters SHALL be rejected. Every string with a trimmed length of 1–500 characters SHALL be accepted.

**Validates: Requirements 3.1, 3.9**

### Property 6: Task Text Is Always Trimmed Before Saving

_For any_ valid task text submitted (add or edit), the saved text SHALL equal the original string with all leading and trailing whitespace characters removed. The trimmed text stored in memory and Local Storage SHALL never start or end with whitespace.

**Validates: Requirements 3.2, 3.4**

### Property 7: Duplicate Detection Is Case-Insensitive and Whitespace-Normalized

_For any_ existing task list and any new task text, the duplicate check SHALL treat two task texts as duplicates if and only if their trimmed, lowercased versions are equal. Submitting a task text that is a case variation or whitespace variation of an existing task SHALL be rejected as a duplicate. Submitting a task text whose trimmed, lowercased value differs from all existing tasks SHALL not be rejected as a duplicate.

**Validates: Requirements 3.8**

### Property 8: Sorted Task List Has All Pending Tasks Before All Completed Tasks, with Alphabetical Order Within Each Group

_For any_ task list of arbitrary size and composition (any mix of pending and completed tasks with any text values), after sorting the task list SHALL satisfy these invariants simultaneously:

1. Every pending task appears before every completed task.
2. Within the pending group, tasks are ordered by their trimmed, lowercased text in non-decreasing alphabetical order.
3. Within the completed group, tasks are ordered by their trimmed, lowercased text in non-decreasing alphabetical order.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 9: Sort Is Stable for Tasks with Equal Text

_For any_ task list containing two or more tasks whose trimmed, lowercased text values are equal and share the same completion status, after sorting their relative order in the output SHALL be the same as their relative order of insertion (determined by their `createdAt` timestamp). The sort SHALL not arbitrarily reorder tasks that compare as equal.

**Validates: Requirements 4.6**

### Property 10: URL Validation Accepts Exactly HTTP and HTTPS URLs

_For any_ string submitted as a Quick_Link URL, the validator SHALL accept the input if and only if the string begins with `http://` or `https://` (case-sensitive) and has a total length of at most 2000 characters. Any string that does not start with one of these two prefixes SHALL be rejected with an inline error message. Every string that starts with `http://` or `https://` and is within the length limit SHALL be accepted.

**Validates: Requirements 5.2**

## Data Flow

### Application Initialization Flow

```
1. app.js loads and executes
2. StorageManager.init() checks Local Storage availability
3. ThemeSwitcher.init() loads and applies theme (before render)
4. GreetingModule.init() loads custom name, starts time interval
5. PomodoroTimer.init() loads duration, initializes timer state
6. TaskManager.init() loads tasks, sorts, renders
7. QuickLinksManager.init() loads links, renders
8. All components attached to DOM, application ready
```

### Task Addition Flow

```
User enters task text → clicks Add
  ↓
TaskManager.addTask(text)
  ↓
Validate: trim, check length 1-500
  ↓ (invalid)
Display inline error, return
  ↓ (valid)
Check for duplicate (case-insensitive, trimmed)
  ↓ (duplicate)
Display inline error, return
  ↓ (not duplicate)
Create task object { id, text: trimmed, completed: false, createdAt: Date.now() }
  ↓
Add to state.tasks array
  ↓
TaskManager.sortTasks()
  ↓
StorageManager.set('dashboard_tasks', state.tasks)
  ↓ (storage success)
TaskManager.render()
  ↓
Clear input field
  ↓ (storage failed)
Display warning, continue with in-memory state
```

### Theme Toggle Flow

```
User clicks theme toggle button
  ↓
ThemeSwitcher.toggle()
  ↓
Determine new theme (light ↔ dark)
  ↓
Update state.currentTheme
  ↓
StorageManager.set('dashboard_theme', currentTheme)
  ↓
ThemeSwitcher.applyTheme(currentTheme)
  ↓
Add/remove CSS classes on document.body (e.g., 'theme-dark')
  ↓
All components re-render with updated theme styles
```

## Error Handling

### Local Storage Errors

**Quota Exceeded (Storage Full)**

```javascript
try {
	localStorage.setItem(key, value);
} catch (e) {
	if (e.name === "QuotaExceededError") {
		// Display non-blocking notification to user
		showNotification("Storage full. Data will be saved for this session only.");
		// Continue with in-memory state
		return false;
	}
}
```

**Parse Errors (Corrupted Data)**

```javascript
try {
	const data = JSON.parse(localStorage.getItem(key));
	return data;
} catch (e) {
	console.error(`Failed to parse ${key}:`, e);
	// Return default value, do not crash
	return defaultValue;
}
```

**Storage Unavailable (Private Browsing, Disabled)**

```javascript
function checkStorageAvailability() {
	try {
		const testKey = "__storage_test__";
		localStorage.setItem(testKey, "1");
		localStorage.removeItem(testKey);
		return true;
	} catch (e) {
		// Display warning to user once on init
		showNotification(
			"Storage unavailable. Data will not persist across sessions.",
		);
		return false;
	}
}
```

### Input Validation Errors

All validation errors are displayed inline near the relevant input field and do not block the application:

- **Task text validation**: "Task must be 1-500 characters and cannot be empty or whitespace."
- **Task duplicate**: "This task already exists."
- **Custom name validation**: "Name must be 1-50 characters (letters, spaces, hyphens, apostrophes only)."
- **URL validation**: "URL must start with http:// or https://"
- **Pomodoro duration**: "Duration must be between 1 and 120 minutes."

### Browser Compatibility Errors

If a required API is not available:

```javascript
if (!window.localStorage) {
	showNotification(
		"Your browser does not support Local Storage. Data will not be saved.",
	);
}

if (!window.setInterval) {
	// Critical API missing, cannot run timer or clock
	showNotification(
		"Your browser is not supported. Please upgrade to a modern browser.",
	);
}
```

## Testing Strategy

The To-Do List Life Dashboard requires a comprehensive testing approach combining unit tests, property-based tests, and manual testing to ensure correctness, reliability, and user experience quality.

### Test Categories

#### 1. Unit Tests (Example-Based)

Unit tests verify specific behaviors with concrete inputs and expected outputs. These tests cover:

**Greeting Module**

- Time formatting: 09:05:03, 14:30:00, 23:59:59
- Date formatting: "Monday, July 3, 2026"
- Greeting selection: 5:00 → "Good Morning", 12:00 → "Good Afternoon", 18:00 → "Good Evening"
- Edge cases: 04:59 → "Good Evening", 11:59 → "Good Morning", 17:59 → "Good Afternoon"
- Custom name display: With name "Alice" → "Good Morning, Alice!"
- Custom name display: Without name → "Good Morning!"

**Pomodoro Timer**

- Start from 25:00, tick to 24:59
- Stop at 15:30, resume continues from 15:30
- Reset from any time returns to configured duration
- Duration change: Set to 45 minutes, timer shows 45:00
- Completion: Tick from 00:01 to 00:00 triggers completion indicator

**Task Manager CRUD**

- Add task "Buy milk" → appears in list
- Edit task "Buy milk" → "Buy bread" → text updates
- Delete task → removed from list
- Toggle status: pending → completed, completed → pending

**Quick Links CRUD**

- Add link ("Google", "https://google.com") → button appears
- Edit link → title/URL update
- Delete link → button removed
- Click link → opens in new tab (mock window.open)

**Theme Switcher**

- Toggle from light → dark applies 'theme-dark' class
- Toggle from dark → light removes 'theme-dark' class

**Storage Manager**

- Save and retrieve string value
- Save and retrieve object value
- Handle parse error gracefully with default value
- Handle quota exceeded with notification

#### 2. Property-Based Tests

Property-based tests verify universal properties across many randomly generated inputs. These tests cover the pure logic functions that exhibit interesting behavior across input variations.

**Test Framework**: We will use **fast-check** (for JavaScript), which is the standard property-based testing library for JavaScript/TypeScript projects.

**Configuration**: Each property test must run a minimum of 100 iterations to ensure adequate input coverage.

**Task Sorting Properties**

- Correctness Properties: See dedicated section below
- Tag format: `Feature: to-do-list-life-dashboard, Property {N}: {property text}`

**Input Validation Properties**

- Correctness Properties: See dedicated section below
- Tag format: `Feature: to-do-list-life-dashboard, Property {N}: {property text}`

**Data Transformation Properties**

- Correctness Properties: See dedicated section below
- Tag format: `Feature: to-do-list-life-dashboard, Property {N}: {property text}`

#### 3. Integration Tests

Integration tests verify interactions between components and with browser APIs:

- Task add → storage save → page reload → tasks restored
- Theme toggle → storage save → page reload → theme restored
- Pomodoro duration change → storage save → page reload → duration restored
- Custom name set → storage save → page reload → name displayed
- Quick link add → storage save → page reload → link rendered

#### 4. Manual Testing

Due to the UI-heavy nature of this application, manual testing is essential for:

- Visual appearance in light and dark themes
- Layout consistency across feature sections
- Hover states and focus indicators on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Responsive layout at different viewport widths
- Timer completion indicator visibility
- Error message display and positioning
- Browser compatibility (Chrome, Firefox, Edge, Safari - last 2 major versions)
- Accessibility: Screen reader testing, contrast ratios, focus management

### Test Organization

```
tests/
├── unit/
│   ├── greeting.test.js
│   ├── timer.test.js
│   ├── tasks.test.js
│   ├── links.test.js
│   ├── theme.test.js
│   └── storage.test.js
├── properties/
│   ├── task-sorting.prop.test.js
│   ├── input-validation.prop.test.js
│   └── data-transformation.prop.test.js
├── integration/
│   └── persistence.test.js
└── manual/
    └── test-checklist.md
```

### Testing Dependencies

- Test runner: **Vitest** or **Jest** (both support ESM and work with vanilla JS)
- Property-based testing: **fast-check**
- DOM testing: **jsdom** (for Node.js test environment)
- Assertions: Built-in test runner assertions

### Mocking Strategy

- `localStorage`: Mock with in-memory Map for isolated tests
- `Date.now()`: Mock for deterministic timestamp generation in task creation
- `setInterval/clearInterval`: Mock with jest.useFakeTimers() or vitest.useFakeTimers()
- `window.open`: Mock to verify calls without opening actual tabs
