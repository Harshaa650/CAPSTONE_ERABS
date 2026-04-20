# ERABS — Enterprise Resource Allocation & Booking System

Production-grade booking platform with **React + Vite + Tailwind + Framer Motion + Recharts** frontend and **FastAPI + SQLAlchemy + PostgreSQL** backend.

> ✅ **No Microsoft C++ Build Tools required.** All Python dependencies ship as pre-built wheels on Windows/Mac/Linux. We use `PyJWT` (pure Python), `psycopg2-binary` (binary wheel), and stdlib `hashlib` for password hashing — no `passlib`, no `bcrypt`, no `python-jose`.

## ✨ Features
- Three roles (Employee / Manager / Admin) with tailored dashboards
- Flip-card Quick Book with live conflict validation
- Conflict detection: double-book, capacity, maintenance, hours, max duration
- Manager swipe-to-approve queue (drag left/right)
- Admin CRUD + maintenance blocks (auto-cancel overlaps) + audit trail
- KPI count-ups, bar & donut charts
- Glassmorphism dark UI with grain

## 🏃 Running locally

### Step 1 — Start PostgreSQL (easiest: Docker)
```bash
cd erabs
docker compose up -d
```
This starts a Postgres 16 container on `localhost:5432` with DB `erabs`, user/password `postgres/postgres`. No install needed beyond Docker Desktop.

**Alternatively**, install Postgres natively and create a DB named `erabs`.

### Step 2 — Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env      # Windows    (or: cp .env.example .env)
uvicorn main:app --reload --port 8000
```
The DB auto-creates tables and seeds demo data on first boot.

Swagger UI → http://localhost:8000/docs

### Step 3 — Frontend (React / Vite)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (Vite proxies `/api` → `:8000`).

## 🔐 Demo accounts
| Role     | Email                | Password     |
|----------|----------------------|--------------|
| Admin    | admin@erabs.io       | admin123     |
| Manager  | manager@erabs.io     | manager123   |
| Employee | employee@erabs.io    | employee123  |

## 🧱 Tech stack (100 % wheels, zero compilation)
| Layer    | Stack |
|----------|-------|
| Frontend | React 18, Vite, Tailwind, Framer Motion, Recharts, Lucide, React Router, react-hot-toast |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic v2, PyJWT, psycopg2-binary |
| DB       | PostgreSQL 16 |
| Auth     | stdlib `hashlib.pbkdf2_hmac` (SHA-256, 200k iterations) + JWT |

## 📁 Structure
```
erabs/
├── docker-compose.yml       # one-command Postgres
├── backend/
│   ├── main.py              # all models, schemas, routes, seed
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/{pages,components,hooks,lib}/
    ├── package.json
    └── vite.config.js
```

## 🧪 Business rules implemented
- No double-booking (capacity-1 resources)
- Capacity-aware overlap for multi-seat rooms / desks / vehicles
- Booking hours enforced (`avail_start` – `avail_end`)
- Max duration policy
- Maintenance blocks reject new bookings **and** auto-cancel overlaps
- Approval-required resources → `pending` → manager approves/rejects
- Lifecycle: `pending → approved/rejected → cancelled/completed`
- Every mutation recorded in `audit_logs`

## 📦 Key endpoints
- `POST /api/auth/login` · `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/resources`
- `POST /api/bookings` · `POST /api/bookings/validate`
- `GET /api/bookings?scope=mine|pending|all`
- `POST /api/bookings/{id}/approve|reject|cancel`
- `GET/POST/DELETE /api/maintenance`
- `GET /api/analytics/summary` · `GET /api/audit`

## 🚀 Production notes
- Set a strong random `SECRET_KEY`
- Use managed Postgres (RDS / Neon / Supabase)
- Frontend: `npm run build` → serve `dist/` behind a CDN; point to backend via `VITE_API_URL`

---
Built with ❤️ as a capstone — enjoy!
