/**
 * To-Do List Life Dashboard - Main Application Entry Point
 *
 * This file contains all application modules and the main initialization
 * function. All interactive behavior is implemented in vanilla JavaScript
 * with no external dependencies.
 *
 * Modules (to be implemented in subsequent tasks):
 *  - StorageManager  : Local Storage wrapper with error handling
 *  - GreetingModule  : Time, date, and personalized greeting
 *  - PomodoroTimer   : Countdown timer with start/stop/reset
 *  - TaskManager     : Task CRUD, sorting, and persistence
 *  - QuickLinksManager: Quick link CRUD and persistence
 *  - ThemeSwitcher   : Light/dark theme toggle and persistence
 */

/**
 * Storage Keys Constants
 * Centralized storage key definitions for all persisted data
 */
const STORAGE_KEYS = {
	CUSTOM_NAME: "dashboard_custom_name",
	POMODORO_DURATION: "dashboard_pomodoro_duration",
	TASKS: "dashboard_tasks",
	QUICK_LINKS: "dashboard_quick_links",
	THEME: "dashboard_theme",
};

/**
 * Storage Manager Module
 * Provides a centralized interface to Local Storage with error handling
 * and graceful degradation when storage is unavailable.
 */
const StorageManager = {
	/**
	 * Indicates whether Local Storage is available and writable
	 */
	isAvailable: false,

	/**
	 * Initialize the Storage Manager
	 * Checks if Local Storage API is available and writable
	 */
	init() {
		try {
			const testKey = "__storage_test__";
			localStorage.setItem(testKey, "1");
			localStorage.removeItem(testKey);
			this.isAvailable = true;
		} catch (e) {
			this.isAvailable = false;
			console.warn("Local Storage is not available:", e);
			this.showNotification(
				"Storage unavailable. Data will not persist across sessions.",
			);
		}
	},

	/**
	 * Retrieve and parse a value from Local Storage
	 * @param {string} key - The storage key to retrieve
	 * @param {*} defaultValue - The default value to return if key doesn't exist or parsing fails
	 * @returns {*} The parsed value or defaultValue
	 */
	get(key, defaultValue) {
		if (!this.isAvailable) {
			return defaultValue;
		}

		try {
			const item = localStorage.getItem(key);
			if (item === null) {
				return defaultValue;
			}
			return JSON.parse(item);
		} catch (e) {
			console.error(`Failed to parse storage key "${key}":`, e);
			return defaultValue;
		}
	},

	/**
	 * Stringify and save a value to Local Storage
	 * @param {string} key - The storage key to save to
	 * @param {*} value - The value to stringify and save
	 * @returns {boolean} True if save succeeded, false otherwise
	 */
	set(key, value) {
		if (!this.isAvailable) {
			return false;
		}

		try {
			const serialized = JSON.stringify(value);
			localStorage.setItem(key, serialized);
			return true;
		} catch (e) {
			if (e.name === "QuotaExceededError") {
				console.error("Storage quota exceeded:", e);
				this.showNotification(
					"Storage full. Data will be saved for this session only.",
				);
			} else {
				console.error(`Failed to save to storage key "${key}":`, e);
			}
			return false;
		}
	},

	/**
	 * Remove an item from Local Storage
	 * @param {string} key - The storage key to remove
	 */
	remove(key) {
		if (!this.isAvailable) {
			return;
		}

		try {
			localStorage.removeItem(key);
		} catch (e) {
			console.error(`Failed to remove storage key "${key}":`, e);
		}
	},

	/**
	 * Display a notification to the user
	 * This is a simple implementation; can be enhanced with a proper UI notification system
	 * @param {string} message - The message to display
	 */
	showNotification(message) {
		// For now, just log to console. In a full implementation, this would show
		// a visible UI notification (toast, banner, etc.)
		console.warn("NOTIFICATION:", message);
	},
};

/**
 * Pomodoro Timer Module
 * Manages countdown timer state with start, stop, reset controls
 * Persists duration setting to Local Storage
 */
