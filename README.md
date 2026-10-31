# Jamae's Craftopia — Production Monorepo

Enterprise-grade monorepo containing the standalone **Go REST Backend** and the decoupled **Next.js SSR Frontend** for Jamae's Craftopia.

---

## 📁 Repository Structure

```
craftopia/
├── backend/                   # Standalone Go REST API Service (Go 1.22+)
│   ├── api/index.go           # Vercel serverless function entrypoint
│   ├── cmd/server/main.go     # Server entrypoint (Docker / Azure / VPS)
│   ├── internal/              # Clean architecture: app, handlers, models, repo
│   ├── deploy/                # Cloud templates: systemd, caddy, nginx, aws
│   ├── schema.sql             # PostgreSQL DDL migrations
│   ├── Dockerfile             # Multi-stage static Go binary container
│   └── vercel.json            # Vercel Go runtime routing config
│
├── frontend/                  # Next.js 15 Decoupled SSR Client
│   ├── app/                   # App Router with full Server-Side Rendering (SSR)
│   ├── components/            # Artisanal design system & components
│   ├── lib/                   # Zustand stores & REST client
│   ├── public/                # Static brand assets
│   ├── Dockerfile             # Multi-stage production container
│   └── next.config.js         # Security headers & /api reverse proxy rewrites
│
├── .github/workflows/
│   ├── backend-ci.yml         # CI workflow triggered on backend/** changes
│   └── frontend-ci.yml        # CI workflow triggered on frontend/** changes
│
├── docker-compose.yml         # Unified local dev stack (Postgres + Go + Next.js)
└── .gitignore                 # Monorepo-wide secret protection
```

---

## 🚀 Quick Start (Local Development)

### Option 1: Run Everything with Docker Compose (Recommended)
From the root of this monorepo:
```bash
docker compose up --build
```
- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Go API**: [http://localhost:8080](http://localhost:8080)
- **PostgreSQL**: `localhost:5432`

---

### Option 2: Run Services Independently

#### Terminal 1 — Backend:
```bash
cd backend
make run
# Or: go run ./cmd/server
```

#### Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Cloud & Vercel Deployment

### Deploying the Frontend to Vercel
1. In the Vercel dashboard, click **Add New Project**.
2. Select your `craftopia` monorepo.
3. In the project setup screen, change the **Root Directory** from `./` to `frontend`.
4. Add your Environment Variables:
   - `GO_BACKEND_URL`: URL of your deployed Go backend (e.g. `https://api.yourdomain.com`).
5. Click **Deploy**.

### Deploying the Backend to Azure / AWS / Cloud
1. In Azure Container Apps or AWS App Runner, set the source directory to `backend/`.
2. Provide your PostgreSQL `DATABASE_URL` and `JWT_SECRET`.
3. The multi-stage `backend/Dockerfile` automatically builds a static, zero-dependency binary under 20MB.

---

## 🛡️ Security & Environment Variables
- Never commit `.env` or `.env.local` files to Git. The root `.gitignore` strictly ignores all local environment secret files.
- Refer to `backend/.env.example` and `frontend/.env.example` for required configuration variables.
