# Craftopia Go Backend Service 🧶✨

A high-performance, unified, cloud-native Go backend service.

Engineered with a **"Deploy Anywhere"** architecture: can run as a **Vercel Serverless Function (Free & Pro)**, in **Docker containers on Azure / AWS / GCP / Render**, or as a **bare-metal static binary daemon on any Linux VPS (Ubuntu/Debian)**.

---

## 🎯 Supported Deployment Targets

| Deployment Target | Mechanism | Best Used For | Free Tier Support |
| :--- | :--- | :--- | :--- |
| **Vercel** | Serverless Function (`api/index.go` + `vercel.json`) | Quick zero-config deployment alongside Next.js | ✅ Yes (Hobby tier) |
| **Azure** | Azure Container Apps (`Dockerfile` + GitHub Actions) | Production cloud microservice with auto-scale | ✅ Yes (2M free req/mo) |
| **AWS** | AWS App Runner / ECS Fargate (`deploy/aws/apprunner.json`) | AWS cloud ecosystem with automated scaling | ⚠️ Low-cost (~$5/mo) |
| **Linux VPS** | Standalone static binary + Systemd + Caddy / Nginx | Maximum performance, full control, lowest cost ($4/mo) | ⚠️ Linode / Hetzner / DO |
| **PaaS (Render/Fly)**| Native Dockerfile deployment | Effortless container hosting with SSL | ✅ Yes (Free / Starter) |

---

## 📁 Architecture Overview

The codebase separates the HTTP routing pipeline into `internal/app/app.go` so that **both** long-running servers (`cmd/server/main.go`) and serverless invocations (`api/index.go`) execute the exact same business logic:

```
backend-go/
├── api/
│   └── index.go                  # 🚀 Vercel Serverless Function entrypoint
├── cmd/
│   └── server/
│       └── main.go               # 🚀 Standalone HTTP server (Azure, AWS, Docker, VPS)
├── internal/
│   ├── app/
│   │   └── app.go                # Unified application builder & ServeMux routing
│   ├── config/                   # 12-factor environment configuration
│   ├── database/                 # pgxpool PostgreSQL connection pool
│   ├── models/                   # Domain entities (Product, Order, CustomRequest, etc.)
│   ├── repository/               # Atomic SQL queries and transactions
│   ├── handlers/                 # HTTP controllers (Catalog, Cart, Orders, Reviews, etc.)
│   ├── middleware/               # CORS, structured JSON logging (slog), JWT auth, recovery
│   └── utils/                    # Standardized API response format
├── deploy/
│   ├── vps/
│   │   ├── craftopia-backend.service  # Systemd service unit for Linux VPS
│   │   ├── Caddyfile                  # Automatic 1-line SSL reverse proxy
│   │   └── nginx.conf                 # Nginx reverse proxy configuration
│   └── aws/
│       └── apprunner.json             # AWS App Runner container service definition
├── .github/
│   └── workflows/
│       └── azure-deploy.yml      # Automated GitHub Actions CI/CD pipeline
├── Dockerfile                    # Multi-stage production build (~15MB image)
├── docker-compose.yml            # Local PostgreSQL + API stack
├── vercel.json                   # Vercel Serverless Function rewrite configuration
├── schema.sql                    # Standalone PostgreSQL database migration
├── Makefile                      # Cross-compilation & build shortcuts
├── go.mod
└── go.sum
```

---

## 🚀 Deployment Guides

### Option 1: Deploy on Vercel (Free or Paid Tier)

The service is pre-configured with `api/index.go` and `vercel.json` rewrites.

1. **Deploy via Vercel CLI**:
   ```bash
   cd backend-go
   vercel
   ```
2. **Or deploy via GitHub**:
   - In Vercel Dashboard, click **Add New Project** -> import this repository.
   - Set **Root Directory** to `backend-go`.
   - Set Environment Variables:
     - `DATABASE_URL`: Your pooled PostgreSQL connection string (e.g. Supabase, Neon, or Azure Flexible Server).
     - `JWT_SECRET`: A secure random secret string.
     - `MERCHANT_UPI_ID`: Your merchant UPI VPA (e.g. `yourname@bank`).
     - `MERCHANT_PAYEE_NAME`: Your business display name.
     - `CORS_ORIGIN`: Your frontend URL (e.g. `https://jamaescraftopia.com`).
   - Click **Deploy**!