const PomodoroTimer = {
	/**
	 * Timer state
	 */
	state: {
		duration: 25 * 60, // duration in seconds (default 25 minutes)
		remaining: 25 * 60, // remaining time in seconds
		isRunning: false,
		intervalId: null,
	},

	/**
	 * Initialize the Pomodoro Timer
	 * Load duration from storage, render initial state, attach event listeners
	 */
	init() {
		// Load duration from storage (in minutes), default to 25
		const savedDuration = StorageManager.get(
			STORAGE_KEYS.POMODORO_DURATION,
			25,
		);
		this.state.duration = savedDuration * 60; // convert to seconds
		this.state.remaining = this.state.duration;

		// Update the duration input field
		const durationInput = document.getElementById("timer-duration-input");
		if (durationInput) {
			durationInput.value = savedDuration;
		}

		// Render initial display
		this.render();

		// Attach event listeners
		this.attachEventListeners();
	},

	/**
	 * Attach event listeners to timer controls
	 */
	attachEventListeners() {
		const startBtn = document.getElementById("timer-start");
		const stopBtn = document.getElementById("timer-stop");
		const resetBtn = document.getElementById("timer-reset");
		const durationSaveBtn = document.getElementById("timer-duration-save");
		const durationInput = document.getElementById("timer-duration-input");

		if (startBtn) {
			startBtn.addEventListener("click", () => this.start());
		}

		if (stopBtn) {
			stopBtn.addEventListener("click", () => this.stop());
		}

		if (resetBtn) {
			resetBtn.addEventListener("click", () => this.reset());
		}

		if (durationSaveBtn) {
			durationSaveBtn.addEventListener("click", () => {
				const input = document.getElementById("timer-duration-input");
				if (input) {
					const minutes = parseInt(input.value, 10);
					this.setDuration(minutes);
				}
			});
		}

		// Allow Enter key to save duration
		if (durationInput) {
			durationInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					const minutes = parseInt(e.target.value, 10);
					this.setDuration(minutes);
				}
			});
		}
	},

	/**
	 * Start the countdown timer
	 */
	start() {
		if (this.state.isRunning) {
			return; // Already running
		}

		this.state.isRunning = true;

		// Hide completion indicator when starting
		const completionEl = document.getElementById("timer-completion");
		if (completionEl) {
			completionEl.classList.add("hidden");
		}

		// Start interval to call tick every 1000ms
		this.state.intervalId = setInterval(() => {
			this.tick();
		}, 1000);

		this.render();
	},

	/**
	 * Stop (pause) the countdown timer
	 * Preserves remaining time
	 */
	stop() {
		if (!this.state.isRunning) {
			return; // Not running
		}

		this.state.isRunning = false;

		// Clear interval
		if (this.state.intervalId !== null) {
			clearInterval(this.state.intervalId);
			this.state.intervalId = null;
		}

		this.render();
	},

	/**
	 * Reset the timer to configured duration
	 */
	reset() {
		// Stop the timer if running
		this.stop();

		// Restore remaining time to configured duration
		this.state.remaining = this.state.duration;

		// Hide completion indicator
		const completionEl = document.getElementById("timer-completion");
		if (completionEl) {
			completionEl.classList.add("hidden");
		}

		this.render();
	},

	/**
	 * Tick function - decrement remaining time and check for completion
	 * Called every second when timer is running
	 */
	tick() {
		if (this.state.remaining > 0) {
			this.state.remaining--;
			this.render();
		}

		// Check for completion (reached zero)
		if (this.state.remaining === 0) {
			this.stop();
			this.showCompletion();
		}
	},

	/**
	 * Set the timer duration (in minutes)
	 * Validates input and saves to storage
	 * @param {number} minutes - Duration in minutes (must be 1-120)
	 * @returns {boolean} True if valid and saved, false otherwise
	 */
	setDuration(minutes) {
		const errorEl = document.getElementById("timer-duration-error");

		// Validate: must be integer in range [1, 120]
		if (
			!Number.isInteger(minutes) ||
			minutes < 1 ||
			minutes > 120 ||
			isNaN(minutes)
		) {
			if (errorEl) {
				errorEl.textContent = "Duration must be between 1 and 120 minutes.";
			}
			return false;
		}

		// Clear error message
		if (errorEl) {
			errorEl.textContent = "";
		}

		// Update duration
		this.state.duration = minutes * 60; // convert to seconds

		// Save to storage (in minutes)
		StorageManager.set(STORAGE_KEYS.POMODORO_DURATION, minutes);

		// Reset the timer to new duration
		this.reset();

		return true;
	},

	/**
	 * Display completion indicator
	 */
	showCompletion() {
		const completionEl = document.getElementById("timer-completion");
		if (completionEl) {
			completionEl.classList.remove("hidden");
		}
	},

	/**
	 * Render the timer display in MM:SS format
	 */
	render() {
		const timerDisplay = document.getElementById("timer-display");
		if (!timerDisplay) {
			return;
		}

		// Convert remaining seconds to MM:SS format
		const minutes = Math.floor(this.state.remaining / 60);
		const seconds = this.state.remaining % 60;

		// Pad with zeros
		const minutesStr = String(minutes).padStart(2, "0");
		const secondsStr = String(seconds).padStart(2, "0");

		timerDisplay.textContent = `${minutesStr}:${secondsStr}`;

		// Update aria-live for screen readers when timer is running
		if (this.state.isRunning) {
			timerDisplay.setAttribute("aria-live", "off"); // Don't announce every second
		}
	},
};

