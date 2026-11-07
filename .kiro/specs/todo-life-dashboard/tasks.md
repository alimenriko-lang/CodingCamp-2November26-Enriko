# Implementation Plan: To-Do List Life Dashboard

## Overview

Implementasi dashboard produktivitas berbasis HTML, CSS, dan Vanilla JavaScript murni. Kode diorganisir menggunakan namespace object pattern di satu file `js/app.js`. Data persisten disimpan di `localStorage`. Semua logika dibangun secara inkremental — dari fondasi Utils, lalu tiap widget, lalu styling, lalu tests, dan diakhiri dengan wiring integrasi.

## Tasks

- [x] 1. Project Setup — Struktur file dan boilerplate
  - Buat direktori `css/` dan `js/` di root project
  - Buat `index.html` dengan elemen HTML untuk keempat widget: `#greeting-text`, `#clock-display`, `#date-display`, `#timer-display`, `#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`, `#timer-message`, `#todo-input`, `#todo-add-btn`, `#todo-error`, `#todo-list`, `#todo-empty`, `#link-label-input`, `#link-url-input`, `#link-add-btn`, `#link-error`, `#links-container`, `#storage-error-banner`
  - Buat `css/style.css` sebagai file kosong (akan diisi di task CSS)
  - Buat `js/app.js` dengan namespace root `App` dan skeleton namespace kosong: `App.Utils`, `App.GreetingWidget`, `App.TimerWidget`, `App.TodoWidget`, `App.QuickLinksWidget`
  - Hubungkan `<link>` ke `css/style.css` dan `<script>` ke `js/app.js` di `index.html`
  - _Requirements: 10.4_

- [x] 2. Utils Module
  - [x] 2.1 Implementasi `Utils.loadFromStorage(key, defaultValue)` dan `Utils.saveToStorage(key, value)`
    - `loadFromStorage`: baca `localStorage.getItem(key)`, parse JSON, kembalikan `defaultValue` jika `null` atau jika `JSON.parse` throw
    - `saveToStorage`: serialize dengan `JSON.stringify`, panggil `localStorage.setItem`, tangkap dan log error jika throw tanpa re-throw
    - Log error ke console dengan prefix `[Dashboard]`
    - _Requirements: 6.1, 6.2, 6.4, 9.1, 9.2, 9.4_
  - [x] 2.2 Implementasi `Utils.qs`, `Utils.qsAll`, dan `Utils.escapeHtml`
    - `qs(selector, scope)`: shorthand `(scope || document).querySelector(selector)`
    - `qsAll(selector, scope)`: shorthand `(scope || document).querySelectorAll(selector)`
    - `escapeHtml(text)`: replace `&`, `<`, `>`, `"`, `'` dengan HTML entities untuk mencegah XSS
    - _Requirements: 10.1_
  

- [x] 3. Greeting Widget
  - [x] 3.1 Implementasi `GreetingWidget.formatTime(date)` dan `GreetingWidget.formatDate(date)`
    - `formatTime`: ekstrak jam dan menit dari `Date`, pad ke dua digit, kembalikan string `"HH:MM"`
    - `formatDate`: gunakan `date.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })` atau implementasi manual dengan array nama hari/bulan Indonesia
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.4 Implementasi `GreetingWidget.getTimePeriod(hour)`
    - Return `'pagi'` untuk hour 5–11, `'siang'` untuk 12–14, `'sore'` untuk 15–17, `'malam'` untuk 0–4 dan 18–23
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [x] 3.6 Implementasi `GreetingWidget.render()` dan `GreetingWidget.init()`
    - `render()`: panggil `new Date()` dalam try/catch; jika error, tampilkan `"--:--"`, string kosong, dan sembunyikan greeting sesuai Requirement 1.7; jika sukses, update `#clock-display`, `#date-display`, `#greeting-text`
    - `init()`: panggil `render()` sekali, lalu `setInterval(render, 60000)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4. Focus Timer Widget
  - [x] 4.1 Implementasi `TimerWidget.formatTime(seconds)` dan state awal
    - `formatTime(seconds)`: hitung menit dan detik, pad ke dua digit, kembalikan `"MM:SS"`
    - Inisialisasi: `state = 'idle'`, `remaining = 1500`, `intervalId = null`
    - _Requirements: 2.1_
  - [x] 4.2 Implementasi `TimerWidget.updateControls()` dan `TimerWidget.render()`
    - `updateControls()`: enable/disable `#timer-start-btn` dan `#timer-stop-btn` sesuai state — Start disabled saat `running`, Stop disabled saat `idle` atau `paused` atau `finished`
    - `render()`: update `#timer-display` dengan `formatTime(remaining)`, tampilkan/sembunyikan `#timer-message`, panggil `updateControls()`
    - _Requirements: 2.7, 2.8, 2.9_
  - [x] 4.3 Implementasi `TimerWidget.tick()`, `TimerWidget.onFinish()`, `TimerWidget.start()`, `TimerWidget.stop()`, `TimerWidget.reset()`
    - `tick()`: kurangi `remaining` satu detik; jika `remaining <= 0`, panggil `onFinish()`
    - `onFinish()`: `clearInterval`, set `state = 'finished'`, panggil `render()`
    - `start()`: jika state `idle` atau `paused`, set `state = 'running'`, set `intervalId = setInterval(tick, 1000)`, panggil `render()`
    - `stop()`: jika state `running`, `clearInterval`, set `state = 'paused'`, panggil `render()`
    - `reset()`: `clearInterval`, set `state = 'idle'`, `remaining = 1500`, panggil `render()`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 4.6 Hubungkan event listener tombol Timer ke metode widget dan panggil `TimerWidget.init()`
    - `init()`: pasang event listener `click` pada `#timer-start-btn`, `#timer-stop-btn`, `#timer-reset-btn`, panggil `render()` untuk tampilkan state awal 25:00
    - _Requirements: 2.1_

