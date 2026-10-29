# IndiComp — Deployment & Execution Guide

This document provides complete instructions for running the **Indigenous Component Dependency & Alternative Intelligence Platform (IndiComp)** locally and deploying it to production using **100% free-tier cloud platforms** (Vercel, Neon PostgreSQL, and Render / Koyeb).

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Running Locally](#2-running-locally)
   - [Method A: Docker Compose (Recommended)](#method-a-docker-compose-recommended)
   - [Method B: Native Local Run (Backend + Frontend)](#method-b-native-local-run)
3. [Deploying to Free Cloud Platforms](#3-deploying-to-free-cloud-platforms)
   - [Step 1: Database Setup — Neon Serverless PostgreSQL](#step-1-database-setup--neon-serverless-postgresql)
   - [Step 2: Backend API Deployment — Render](#step-2-backend-api-deployment--render)
   - [Step 3: Frontend Deployment — Vercel](#step-3-frontend-deployment--vercel)
4. [Alternative Free Providers (Koyeb, Supabase, Cloudflare Pages)](#4-alternative-free-providers)
   - [Database Note: PostgreSQL vs MongoDB](#database-note-postgresql-vs-mongodb)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Database Initialization & Verification](#6-database-initialization--verification)
7. [Troubleshooting & FAQ](#7-troubleshooting--faq)

---

## 1. Architecture Overview

```
                      +-------------------------------+
                      |       Vercel (Frontend)       |
                      |  React 19 + TypeScript + Vite |
                      +---------------+---------------+
                                      |
                           HTTPS REST | (VITE_API_BASE)
                                      v
                      +-------------------------------+
                      |     Render / Koyeb (Backend)  |
                      |   FastAPI + Uvicorn + Python  |
                      +---------------+---------------+
                                      |
                           SQLAlchemy | (DATABASE_URL)
                                      v
                      +-------------------------------+
                      |    Neon DB (PostgreSQL 16)    |
                      |   Serverless Cloud Database   |
                      +-------------------------------+
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, Recharts.
- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Uvicorn, Pandas, OpenPyXL, ReportLab.
- **Database**: PostgreSQL (production via Neon) or SQLite (zero-config local dev).

---

## 2. Running Locally

### Method A: Docker Compose (Recommended)

Requires Docker Desktop or Docker Engine installed.

1. Clone or navigate to the repository directory:
   ```bash
   cd d:\IndiComp
   ```

2. Start all services (PostgreSQL, FastAPI Backend, React Frontend):
   ```bash
   docker compose up --build
   ```

3. Open your browser:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **PostgreSQL Database**: `localhost:5432` (User: `indicomp_user`, Password: `indicomp_password`, DB: `indicomp_db`)

4. Stop services when done:
   ```bash
   docker compose down
   ```

---

### Method B: Native Local Run

Run without Docker using local Python and Node.js.

#### Prerequisites
- **Python**: 3.11+ (Python 3.13 supported)
- **Node.js**: 18+ (Node 20 or 22 recommended)
- **Git**

#### 1. Backend Setup
1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   > **Note**: On first launch, SQLite (`indigenous_platform.db`) is automatically created and populated with baseline verified Indian manufacturers, distributors, component listings, and sample RFQs.

   Verify backend at [http://localhost:8000/api/health](http://localhost:8000/api/health) and [http://localhost:8000/docs](http://localhost:8000/docs).

#### 2. Frontend Setup
1. Open a second terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 3. Deploying to Free Cloud Platforms

### Step 1: Database Setup — Neon Serverless PostgreSQL

[Neon](https://neon.tech) offers a free-tier serverless PostgreSQL database with 0.5 GB storage, automated backups, and zero maintenance.

1. Sign up for free at [neon.tech](https://console.neon.tech/signup).
2. Click **Create Project**:
   - **Project Name**: `indicomp-db`
   - **Postgres Version**: `16`
   - **Region**: Select the region closest to your backend (e.g. `AWS eu-central-1` or `AWS us-east-1`).
3. Under **Dashboard > Connection Details**, select:
   - **Branch**: `main`
   - **Database**: `neondb`
   - **Connection string syntax**: Select **PostgreSQL**.
4. Copy the connection string. It will look like:
   ```text
   postgresql://indicomp_user:AbCdEf123456@ep-cool-butterfly-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Keep this connection string ready for the backend deployment.

---

### Step 2: Backend API Deployment — Render

[Render](https://render.com) provides a free Web Service tier that can run Python FastAPI applications directly from your GitHub repository.

1. Push your code to a GitHub repository:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
3. Select your GitHub repository.
4. Configure the Web Service settings:
   - **Name**: `indicomp-backend`
   - **Region**: Choose the same region as your Neon database (e.g., `Frankfurt (EU Central)` or `Ohio (US East)`).
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Select **Free**.

5. Add **Environment Variables** in Render:
   | Key | Value | Description |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require` | Your Neon connection string |
   | `ENVIRONMENT` | `production` | Production environment flag |
   | `ENABLE_SEMANTIC_SEARCH` | `false` | Set `false` for free tier (avoids high RAM requirements) |
   | `ENABLE_LLM_EXPLAINER` | `false` | Optional AI explainer |
   | `MAX_UPLOAD_SIZE_MB` | `10` | Max BOM upload size |

6. Click **Create Web Service**. Render will build and deploy the backend.
7. Once deployed, note your public backend URL, e.g.:
   ```text
   https://indicomp-backend.onrender.com
   ```
8. Verify it by visiting:
   ```text
   https://indicomp-backend.onrender.com/api/health
   ```
   > **First Boot Notice**: On startup, FastAPI executes `Base.metadata.create_all()` and seeds all Indian suppliers, listings, and default demo BOMs directly into your Neon PostgreSQL database automatically!

---

### Step 3: Frontend Deployment — Vercel

[Vercel](https://vercel.com) provides global edge hosting with free SSL, automated preview deployments, and zero-config Vite support.

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
2. Select your GitHub repository.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE` | `https://indicomp-backend.onrender.com/api` |
   *(Replace with your actual Render backend URL followed by `/api`)*
5. Click **Deploy**.
6. Vercel will build the frontend and provide a live URL, e.g.:
   ```text
   https://indicomp.vercel.app
   ```

> **SPA Client-Side Routing**: The repository already includes [frontend/vercel.json](file:///d:/IndiComp/frontend/vercel.json) with rewrite rules (`"source": "/(.*)", "destination": "/index.html"`), ensuring routes like `/sellers` and `/boms` reload cleanly on direct URL visits.

---

## 4. Alternative Free Providers

If you prefer different cloud providers, the platform works identically on:

### Alternative Backend Hosts:
- **Koyeb** (Free tier): Deploy using GitHub or Dockerfile. Koyeb gives free nano instances with continuous deployment and automatic TLS certificates.
  - Root directory: `/backend`
  - Port: `8000`
- **Fly.io**: Deploy using `fly launch` inside the `backend/` directory.

### Alternative Frontend Hosts:
- **Cloudflare Pages** (Free tier):
  - Framework: Vite
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment variable: `VITE_API_BASE=https://<your-backend>/api`
- **Render Static Site** (Free tier):
  - Publish directory: `frontend/dist`
  - Build command: `npm install && npm run build`

---

### Database Note: PostgreSQL vs MongoDB

> **Why PostgreSQL (Neon) instead of MongoDB?**
> 
> IndiComp is built on a **relational domain model** with foreign-key referential integrity between:
> - Bills of Materials (`BOMHeader` -> `BOMItem`)
> - Components and Technical Specifications
> - Indian Sellers (`Seller` -> `SellerListing` -> `SellerContact`)
> - Request For Quotations (`RFQ` -> `RFQItem` -> `RFQStatusHistory`)
> - Supplier bookmarks (`SavedSeller`)
>
> The backend uses **SQLAlchemy 2.0 ORM** which natively speaks PostgreSQL and SQLite. 
> 
> - **Neon Database** is serverless PostgreSQL and provides a **100% free forever tier** with zero code modifications needed (`DATABASE_URL=postgresql://...`).
> - If your organization strictly requires MongoDB, you would need an ODM adapter (like MongoEngine or Beanie) replacing SQLAlchemy. However, for instant zero-code free deployment, **Neon PostgreSQL** is the recommended cloud database.

---

## 5. Environment Variables Reference

### Backend (`backend/`)
| Variable | Default Value | Required in Production | Description |
|---|---|---|---|
| `DATABASE_URL` | `sqlite:///./indigenous_platform.db` | **Yes** | Database connection string (PostgreSQL URL from Neon/Supabase) |
| `ENVIRONMENT` | `development` | No | Set to `production` in live deployments |
| `MAX_UPLOAD_SIZE_MB` | `10` | No | Maximum allowed BOM upload size in megabytes |
| `ENABLE_SEMANTIC_SEARCH` | `false` | No | Enables vector embeddings (disable on free tiers to conserve RAM) |
| `ENABLE_LLM_EXPLAINER` | `false` | No | Enables local Ollama/OpenAI narrative generator |
| `LLM_PROVIDER` | `ollama` | No | LLM backend provider (`ollama`, `openai`, `mock`) |
| `MOUSER_API_KEY` | *(empty)* | No | Optional external Mouser API key |
| `DIGIKEY_CLIENT_ID` | *(empty)* | No | Optional DigiKey API client ID |
| `NEXAR_CLIENT_ID` | *(empty)* | No | Optional Nexar / Octopart client ID |

### Frontend (`frontend/`)
| Variable | Default Value | Required in Production | Description |
|---|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000/api` | **Yes** | Fully qualified public URL to the FastAPI backend API |

---

## 6. Database Initialization & Verification

When pointing the backend to an empty Neon PostgreSQL database, the app automatically runs:
1. `Base.metadata.create_all(bind=engine)` — Generates all tables (`boms`, `bom_items`, `components`, `sellers`, `seller_listings`, `seller_contacts`, `rfqs`, `rfq_items`, etc.).
2. `seed_database(db, force_reset=False)` — Pre-populates the database with:
   - 8 Verified Indian Suppliers & Manufacturers (Mindgrove Technologies, SCL Mohali, Bharat Electronics Limited, C-DAC, Element14 India, Semikart, Robu.in, Mouser India).
   - Component listings for popular BOM items (STM32F401RET6, LM1117IMP-3.3, ESP32, Mindgrove Secure IoT SoC, etc.).
   - Verified enterprise business contacts (procurement emails, technical support, corporate addresses).
   - Pre-configured RFQs across various status stages.

### Manual Verification Command
To verify your production database connection locally before deploying:
```bash
python -c "from app.database import SessionLocal; from app.models import Seller, BOM; db = SessionLocal(); print('Sellers:', db.query(Seller).count(), 'BOMs:', db.query(BOM).count()); db.close()"
```

---

## 7. Troubleshooting & FAQ

### Q1: Render Free Tier "Cold Start" Delays
- **Symptom**: The first request to the backend takes 30-50 seconds to respond.
- **Cause**: Render spins down free web services after 15 minutes of inactivity.
- **Solution**: This is normal for free hosting. Once the first request loads, subsequent requests are instantaneous. You can use a free uptime monitor (like UptimeRobot or Cron-job.org) hitting `/api/health` every 10 minutes to keep the instance warm.

### Q2: Neon PostgreSQL SSL Error (`sslmode=require`)
- **Symptom**: `psycopg2.OperationalError: connection to server at ... failed: SSL connection has been closed unexpectedly`.
- **Solution**: Ensure your `DATABASE_URL` contains `?sslmode=require` at the end:
  ```text
  postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require
  ```

### Q3: Vercel 404 on Page Refresh (e.g. `/sellers` or `/boms`)
- **Symptom**: Navigating to `https://your-app.vercel.app/sellers` works, but refreshing gives 404.
- **Solution**: Ensure `frontend/vercel.json` exists with the rewrite rule to `/index.html`. This file is already included in this repository.

### Q4: CORS Errors in Browser Console
- **Symptom**: `Access to fetch at ... from origin ... has been blocked by CORS policy`.
- **Solution**: The backend already has `CORSMiddleware` configured with `allow_origins=["*"]`. If you customized CORS in `backend/app/main.py`, make sure your Vercel domain (`https://*.vercel.app`) is included in `allow_origins`.

---

## 8. Summary Checklist for Free Deployment

- [x] Push latest code to GitHub repository.
- [x] Create free **Neon DB** project and copy PostgreSQL connection string.
- [x] Create free **Render** Web Service pointing to `backend/` with `DATABASE_URL`.
- [x] Copy Render backend URL (`https://...onrender.com/api`).
- [x] Create free **Vercel** project pointing to `frontend/` with `VITE_API_BASE`.
- [x] Open Vercel URL and test BOM upload, Indian Seller Discovery, and RFQ generation!
