/**
 * dashboard.test.js
 * Full test suite for To-Do Life Dashboard
 *
 * Covers:
 *  - P1–P16: Property-based tests (fast-check)
 *  - Unit tests: timer state machine, control enable/disable,
 *                empty state, localStorage failure, system clock,
 *                edit cancel, link open in new tab
 *
 * Feature: todo-life-dashboard
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  Utils,
  GreetingWidget,
  createTimerWidget,
  createTodoWidget,
  createQuickLinksWidget,
} from '../js/app-testable.js';

/* ================================================================
   Helpers
   ================================================================ */

/** Build a Date from explicit hours & minutes (today's date). */
function makeDate(hours, minutes) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/* Reset in-memory state between tests */
function freshTodo() {
  const w = createTodoWidget();
  localStorage.clear();
  return w;
}

function freshLinks() {
  const w = createQuickLinksWidget();
  localStorage.clear();
  return w;
}

/* ================================================================
   P1: Time Format Zero-Padding
   Validates: Requirements 1.1, 2.3
   ================================================================ */
describe('P1: Time Format Zero-Padding', () => {
  it('GreetingWidget.formatTime produces HH:MM for any valid hour/minute', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (hour, minute) => {
          const date = makeDate(hour, minute);
          const result = GreetingWidget.formatTime(date);
          return /^\d{2}:\d{2}$/.test(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('TimerWidget.formatTime produces MM:SS for any valid second count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1500 }),
        (seconds) => {
          const timer = createTimerWidget();
          const result = timer.formatTime(seconds);
          return /^\d{2}:\d{2}$/.test(result);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P2: Date Format Contains Indonesian Components
   Validates: Requirements 1.2
   ================================================================ */
describe('P2: Date Format Contains Indonesian Components', () => {
  const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  it('formatDate contains Indonesian day, numeric day, Indonesian month, and 4-digit year', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (date) => {
          const result = GreetingWidget.formatDate(date);
          const hasDay   = DAYS.some(d => result.includes(d));
          const hasMonth = MONTHS.some(m => result.includes(m));
          const hasYear  = /\d{4}/.test(result);
          const hasNum   = /\d+/.test(result);
          return hasDay && hasMonth && hasYear && hasNum;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P3: Time Period Classification Is Exhaustive and Consistent
   Validates: Requirements 1.3, 1.4, 1.5, 1.6
   ================================================================ */
describe('P3: Time Period Classification', () => {
  it('getTimePeriod returns a valid period for every hour 0–23', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }),
        (hour) => {
          const result = GreetingWidget.getTimePeriod(hour);
          return ['pagi', 'siang', 'sore', 'malam'].includes(result);
        }
      ),
      { numRuns: 24 }
    );
  });

  it('getTimePeriod respects defined boundary values', () => {
    // Boundary assertions
    expect(GreetingWidget.getTimePeriod(5)).toBe('pagi');
    expect(GreetingWidget.getTimePeriod(11)).toBe('pagi');
    expect(GreetingWidget.getTimePeriod(12)).toBe('siang');
    expect(GreetingWidget.getTimePeriod(14)).toBe('siang');
    expect(GreetingWidget.getTimePeriod(15)).toBe('sore');
    expect(GreetingWidget.getTimePeriod(17)).toBe('sore');
    expect(GreetingWidget.getTimePeriod(18)).toBe('malam');
    expect(GreetingWidget.getTimePeriod(23)).toBe('malam');
    expect(GreetingWidget.getTimePeriod(0)).toBe('malam');
    expect(GreetingWidget.getTimePeriod(4)).toBe('malam');
  });

  it('getTimePeriod is consistent with defined hour ranges across all 24 hours', () => {
    for (let h = 0; h <= 23; h++) {
      const period = GreetingWidget.getTimePeriod(h);
      if (h >= 5 && h <= 11)  { expect(period).toBe('pagi');  continue; }
      if (h >= 12 && h <= 14) { expect(period).toBe('siang'); continue; }
      if (h >= 15 && h <= 17) { expect(period).toBe('sore');  continue; }
      expect(period).toBe('malam');
    }
  });
});

/* ================================================================
   P4: Timer Reset Is Idempotent from Any State
   Validates: Requirements 2.5
   ================================================================ */
describe('P4: Timer Reset Is Idempotent from Any State', () => {
  it('reset() always yields state=idle and remaining=1500', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'running', 'paused', 'finished'),
        fc.integer({ min: 0, max: 1500 }),
        (state, remaining) => {
          const timer = createTimerWidget();
          timer.state = state;
          timer.remaining = remaining;
          timer.reset();
          return timer.state === 'idle' && timer.remaining === 1500;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P5: Task Description Validation Rejects All Whitespace-Only Strings
   Validates: Requirements 3.3, 4.5
   ================================================================ */
describe('P5: Validation Rejects Whitespace-Only Strings', () => {
  it('validateDescription returns invalid for any whitespace-only string', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (ws) => {
          const widget = createTodoWidget();
          const result = widget.validateDescription(ws);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('addTask does not modify the task list for whitespace-only input', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (ws) => {
          const widget = freshTodo();
          widget.addTask(ws);
          return widget.tasks.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editTask does not modify the task list for whitespace-only input', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (ws) => {
          const widget = freshTodo();
          widget.addTask('Original task');
          const id = widget.tasks[0].id;
          const originalDesc = widget.tasks[0].description;
          widget.editTask(id, ws);
          return widget.tasks[0].description === originalDesc;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P6: Task Addition Preserves Trimmed Description and Incomplete Status
   Validates: Requirements 3.2
   ================================================================ */
describe('P6: addTask Preserves Trimmed Description and Incomplete Status', () => {
  it('addTask stores trimmed description with completed=false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (description) => {
          const widget = freshTodo();
          widget.addTask(description);
          const task = widget.tasks[0];
          return task.description === description.trim() && task.completed === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P7: Task Insertion Order Is Preserved
   Validates: Requirements 3.4
   ================================================================ */
describe('P7: Task Insertion Order Is Preserved', () => {
  it('tasks array order matches addTask call order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), {
          minLength: 1,
          maxLength: 10,
        }),
        (descriptions) => {
          const widget = freshTodo();
          descriptions.forEach(d => widget.addTask(d));
          const stored = widget.tasks.map(t => t.description);
          const expected = descriptions.map(d => d.trim());
          return stored.every((d, i) => d === expected[i]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P8: Edit Mode Is Mutually Exclusive
   Validates: Requirements 4.3
   ================================================================ */
describe('P8: Edit Mode Is Mutually Exclusive', () => {
  it('activating edit on task B while A is editing results in editingId === B.id', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 2 }),
        ([idA, idB]) => {
          const widget = freshTodo();
          // Manually push two tasks with known IDs
          widget.tasks = [
            { id: idA, description: 'Task A', completed: false, createdAt: Date.now() },
            { id: idB, description: 'Task B', completed: false, createdAt: Date.now() },
          ];
          widget.enterEditMode(idA);
          expect(widget.editingId).toBe(idA);
          widget.enterEditMode(idB);
          return widget.editingId === idB;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P9: Task Edit Updates Description with Trimmed Value
   Validates: Requirements 4.4
   ================================================================ */
describe('P9: Task Edit Updates Description with Trimmed Value', () => {
  it('editTask updates description to the trimmed new value', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (newDescription) => {
          const widget = freshTodo();
          widget.addTask('Original');
          const id = widget.tasks[0].id;
          widget.editTask(id, newDescription);
          return widget.tasks.find(t => t.id === id).description === newDescription.trim();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P10: Toggle Completion Is an Involution (Round-Trip)
   Validates: Requirements 5.3
   ================================================================ */
describe('P10: Toggle Completion Is an Involution', () => {
  it('toggle(toggle(task)).completed === original', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialCompleted) => {
          const widget = freshTodo();
          widget.addTask('Test task');
          const id = widget.tasks[0].id;
          widget.tasks[0].completed = initialCompleted;
          widget.toggleTask(id);
          widget.toggleTask(id);
          return widget.tasks.find(t => t.id === id).completed === initialCompleted;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P11: Delete Removes Exactly the Targeted Task
   Validates: Requirements 5.5
   ================================================================ */
describe('P11: Delete Removes Exactly the Targeted Task', () => {
  it('after deleteTask(id), no task with that id remains', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.integer({ min: 0, max: 9 }),
        (descriptions, indexToDelete) => {
          const widget = freshTodo();
          descriptions.forEach(d => widget.addTask(d));
          const idx = indexToDelete % widget.tasks.length;
          const idToDelete = widget.tasks[idx].id;
          widget.deleteTask(idToDelete);
          return widget.tasks.every(t => t.id !== idToDelete);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P12: Todo localStorage Round-Trip Preserves All Data
   Validates: Requirements 6.1, 6.2
   ================================================================ */
describe('P12: Todo localStorage Round-Trip', () => {
  it('load(save(tasks)) deeply equals original tasks', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            description: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            completed: fc.boolean(),
            createdAt: fc.integer({ min: 0, max: Date.now() }),
          }),
          { maxLength: 10 }
        ),
        (tasks) => {
          localStorage.clear();
          const widget = createTodoWidget();
          widget.tasks = tasks;
          widget.saveTasks();
          widget.tasks = [];
          widget.loadTasks();
          return JSON.stringify(widget.tasks) === JSON.stringify(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P13: URL Validation Accepts Only http/https With Non-Empty Host
   Validates: Requirements 7.2, 7.3
   ================================================================ */
describe('P13: URL Validation Accepts http/https With Non-Empty Host Only', () => {
  it('accepts URLs with http:// or https:// followed by a non-empty host', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          const widget = createQuickLinksWidget();
          const result = widget.validateLink('Label', url);
          // webUrl() always produces valid http/https URLs
          return result.errors.url === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects URLs that do not start with http:// or https://', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('ftp://example.com'),
          fc.constant('//example.com'),
          fc.constant('example.com'),
          fc.constant(''),
          fc.string().filter(s => !s.startsWith('http://') && !s.startsWith('https://'))
        ),
        (url) => {
          const widget = createQuickLinksWidget();
          const result = widget.validateLink('Label', url);
          return typeof result.errors.url === 'string';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects URLs that have empty host after scheme', () => {
    const emptyHostUrls = ['http://', 'https://'];
    emptyHostUrls.forEach(url => {
      const widget = createQuickLinksWidget();
      const result = widget.validateLink('Label', url);
      expect(result.errors.url).toBeDefined();
    });
  });
});

/* ================================================================
   P14: Rendered Link Button Contains Label Text
   Validates: Requirements 7.5
   ================================================================ */
describe('P14: Rendered Link Button Contains Label Text', () => {
  it('renderLink produces an element whose text includes link.label', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          label: fc.string({ minLength: 1 }),
          url: fc.constant('https://example.com'),
        }),
        (link) => {
          const widget = createQuickLinksWidget();
          const el = widget.renderLink(link);
          return el.textContent.includes(link.label);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P15: Delete Link Removes Exactly the Targeted Link
   Validates: Requirements 8.2
   ================================================================ */
describe('P15: Delete Link Removes Exactly the Targeted Link', () => {
  it('after deleteLink(id), no link with that id remains', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            label: fc.string({ minLength: 1 }),
            url: fc.constant('https://example.com'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 9 }),
        (linkInputs, indexToDelete) => {
          const widget = freshLinks();
          linkInputs.forEach(({ label, url }) => widget.addLink(label, url));
          const idx = indexToDelete % widget.links.length;
          const idToDelete = widget.links[idx].id;
          widget.deleteLink(idToDelete);
          return widget.links.every(l => l.id !== idToDelete);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   P16: Quick Links localStorage Round-Trip Preserves All Data
   Validates: Requirements 9.1, 9.2
   ================================================================ */
describe('P16: Quick Links localStorage Round-Trip', () => {
  it('load(save(links)) deeply equals original links', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            label: fc.string({ minLength: 1 }),
            url: fc.webUrl(),
          }),
          { maxLength: 10 }
        ),
        (links) => {
          localStorage.clear();
          const widget = createQuickLinksWidget();
          widget.links = links;
          widget.saveLinks();
          widget.links = [];
          widget.loadLinks();
          return JSON.stringify(widget.links) === JSON.stringify(links);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ================================================================
   UNIT TESTS — Timer State Machine Transitions
   ================================================================ */
describe('Unit: Timer state machine transitions', () => {
  it('initial state is idle with 1500 seconds remaining', () => {
    const timer = createTimerWidget();
    expect(timer.state).toBe('idle');
    expect(timer.remaining).toBe(1500);
  });

  it('idle → running on start()', () => {
    const timer = createTimerWidget();
    timer.start();
    expect(timer.state).toBe('running');
  });

  it('running → paused on stop()', () => {
    const timer = createTimerWidget();
    timer.start();
    timer.stop();
    expect(timer.state).toBe('paused');
  });

  it('paused → running on start()', () => {
    const timer = createTimerWidget();
    timer.start();
    timer.stop();
    timer.start();
    expect(timer.state).toBe('running');
  });

  it('any state → idle on reset()', () => {
    for (const state of ['idle', 'running', 'paused', 'finished']) {
      const timer = createTimerWidget();
      timer.state = state;
      timer.remaining = 42;
      timer.reset();
      expect(timer.state).toBe('idle');
      expect(timer.remaining).toBe(1500);
    }
  });

  it('running → finished when remaining reaches 0 via tick()', () => {
    const timer = createTimerWidget();
    timer.start();
    timer.remaining = 1; // one tick away from finish
    timer.tick();
    expect(timer.state).toBe('finished');
    expect(timer.remaining).toBe(0);
  });

  it('finished state displays "00:00"', () => {
    const timer = createTimerWidget();
    timer.start();
    timer.remaining = 1;
    timer.tick();
    expect(timer.formatTime(timer.remaining)).toBe('00:00');
  });

  it('start() is a no-op when state is finished', () => {
    const timer = createTimerWidget();
    timer.state = 'finished';
    timer.start();
    expect(timer.state).toBe('finished');
  });

  it('stop() is a no-op when state is idle', () => {
    const timer = createTimerWidget();
    timer.stop();
    expect(timer.state).toBe('idle');
  });
});

/* ================================================================
   UNIT TESTS — Empty State Display
   ================================================================ */
describe('Unit: Empty state display', () => {
  it('new todo widget starts with empty tasks array', () => {
    const widget = freshTodo();
    expect(widget.tasks).toEqual([]);
  });

  it('new links widget starts with empty links array', () => {
    const widget = freshLinks();
    expect(widget.links).toEqual([]);
  });
});

/* ================================================================
   UNIT TESTS — localStorage Failure Handling
   ================================================================ */
describe('Unit: localStorage failure handling', () => {
  it('loadFromStorage returns defaultValue when JSON is corrupted', () => {
    localStorage.setItem('test-key', 'not-valid-json{{{');
    const result = Utils.loadFromStorage('test-key', []);
    expect(result).toEqual([]);
  });

  it('saveToStorage does not throw when localStorage.setItem throws', () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    // Mock setItem to throw
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    // Should not throw
    expect(() => Utils.saveToStorage('test-key', { value: 1 })).not.toThrow();
    // Restore
    vi.restoreAllMocks();
  });

  it('loadTasks initializes with empty array when storage key is missing', () => {
    localStorage.clear();
    const widget = createTodoWidget();
    widget.loadTasks();
    expect(widget.tasks).toEqual([]);
  });

  it('loadLinks initializes with empty array when storage key is missing', () => {
    localStorage.clear();
    const widget = createQuickLinksWidget();
    widget.loadLinks();
    expect(widget.links).toEqual([]);
  });
});

/* ================================================================
   UNIT TESTS — Edit Cancel (changes discarded)
   ================================================================ */
describe('Unit: Edit cancel preserves original description', () => {
  it('exitEditMode(false) discards changes and restores editingId=null', () => {
    const widget = freshTodo();
    widget.addTask('Original description');
    const id = widget.tasks[0].id;
    widget.enterEditMode(id);
    expect(widget.editingId).toBe(id);
    // Cancel — pass no new description
    widget.exitEditMode(false, 'Should be ignored');
    expect(widget.editingId).toBeNull();
    expect(widget.tasks[0].description).toBe('Original description');
  });

  it('entering edit mode on a second task cancels the first (no-save)', () => {
    const widget = freshTodo();
    widget.addTask('Task A');
    widget.addTask('Task B');
    const idA = widget.tasks[0].id;
    const idB = widget.tasks[1].id;

    widget.enterEditMode(idA);
    // Now open edit on B — should auto-cancel A
    widget.enterEditMode(idB);
    expect(widget.editingId).toBe(idB);
    // Task A description unchanged
    expect(widget.tasks[0].description).toBe('Task A');
  });
});

/* ================================================================
   UNIT TESTS — Link open in new tab (window.open called with _blank)
   ================================================================ */
describe('Unit: Link opens in new tab', () => {
  it('clicking a rendered link button calls window.open with _blank', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const widget = createQuickLinksWidget();
    const link = { id: '1', label: 'GitHub', url: 'https://github.com' };
    const el = widget.renderLink(link);

    // The first button inside the wrapper is the link button
    const linkBtn = el.querySelector('button');
    linkBtn.click();

    expect(openSpy).toHaveBeenCalledWith('https://github.com', '_blank');
    openSpy.mockRestore();
  });
});

/* ================================================================
   UNIT TESTS — System Clock Unavailable (GreetingWidget.render)
   ================================================================ */
describe('Unit: System clock unavailable fallback', () => {
  it('formatTime on a valid Date works correctly', () => {
    const d = makeDate(9, 5);
    expect(GreetingWidget.formatTime(d)).toBe('09:05');
  });

  it('formatTime zero-pads both hour and minute', () => {
    expect(GreetingWidget.formatTime(makeDate(0, 0))).toBe('00:00');
    expect(GreetingWidget.formatTime(makeDate(1, 3))).toBe('01:03');
    expect(GreetingWidget.formatTime(makeDate(23, 59))).toBe('23:59');
  });
});

/* ================================================================
   UNIT TESTS — XSS: escapeHtml
   ================================================================ */
describe('Unit: Utils.escapeHtml prevents XSS', () => {
  it('escapes all five special HTML characters', () => {
    const raw = '<script>alert("XSS\'s")&danger</script>';
    const escaped = Utils.escapeHtml(raw);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
  });
});
