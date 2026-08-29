# Codvdha LMS Hub 🎓

Adyapan LMS is a modern, state-of-the-art Learning Management System designed to bridge the gap between students, educators, and administrators. Powered by a Next.js frontend, an Express REST API backend, and a Supabase-managed PostgreSQL database, it enables real-time course scheduling, automated quiz evaluations, task grading, classroom video link management, and verified certificate generation.

---

## 🚀 Key Architectural Features

*   **Universal API Integrations**: Replaced static mock arrays with custom SWR fetches and Axios API hooks mapped to real database entities.
*   **Dynamic Role-based Portals**: Fully responsive workspaces for **Administrators**, **Teachers**, and **Students** with automatic index redirection.
*   **Live Online Classrooms**: Interactive schedules for Live, Upcoming, and Recorded video rooms (linked to Google Meet, Zoom, etc.).
*   **Attendance Ledger & Calendar**: Check-in boards for daily roll calls and monthly calendar views for student logs.
*   **Interactive Quizzes**: Auto-graded MCQ and True/False quiz attempts with real-time scoring.
*   **Certificates Hub**: Digital certificate builder with unique cryptographic verification codes (e.g. `ADY-XXXXXX`).
*   **Operational Dashboards**: Analytics charts (Student Growth, Course Progression, Weekly Attendance Trends) reflecting live database stats.

---

## 🛠️ Technology Stack

### Frontend
*   **Core**: Next.js 15 (App Router, TypeScript)
*   **Styling**: TailwindCSS & Vanilla CSS
*   **State & Fetching**: SWR (Stale-While-Revalidate), Axios, React Hook Form
*   **Visualizations**: Recharts (Pie, Area, Line, and Bar charts), Framer Motion (micro-animations)

### Backend
*   **Core**: Express, Node.js, TypeScript
*   **Database & ORM**: PostgreSQL (hosted on Supabase) with Prisma ORM
*   **Driver Adapter**: `@prisma/adapter-pg` for optimized pool connections
*   **Security & Auth**: JSON Web Tokens (JWT), Bcrypt password hashing, Helmet, CORS, and Rate-limiting middleware

---

## 📦 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### 1. Database Setup (Supabase)
Create a `.env` file in the `backend/` directory and configure the database link:
```env
DATABASE_URL="url"
PORT=5000
JWT_SECRET="your-jwt-secret-key"
FRONTEND_URL="http://localhost:3000"
```

Sync the database schema and seed the initial categories, courses, and users:
```bash
cd backend
npm install
npm run prisma:push
npm run prisma:seed
```

### 2. Backend API Server Execution
Launch the Express API development server (which will watch files and auto-reload on changes):
```bash
npm run dev
```
The REST API will start running at `http://localhost:5000/api`.

### 3. Frontend Portal Execution
Configure the local environment file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

Start the Next.js server:
```bash
cd ../frontend
npm install
npm run dev
```
The frontend portal will open at `http://localhost:3000` (or `http://localhost:3001`).

---



---

## 📂 Project Structure

```
LMSadyapan/
├── backend/
│   ├── prisma/             # Schema configuration and database seed scripts
│   ├── src/
│   │   ├── config/         # Environment variables & database pool configurations
│   │   ├── middlewares/    # Auth guards, role authorization, & validate schemas
│   │   ├── modules/        # API modules: auth, courses, materials, quizzes, tasks, etc.
│   │   ├── routes/         # Index routers
│   │   └── server.ts       # Express bootstrap entrypoint
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App router (portal routes, layouts)
│   │   ├── components/     # Layout cards, sidebar nav, tables, and buttons
│   │   ├── context/        # LMS global authentication provider context
│   │   ├── lib/            # Axios API instances and SWR query fetchers
│   │   └── screens/        # Dynamic screens: Courses, Attendance, Tasks, etc.
└── README.md
```

# CodevdhaLMS