/**
 * Theme Switcher Module
 * Manages light/dark theme toggle with persistence to Local Storage
 */
const ThemeSwitcher = {
	/**
	 * Theme state
	 */
	state: {
		currentTheme: "light", // 'light' or 'dark'
	},

	/**
	 * Initialize the Theme Switcher
	 * Load theme from storage, apply theme, attach event listeners
	 */
	init() {
		// Load theme from storage, default to 'light'
		this.state.currentTheme = StorageManager.get(STORAGE_KEYS.THEME, "light");

		// Apply the theme before any content renders
		this.applyTheme(this.state.currentTheme);

		// Attach event listener to toggle button
		const toggleButton = document.getElementById("theme-toggle");
		if (toggleButton) {
			toggleButton.addEventListener("click", () => this.toggle());
		}

		// Initial render to update button state
		this.render();
	},

	/**
	 * Toggle between light and dark themes
	 */
	toggle() {
		// Switch theme
		if (this.state.currentTheme === "light") {
			this.state.currentTheme = "dark";
		} else {
			this.state.currentTheme = "light";
		}

		// Save to storage
		StorageManager.set(STORAGE_KEYS.THEME, this.state.currentTheme);

		// Apply the new theme
		this.applyTheme(this.state.currentTheme);

		// Update button state
		this.render();
	},

	/**
	 * Apply theme by adding/removing CSS classes
	 * @param {string} theme - The theme to apply ('light' or 'dark')
	 */
	applyTheme(theme) {
		if (theme === "dark") {
			document.body.classList.add("theme-dark");
		} else {
			document.body.classList.remove("theme-dark");
		}
	},

	/**
	 * Render the toggle button state and icon
	 */
	render() {
		const toggleButton = document.getElementById("theme-toggle");
		const toggleIcon = toggleButton?.querySelector(".theme-toggle-icon");
		const toggleLabel = toggleButton?.querySelector(".theme-toggle-label");

		if (!toggleButton) {
			return;
		}

		// Update button aria-pressed attribute
		const isDark = this.state.currentTheme === "dark";
		toggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");

		// Update icon and label based on current theme
		if (toggleIcon) {
			toggleIcon.textContent = isDark ? "☀️" : "🌙";
		}

		if (toggleLabel) {
			toggleLabel.textContent = isDark ? "Light Mode" : "Dark Mode";
		}
	},
};

/**
 * Task Manager Module
 * Manages CRUD operations for tasks with validation, duplicate checking,
 * and automatic sorting (pending first, then alphabetically within groups)
 */
