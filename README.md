# Citizen Infra Grievance Assistance (CIGA)

An AI-powered civic infrastructure grievance reporting and administrative resolution platform. Citizens can report civic issues (potholes, water leaks, broken streetlights, drainage failures) using photos, audio voice notes, and GPS coordinates. Municipal administrators can track, triage, cluster, and resolve incidents in real time using an interactive geospatial dashboard.

---

## 📋 Table of Contents

- [Project Architecture](#-project-architecture)
- [Frontend Prerequisites & Requirements](#-frontend-prerequisites--requirements)
- [Frontend Setup & Installation](#-frontend-setup--installation)
- [Environment Variables Configuration](#-environment-variables-configuration)
- [Running the Frontend](#-running-the-frontend)
- [Default Routes](#-default-routes)

---

## 🏛 Project Architecture

```
Citizen-Infra-Grievance-Assistance/
├── frontend/               # Next.js 16 (App Router) Web Client & Admin Dashboard
├── backend/                # Python / Flask Civic Infrastructure Backend API
└── README.md               # Main Project Documentation
```

---

## ⚙️ Frontend Prerequisites & Requirements

Before setting up and running the frontend application, ensure your system has the following installed:

| Requirement | Supported Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.18.0` (Recommended: `v20.x` or `v22.x`) | Check with `node -v` |
| **npm** | `>= 9.x` (Recommended: `10.x`) | Comes with Node.js (`npm -v`) |
| **Operating System** | Windows, macOS, or Linux | Cross-platform |
| **Modern Browser** | Chrome, Edge, Firefox, Safari | Web Audio API & Geolocation required |
| **Backend API** | Running instance | Default remote: `http://localhost:5000` |

---

## 🚀 Frontend Setup & Installation

Follow these steps to set up and run the frontend:

### 1. Clone & Navigate to Frontend

Open your terminal and navigate to the `frontend` folder:

```bash
cd frontend
```

### 2. Install Dependencies

Install all required packages via `npm`:

```bash
npm install
```

> **Note:** If you encounter dependency peer warnings with React 19, use:
> ```bash
> npm install --legacy-peer-deps
> ```

---

## 🔐 Environment Variables Configuration

The frontend connects to the backend API via environment variables.

Create a `.env.local` file inside the `frontend/` directory (or verify existing `.env.local`):

```bash
# Path: frontend/.env.local
```

Populate it with the following configuration:

```env
# ==========================================
# Citizen Infra Grievance Assistance Environment
# ==========================================

# Base Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

# Frontend Client API Keys
NEXT_PUBLIC_COMPLAINTS_API_KEY=e5q2V2sJkkdEQUXe_-ETzy3UjrQreotz8QrT5gcHqKU
NEXT_PUBLIC_TRACKING_API_KEY=AwH0IukvjtwAc9lqpJ8MWrj2QZkIQ6MLKsww0Qoqs5g
NEXT_PUBLIC_ADMIN_API_KEY=h7Dn_V0HqYBAKbdaACWVET3DAmVsbsuxoNKiOKjtx3s
NEXT_PUBLIC_COMPLAINTS_LIST_API_KEY=l5VlqCYhtC9OCLT-3ifm0yJzciW-Yd6NV7mQ-48t2zk
NEXT_PUBLIC_UPDATE_STATUS_API_KEY=v8ZLmsO6PefwCOTx7RpTY9aPJunrKJP4my1vzVpB5zY
NEXT_PUBLIC_DELETE_COMPLAINT_API_KEY=v8ZLmsO6PefwCOTx7RpTY9aPJunrKJP4my1vzVpB5zY
NEXT_PUBLIC_MAP_POINTS_API_KEY=5SjJvF8lvgiMb54IHNiwr4KYrsyX4eGyEfvZD61RZC8

# Server-side Fallback Keys
BACKEND_URL=http://localhost:5000
COMPLAINTS_API_KEY=e5q2V2sJkkdEQUXe_-ETzy3UjrQreotz8QrT5gcHqKU
TRACKING_API_KEY=AwH0IukvjtwAc9lqpJ8MWrj2QZkIQ6MLKsww0Qoqs5g
ADMIN_API_KEY=h7Dn_V0HqYBAKbdaACWVET3DAmVsbsuxoNKiOKjtx3s
COMPLAINTS_LIST_API_KEY=l5VlqCYhtC9OCLT-3ifm0yJzciW-Yd6NV7mQ-48t2zk
UPDATE_STATUS_API_KEY=v8ZLmsO6PefwCOTx7RpTY9aPJunrKJP4my1vzVpB5zY
DELETE_COMPLAINT_API_KEY=v8ZLmsO6PefwCOTx7RpTY9aPJunrKJP4my1vzVpB5zY
MAP_POINTS_API_KEY=5SjJvF8lvgiMb54IHNiwr4KYrsyX4eGyEfvZD61RZC8
```

---

## 💻 Running the Frontend

All commands should be executed from within the `frontend/` directory:

### Development Mode

Start the Next.js development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Launch

To create an optimized production build:

```bash
# 1. Build the production application
npm run build

# 2. Start the production server
npm run start
```

---

## 🌐 Default Routes

| Path | Description | Access |
| :--- | :--- | :--- |
| `/` | Public Citizen Reporting & Ticket Tracking | Public |
| `/login` | Administrator Sign In | Public |
| `/admin` | Live Geospatial Map & Incident Management Table | Administrators |

---