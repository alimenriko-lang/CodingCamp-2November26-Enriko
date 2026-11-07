# Requirements Document

## Introduction

"To-Do List Life Dashboard" adalah sebuah halaman web produktivitas pribadi berbasis HTML, CSS, dan Vanilla JavaScript yang berjalan sepenuhnya di sisi klien. Dashboard ini menggabungkan empat fitur utama — Greeting (sapaan berdasarkan waktu), Focus Timer bergaya Pomodoro, To-Do List, dan Quick Links — dalam satu antarmuka yang bersih dan minimal. Semua data disimpan menggunakan browser Local Storage API sehingga tidak memerlukan backend server.

## Glossary

- **Dashboard**: Halaman web utama yang menampilkan semua widget fitur dalam satu tampilan.
- **Greeting_Widget**: Komponen UI yang menampilkan waktu, tanggal, dan sapaan berdasarkan waktu hari.
- **Timer**: Komponen UI yang mengimplementasikan sesi kerja bergaya Pomodoro selama 25 menit.
- **Todo_List**: Komponen UI yang mengelola daftar tugas pengguna.
- **Task**: Satu item pekerjaan dalam Todo_List yang memiliki teks deskripsi dan status selesai atau belum.
- **Quick_Links**: Komponen UI yang menampilkan dan mengelola koleksi tautan website favorit pengguna.
- **Link**: Satu item tautan dalam Quick_Links yang memiliki label dan URL.
- **Local_Storage**: Browser Local Storage API yang digunakan untuk menyimpan data di sisi klien.
- **Time_Period**: Klasifikasi waktu hari — Pagi (05:00–11:59), Siang (12:00–14:59), Sore (15:00–17:59), Malam (18:00–04:59).

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a pengguna, I want to see the current time, date, and a greeting based on the time of day, so that I can quickly orient myself and feel welcomed when opening the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM 24-hour format, updated every 60 seconds.
2. THE Greeting_Widget SHALL display the current date including the day name, date number, month name, and year in Indonesian language (e.g., "Minggu, 7 November 2026").
3. WHEN the current time is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Selamat Pagi".
4. WHEN the current time is between 12:00 and 14:59, THE Greeting_Widget SHALL display the greeting "Selamat Siang".
5. WHEN the current time is between 15:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Selamat Sore".
6. WHEN the current time is between 18:00 and 23:59, OR between 00:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Selamat Malam".
7. IF the system clock is unavailable, THEN THE Greeting_Widget SHALL display "--:--" for time, an empty string for the date, and suppress the greeting message.

---

### Requirement 2: Focus Timer

**User Story:** As a pengguna, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a countdown display of 25:00 in MM:SS format when the Dashboard loads.
2. WHEN the user activates the Start control, THE Timer SHALL begin counting down one second at a time.
3. WHILE the Timer is counting down, THE Timer SHALL update the displayed time every second.
4. WHEN the user activates the Stop control, THE Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the Reset control, THE Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically and display a session-end message on screen that remains visible until the user activates the Reset control.
7. WHILE the Timer is counting down, THE Timer SHALL disable the Start control to prevent duplicate timers from being started.
8. WHILE the Timer is paused or reset, THE Timer SHALL disable the Stop control.
9. WHEN the countdown reaches 00:00, THE Timer SHALL re-enable the Start control and disable the Stop control.

---

### Requirement 3: To-Do List — Add and Display Tasks

**User Story:** As a pengguna, I want to add new tasks and see them displayed in a list, so that I can track what needs to be done.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field (with a maximum of 200 characters) and an Add button for the user to submit a new Task.
2. WHEN the user submits a non-empty task description, THE Todo_List SHALL trim leading and trailing whitespace and add the new Task to the list with a status of incomplete.
3. IF the user submits an empty or whitespace-only task description, THEN THE Todo_List SHALL reject the submission, not add a Task to the list, and display an error message to the user.
4. THE Todo_List SHALL display all Tasks in the order they were added, showing the task description and completion status.
5. IF the Todo_List contains no Tasks, THEN THE Todo_List SHALL display an empty state message (e.g., "Belum ada tugas. Tambahkan tugas baru!").

---

### Requirement 4: To-Do List — Edit Tasks