- [x] 5. To-Do List Widget
  - [x] 5.1 Implementasi `TodoWidget.validateDescription(text)`
    - Trim teks, jika kosong kembalikan `{ valid: false, error: "Deskripsi tugas tidak boleh kosong" }`
    - Jika valid kembalikan `{ valid: true, error: '' }`
    - _Requirements: 3.3, 4.5_
  
  - [x] 5.3 Implementasi `TodoWidget.addTask(description)` dan `TodoWidget.loadTasks()` / `TodoWidget.saveTasks()`
    - `addTask`: validasi, trim, buat objek `Task` dengan `id` (via `crypto.randomUUID()` atau fallback), `description`, `completed: false`, `createdAt`; push ke `tasks`; panggil `saveTasks()` lalu `render()`
    - `loadTasks`: panggil `Utils.loadFromStorage('todos', [])`, assign ke `this.tasks`
    - `saveTasks`: panggil `Utils.saveToStorage('todos', this.tasks)`
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

  - [x] 5.7 Implementasi `TodoWidget.toggleTask(id)` dan `TodoWidget.deleteTask(id)`
    - `toggleTask`: temukan task by id, flip `completed`, panggil `saveTasks()` lalu `render()`
    - `deleteTask`: filter task by id, panggil `saveTasks()` lalu `render()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 5.10 Implementasi `TodoWidget.enterEditMode(id)`, `TodoWidget.exitEditMode(save)`, dan `TodoWidget.editTask(id, newDescription)`
    - `enterEditMode`: jika `editingId !== null`, panggil `exitEditMode(false)` terlebih dahulu; set `editingId = id`; panggil `render()`
    - `exitEditMode(save)`: jika `save === true`, panggil `editTask(editingId, currentInputValue)`; set `editingId = null`; panggil `render()`
    - `editTask`: validasi, trim, update `description` di tasks, panggil `saveTasks()` lalu `render()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 5.13 Implementasi `TodoWidget.renderTask(task)` dan `TodoWidget.render()`
    - `renderTask`: buat elemen `<li>` dengan teks task (escaped), checkbox toggle, tombol Edit, tombol Delete; terapkan class `completed` + strikethrough jika `task.completed === true`; jika `task.id === editingId`, tampilkan `<input>` edit mode dengan tombol Save/Cancel
    - `render()`: kosongkan `#todo-list`, tampilkan/sembunyikan `#todo-empty`, render tiap task dengan `renderTask`
    - _Requirements: 3.4, 3.5, 5.2_
  - [x] 5.14 Implementasi `TodoWidget.init()` — pasang event listener dan load data awal
    - Pasang event listener `click` pada `#todo-add-btn`, pasang listener `input` pada `#todo-input` untuk clear error
    - Panggil `loadTasks()`, jika localStorage read gagal tampilkan `#storage-error-banner`, panggil `render()`
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 6. Quick Links Widget
  - [x] 6.1 Implementasi `QuickLinksWidget.validateLink(label, url)`
    - Jika label kosong (setelah trim): `errors.label = "Label tidak boleh kosong"`
    - Jika URL tidak dimulai dengan `http://` atau `https://`, atau host segment setelah `://` kosong: `errors.url = "URL harus dimulai dengan http:// atau https:// dan memiliki host yang valid"`
    - Kembalikan `{ valid: Object.keys(errors).length === 0, errors }`
    - _Requirements: 7.2, 7.3_

  - [x] 6.3 Implementasi `QuickLinksWidget.addLink(label, url)`, `loadLinks()`, `saveLinks()`
    - `addLink`: validasi, buat objek `Link` dengan `id`, `label` (trimmed), `url`; push ke `links`; panggil `saveLinks()` lalu `render()`
    - `loadLinks`: `Utils.loadFromStorage('quicklinks', [])`
    - `saveLinks`: `Utils.saveToStorage('quicklinks', this.links)`
    - _Requirements: 7.1, 7.2, 9.1, 9.2, 9.3_
 
  - [x] 6.5 Implementasi `QuickLinksWidget.deleteLink(id)`
    - Filter `links` by id, panggil `saveLinks()` lalu `render()`
    - _Requirements: 8.1, 8.2_
  
  - [x] 6.7 Implementasi `QuickLinksWidget.renderLink(link)` dan `QuickLinksWidget.render()`
    - `renderLink`: buat `<button>` dengan `textContent = link.label` (bukan innerHTML, untuk mencegah XSS); pasang event listener `click` yang memanggil `window.open(link.url, '_blank')`; sertakan tombol Delete
    - `render()`: kosongkan `#links-container`, render tiap link dengan `renderLink`
    - _Requirements: 7.4, 7.5_

  - [x] 6.9 Implementasi `QuickLinksWidget.init()` — pasang event listener dan load data awal
    - Pasang event listener `click` pada `#link-add-btn`
    - Panggil `loadLinks()`, jika gagal tampilkan `#storage-error-banner`, panggil `render()`
    - _Requirements: 9.2, 9.3, 9.4_

