// js/app.js — To-Do Life Dashboard
// Organised using the namespace object pattern (no external frameworks).

'use strict';

/* =========================================================
   Namespace root
   ========================================================= */
const App = {};

/* =========================================================
   Utils — helper functions (localStorage, DOM shortcuts, XSS)
   ========================================================= */
App.Utils = {

  // --- localStorage helpers (Requirements 6.1, 6.2, 6.4, 9.1, 9.2, 9.4) ---

  /**
   * Read and parse a value from localStorage.
   * @param {string} key
   * @param {*} defaultValue  Returned when key is absent or JSON is invalid.
   * @returns {*} Parsed value, or defaultValue on any error.
   */
  loadFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Dashboard] loadFromStorage: invalid JSON for key "' + key + '"', err);
      return defaultValue;
    }
  },

  /**
   * Serialize and write a value to localStorage.
   * Errors (e.g. quota exceeded) are logged but never re-thrown so the UI
   * keeps working even when storage is unavailable.
   * @param {string} key
   * @param {*} value  Must be JSON-serializable.
   */
  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('[Dashboard] saveToStorage: could not save key "' + key + '"', err);
    }
  },

  // --- DOM shortcuts (Requirements 10.1) ---

  /**
   * Shorthand for (scope || document).querySelector(selector).
   * @param {string} selector  CSS selector.
   * @param {Element|Document} [scope]  Root element for the query.
   * @returns {Element|null}
   */
  qs(selector, scope) {
    return (scope || document).querySelector(selector);
  },

  /**
   * Shorthand for (scope || document).querySelectorAll(selector).
   * @param {string} selector  CSS selector.
   * @param {Element|Document} [scope]  Root element for the query.
   * @returns {NodeList}
   */
  qsAll(selector, scope) {
    return (scope || document).querySelectorAll(selector);
  },

  // --- XSS protection (Requirements 10.1) ---

  /**
   * Escape special HTML characters to prevent XSS when inserting user text
   * into the DOM via innerHTML.
   * @param {string} text  Raw user-supplied string.
   * @returns {string} HTML-safe string.
   */
  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

};

/* =========================================================
   GreetingWidget — time, date, and contextual greeting
   ========================================================= */
App.GreetingWidget = {

  /**
   * Format a Date object into a zero-padded "HH:MM" 24-hour string.
   * @param {Date} date
   * @returns {string} e.g. "09:05"
   */
  formatTime(date) {
    const hours   = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  },

  /**
   * Format a Date object into a full Indonesian date string.
   * @param {Date} date
   * @returns {string} e.g. "Minggu, 7 November 2026"
   */
  formatDate(date) {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  },

  /**
   * Return the time period label for a given hour.
   * Requirements 1.3, 1.4, 1.5, 1.6
   * @param {number} hour  Integer 0–23.
   * @returns {'pagi'|'siang'|'sore'|'malam'}
   */
  getTimePeriod(hour) {
    if (hour >= 5 && hour <= 11)  return 'pagi';
    if (hour >= 12 && hour <= 14) return 'siang';
    if (hour >= 15 && hour <= 17) return 'sore';
    return 'malam'; // 0–4 and 18–23
  },

  /**
   * Update the DOM with current time, date, and greeting.
   * Requirement 1.7: If system clock is unavailable, display "--:--", empty date,
   * and hide greeting.
   * Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  render() {
    const clockEl = App.Utils.qs('#clock-display');
    const dateEl = App.Utils.qs('#date-display');
    const greetingEl = App.Utils.qs('#greeting-text');

    let date;
    try {
      date = new Date();
      // Check if date is invalid (Requirement 1.7)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (err) {
      // System clock unavailable (Requirement 1.7)
      if (clockEl) clockEl.textContent = '--:--';
      if (dateEl) dateEl.textContent = '';
      if (greetingEl) greetingEl.style.display = 'none';
      return;
    }

    // Update clock display (Requirement 1.1)
    if (clockEl) {
      clockEl.textContent = this.formatTime(date);
    }

    // Update date display (Requirement 1.2)
    if (dateEl) {
      dateEl.textContent = this.formatDate(date);
    }

    // Update greeting (Requirements 1.3, 1.4, 1.5, 1.6)
    if (greetingEl) {
      const period = this.getTimePeriod(date.getHours());
      // Capitalize the first letter of the period
      const capitalizedPeriod = period.charAt(0).toUpperCase() + period.slice(1);
      greetingEl.textContent = 'Selamat ' + capitalizedPeriod;
      // Make sure greeting is visible (in case it was previously hidden)
      greetingEl.style.display = '';
    }
  },

  /**
   * Initialize the greeting widget.
   * Renders immediately, then sets up 60-second refresh interval.
   * Requirement 1.1
   */
  init() {
    // Render immediately
    this.render();
    // Update every 60 seconds (60000 ms)
    setInterval(() => this.render(), 60000);
  },

};