**User Story:** As a pengguna, I want to edit an existing task's description, so that I can correct mistakes or update the task details.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an Edit control for each Task in the list.
2. WHEN the user activates the Edit control on a Task, THE Todo_List SHALL replace the task description text with an editable input field (maximum 200 characters) pre-filled with the current description.
3. WHEN the user activates the Edit control on a Task while another Task is already in edit mode, THE Todo_List SHALL save or cancel the in-progress edit on the previous Task before opening the new edit field.
4. WHEN the user confirms the edit with a non-empty description, THE Todo_List SHALL trim leading and trailing whitespace, update the Task's description, and return the item to display mode.
5. IF the user confirms the edit with an empty or whitespace-only description, THEN THE Todo_List SHALL reject the update, retain the original task description in the input field, and display an error message.
6. WHEN the user cancels the edit, THE Todo_List SHALL discard the changes and return the item to display mode without modifying the Task.

---

### Requirement 5: To-Do List — Complete and Delete Tasks

**User Story:** As a pengguna, I want to mark tasks as done and delete tasks I no longer need, so that I can maintain an accurate and clean task list.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a toggle control for each Task that switches its completion status between incomplete and complete.
2. WHEN a Task is marked as complete, THE Todo_List SHALL apply a strikethrough style to the task description text to differentiate it from incomplete tasks.
3. WHEN a Task is marked as complete and the toggle control is activated again, THE Todo_List SHALL revert the Task's status to incomplete and remove the strikethrough style.
4. THE Todo_List SHALL provide a Delete control for each Task in the list.
5. WHEN the user activates the Delete control on a Task, THE Todo_List SHALL immediately and permanently remove that Task from the list without requiring additional confirmation.

---

### Requirement 6: To-Do List — Data Persistence

**User Story:** As a pengguna, I want my tasks to be saved automatically, so that they are still available the next time I open the dashboard.

#### Acceptance Criteria

1. WHEN a Task is added, edited, completed, or deleted, THE Todo_List SHALL save the updated task list to Local_Storage synchronously before the operation is considered complete.
2. WHEN the Dashboard loads, THE Todo_List SHALL read and restore all previously saved Tasks from Local_Storage, preserving both task descriptions and completion statuses.
3. IF no task data exists in Local_Storage, THEN THE Todo_List SHALL initialize with an empty task list.
4. IF reading task data from Local_Storage fails, THEN THE Todo_List SHALL initialize with an empty task list and display an error message to the user.

---

### Requirement 7: Quick Links — Add and Display Links

**User Story:** As a pengguna, I want to save links to my favorite websites and have them displayed as clickable buttons, so that I can access frequently used sites quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide an input field for a label, an input field for a URL, and an Add button to submit a new Link.
2. WHEN the user submits a Link with a non-empty label and a valid URL (beginning with `http://` or `https://` and containing a non-empty host segment), THE Quick_Links SHALL add the Link to the collection and display it as a clickable button.
3. IF the user submits a Link with an empty label or an invalid/empty URL, THEN THE Quick_Links SHALL reject the submission, not add the Link, and display an error message indicating which field is invalid.
4. WHEN the user clicks a Link button, THE Quick_Links SHALL open the corresponding URL in a new browser tab.
5. THE Quick_Links SHALL display all saved Links as buttons showing the label text.

---

### Requirement 8: Quick Links — Delete Links

**User Story:** As a pengguna, I want to remove Quick Links I no longer need, so that the links panel stays relevant and uncluttered.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a Delete control for each Link button in the collection.
2. WHEN the user activates the Delete control on a Link, THE Quick_Links SHALL immediately and permanently remove that Link from the collection without requiring additional confirmation.

---

### Requirement 9: Quick Links — Data Persistence

**User Story:** As a pengguna, I want my saved links to persist across browser sessions, so that I do not have to re-add them every time I open the dashboard.

#### Acceptance Criteria

1. WHEN a Link is added or deleted, THE Quick_Links SHALL save the updated link collection to Local_Storage synchronously before the operation is considered complete.
2. WHEN the Dashboard loads, THE Quick_Links SHALL read and restore all previously saved Links from Local_Storage.
3. IF no link data exists in Local_Storage, THEN THE Quick_Links SHALL initialize with an empty link collection.
4. IF reading link data from Local_Storage fails, THEN THE Quick_Links SHALL initialize with an empty link collection and display an error message to the user.

---

### Requirement 10: Technical Constraints

**User Story:** As a developer, I want the dashboard to be built with plain HTML, CSS, and Vanilla JavaScript, so that it runs in any modern browser without any build tools or server infrastructure.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript without any external JavaScript frameworks, JS libraries, CSS frameworks, or CSS libraries.
2. THE Dashboard SHALL store all persistent data exclusively through the Local_Storage API with no backend server communication.
3. THE Dashboard SHALL function correctly in the latest stable release version of Chrome, Firefox, Edge, and Safari available at the time of development.
4. THE Dashboard SHALL consist of exactly one HTML file, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