- [x] 7. Checkpoint — Pastikan semua widget terinisialisasi
  - Pastikan semua tests pass, ask the user if questions arise.

- [x] 8. CSS Styling
  - [x] 8.1 Implementasi layout dashboard dan visual hierarchy
    - CSS reset dan custom properties (`--color-primary`, `--color-bg`, `--color-surface`, `--color-text`, `--radius`, dll.)
    - Layout grid atau flexbox untuk keempat widget dalam satu halaman
    - Tipografi bersih dan minimal; spacing konsisten
    - _Requirements: 10.1, 10.3_
  - [x] 8.2 Implementasi styling untuk widget Greeting, Timer, dan Quick Links
    - Greeting: tampilan jam besar, tanggal kecil, greeting text
    - Timer: display digital `#timer-display`, tombol Start/Stop/Reset; style `.disabled` untuk tombol yang dinonaktifkan; style `#timer-message` (tersembunyi secara default, muncul saat finished)
    - Quick Links: grid atau flex wrap untuk tombol link, tombol delete inline
    - _Requirements: 2.7, 2.8, 10.1_
  - [x] 8.3 Implementasi styling untuk widget To-Do List
    - Input tambah task dan tombol Add
    - `#todo-empty`: pesan empty state, tersembunyi saat ada task
    - Style completed task: class `.completed` → `text-decoration: line-through` + warna redup
    - Inline edit mode: input menggantikan teks task
    - Pesan error inline (`#todo-error`, `#link-error`): warna merah, tersembunyi secara default
    - `#storage-error-banner`: banner error di atas halaman
    - _Requirements: 5.2, 3.5_
 
- [x] 9. Integration dan Wiring Final
  - [x] 9.1 Hubungkan semua widget di event `DOMContentLoaded` dalam `app.js`
    - Di bagian bawah `app.js`, tambahkan `document.addEventListener('DOMContentLoaded', () => { App.GreetingWidget.init(); App.TimerWidget.init(); App.TodoWidget.init(); App.QuickLinksWidget.init(); })`
    - Verifikasi bahwa tidak ada widget yang inisialisasi di luar `DOMContentLoaded`
    - _Requirements: 10.1, 10.2_
  

- [x] 10. Final Checkpoint — Pastikan semua tests pass
  - Pastikan semua tests pass, ask the user if questions arise.

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task merujuk ke requirements spesifik untuk keterlacakan
- Checkpoints memastikan validasi inkremental
- Property tests (P1–P16) memvalidasi correctness properties universal dari design.md
- Unit tests memvalidasi state machine dan edge case konkret
- Semua teks user-input harus di-escape via `Utils.escapeHtml()` atau `textContent` sebelum masuk DOM

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "3.1", "4.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "5.2", "6.2"] },
    { "id": 3, "tasks": ["3.5", "3.6", "4.2", "5.3", "6.3"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.4", "5.5", "5.6", "6.4"] },
    { "id": 5, "tasks": ["4.5", "4.6", "5.7", "6.5"] },
    { "id": 6, "tasks": ["5.8", "5.9", "5.10", "6.6", "6.7"] },
    { "id": 7, "tasks": ["5.11", "5.12", "5.13", "6.8", "6.9"] },
    { "id": 8, "tasks": ["5.14", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["8.4", "9.1"] },
    { "id": 11, "tasks": ["9.2"] },
    { "id": 12, "tasks": ["9.3"] }
  ]
}
```