const TaskManager = {
	/**
	 * Task Manager state
	 */
	state: {
		tasks: [], // Array of task objects: { id, text, completed, createdAt }
	},

	/**
	 * Initialize the Task Manager
	 * Load tasks from storage, sort, render, attach event listeners
	 */
	init() {
		// Load tasks from storage
		const savedTasks = StorageManager.get(STORAGE_KEYS.TASKS, []);
		this.state.tasks = savedTasks;

		// Sort tasks
		this.sortTasks();

		// Render initial task list
		this.render();

		// Attach event listeners
		this.attachEventListeners();
	},

	/**
	 * Attach event listeners to task controls
	 */
	attachEventListeners() {
		const addBtn = document.getElementById("task-add-btn");
		const taskInput = document.getElementById("task-input");

		if (addBtn) {
			addBtn.addEventListener("click", () => {
				const text = taskInput ? taskInput.value : "";
				this.addTask(text);
			});
		}

		// Allow Enter key to add task
		if (taskInput) {
			taskInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					this.addTask(taskInput.value);
				}
			});
		}
	},

	/**
	 * Add a new task
	 * @param {string} text - The task text to add
	 * @returns {{success: boolean, error?: string}} Result of add operation
	 */
	addTask(text) {
		const errorEl = document.getElementById("task-input-error");

		// Validate task text
		const validation = this.validateTaskText(text);
		if (!validation.valid) {
			if (errorEl) {
				errorEl.textContent = validation.error;
			}
			return { success: false, error: validation.error };
		}

		// Trim the text
		const trimmedText = text.trim();

		// Check for duplicates
		if (this.isDuplicate(trimmedText)) {
			const error = "This task already exists.";
			if (errorEl) {
				errorEl.textContent = error;
			}
			return { success: false, error };
		}

		// Clear error message
		if (errorEl) {
			errorEl.textContent = "";
		}

		// Create new task object
		const newTask = {
			id: `task_${Date.now()}_${Math.random()}`,
			text: trimmedText,
			completed: false,
			createdAt: Date.now(),
		};

		// Add to state
		this.state.tasks.push(newTask);

		// Sort tasks
		this.sortTasks();

		// Save to storage
		StorageManager.set(STORAGE_KEYS.TASKS, this.state.tasks);

		// Render updated list
		this.render();

		// Clear input field
		const taskInput = document.getElementById("task-input");
		if (taskInput) {
			taskInput.value = "";
		}

		return { success: true };
	},

	/**
	 * Edit an existing task
	 * @param {string} id - The task ID to edit
	 * @param {string} newText - The new text for the task
	 * @returns {{success: boolean, error?: string}} Result of edit operation
	 */
	editTask(id, newText) {
		// Validate task text
		const validation = this.validateTaskText(newText);
		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		// Trim the text
		const trimmedText = newText.trim();

		// Check for duplicates (excluding self)
		if (this.isDuplicate(trimmedText, id)) {
			const error = "This task already exists.";
			return { success: false, error };
		}

		// Find and update task
		const task = this.state.tasks.find((t) => t.id === id);
		if (!task) {
			return { success: false, error: "Task not found." };
		}

		task.text = trimmedText;

		// Sort tasks
		this.sortTasks();

		// Save to storage
		StorageManager.set(STORAGE_KEYS.TASKS, this.state.tasks);

		// Render updated list
		this.render();

		return { success: true };
	},

	/**
	 * Delete a task
	 * @param {string} id - The task ID to delete
	 */
	deleteTask(id) {
		// Remove task from state
		this.state.tasks = this.state.tasks.filter((task) => task.id !== id);

		// Save to storage
		StorageManager.set(STORAGE_KEYS.TASKS, this.state.tasks);

		// Render updated list
		this.render();
	},

	/**
	 * Toggle task completion status
	 * @param {string} id - The task ID to toggle
	 */
	toggleTaskStatus(id) {
		// Find task and flip completed flag
		const task = this.state.tasks.find((t) => t.id === id);
		if (task) {
			task.completed = !task.completed;

			// Sort tasks (completed tasks move to bottom)
			this.sortTasks();

			// Save to storage
			StorageManager.set(STORAGE_KEYS.TASKS, this.state.tasks);

			// Render updated list
			this.render();
		}
	},

	/**
	 * Validate task text
	 * @param {string} text - The text to validate
	 * @returns {{valid: boolean, error?: string}} Validation result
	 */
	validateTaskText(text) {
		// Check if text exists and is not empty after trimming
		if (!text || text.trim().length === 0) {
			return {
				valid: false,
				error: "Task cannot be empty or whitespace-only.",
			};
		}

		const trimmed = text.trim();

		// Check length: 1-500 characters after trimming
		if (trimmed.length < 1 || trimmed.length > 500) {
			return {
				valid: false,
				error: "Task must be 1-500 characters.",
			};
		}

		return { valid: true };
	},

	/**
	 * Check if a task text is a duplicate
	 * @param {string} text - The text to check (should be trimmed)
	 * @param {string} [excludeId] - Optional task ID to exclude from check (for edit operation)
	 * @returns {boolean} True if duplicate exists, false otherwise
	 */
	isDuplicate(text, excludeId) {
		const lowerText = text.toLowerCase();

		return this.state.tasks.some((task) => {
			// Skip the task being edited
			if (excludeId && task.id === excludeId) {
				return false;
			}

			// Case-insensitive, trimmed comparison
			return task.text.trim().toLowerCase() === lowerText;
		});
	},

	/**
	 * Sort tasks: pending first, then completed, alphabetically within each group
	 * Maintains stable sort by createdAt for tasks with equal text
	 */
	sortTasks() {
		this.state.tasks.sort((a, b) => {
			// First, sort by completion status (pending before completed)
			if (a.completed !== b.completed) {
				return a.completed ? 1 : -1; // false (pending) comes before true (completed)
			}

			// Within same completion status, sort alphabetically by trimmed, lowercased text
			const textA = a.text.trim().toLowerCase();
			const textB = b.text.trim().toLowerCase();

			const textComparison = textA.localeCompare(textB);

			// If text is equal, maintain insertion order (stable sort by createdAt)
			if (textComparison === 0) {
				return a.createdAt - b.createdAt;
			}

			return textComparison;
		});
	},

	/**
	 * Render the task list to DOM
	 */
	render() {
		const taskList = document.getElementById("task-list");
		const emptyState = document.getElementById("task-list-empty");

		if (!taskList) {
			return;
		}

		// Clear existing content
		taskList.innerHTML = "";

		// Show/hide empty state
		if (this.state.tasks.length === 0) {
			if (emptyState) {
				emptyState.style.display = "block";
			}
			return;
		} else {
			if (emptyState) {
				emptyState.style.display = "none";
			}
		}

		// Render each task
		this.state.tasks.forEach((task) => {
			const li = document.createElement("li");
			li.className = "task-item";
			if (task.completed) {
				li.classList.add("task-item--completed");
			}

			// Checkbox for toggle status
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.className = "task-checkbox";
			checkbox.checked = task.completed;
			checkbox.setAttribute(
				"aria-label",
				`Mark "${task.text}" as ${task.completed ? "pending" : "completed"}`,
			);
			checkbox.addEventListener("change", () => {
				this.toggleTaskStatus(task.id);
			});

			// Task text
			const taskText = document.createElement("span");
			taskText.className = "task-text";
			taskText.textContent = task.text;

			// Edit button
			const editBtn = document.createElement("button");
			editBtn.type = "button";
			editBtn.className = "btn btn-small btn-secondary";
			editBtn.textContent = "Edit";
			editBtn.setAttribute("aria-label", `Edit task "${task.text}"`);
			editBtn.addEventListener("click", () => {
				this.showEditForm(task.id);
			});

			// Delete button
			const deleteBtn = document.createElement("button");
			deleteBtn.type = "button";
			deleteBtn.className = "btn btn-small btn-danger";
			deleteBtn.textContent = "Delete";
			deleteBtn.setAttribute("aria-label", `Delete task "${task.text}"`);
			deleteBtn.addEventListener("click", () => {
				this.deleteTask(task.id);
			});

			// Assemble task item
			li.appendChild(checkbox);
			li.appendChild(taskText);
			li.appendChild(editBtn);
			li.appendChild(deleteBtn);

			taskList.appendChild(li);
		});
	},

	/**
	 * Show inline edit form for a task
	 * @param {string} id - The task ID to edit
	 */
	showEditForm(id) {
		const task = this.state.tasks.find((t) => t.id === id);
		if (!task) {
			return;
		}

		// Find the task item in the DOM
		const taskList = document.getElementById("task-list");
		if (!taskList) {
			return;
		}

		const taskItems = taskList.querySelectorAll(".task-item");
		const taskIndex = this.state.tasks.indexOf(task);
		const taskItem = taskItems[taskIndex];

		if (!taskItem) {
			return;
		}

		// Create edit form
		const editForm = document.createElement("div");
		editForm.className = "task-edit-form";

		const editInput = document.createElement("input");
		editInput.type = "text";
		editInput.className = "form-input";
		editInput.value = task.text;
		editInput.maxLength = 500;

		const saveBtn = document.createElement("button");
		saveBtn.type = "button";
		saveBtn.className = "btn btn-small btn-primary";
		saveBtn.textContent = "Save";

		const cancelBtn = document.createElement("button");
		cancelBtn.type = "button";
		cancelBtn.className = "btn btn-small btn-secondary";
		cancelBtn.textContent = "Cancel";

		const errorMsg = document.createElement("p");
		errorMsg.className = "error-message";
		errorMsg.setAttribute("role", "alert");
		errorMsg.setAttribute("aria-live", "assertive");

		// Save handler
		const handleSave = () => {
			const result = this.editTask(id, editInput.value);
			if (!result.success) {
				errorMsg.textContent = result.error;
			} else {
				// Success - render will replace the edit form
			}
		};

		// Cancel handler
		const handleCancel = () => {
			this.render(); // Re-render to remove edit form
		};

		saveBtn.addEventListener("click", handleSave);
		cancelBtn.addEventListener("click", handleCancel);

		// Allow Enter to save, Escape to cancel
		editInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				handleSave();
			}
		});
		editInput.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				handleCancel();
			}
		});

		editForm.appendChild(editInput);
		editForm.appendChild(saveBtn);
		editForm.appendChild(cancelBtn);
		editForm.appendChild(errorMsg);

		// Replace task item with edit form
		taskItem.innerHTML = "";
		taskItem.appendChild(editForm);

		// Focus the input
		editInput.focus();
		editInput.select();
	},
};