/* =========================================================
   TimerWidget — 25-minute Pomodoro countdown state machine
   ========================================================= */
App.TimerWidget = {

  // --- State (Requirement 2.1) ---
  state: 'idle',       // 'idle' | 'running' | 'paused' | 'finished'
  remaining: 1500,     // seconds remaining (1500 = 25 minutes)
  intervalId: null,    // reference to the active setInterval, or null

  /**
   * Convert a total number of seconds into a zero-padded "MM:SS" string.
   * @param {number} seconds  Total seconds (non-negative integer).
   * @returns {string} e.g. 1500 → "25:00", 65 → "01:05", 0 → "00:00"
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  },

  /**
   * Enable/disable the Start and Stop buttons based on current state.
   * Requirements 2.7, 2.8, 2.9
   *   - Start is disabled while the timer is running (prevents duplicate intervals).
   *   - Stop is disabled while idle, paused, or finished (nothing to stop).
   *   - Reset button is always enabled — no change needed here.
   */
  updateControls() {
    const startBtn = App.Utils.qs('#timer-start-btn');
    const stopBtn  = App.Utils.qs('#timer-stop-btn');

    if (startBtn) {
      // Disable Start only while actively running (Requirement 2.7)
      startBtn.disabled = (this.state === 'running');
    }

    if (stopBtn) {
      // Disable Stop when there is nothing running to stop (Requirements 2.8, 2.9)
      stopBtn.disabled = (this.state === 'idle' || this.state === 'paused' || this.state === 'finished');
    }
  },

  /**
   * Sync the timer UI with the current in-memory state.
   * - Updates the countdown display.
   * - Shows/hides the session-end message.
   * - Delegates button state to updateControls().
   * Requirements 2.3, 2.6, 2.7, 2.8, 2.9
   */
  render() {
    // Update countdown display
    const displayEl = App.Utils.qs('#timer-display');
    if (displayEl) {
      displayEl.textContent = this.formatTime(this.remaining);
    }

    // Show session-end message only in finished state (Requirement 2.6)
    const messageEl = App.Utils.qs('#timer-message');
    if (messageEl) {
      messageEl.style.display = (this.state === 'finished') ? '' : 'none';
    }

    // Sync button enable/disable state
    this.updateControls();
  },

  /**
   * Decrement remaining by one second; trigger onFinish when time runs out.
   * Called by setInterval every 1000 ms while state === 'running'.
   * Requirements 2.2, 2.3
   */
  tick() {
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this.onFinish();
    } else {
      this.render();
    }
  },

  /**
   * Handle the countdown reaching zero.
   * Clears the interval, moves to 'finished' state, and renders.
   * Requirement 2.6
   */
  onFinish() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'finished';
    this.remaining = 0; // Clamp to exactly 0 so display shows "00:00"
    this.render();
  },

  /**
   * Begin (or resume) the countdown.
   * Only acts when state is 'idle' or 'paused'.
   * Requirement 2.2
   */
  start() {
    if (this.state !== 'idle' && this.state !== 'paused') return;
    this.state = 'running';
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.render();
  },

  /**
   * Pause the countdown, retaining the current remaining time.
   * Only acts when state is 'running'.
   * Requirement 2.4
   */
  stop() {
    if (this.state !== 'running') return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'paused';
    this.render();
  },

  /**
   * Stop any active countdown and restore the timer to its initial state.
   * Acts from any state.
   * Requirement 2.5
   */
  reset() {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.state = 'idle';
    this.remaining = 1500;
    this.render();
  },

  /**
   * Attach button event listeners and render the initial timer state.
   * Requirement 2.1
   */
  init() {
    const startBtn = App.Utils.qs('#timer-start-btn');
    const stopBtn  = App.Utils.qs('#timer-stop-btn');
    const resetBtn = App.Utils.qs('#timer-reset-btn');

    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (stopBtn)  stopBtn.addEventListener('click',  () => this.stop());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    this.render();
  },

};

