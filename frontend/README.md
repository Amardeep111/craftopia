# Jamae's Craftopia — Decoupled REST Frontend

A high-performance, decoupled Next.js storefront client designed to connect seamlessly to the standalone Go backend service (`backend-go`).

---

## 🎨 Visual Identity & Styling

All original artisanal branding and visual aesthetics have been 100% preserved:
- **Palette Tokens**: `cream`, `ivory`, `blush`, `petal`, `bloom`, `plum`, `sage`, `sand`, `ink`, `muted`.
- **Typography**: `Fraunces` (warm editorial display serif) and `Nunito` (friendly, legible sans).
- **Interactions**: Framer Motion scroll reveals, skeleton loading states, floating cart badges, and responsive touch gestures.

---

## 🚀 Key Improvements & Architecture Highlights

1. **Pure REST Decoupling**:
   - Completely stripped of server-side Prisma ORM, SQLite/PostgreSQL drivers, bcryptjs, and nodemailer.
   - Ultra-fast compilation and lightweight bundle footprint.

2. **Native UPI Deep-Link Fix (Mobile Optimization)**:
   - Resolved the issue where parameters (`pa`, `pn`, `tn`) were doubly URL-encoded, causing mobile UPI apps (Google Pay, PhonePe, Paytm, BHIM) to fail to launch or report invalid VPA.
   - Preserved exact amount formatting (`₹XX.XX`).
   - Integrated a 1-click WhatsApp payment proof button that pre-populates the order amount and UPI reference note.

3. **Intelligent Dual-Mode API Client (`app/lib/api/client.js`)**:
   - **In Browser**: Automatically uses same-origin `/api/...` proxies through Next.js rewrites (zero CORS issues during development).
   - **In Server Components (SSR)**: Automatically resolves relative routes against `GO_BACKEND_URL` (default: `http://localhost:8080`).

4. **Admin Custom Request Acceptance Flow**:
   - Custom order review modal with GST calculation (0%, 5%, 12%, 18%, 28%), shipping charges, pin-code auto-detection for Indian states/cities, and automatic order creation upon acceptance.

5. **Payment Status Verification**:
   - Admin UI displays payment status, UTR reference, and enforces transaction reference verification prior to order confirmation.

---

## 🛠️ Getting Started Locally

### 1. Start the Go Backend
In one terminal window:
```bash
cd backend-go
make run
# Or go run ./cmd/server
```
The Go server will start on `http://localhost:8080`.

### 2. Start the Frontend
In another terminal window:
```bash
cd frontend-rest
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. All requests to `/api/*` are automatically reverse-proxied to `http://localhost:8080`.

---

## ☁️ Deployment Guides

### Option A: Deploy to Vercel (Free or Pro Tier)

Because this frontend has zero direct database dependencies:
1. In the Vercel dashboard, click **Add New Project**.
2. Select your repository and set the **Root Directory** to `frontend-rest`.
3. Set the Environment Variables:
   - `GO_BACKEND_URL`: The URL of your deployed Go backend (e.g. `https://api.yourdomain.com`).
   - `NEXT_PUBLIC_API_URL`: (Optional) Same as above if you want the browser to call the API directly instead of proxying through Next.js rewrites.
4. Click **Deploy**.

### Option B: Docker / Docker Compose

A production-ready multi-stage Dockerfile is included:
```bash
docker build -t craftopia-frontend:latest .
docker run -p 3000:3000 -e GO_BACKEND_URL="http://your-backend-host:8080" craftopia-frontend:latest
```

To run both Postgres, the Go backend, and the REST frontend together:
```bash
cd backend-go/deploy
docker compose up --build
```

### Option C: Linux VPS / Azure VM / AWS EC2 with PM2 or Systemd

```bash
cd frontend-rest
npm install
npm run build

# Start with PM2
pm2 start npm --name "craftopia-frontend" -- start -- -p 3000
```
Then configure Nginx or Caddy reverse proxy to port `3000`.

---

## 📁 Directory Structure

```
frontend-rest/
├── app/
│   ├── about/                   # About page
│   ├── account/                 # Login, signup, customer profile
│   ├── admin/                   # Full admin dashboard & order management
│   ├── cart/                    # Cart & item modification
│   ├── checkout/                # Checkout steps (address, coupon, payment)
│   ├── components/              # Shared UI components, forms, layouts
│   ├── contact/                 # Contact form
│   ├── custom-orders/           # Custom order commission inquiry form
│   ├── data/                    # Fallback seed & taxonomy
│   ├── lib/
│   │   ├── api/client.js        # Standalone Go REST API client
│   │   ├── cart.js              # Zustand cart state
│   │   ├── coupon.js            # Zustand coupon state
│   │   └── address.js           # Zustand address state
│   ├── orders/                  # Customer order tracking & history
│   ├── shop/                    # Catalog with infinite scroll & search
│   └── page.jsx                 # Storefront homepage
├── public/                      # Static assets & brand imagery
├── Dockerfile                   # Multi-stage production container
├── next.config.js               # API rewrites & optimization
├── package.json                 # Pure client dependencies
└── tailwind.config.js           # Artisanal brand theme
```

