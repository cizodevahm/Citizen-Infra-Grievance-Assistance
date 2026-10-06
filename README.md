# Citizen Infra Grievance Assistance (CIGA)

An AI-powered civic infrastructure grievance reporting and administrative resolution platform. Citizens can report civic issues (potholes, water leaks, broken streetlights, drainage failures) using photos, audio voice notes, and GPS coordinates. Municipal administrators can track, triage, cluster, and resolve incidents in real time using an interactive geospatial dashboard.

---

## 📋 Table of Contents

- [Project Architecture](#-project-architecture)
- [Backend Setup & Execution (Python / Flask)](#-backend-setup--execution-python--flask)
  - [Backend Requirements](#backend-requirements)
  - [How to Run the Backend](#how-to-run-the-backend)
  - [Backend Environment Variables (`.env`)](#backend-environment-variables-env)
  - [Database Migrations](#database-migrations)
  - [API Endpoints & Documentation](#api-endpoints--documentation)
- [Frontend Setup & Execution (Next.js 16)](#-frontend-setup--execution-nextjs-16)
  - [Frontend Prerequisites & Requirements](#frontend-prerequisites--requirements)
  - [How to Run the Frontend](#how-to-run-the-frontend)
  - [Frontend Environment Variables (`.env.local`)](#frontend-environment-variables-envlocal)
  - [Default Routes](#default-routes)
- [API Key Mapping (Backend ↔ Frontend)](#-api-key-mapping-backend--frontend)

---

## 🏛 Project Architecture

```
Citizen-Infra-Grievance-Assistance/
├── backend/                # Python 3.11+ / Flask Civic Infrastructure Backend API
├── frontend/               # Next.js 16 (App Router) Web Client & Admin Dashboard
└── README.md               # Unified Project Documentation
```

---

## 🐍 Backend Setup & Execution (Python / Flask)

### Backend Requirements

- **Python**: `3.11+`
- **PostgreSQL**: With `PostGIS` enabled (Supabase PostgreSQL is supported)
- **psql**: Command-line client (if migrations will be run from terminal)
- **OpenAI API Key**: For AI incident triage, vision analysis, and audio transcription
- **AWS S3**: S3 bucket and AWS credentials for storing complaint photos and audio files

---

### How to Run the Backend

#### 1. Navigate to the Backend Directory

```bash
cd backend
```

#### 2. Create and Activate a Virtual Environment

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows PowerShell:**
```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure Environment Variables

Create the `.env` file:

```bash
cp .env.example .env
```

Generate the 7 endpoint API keys:

```bash
python scripts/generate_keys.py
```

Copy the generated keys into `.env`, then fill in the required credentials:

### Backend Environment Variables (`.env`)

```env
DATABASE_URL=<postgresql-connection-string>

MY_AWS_REGION=<aws-region>
MY_AWS_ACCESS_KEY_ID=<aws-access-key>
MY_AWS_SECRET_ACCESS_KEY=<aws-secret-key>
MY_AWS_S3_BUCKET=<s3-bucket-name>

OPENAI_API_KEY=<openai-api-key>

# Endpoint API Keys (Generated via scripts/generate_keys.py)
KEY_SUBMIT_COMPLAINT=<unique-key-submit-complaint>
KEY_TRACK_COMPLAINT=<unique-key-track-complaint>
KEY_LIST_COMPLAINTS=<unique-key-list-complaints>
KEY_GET_COMPLAINT=<unique-key-get-complaint>
KEY_UPDATE_STATUS=<unique-key-update-status>
KEY_DASHBOARD_STATS=<unique-key-dashboard-stats>
KEY_MAP_POINTS=<unique-key-map-points>
```

> **Note:** The AWS S3 bucket must permit public read access to the image and audio URLs returned by the API.

---

### Database Migrations

Run both migrations in this exact order using the **Supabase SQL Editor**:

```text
migrations/001_init.sql
migrations/002_soft_delete_complaints.sql
```

Or run them from the terminal once `DATABASE_URL` is set:

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_soft_delete_complaints.sql
```

---

### Start the Backend

**Development Server:**
```bash
python run.py
```
The backend API will be available at `http://127.0.0.1:5000`.


---

### API Endpoints & Documentation

All `/api/*` endpoints require the `X-API-Key` header:

```http
X-API-Key: <endpoint-specific-key>
```

`GET /health` is public and does not require an API key.

| Method | Endpoint | Required API Key | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/complaints` | `KEY_SUBMIT_COMPLAINT` | Submit a new complaint (image + GPS) |
| `GET` | `/api/complaints/track/<tracking_id>` | `KEY_TRACK_COMPLAINT` | Track complaint details by tracking ID |
| `GET` | `/api/complaints` | `KEY_LIST_COMPLAINTS` | List, paginate, and filter complaints |
| `GET` | `/api/complaints/<id>` | `KEY_GET_COMPLAINT` | Get complaint details by numeric ID |
| `PATCH` | `/api/complaints/<tracking_id>/status` | `KEY_UPDATE_STATUS` | Update complaint status |
| `DELETE` | `/api/complaints/<tracking_id>` | `KEY_UPDATE_STATUS` | Soft-delete a complaint with reason |
| `GET` | `/api/admin/dashboard/stats` | `KEY_DASHBOARD_STATS` | Get admin dashboard statistics |
| `GET` | `/api/map/points` | `KEY_MAP_POINTS` | Get live map points and cluster hotspots |


---

## 💻 Frontend Setup & Execution (Next.js 16)

### Frontend Prerequisites & Requirements

| Requirement | Supported Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.18.0` (Recommended: `v20.x` or `v22.x`) | Check with `node -v` |
| **npm** | `>= 9.x` (Recommended: `10.x`) | Comes with Node.js (`npm -v`) |
| **Operating System** | Windows, macOS, or Linux | Cross-platform |
| **Modern Browser** | Chrome, Edge, Firefox, Safari | Audio Recording & Geolocation required |
| **Backend API** | Running instance | Local: `http://127.0.0.1:5000` or Remote |

---

### How to Run the Frontend

#### 1. Navigate to the Frontend Directory

```bash
cd frontend
```

#### 2. Install Dependencies

```bash
npm install
```

> **Note:** If you encounter dependency peer warnings with React 19, run:
> ```bash
> npm install --legacy-peer-deps
> ```

#### 3. Configure Environment Variables (`frontend/.env.local`)

Create or update `frontend/.env.local`:

```env
# ==========================================
# Citizen Infra Grievance Assistance Environment
# ==========================================

# Base Backend API URL (Local development or Remote server)
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000

# Frontend Client API Keys (Must match backend KEY_* values)
NEXT_PUBLIC_COMPLAINTS_API_KEY=<unique-key-submit-complaint>
NEXT_PUBLIC_TRACKING_API_KEY=<unique-key-track-complaint>
NEXT_PUBLIC_ADMIN_API_KEY=<unique-key-dashboard-stats>
NEXT_PUBLIC_COMPLAINTS_LIST_API_KEY=<unique-key-list-complaints>
NEXT_PUBLIC_UPDATE_STATUS_API_KEY=<unique-key-update-status>
NEXT_PUBLIC_DELETE_COMPLAINT_API_KEY=<unique-key-update-status>
NEXT_PUBLIC_MAP_POINTS_API_KEY=<unique-key-map-points>

# Server-Side Fallback Keys
BACKEND_URL=http://127.0.0.1:5000
COMPLAINTS_API_KEY=<unique-key-submit-complaint>
TRACKING_API_KEY=<unique-key-track-complaint>
ADMIN_API_KEY=<unique-key-dashboard-stats>
COMPLAINTS_LIST_API_KEY=<unique-key-list-complaints>
UPDATE_STATUS_API_KEY=<unique-key-update-status>
DELETE_COMPLAINT_API_KEY=<unique-key-update-status>
MAP_POINTS_API_KEY=<unique-key-map-points>
```

#### 4. Start the Frontend Server

**Development Mode:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Production Build & Launch:**
```bash
# 1. Build the production bundle
npm run build

# 2. Run the production server
npm run start
```

---

### Default Routes

| Path | Description | Access |
| :--- | :--- | :--- |
| `/` | Public Citizen Reporting & Ticket Tracking | Public |
| `/login` | Administrator Sign In | Public |
| `/admin` | Live Geospatial Map & Incident Management Table | Administrators |

---

## 🔑 API Key Mapping (Backend ↔ Frontend)

To ensure seamless communication between the Next.js frontend and the Flask backend, set the corresponding keys in both environments:

| Frontend Key (`frontend/.env.local`) | Backend Key (`backend/.env`) | Target API Endpoint |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_COMPLAINTS_API_KEY` | `KEY_SUBMIT_COMPLAINT` | `POST /api/complaints` |
| `NEXT_PUBLIC_TRACKING_API_KEY` | `KEY_TRACK_COMPLAINT` | `GET /api/complaints/track/<id>` |
| `NEXT_PUBLIC_COMPLAINTS_LIST_API_KEY` | `KEY_LIST_COMPLAINTS` | `GET /api/complaints` |
| `NEXT_PUBLIC_UPDATE_STATUS_API_KEY` | `KEY_UPDATE_STATUS` | `PATCH /api/complaints/<id>/status` |
| `NEXT_PUBLIC_DELETE_COMPLAINT_API_KEY` | `KEY_UPDATE_STATUS` | `DELETE /api/complaints/<id>` |
| `NEXT_PUBLIC_ADMIN_API_KEY` | `KEY_DASHBOARD_STATS` | `GET /api/admin/dashboard/stats` |
| `NEXT_PUBLIC_MAP_POINTS_API_KEY` | `KEY_MAP_POINTS` | `GET /api/map/points` |