/* =========================================================
   TodoWidget — CRUD tasks + localStorage persistence
   ========================================================= */
App.TodoWidget = {

  // In-memory task list and edit state
  tasks: [],       // Array of Task objects
  editingId: null, // ID of the task currently being edited, or null

  /**
   * Validate a task description string.
   * Trims the input; rejects it if empty or whitespace-only.
   * Requirements 3.3, 4.5
   * @param {string} text  Raw user-supplied description.
   * @returns {{ valid: boolean, error: string }}
   */
  validateDescription(text) {
    const trimmed = String(text).trim();
    if (trimmed === '') {
      return { valid: false, error: 'Deskripsi tugas tidak boleh kosong' };
    }
    return { valid: true, error: '' };
  },

  /**
   * Load tasks from localStorage into this.tasks.
   * Requirement 6.1
   */
  loadTasks() {
    this.tasks = App.Utils.loadFromStorage('todos', []);
  },

  /**
   * Persist the current task list to localStorage.
   * Requirements 6.2, 6.3
   */
  saveTasks() {
    App.Utils.saveToStorage('todos', this.tasks);
  },

  /**
   * Add a new task to the list.
   * Validates and trims description; generates a unique ID; persists; re-renders.
   * Requirements 3.1, 3.2, 3.3
   * @param {string} description  Raw user-supplied task description.
   */
  addTask(description) {
    const errorEl = App.Utils.qs('#todo-error');

    const result = this.validateDescription(description);
    if (!result.valid) {
      // Show error message (Requirement 3.3)
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.hidden = false;
      }
      return;
    }

    // Hide any previous error
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    const trimmed = String(description).trim();

    // Generate unique ID — prefer crypto.randomUUID() with fallback (Requirement 3.1)
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : (Date.now() + '-' + Math.random());

    /** @type {{ id: string, description: string, completed: boolean, createdAt: number }} */
    const task = {
      id,
      description: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    this.tasks.push(task);

    // Clear the input field after a successful add (Requirement 3.4)
    const inputEl = App.Utils.qs('#todo-input');
    if (inputEl) inputEl.value = '';

    this.saveTasks();
    this.render();
  },

  /**
   * Toggle the completion status of a task.
   * Finds the task by id, flips its `completed` field, persists, and re-renders.
   * Requirements 5.1, 5.2, 5.3
   * @param {string} id  The unique id of the task to toggle.
   */
  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    this.saveTasks();
    this.render();
  },

  /**
   * Permanently remove a task from the list.
   * Filters out the task by id, persists, and re-renders.
   * Requirements 5.4, 5.5
   * @param {string} id  The unique id of the task to delete.
   */
  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveTasks();
    this.render();
  },

  /**
   * Enter edit mode for a specific task.
   * If another task is already being edited, cancel it first (discard changes).
   * Requirements 4.1, 4.2, 4.3
   * @param {string} id  The unique id of the task to edit.
   */
  enterEditMode(id) {
    // Cancel any in-progress edit before opening a new one (Requirement 4.3)
    if (this.editingId !== null) {
      this.exitEditMode(false);
    }
    this.editingId = id;
    this.render();
  },

  /**
   * Exit edit mode, optionally saving the current input value.
   * Requirements 4.2, 4.4, 4.5, 4.6
   * @param {boolean} save  If true, persist the edited value; if false, discard it.
   */
  exitEditMode(save) {
    if (save === true) {
      // Read the current value from the edit input rendered by task 5.13
      // The edit input will have a data-edit-id attribute matching editingId
      const currentInputValue =
        document.querySelector(`[data-edit-id="${this.editingId}"]`)?.value ?? '';
      this.editTask(this.editingId, currentInputValue);
      // If editTask rejected (invalid input), editingId was not changed — keep
      // edit mode open so the user can correct the input. Only proceed to
      // clear editingId when editTask succeeded (errorEl would be empty).
      const errorEl = App.Utils.qs('#todo-error');
      if (errorEl && !errorEl.hidden && errorEl.textContent !== '') {
        // Validation failed inside editTask; stay in edit mode
        return;
      }
    }
    this.editingId = null;
    this.render();
  },

  /**
   * Update the description of an existing task.
   * Validates and trims the new description; persists if valid.
   * Requirements 4.4, 4.5
   * @param {string} id              The unique id of the task to update.
   * @param {string} newDescription  Raw user-supplied new description.
   */
  editTask(id, newDescription) {
    const errorEl = App.Utils.qs('#todo-error');

    const result = this.validateDescription(newDescription);
    if (!result.valid) {
      // Show error message (Requirement 4.5); do NOT modify editingId here
      if (errorEl) {
        errorEl.textContent = result.error;
        errorEl.hidden = false;
      }
      return;
    }

    // Hide any previous error
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    const trimmed = String(newDescription).trim();

    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    task.description = trimmed;
    this.saveTasks();
    this.render();
  },

  /**
   * Build and return a single <li> element for the given task.
   * Handles both normal display mode and inline edit mode.
   * Requirements 3.4, 3.5, 5.2
   * @param {{ id: string, description: string, completed: boolean }} task
   * @returns {HTMLLIElement}
   */
  renderTask(task) {
    const li = document.createElement('li');
    li.setAttribute('data-task-id', task.id);

    if (task.id === this.editingId) {
      // ---- Edit mode ----
      const input = document.createElement('input');
      input.type = 'text';
      input.value = task.description;          // .value assignment — XSS-safe
      input.setAttribute('data-edit-id', task.id);
      input.maxLength = 200;
      input.className = 'todo-edit-input';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'todo-save-btn';
      saveBtn.textContent = 'Simpan';
      saveBtn.addEventListener('click', () => this.exitEditMode(true));

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'todo-cancel-btn';
      cancelBtn.textContent = 'Batal';
      cancelBtn.addEventListener('click', () => this.exitEditMode(false));

      li.appendChild(input);
      li.appendChild(saveBtn);
      li.appendChild(cancelBtn);
    } else {
      // ---- Display mode ----
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => this.toggleTask(task.id));

      const span = document.createElement('span');
      span.textContent = task.description;     // textContent — XSS-safe

      if (task.completed) {
        li.classList.add('completed');
        span.classList.add('completed');
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'todo-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => this.enterEditMode(task.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'todo-delete-btn';
      deleteBtn.textContent = 'Hapus';
      deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
    }

    return li;
  },

  /**
   * Sync the full task list into the DOM.
   * Clears #todo-list, shows/hides the empty-state message,
   * then appends a rendered <li> for every task in order.
   * Requirements 3.4, 3.5
   */
  render() {
    const listEl  = App.Utils.qs('#todo-list');
    const emptyEl = App.Utils.qs('#todo-empty');

    if (listEl) {
      listEl.innerHTML = '';
    }

    if (this.tasks.length === 0) {
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      if (listEl) {
        this.tasks.forEach(task => {
          listEl.appendChild(this.renderTask(task));
        });
      }
    }
  },

  /**
   * Attach event listeners for the Add button and input field,
   * then load persisted tasks from localStorage and render.
   * Requirements 6.2, 6.3, 6.4
   */
  init() {
    // Wire up Add button
    const addBtn  = App.Utils.qs('#todo-add-btn');
    const inputEl = App.Utils.qs('#todo-input');
    const errorEl = App.Utils.qs('#todo-error');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (inputEl) this.addTask(inputEl.value);
      });
    }

    // Also allow pressing Enter in the input to add a task
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.addTask(inputEl.value);
      });
    }

    // Clear error message whenever user starts typing
    if (inputEl && errorEl) {
      inputEl.addEventListener('input', () => {
        errorEl.textContent = '';
        errorEl.hidden = true;
      });
    }

    // Detect corrupted localStorage data before loadTasks() silently swallows it
    // (Requirement 6.4)
    let loadFailed = false;
    const raw = localStorage.getItem('todos');
    if (raw !== null) {
      try {
        JSON.parse(raw);
      } catch (e) {
        loadFailed = true;
      }
    }

    // Load tasks from localStorage (Requirements 6.2, 6.3)
    this.loadTasks();

    if (loadFailed) {
      // Show storage error banner (Requirement 6.4)
      const bannerEl = App.Utils.qs('#storage-error-banner');
      if (bannerEl) bannerEl.hidden = false;
    }

    this.render();
  },

};

