# Adyapan LMS — Role Specifications & Flow Walkthrough

Welcome to the **Adyapan LMS** documentation. This document details the exact specifications, features, and workflows for each role in the system: **Admin**, **Faculty (Teacher)**, and **Student**.

---

## 1. System Architecture & Scoping System

Adyapan LMS operates on a dual-scoping system designed to support flexible, cohort-based learning:
1. **Course Curriculum Scoping (Duration-based):** 
   - A Course is created globally.
   - It contains curriculum content (videos, PDFs, notes) categorized under four isolated tracks: **30 Days**, **45 Days**, **90 Days**, and **180 Days**.
   - Curriculum contents are universal to all batches but filtered for students based on their enrolled duration track.
2. **Cohort Scoping (Batch-based):**
   - Batches are created for a specific Course and Course Duration (e.g., "Master JS - July 2026 Batch" on the "45 Days" track).
   - Interactive components—namely **Quizzes**, **Assignments (Tasks)**, **Learning Materials**, and **Online Live Classes**—are bound strictly to a single Batch.
   - A student only has access to the interactive components assigned to their specific Batch.

---

## 2. Role Specifications & Features

### 👤 Admin Role
The Admin has full operational oversight of the platform, including user provisioning, course generation, and cohort orchestration.

#### Key Features & Flows:
- **Student Management:**
  - **Create Student Profile:** Provision new student profiles (name, email, password, profile photo).
  - **Interactive Course Scoping:** When assigning courses to a student, the admin specifies the target **Duration Days** (`30`, `45`, `90`, `180` days) and selects the specific **Batch** for that course. Selecting a batch automatically and dynamically auto-selects the corresponding duration of that cohort and disables the custom Duration selection to prevent configuration mismatches. This stores a custom scoped enrollment in the database.
  - **Deactivate / Activate:** Instantly toggle student access status.
- **Faculty Management:**
  - Create and manage Faculty profiles.
  - Assign Faculty to teach specific Courses.
  - Toggle Faculty account access.
- **Course Management:**
  - Create courses under categories (e.g., CSE/IT Domains, Management & Commerce).
  - Build universal curriculum syllabi with duration-specific filters.
- **Batch Management:**
  - Create Batches by selecting a Course, Duration track, and Start Date (End Date is computed automatically based on the duration).
  - Manage Batch Detail Dashboards: Assign/remove students, monitor batch progress, and toggle batch status.
  - View counts and lists of quizzes, assignments, and online classes assigned to each batch.
- **Attendance & Analytics:**
  - Review course-wide and batch-specific student attendance logs.
  - View overall platform metrics (active enrollments, grades, submissions).

---

### 🎓 Faculty (Teacher) Role
Faculty members are responsible for instructional content delivery, cohort engagement, and evaluation of student work.

#### Key Features & Flows:
- **Batch Management Dashboard:**
  - View assigned batches, start/end dates, and day-progress indicators.
  - Access the Batch Details panel to inspect the assigned students and monitor their learning progress.
- **Batch-Scoped Learning Materials:**
  - Upload study resources (PDFs, Videos, Notes, External Resources) to S3.
  - **Mandatory Batch Assignment:** Faculty must select a specific target Batch when uploading study materials to ensure only students of that cohort can view them.
- **Batch-Scoped Quiz Management:**
  - Create MCQ, True/False, or Single-Choice examinations.
  - **Mandatory Batch Assignment:** Select the target Course and Batch to make the quiz exclusive to that cohort.
- **Batch-Scoped Assignments (Tasks):**
  - Publish project sheets or homework assignments with due dates and attachments.
  - Evaluate and grade student submissions (O, A+, A, B+, B, C, D) with custom written feedback.
- **Batch-Scoped Online Classes:**
  - Schedule virtual live rooms by specifying Title, Course, Batch, Schedule Time, Meeting Link, and Class Format (Live, Upcoming, Recorded).
  - Toggle class status or cancel scheduled sessions.

---

### 🧑‍🎓 Student Role
Students experience a highly focused learning environment tailored to their enrolled track and assigned cohort.

#### Key Features & Flows:
- **Interactive Portal Dashboard:**
  - View enrolled courses and overall course progress percentage.
- **Course Curriculum View:**
  - Browse lessons and curriculum sections. The system reads the student's enrollment duration track and automatically filters the view to show only curriculum items corresponding to that track (e.g., 30 Days lessons).
  - Displays a clean, dedicated badge showing their actual assigned syllabus duration track (e.g. `45 Days`), completely hiding the multi-duration selectors that are only available for admins and faculty.
  - Selected tab preferences (last visited duration) are stored locally in the browser to maintain state across sessions.
- **Learning Materials Library:**
  - Access, read, and download materials uploaded specifically for their Batch.
- **Interactive Quizzes:**
  - Attempt scheduled examinations within the designated duration minutes.
  - Results and scores are recorded immediately upon submission, with instant feedback. Already attempted quizzes are locked to prevent re-attempts.
- **Homework Assignments (Tasks):**
  - View pending, submitted, and graded tasks.
  - Upload project files to S3 or link GitHub repositories to submit homework.
  - Read faculty grades and feedback comments.
- **Online Live Rooms:**
  - View and join scheduled virtual classes for their batch.

---

## 3. Database Schema Mapping
- **`User` Model:** Stores profiles with roles (`ADMIN`, `TEACHER`, `STUDENT`) and active status.
- **`Enrollment` Model:** Connects `Student` to `Course`, storing custom scoping settings (`durationDays` and `batchId`).
- **`CourseBatch` Model:** Holds batch details, linked to a `Course` and scoped to `durationDays`.
- **`Lesson` Model:** Curriculum content scoped globally to `Course` and `durationDays`.
- **`Material` Model:** Learning materials scoped to `Course` and `batchId`.
- **`Quiz` Model:** Scopes online exams to `Course` and `batchId`.
- **`Task` Model:** Scopes assignments to `Course` and `batchId`.
- **`LiveClass` Model:** Scopes scheduled live classes to `Course` and `batchId`.