/**
 * Quick Links Manager Module
 * Manages CRUD operations for quick links with URL validation
 * Opens links in new tabs and persists to Local Storage
 */
const QuickLinksManager = {
	/**
	 * Module state
	 */
	state: {
		links: [], // Array of { id, title, url }
	},

	/**
	 * Initialize the Quick Links Manager
	 * Load links from storage, render link buttons, attach event listeners
	 */
	init() {
		// Load links from storage
		this.state.links = StorageManager.get(STORAGE_KEYS.QUICK_LINKS, []);

		// Attach event listeners
		this.attachEventListeners();

		// Initial render
		this.render();
	},

	/**
	 * Attach event listeners to link controls
	 */
	attachEventListeners() {
		const addBtn = document.getElementById("link-add-btn");
		const titleInput = document.getElementById("link-title-input");
		const urlInput = document.getElementById("link-url-input");

		if (addBtn) {
			addBtn.addEventListener("click", () => {
				const title = titleInput.value;
				const url = urlInput.value;
				this.addLink(title, url);
			});
		}

		// Allow Enter key to add link (when focused on either input)
		if (titleInput) {
			titleInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					const title = titleInput.value;
					const url = urlInput.value;
					this.addLink(title, url);
				}
			});
		}

		if (urlInput) {
			urlInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					const title = titleInput.value;
					const url = urlInput.value;
					this.addLink(title, url);
				}
			});
		}
	},

	/**
	 * Add a new quick link
	 * @param {string} title - Link title (1-100 chars)
	 * @param {string} url - Link URL (http/https protocol, max 2000 chars)
	 * @returns {{success: boolean, error?: string}} Result object
	 */
	addLink(title, url) {
		const errorEl = document.getElementById("link-form-error");

		// Validate title
		const titleValidation = this.validateTitle(title);
		if (!titleValidation.valid) {
			if (errorEl) {
				errorEl.textContent = titleValidation.error;
			}
			return { success: false, error: titleValidation.error };
		}

		// Validate URL
		const urlValidation = this.validateUrl(url);
		if (!urlValidation.valid) {
			if (errorEl) {
				errorEl.textContent = urlValidation.error;
			}
			return { success: false, error: urlValidation.error };
		}

		// Clear error message
		if (errorEl) {
			errorEl.textContent = "";
		}

		// Generate unique ID using timestamp and random number
		const id = `link_${Date.now()}_${Math.random()}`;

		// Create link object
		const newLink = {
			id,
			title,
			url,
		};

		// Add to state
		this.state.links.push(newLink);

		// Save to storage
		StorageManager.set(STORAGE_KEYS.QUICK_LINKS, this.state.links);

		// Clear input fields
		const titleInput = document.getElementById("link-title-input");
		const urlInput = document.getElementById("link-url-input");
		if (titleInput) titleInput.value = "";
		if (urlInput) urlInput.value = "";

		// Re-render
		this.render();

		return { success: true };
	},

	/**
	 * Edit an existing quick link
	 * @param {string} id - Link ID
	 * @param {string} title - New title
	 * @param {string} url - New URL
	 * @returns {{success: boolean, error?: string}} Result object
	 */
	editLink(id, title, url) {
		// Validate title
		const titleValidation = this.validateTitle(title);
		if (!titleValidation.valid) {
			return { success: false, error: titleValidation.error };
		}

		// Validate URL
		const urlValidation = this.validateUrl(url);
		if (!urlValidation.valid) {
			return { success: false, error: urlValidation.error };
		}

		// Find link by id
		const linkIndex = this.state.links.findIndex((link) => link.id === id);
		if (linkIndex === -1) {
			return { success: false, error: "Link not found" };
		}

		// Update link
		this.state.links[linkIndex].title = title;
		this.state.links[linkIndex].url = url;

		// Save to storage
		StorageManager.set(STORAGE_KEYS.QUICK_LINKS, this.state.links);

		// Re-render
		this.render();

		return { success: true };
	},

	/**
	 * Delete a quick link
	 * @param {string} id - Link ID
	 */
	deleteLink(id) {
		// Remove link from state
		this.state.links = this.state.links.filter((link) => link.id !== id);

		// Save to storage
		StorageManager.set(STORAGE_KEYS.QUICK_LINKS, this.state.links);

		// Re-render
		this.render();
	},

	/**
	 * Open a link in a new tab
	 * @param {string} url - URL to open
	 */
	openLink(url) {
		window.open(url, "_blank", "noopener,noreferrer");
	},

	/**
	 * Validate URL
	 * @param {string} url - URL to validate
	 * @returns {{valid: boolean, error?: string}} Validation result
	 */
	validateUrl(url) {
		// Check if URL starts with http:// or https://
		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			return {
				valid: false,
				error: "URL must start with http:// or https://",
			};
		}

		// Check length (max 2000 chars)
		if (url.length > 2000) {
			return {
				valid: false,
				error: "URL must be at most 2000 characters",
			};
		}

		return { valid: true };
	},

	/**
	 * Validate title
	 * @param {string} title - Title to validate
	 * @returns {{valid: boolean, error?: string}} Validation result
	 */
	validateTitle(title) {
		// Check length (1-100 chars)
		if (!title || title.length < 1 || title.length > 100) {
			return {
				valid: false,
				error: "Title must be 1-100 characters",
			};
		}

		return { valid: true };
	},

	/**
	 * Render quick links to DOM
	 */
	render() {
		const linksList = document.getElementById("links-list");
		const emptyState = document.getElementById("links-list-empty");

		if (!linksList) {
			return;
		}

		// Clear current links
		linksList.innerHTML = "";

		// Show/hide empty state
		if (this.state.links.length === 0) {
			if (emptyState) {
				emptyState.style.display = "block";
			}
			linksList.style.display = "none";
			return;
		}

		if (emptyState) {
			emptyState.style.display = "none";
		}
		linksList.style.display = "flex";

		// Render each link as a button with edit/delete controls
		this.state.links.forEach((link) => {
			// Create link item container
			const linkItem = document.createElement("div");
			linkItem.className = "link-item";
			linkItem.setAttribute("role", "listitem");

			// Create link button
			const linkButton = document.createElement("button");
			linkButton.className = "link-button";
			linkButton.textContent = link.title;
			linkButton.type = "button";
			linkButton.setAttribute("aria-label", `Open ${link.title}`);
			linkButton.addEventListener("click", () => this.openLink(link.url));

			// Create controls container
			const controls = document.createElement("div");
			controls.className = "link-controls";

			// Create delete button
			const deleteBtn = document.createElement("button");
			deleteBtn.className = "link-delete-btn";
			deleteBtn.textContent = "×";
			deleteBtn.type = "button";
			deleteBtn.setAttribute("aria-label", `Delete ${link.title}`);
			deleteBtn.addEventListener("click", () => this.deleteLink(link.id));

			// Append elements
			controls.appendChild(deleteBtn);
			linkItem.appendChild(linkButton);
			linkItem.appendChild(controls);
			linksList.appendChild(linkItem);
		});
	},
};

