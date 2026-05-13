# ⚔ CodeArena — Competitive Programming Platform

A full-stack online coding judge platform built with Angular 18, Express.js, Judge0, PostgreSQL, Redis, and Stripe.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start — Local Dev](#quick-start--local-dev)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Features](#features)
- [Default Credentials](#default-credentials)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 18 (standalone, signals), Angular Material |
| Code Editor | Monaco Editor (`@monaco-editor/angular`) |
| Backend | Express.js + TypeScript |
| Real-time | Socket.io (WebSocket) |
| Code Execution | Judge0 CE (self-hosted) |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Auth | JWT + refresh tokens, Google/GitHub OAuth (Passport.js) |
| Payments | Stripe Checkout + Webhooks |
| Email | SendGrid |
| Proxy | Nginx (SSL termination, reverse proxy) |
| Containers | Docker Compose |
| Testing | Jest (backend), Karma/Jasmine (frontend) |

---

## Architecture

```
Browser
  │
  ▼
Nginx (port 80/443)
  ├── /api/*       → Express API (port 3000)
  ├── /socket.io/* → Express WebSocket
  └── /*           → Angular SPA (Nginx, port 80)

Express API
  ├── Auth (JWT, OAuth)
  ├── Problems CRUD
  ├── Submissions → BullMQ → Judge0
  ├── Contests + Scoreboard
  ├── Payments (Stripe)
  └── Socket.io (real-time verdicts, scoreboard)

Background Workers
  ├── Submission Worker (BullMQ → Judge0 API)
  └── Email Worker (BullMQ → SendGrid)

Data Stores
  ├── PostgreSQL (primary data)
  └── Redis (queue, rate limiting, cache)
```

---

## Quick Start — Local Dev

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.x+
- [Node.js](https://nodejs.org/) 20+ (for local tooling)
- [Git](https://git-scm.com/)

### 1. Clone and configure

```bash
git clone https://github.com/yourorg/codearena.git
cd codearena

# Copy and fill in your environment variables
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate another>
ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

The rest (Stripe, OAuth, SendGrid) can be left as placeholders during development.

### 2. Start all services

```bash
# This automatically picks up docker-compose.override.yml for hot-reload
docker compose up --build
```

First boot takes 3–5 minutes while:
- PostgreSQL initializes
- Judge0 downloads language environments
- Node.js installs dependencies

### 3. Run database migrations and seed

```bash
# In a new terminal, once containers are up:
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npm run seed
```

### 4. Access the app

| Service | URL |
|---|---|
| Frontend | http://localhost |
| API | http://localhost/api |
| Swagger Docs | http://localhost/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 5. Development workflow

The override file mounts source directories as volumes, enabling hot-reload:

```bash
# Frontend hot-reload (Angular dev server at :4200, proxied via Nginx)
# Backend hot-reload (ts-node-dev watches src/)
# Both happen automatically when you edit files
```

To run tests:

```bash
# Backend tests
docker compose exec api npm test

# Frontend tests
docker compose exec frontend npm test
```

---

## Production Deployment

### 1. Server requirements

- Ubuntu 22.04 LTS (recommended)
- 4 vCPU, 8 GB RAM minimum
- Docker + Docker Compose installed
- Domain name with DNS pointed at server

### 2. SSL certificates

Using Let's Encrypt (Certbot):

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Symlink into nginx/ssl/
mkdir -p nginx/ssl
ln -s /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/fullchain.pem
ln -s /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/privkey.pem
```

Update `nginx/nginx.conf` — replace `${DOMAIN:-codearena.dev}` with your domain.

### 3. Configure production env

```bash
cp .env.example .env
# Fill ALL values — especially:
# - Strong passwords for POSTGRES_PASSWORD, REDIS_PASSWORD
# - Real Stripe keys (live keys, not test)
# - Real OAuth credentials
# - FRONTEND_URL=https://yourdomain.com
# - ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Deploy

```bash
# Production uses docker-compose.yml only (no override)
docker compose -f docker-compose.yml up -d --build

# Run migrations
docker compose exec api npx prisma migrate deploy

# Seed (first time only)
docker compose exec api npm run seed
```

### 5. Stripe webhooks

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add:

```
Endpoint URL: https://yourdomain.com/api/payments/webhook
Events to listen:
  - checkout.session.completed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_failed
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 6. Auto-renewal (SSL)

```bash
# Add to crontab: renew SSL and reload nginx
0 12 * * * certbot renew --quiet && docker compose exec nginx nginx -s reload
```

---

## Environment Variables

See `.env.example` for full reference. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret (64-byte hex) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (64-byte hex) |
| `ENCRYPTION_KEY` | AES-256 key for test case encryption (32-byte hex) |
| `JUDGE0_URL` | Judge0 API URL |
| `JUDGE0_AUTH_TOKEN` | Judge0 authentication token |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro monthly |
| `STRIPE_ELITE_PRICE_ID` | Stripe Price ID for Elite monthly |
| `GOOGLE_CLIENT_ID` | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `FRONTEND_URL` | Full URL of frontend (e.g. `https://codearena.dev`) |

---

## API Reference

Swagger UI is available at `/api/docs` when running.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Set new password |
| GET | `/api/auth/google` | Google OAuth redirect |
| GET | `/api/auth/github` | GitHub OAuth redirect |

### Problems

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/problems` | List problems (paginated, filterable) |
| GET | `/api/problems/:slug` | Get problem detail |
| POST | `/api/problems` | Create problem (SETTER/ADMIN) |
| PATCH | `/api/problems/:id` | Update problem (SETTER/ADMIN) |
| DELETE | `/api/problems/:id` | Soft-delete problem (ADMIN) |

### Submissions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/submissions` | Submit code |
| GET | `/api/submissions/:id` | Get submission detail |
| GET | `/api/submissions` | List user's submissions |

### Contests

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/contests` | List contests |
| GET | `/api/contests/:slug` | Contest detail |
| POST | `/api/contests/:id/register` | Register (free contests) |
| GET | `/api/contests/:id/scoreboard` | Live scoreboard |
| POST | `/api/contests` | Create contest (SETTER/ADMIN) |
| PATCH | `/api/contests/:id` | Update contest (SETTER/ADMIN) |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/create-checkout` | Create Stripe checkout |
| POST | `/api/payments/webhook` | Stripe webhook handler |
| GET | `/api/payments/history` | Payment history |

### Users & Leaderboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/:username/profile` | User profile + stats |
| PATCH | `/api/users/me` | Update own profile |
| GET | `/api/leaderboard` | Global leaderboard |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| GET | `/api/admin/problems` | All problems (incl. unpublished) |
| GET | `/api/admin/submissions` | All submissions |
| POST | `/api/admin/submissions/:id/rejudge` | Rejudge a submission |

---

## Project Structure

```
codearena/
├── frontend/                    # Angular 18 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/      # authGuard, roleGuard
│   │   │   │   ├── interceptors/ # JWT, error handling
│   │   │   │   └── services/    # AuthService, ApiServices, SocketService
│   │   │   ├── features/
│   │   │   │   ├── auth/        # Login, Register, OAuth callback
│   │   │   │   ├── problems/    # Problem list + Monaco editor + judge
│   │   │   │   ├── contests/    # Contest hub + live view + scoreboard
│   │   │   │   ├── profile/     # User profile + heatmap + stats
│   │   │   │   ├── leaderboard/ # Global ELO leaderboard
│   │   │   │   ├── pricing/     # Subscription plans + Stripe checkout
│   │   │   │   ├── landing/     # Home page
│   │   │   │   └── admin/       # Dashboard, users, problems, submissions
│   │   │   └── shared/
│   │   │       └── components/  # Navbar, NotFound
│   │   ├── environments/        # environment.ts / environment.prod.ts
│   │   ├── styles.scss          # Global styles + CSS variables
│   │   └── index.html
│   ├── Dockerfile
│   ├── nginx.conf               # SPA routing config
│   └── angular.json
│
├── backend/                     # Express.js API
│   ├── src/
│   │   ├── auth/                # Service, routes, Passport strategies
│   │   ├── problems/            # Service + routes (CRUD, encryption)
│   │   ├── submissions/         # Routes, BullMQ worker, Judge0 client
│   │   ├── contests/            # Service + routes
│   │   ├── payments/            # Stripe service + webhook handler
│   │   ├── leaderboard/         # Routes
│   │   ├── users/               # Profile routes
│   │   ├── admin/               # Admin routes
│   │   └── shared/
│   │       ├── middleware/      # auth.ts, errorHandler.ts, rateLimiter.ts
│   │       └── utils/           # prisma, redis, queues, socketio, email, encryption
│   └── Dockerfile
│
├── prisma/
│   ├── schema.prisma            # Full data model
│   └── seed.ts                  # 10 sample problems + users
│
├── nginx/
│   ├── nginx.conf               # Production (HTTPS)
│   └── nginx.dev.conf           # Development (HTTP only)
│
├── docker-compose.yml           # Production services
├── docker-compose.override.yml  # Dev overrides (hot-reload, port exposure)
├── .env.example                 # Template for environment variables
└── README.md
```

---

## Features

### 🔐 Auth
- Email + password with bcrypt hashing
- Google and GitHub OAuth2 via Passport.js
- JWT access tokens (15min) + refresh tokens (7 days, rotated)
- Role-based access: USER, SETTER, ADMIN
- Email verification + password reset via SendGrid

### 📝 Problem Bank
- Markdown descriptions with syntax highlighting
- Easy / Medium / Hard difficulty
- Tag-based filtering and search
- Sample + hidden test cases (hidden cases AES-256 encrypted at rest)
- Time limit, memory limit per problem
- Acceptance rate tracking

### ⚡ Code Execution
- Monaco Editor with syntax highlighting for 6 languages
- Submit → BullMQ job queue → Judge0 CE
- Verdicts: AC, WA, TLE, MLE, RE, CE
- Real-time verdict push via Socket.io
- Rate limiting: 5 submissions/min per user
- Daily limit: 5/day (Free), unlimited (Pro/Elite)
- Priority queue for Elite subscribers

### 🏆 Contests
- ICPC-style (penalty time) and IOI-style (partial scoring)
- Lifecycle: DRAFT → REGISTRATION → LIVE → ENDED → RESULTS
- Paid entry via Stripe Checkout
- Live scoreboard via Socket.io
- Countdown timer for start/end

### 💳 Payments
- Stripe Checkout for contest entry and subscriptions
- Plans: Free (5/day), Pro ($9.99/mo), Elite ($29.99/mo + priority queue)
- Webhook handler with signature verification
- Payment history

### 📊 Leaderboard & Profiles
- Global ELO-style rating leaderboard
- Per-user: submission heatmap, difficulty breakdown, achievement badges, rating history
- Achievement system: First AC, solving milestones, streak badges

### ⚙ Admin
- Platform stats dashboard with ApexCharts
- User management + role assignment
- Problem management + publish toggle
- Submission monitor + rejudge

---

## Default Credentials

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | admin@codearena.dev | Admin@123 |
| Setter | setter@codearena.dev | Setter@123 |
| User | alice@example.com | User@123 |

> ⚠ Change all default passwords immediately in production.

---

## Scaling Notes

- **Judge0 workers**: Increase `deploy.replicas` in `docker-compose.yml` for higher throughput
- **BullMQ concurrency**: Set `WORKER_CONCURRENCY` env var (default: 5)
- **Read replicas**: Prisma supports read replicas via `datasource` config
- **Redis cluster**: ioredis supports cluster mode — update `REDIS_URL`
- **Horizontal scaling**: The API is stateless; run multiple replicas behind a load balancer (sticky sessions required for Socket.io, or use Redis adapter)

---

## License

MIT — see LICENSE file.