> **Vercel Free Tier Note**: Free tier serverless functions time out after 10 seconds. For database connections, ensure you use a connection pooler like **Supabase Transaction Pooler** (port 6543) or **Neon connection pooling** to avoid exhausting database connection limits during traffic spikes.

---

### Option 2: Deploy on Azure (Azure Container Apps)

Azure Container Apps provides a generous **free allocation** of 180,000 vCPU-seconds and 2 million requests per month.

1. **Automated CI/CD via GitHub Actions**:
   - Push code to `main`.
   - The included workflow [`.github/workflows/azure-deploy.yml`](.github/workflows/azure-deploy.yml) will build the Docker container, push to Azure Container Registry (ACR), and roll out revisions automatically.
2. **Manual Azure CLI deployment**:
   ```bash
   # 1. Build and push image to Azure Container Registry
   az acr build --registry youracrname --image craftopia-backend:latest .

   # 2. Deploy to Azure Container Apps
   az containerapp create \
     --name craftopia-backend-api \
     --resource-group rg-craftopia-prod \
     --environment craftopia-env \
     --image youracrname.azurecr.io/craftopia-backend:latest \
     --target-port 8080 \
     --ingress external \
     --min-replicas 1 \
     --max-replicas 5 \
     --env-vars \
       DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require" \
       JWT_SECRET="your-jwt-secret" \
       MERCHANT_UPI_ID="yourname@bank"
   ```

---

### Option 3: Deploy on AWS (App Runner or ECS)

AWS App Runner provides zero-ops container hosting with auto-scaling:

1. Push your Docker image to **AWS ECR**:
   ```bash
   docker build -t craftopia-backend .
   docker tag craftopia-backend:latest 123456789012.dkr.ecr.ap-south-1.amazonaws.com/craftopia-backend:latest
   docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/craftopia-backend:latest
   ```
2. Create App Runner service using the provided template:
   ```bash
   aws apprunner create-service --cli-input-json file://deploy/aws/apprunner.json
   ```

---

### Option 4: Deploy on Any Linux VPS (Ubuntu / Debian / Hetzner / DigitalOcean)

A compiled Go binary runs with single-digit millisecond latency and ~15MB RAM footprint on a $4/month VPS.

1. **Cross-compile static Linux binary on your development machine**:
   ```bash
   make build-linux
   # Generates: bin/craftopia-server-linux-amd64
   ```
2. **Copy binary and service files to your VPS**:
   ```bash
   scp bin/craftopia-server-linux-amd64 root@your-vps-ip:/opt/craftopia-backend/bin/craftopia-server
   scp deploy/vps/craftopia-backend.service root@your-vps-ip:/etc/systemd/system/
   ```
3. **Start the Systemd service**:
   ```bash
   ssh root@your-vps-ip
   chmod +x /opt/craftopia-backend/bin/craftopia-server
   systemctl daemon-reload
   systemctl enable --now craftopia-backend
   systemctl status craftopia-backend
   ```
4. **Setup automatic HTTPS with Caddy** (Zero-configuration SSL):
   ```bash
   apt install caddy -y
   cp deploy/vps/Caddyfile /etc/caddy/Caddyfile
   # Edit /etc/caddy/Caddyfile with your domain
   systemctl restart caddy
   ```

---

### Option 5: Deploy on Render / Railway / Fly.io

Because this repository contains a multi-stage [Dockerfile](Dockerfile), deploying to modern container PaaS platforms is 100% plug-and-play:
- **Render**: Connect repository, select **Web Service**, choose **Docker** runtime.
- **Railway**: Connect repository, Railway auto-detects `Dockerfile` and deploys.
- **Fly.io**: Run `fly launch` in `backend-go/`.

---

## 🛠️ Local Development & Testing

```bash
# 1. Run unit tests
make test

# 2. Build local binary
make build

# 3. Run with Docker Compose (spins up PostgreSQL + API)
make docker-run
```