/* =========================================================
   QuickLinksWidget — CRUD quick links + localStorage persistence
   ========================================================= */
App.QuickLinksWidget = {

  // In-memory link collection
  links: [], // Array of Link objects

  /**
   * Validate the label and URL for a new link.
   * Requirements 7.2, 7.3
   * @param {string} label  Raw user-supplied label text.
   * @param {string} url    Raw user-supplied URL string.
   * @returns {{ valid: boolean, errors: { label?: string, url?: string } }}
   */
  validateLink(label, url) {
    const errors = {};

    // Validate label (Requirement 7.3)
    const labelTrimmed = String(label).trim();
    if (labelTrimmed === '') {
      errors.label = 'Label tidak boleh kosong';
    }

    // Validate URL (Requirements 7.2, 7.3)
    const urlTrimmed = String(url).trim();
    const hasScheme = urlTrimmed.startsWith('http://') || urlTrimmed.startsWith('https://');
    const host = hasScheme ? urlTrimmed.replace(/^https?:\/\//, '') : '';
    const hasHost = host.length > 0;
    if (!hasScheme || !hasHost) {
      errors.url = 'URL harus dimulai dengan http:// atau https:// dan memiliki host yang valid';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  },

  /**
   * Load links from localStorage into this.links.
   * Requirement 9.2
   */
  loadLinks() {
    this.links = App.Utils.loadFromStorage('quicklinks', []);
  },

  /**
   * Persist the current link collection to localStorage.
   * Requirements 9.1, 9.3
   */
  saveLinks() {
    App.Utils.saveToStorage('quicklinks', this.links);
  },

  /**
   * Add a new link to the collection.
   * Validates label and URL; generates a unique ID; persists; re-renders.
   * Requirements 7.1, 7.2, 9.1, 9.2, 9.3
   * @param {string} label  Raw user-supplied label text.
   * @param {string} url    Raw user-supplied URL string.
   */
  addLink(label, url) {
    const errorEl = App.Utils.qs('#link-error');

    const result = this.validateLink(label, url);
    if (!result.valid) {
      // Build a combined error message indicating which field(s) are invalid (Requirement 7.3)
      const messages = [];
      if (result.errors.label) messages.push(result.errors.label);
      if (result.errors.url)   messages.push(result.errors.url);
      if (errorEl) {
        errorEl.textContent = messages.join(' — ');
        errorEl.hidden = false;
      }
      return;
    }

    // Hide any previous error
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    const labelTrimmed = String(label).trim();

    // Generate unique ID — prefer crypto.randomUUID() with fallback
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : (Date.now() + '-' + Math.random());

    /** @type {{ id: string, label: string, url: string }} */
    const link = {
      id,
      label: labelTrimmed,
      url: String(url).trim(),
    };

    this.links.push(link);

    // Clear input fields after a successful add (Requirement 7.1)
    const labelInputEl = App.Utils.qs('#link-label-input');
    const urlInputEl   = App.Utils.qs('#link-url-input');
    if (labelInputEl) labelInputEl.value = '';
    if (urlInputEl)   urlInputEl.value   = '';

    this.saveLinks();
    this.render();
  },

  /**
   * Permanently remove a link from the collection.
   * Filters out the link by id, persists, and re-renders.
   * Requirements 8.1, 8.2
   * @param {string} id  The unique id of the link to delete.
   */
  deleteLink(id) {
    this.links = this.links.filter(l => l.id !== id);
    this.saveLinks();
    this.render();
  },

  /**
   * Build and return a wrapper <div> element for the given link.
   * Contains a clickable label button and a delete button.
   * Requirements 7.4, 7.5
   * @param {{ id: string, label: string, url: string }} link
   * @returns {HTMLDivElement}
   */
  renderLink(link) {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-item';
    wrapper.setAttribute('data-link-id', link.id);

    // Link button — opens the URL in a new tab (Requirement 7.4)
    const linkBtn = document.createElement('button');
    linkBtn.className = 'link-btn';
    linkBtn.textContent = link.label; // textContent — XSS-safe (Requirement 7.5)
    linkBtn.addEventListener('click', () => window.open(link.url, '_blank'));

    // Delete button (Requirement 8.1)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete-btn';
    deleteBtn.textContent = 'Hapus';
    deleteBtn.addEventListener('click', () => this.deleteLink(link.id));

    wrapper.appendChild(linkBtn);
    wrapper.appendChild(deleteBtn);

    return wrapper;
  },

  /**
   * Sync the full link collection into the DOM.
   * Clears #links-container, then appends a rendered wrapper for every link.
   * Requirements 7.5
   */
  render() {
    const containerEl = App.Utils.qs('#links-container');
    if (!containerEl) return;

    containerEl.innerHTML = '';

    this.links.forEach(link => {
      containerEl.appendChild(this.renderLink(link));
    });
  },

  /**
   * Attach event listeners for the Add button and input fields,
   * then load persisted links from localStorage and render.
   * Requirements 9.2, 9.3, 9.4
   */
  init() {
    const addBtn       = App.Utils.qs('#link-add-btn');
    const labelInputEl = App.Utils.qs('#link-label-input');
    const urlInputEl   = App.Utils.qs('#link-url-input');
    const errorEl      = App.Utils.qs('#link-error');

    // Wire up Add button (Requirement 7.1)
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const label = labelInputEl ? labelInputEl.value : '';
        const url   = urlInputEl   ? urlInputEl.value   : '';
        this.addLink(label, url);
      });
    }

    // Clear error message whenever user starts typing in either input field
    const clearError = () => {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    };
    if (labelInputEl) labelInputEl.addEventListener('input', clearError);
    if (urlInputEl)   urlInputEl.addEventListener('input', clearError);

    // Detect corrupted localStorage data before loadLinks() silently swallows it
    // (Requirement 9.4)
    let loadFailed = false;
    const raw = localStorage.getItem('quicklinks');
    if (raw !== null) {
      try {
        JSON.parse(raw);
      } catch (e) {
        loadFailed = true;
      }
    }

    // Load links from localStorage (Requirements 9.2, 9.3)
    this.loadLinks();

    if (loadFailed) {
      // Show storage error banner (Requirement 9.4)
      const bannerEl = App.Utils.qs('#storage-error-banner');
      if (bannerEl) bannerEl.hidden = false;
    }

    this.render();
  },

};

/* =========================================================
   Bootstrap — initialise all widgets after DOM is ready
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  App.GreetingWidget.init();
  App.TimerWidget.init();
  App.TodoWidget.init();
  App.QuickLinksWidget.init();
});