/**
 * Greeting Module
 * Displays current time, date, and personalized greeting based on time of day
 */
const GreetingModule = {
	/**
	 * Module state
	 */
	state: {
		currentTime: null,
		customName: null,
		intervalId: null,
	},

	/**
	 * Initialize the Greeting Module
	 * Loads custom name from storage, starts time update interval
	 */
	init() {
		// Load custom name from storage
		this.state.customName = StorageManager.get(STORAGE_KEYS.CUSTOM_NAME, null);

		// Update time immediately and start interval
		this.updateTime();
		this.state.intervalId = setInterval(() => this.updateTime(), 1000);

		// Attach modal controls
		this.attachModalListeners();

		// Initial render
		this.render();
	},

	/**
	 * Attach event listeners for modal and name editing
	 */
	attachModalListeners() {
		const editBtn = document.getElementById("edit-name-btn");
		const modal = document.getElementById("name-edit-modal");
		const modalOverlay = document.getElementById("modal-overlay");
		const modalClose = document.getElementById("modal-close");
		const modalCancel = document.getElementById("modal-cancel");
		const saveButton = document.getElementById("custom-name-save");
		const nameInput = document.getElementById("custom-name-input");

		// Open modal
		if (editBtn) {
			editBtn.addEventListener("click", () => {
				this.openModal();
			});
		}

		// Close modal handlers
		const closeModal = () => {
			this.closeModal();
		};

		if (modalClose) {
			modalClose.addEventListener("click", closeModal);
		}

		if (modalCancel) {
			modalCancel.addEventListener("click", closeModal);
		}

		if (modalOverlay) {
			modalOverlay.addEventListener("click", closeModal);
		}

		// Save name handler
		const saveName = () => {
			const name = nameInput.value;
			const result = this.setCustomName(name);
			if (result) {
				this.closeModal();
			}
		};

		if (saveButton) {
			saveButton.addEventListener("click", saveName);
		}

		// Allow Enter key to save name
		if (nameInput) {
			nameInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					saveName();
				}
			});
		}

		// Allow Escape key to close modal
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				const modal = document.getElementById("name-edit-modal");
				if (modal && !modal.classList.contains("hidden")) {
					closeModal();
				}
			}
		});
	},

	/**
	 * Open the name edit modal
	 */
	openModal() {
		const modal = document.getElementById("name-edit-modal");
		const nameInput = document.getElementById("custom-name-input");
		const errorEl = document.getElementById("custom-name-error");

		if (modal) {
			modal.classList.remove("hidden");

			// Pre-fill with current name if exists
			if (nameInput) {
				nameInput.value = this.state.customName || "";
				// Focus the input
				setTimeout(() => {
					nameInput.focus();
					nameInput.select();
				}, 50);
			}

			// Clear any previous error
			if (errorEl) {
				errorEl.textContent = "";
			}
		}
	},

	/**
	 * Close the name edit modal
	 */
	closeModal() {
		const modal = document.getElementById("name-edit-modal");
		const errorEl = document.getElementById("custom-name-error");

		if (modal) {
			modal.classList.add("hidden");
		}

		// Clear error message
		if (errorEl) {
			errorEl.textContent = "";
		}
	},

	/**
	 * Update current time and trigger render
	 * Called every second by setInterval
	 */
	updateTime() {
		this.state.currentTime = new Date();
		this.render();
	},

	/**
	 * Get greeting prefix based on hour of day
	 * @returns {string} "Good Morning", "Good Afternoon", or "Good Evening"
	 */
	getGreetingPrefix() {
		const hour = this.state.currentTime.getHours();

		// Good Morning: 5-11 (05:00-11:59)
		if (hour >= 5 && hour <= 11) {
			return "Good Morning";
		}

		// Good Afternoon: 12-17 (12:00-17:59)
		if (hour >= 12 && hour <= 17) {
			return "Good Afternoon";
		}

		// Good Evening: 18-23 and 0-4 (18:00-04:59)
		return "Good Evening";
	},

	/**
	 * Set custom name with validation
	 * @param {string} name - The custom name to set
	 * @returns {boolean} True if valid and saved, false otherwise
	 */
	setCustomName(name) {
		const validation = this.validateName(name);

		const errorElement = document.getElementById("custom-name-error");

		if (!validation.valid) {
			// Display error message
			if (errorElement) {
				errorElement.textContent = validation.error;
			}
			return false;
		}

		// Clear error message
		if (errorElement) {
			errorElement.textContent = "";
		}

		// Save to state and storage
		this.state.customName = name;
		StorageManager.set(STORAGE_KEYS.CUSTOM_NAME, name);

		// Re-render greeting
		this.render();

		return true;
	},

	/**
	 * Validate custom name
	 * @param {string} name - The name to validate
	 * @returns {{valid: boolean, error?: string}} Validation result
	 */
	validateName(name) {
		// Check length: 1-50 characters
		if (!name || name.length < 1 || name.length > 50) {
			return {
				valid: false,
				error: "Name must be 1-50 characters.",
			};
		}

		// Check characters: letters, spaces, hyphens, apostrophes only
		const validNameRegex = /^[a-zA-Z '-]+$/;
		if (!validNameRegex.test(name)) {
			return {
				valid: false,
				error:
					"Name must contain only letters, spaces, hyphens, and apostrophes.",
			};
		}

		return { valid: true };
	},

	/**
	 * Render greeting, time, and date to DOM
	 */
	render() {
		if (!this.state.currentTime) {
			return;
		}

		// Format time as HH:MM:SS (24-hour)
		const hours = String(this.state.currentTime.getHours()).padStart(2, "0");
		const minutes = String(this.state.currentTime.getMinutes()).padStart(
			2,
			"0",
		);
		const seconds = String(this.state.currentTime.getSeconds()).padStart(
			2,
			"0",
		);
		const timeString = `${hours}:${minutes}:${seconds}`;

		// Format date as "Weekday, Month Day, Year"
		const weekdays = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		const months = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

		const weekday = weekdays[this.state.currentTime.getDay()];
		const month = months[this.state.currentTime.getMonth()];
		const day = this.state.currentTime.getDate();
		const year = this.state.currentTime.getFullYear();
		const dateString = `${weekday}, ${month} ${day}, ${year}`;

		// Build greeting text
		const greetingPrefix = this.getGreetingPrefix();
		let greetingText;
		if (this.state.customName) {
			greetingText = `${greetingPrefix}, ${this.state.customName}!`;
		} else {
			greetingText = `${greetingPrefix}!`;
		}

		// Update DOM elements
		const greetingElement = document.getElementById("greeting-text");
		const timeElement = document.getElementById("time-display");
		const dateElement = document.getElementById("date-display");

		if (greetingElement) {
			greetingElement.textContent = greetingText;
		}

		if (timeElement) {
			timeElement.textContent = timeString;
		}

		if (dateElement) {
			dateElement.textContent = dateString;
		}
	},
};

// Placeholder — modules and initialization will be added in subsequent tasks.
// The file is linked by index.html and must exist to prevent 404 errors.

document.addEventListener("DOMContentLoaded", function () {
	console.log("Life Dashboard initializing...");

	// Initialize modules in order
	StorageManager.init();
	ThemeSwitcher.init(); // Initialize theme before other modules to apply theme early
	GreetingModule.init();
	PomodoroTimer.init();
	TaskManager.init();
	QuickLinksManager.init();

	console.log("Life Dashboard initialized successfully.");
});

// Export for testing (ES modules)
export {
	StorageManager,
	GreetingModule,
	PomodoroTimer,
	ThemeSwitcher,
	TaskManager,
	QuickLinksManager,
	STORAGE_KEYS,
};
