# Citizen Infra Grievance Assistance (CIGA)

An AI-powered civic infrastructure grievance reporting and administrative resolution platform. Citizens can report civic issues (potholes, water leaks, broken streetlights, drainage failures) using photos, audio voice notes, and GPS coordinates. Municipal administrators can track, triage, cluster, and resolve incidents in real time using an interactive geospatial dashboard.

---

## 📋 Table of Contents

- [Project Architecture](#-project-architecture)
- [Frontend Setup & Execution (Next.js 16)](#-frontend-setup--execution-nextjs-16)
  - [Frontend Prerequisites & Requirements](#frontend-prerequisites--requirements)
  - [How to Run the Frontend](#how-to-run-the-frontend)
  - [Frontend Environment Variables (`.env.local`)](#frontend-environment-variables-envlocal)
  - [Default Routes](#default-routes)
- [Backend Setup & Execution (Python / Flask)](#-backend-setup--execution-python--flask)
  - [Backend Requirements](#backend-requirements)
  - [How to Run the Backend](#how-to-run-the-backend)
  - [Backend Environment Variables (`.env`)](#backend-environment-variables-env)
  - [Database Migrations](#database-migrations)
  - [API Endpoints & Documentation](#api-endpoints--documentation)
  - [Backend Test Cases & Verification](#-backend-test-cases--verification)
- [Authentication & API Access Model](#-authentication--api-access-model)

---

## 🏛 Project Architecture

```
Citizen-Infra-Grievance-Assistance/
├── frontend/               # Next.js 16 (App Router) Web Client & Admin Dashboard
├── backend/                # Python 3.11+ / Flask Civic Infrastructure Backend API
└── README.md               # Unified Project Documentation
```

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
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

# Server-Side Fallback Backend URL
BACKEND_URL=http://localhost:5000
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

### Backend Environment Variables (`.env`)

```env
DATABASE_URL=<postgresql-connection-string>

MY_AWS_REGION=<aws-region>
MY_AWS_ACCESS_KEY_ID=<aws-access-key>
MY_AWS_SECRET_ACCESS_KEY=<aws-secret-key>
MY_AWS_S3_BUCKET=<s3-bucket-name>

OPENAI_API_KEY=<openai-api-key>
```

> **Note:** The AWS S3 bucket must permit public read access to the image and audio URLs returned by the API.

---

### Database Migrations

Run migrations in this exact order using the **Supabase SQL Editor**:

```text
migrations/001_init.sql
migrations/002_soft_delete_complaints.sql
migrations/003_user_message_ai_decision.sql
```

Or run them from the terminal once `DATABASE_URL` is set:

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/002_soft_delete_complaints.sql
psql "$DATABASE_URL" -f migrations/003_user_message_ai_decision.sql
```

---

### Start the Backend

**Development Server:**
```bash
python run.py
```
The backend API will be available at `http://127.0.0.1:5000`.

**Production Server:**
```bash
gunicorn -w 2 -b 0.0.0.0:8000 run:app
```

---

### API Endpoints & Documentation

Public citizen endpoints require no authentication. All protected administrative endpoints require standard Bearer token authorization:

```http
Authorization: Bearer <access_token>
```

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Health check endpoint |
| `POST` | `/api/auth/login` | Public | Authenticate administrator and receive Bearer token |
| `POST` | `/api/complaints` | Public | Submit a new complaint (image + GPS) |
| `GET` | `/api/complaints/track/<tracking_id>` | Public | Track complaint details by tracking ID |
| `GET` | `/api/admin/dashboard/stats` | `Bearer <token>` | Get admin dashboard statistics |
| `GET` | `/api/complaints` | `Bearer <token>` | List, paginate, and filter complaints |
| `GET` | `/api/complaints/<id>` | `Bearer <token>` | Get complaint details by numeric ID |
| `PATCH` | `/api/complaints/<tracking_id>/status` | `Bearer <token>` | Update complaint status |
| `DELETE` | `/api/complaints/<tracking_id>` | `Bearer <token>` | Soft-delete a complaint with reason |
| `GET` | `/api/map/points` | `Bearer <token>` | Get live map points and cluster hotspots |

---

### 🧪 Backend Test Cases & Verification

#### 1. Upload photos/voice note (Pothole Case)

![Upload photos/voice note - Pothole](<backend/assests/Pot hole.png>)

#### 2. Upload photos/voice note (Drainage Case)

![Upload photos/voice note - Drainage](<backend/assests/Drainage.png>)

#### 3. Blur Image Validation Case

![Blur Image Case](<backend/assests/Blur Image case.png>)

#### 4. Admin Dashboard Verification

![Admin Dashboard](<backend/assests/Admin Dashboard.png>)

---

## 🔐 Authentication & API Access Model

The `X-API-Key` concept has been removed:

1. **Public Citizen Endpoints**:
   - `POST /api/complaints`: Citizens file grievances with photos, GPS, text, and voice notes. No authentication headers required.
   - `GET /api/complaints/track/<tracking_id>`: Citizens track their complaint by tracking code. No authentication headers required.
2. **Administrative Access**:
   - `POST /api/auth/login`: Administrator signs in with email and password to receive a Bearer session token.
   - `Authorization: Bearer <token>`: Passed automatically by all admin calls (`/api/admin/dashboard/stats`, `/api/complaints`, `/api/complaints/<id>/status`, `/api/complaints/<id>`, `/api/map/points`).
