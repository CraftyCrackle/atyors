# AGENTS.md — atyors.com Development Guide

> **Project:** atyors.com ("At Your Service")
> **Domain:** Curbside services platform — starting with trash barrel pickup scheduling, expanding to additional service verticals.
> **Architecture:** Mobile-first progressive web app (PWA)
> **Gold Standard Reference:** bidor.ai (repo: `workflowhero_io`)
> **GitHub Repo:** [github.com/CraftyCrackle/atyors](https://github.com/CraftyCrackle/atyors)
> **Issue Tracker:** [github.com/CraftyCrackle/atyors/issues](https://github.com/CraftyCrackle/atyors/issues)
> **Milestones:** [github.com/CraftyCrackle/atyors/milestones](https://github.com/CraftyCrackle/atyors/milestones)

---

## 1. Role Definitions

| Role | Who | Responsibilities |
|------|-----|-----------------|
| **Developer** | AI Agent | All code, documentation, implementation decisions, debugging, refactoring |
| **Project Manager** | Human | Goals, priorities, deadlines, acceptance criteria |
| **Tester** | Human | Reviews, runs, reports bugs or behavioral issues |
| **Architect** | Human (on request) | System structure, scalability, integration guidance when explicitly invoked |

---

## 2. Project Overview

**atyors.com** is a mobile-first web application that enables homeowners and property managers to schedule curbside services. The initial service vertical is **trash barrel management** (put-out/bring-in scheduling). The platform is designed to scale into additional service categories (lawn, snow, deliveries, etc.) as the business grows.

### Core User Flows (Phase 1 — Trash Barrels)
- User signs up / logs in
- User enters service address
- User selects trash barrel service
- User picks schedule (one-time or recurring)
- User pays via Stripe
- Service provider receives job assignment
- User gets confirmation and status updates

---

## 3. Tech Stack (Target)

Modeled after bidor.ai with mobile-first adjustments:

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 14+ (App Router) | Mobile-first, PWA-enabled |
| **UI Framework** | Tailwind CSS 3.x | Responsive, utility-first |
| **State Management** | Zustand | Lightweight, scalable |
| **Data Fetching** | TanStack React Query v5 | Caching, optimistic updates |
| **Backend** | Node.js + Express | REST API with versioned routes (`/api/v1/`) |
| **Database** | MongoDB (Atlas in prod) | Mongoose ODM |
| **Cache / Sessions** | Redis 7 | ioredis client |
| **Auth** | AWS Cognito + JWT | Same pattern as bidor.ai |
| **Payments** | Stripe | Subscriptions + one-time payments |
| **Real-time** | Socket.io | Job status updates, notifications |
| **Storage** | AWS S3 | File uploads, media |
| **Containerization** | Docker + Docker Compose | Dev and prod |
| **Reverse Proxy** | Nginx | SSL termination at ALB |
| **CI/CD** | GitHub Actions | Auto-deploy on push to `main` |
| **Hosting** | AWS EC2 | Docker Compose orchestration |
| **Monitoring** | Prometheus + Grafana | Metrics, dashboards |
| **Testing** | Jest (API), Vitest (Web), Playwright (E2E) | 70% coverage thresholds |

---

## 4. Project Structure

Follow the bidor.ai monorepo pattern:

```
atyors_com/
├── AGENTS.md                      # This file
├── README.md                      # Project overview & setup
├── package.json                   # Root package (atyors-api)
├── Makefile                       # Dev automation commands
├── docker-compose.yml             # Local development
├── docker-compose.ec2.yml         # EC2 production
├── docker-compose.override.yml    # Local overrides
├── Dockerfile.api                 # API server image
├── .github/
│   └── workflows/
│       ├── deploy-production.yml  # Deploy on push to main
│       ├── ci-tests.yml           # Lint + test on PR
│       ├── test.yml               # Full test suite
│       └── rollback.yml           # Manual rollback
├── apps/
│   ├── server/                    # Backend API
│   │   ├── config/                # App configuration
│   │   ├── controllers/           # Request handlers
│   │   ├── middleware/            # Auth, rate-limit, validation
│   │   ├── models/                # Mongoose schemas
│   │   ├── routes/                # Express route definitions
│   │   ├── services/              # Business logic
│   │   ├── utils/                 # Helpers
│   │   ├── jobs/                  # Background/cron tasks
│   │   ├── socket.js              # Socket.io setup
│   │   └── tests/                 # Jest tests
│   └── web/                       # Frontend (Next.js)
│       ├── app/                   # App Router pages (or pages/)
│       ├── components/            # React components
│       ├── hooks/                 # Custom hooks
│       ├── stores/                # Zustand stores
│       ├── services/              # API client services
│       ├── lib/                   # Utilities
│       ├── styles/                # Tailwind / global CSS
│       ├── public/                # Static assets, PWA manifest
│       ├── tests/                 # Vitest unit tests
│       └── e2e/                   # Playwright E2E tests
├── nginx/
│   ├── default.conf               # Local dev config
│   ├── ec2.conf                   # Production config
│   └── ssl/                       # SSL certificates
├── docs/                          # Project documentation
├── scripts/                       # Utility scripts
└── grafana/                       # Monitoring dashboards
```

---

## 5. Development Rules

### 5.1 Code Quality
- **No narration comments.** Comments explain *why*, never *what*. Never `// increment counter` or `// return result`.
- **Lint before commit.** ESLint must pass. Fix introduced lint errors immediately.
- **Test coverage ≥ 70%** on branches, functions, lines, and statements.
- **Regression test all changes.** Every code change must be verified against existing tests.
- **Unit test all outputs.** New functions/endpoints get unit tests.

### 5.2 Mobile-First Design
- All UI starts from the smallest breakpoint (320px) and scales up.
- Touch targets minimum 44×44px.
- Use `min-width` media queries in Tailwind (`sm:`, `md:`, `lg:`).
- Test on real mobile viewports before desktop.
- PWA manifest and service worker required for offline-capable scheduling.

### 5.3 Git & Version Control
- **Branching:** `main` (production), `develop` (integration), `feature/*`, `fix/*`, `hotfix/*`.
- **Commits:** Concise messages focused on *why*, not *what*. Use conventional format:
  - `feat: add recurring schedule selector`
  - `fix: correct timezone offset in barrel pickup`
  - `refactor: extract payment service from controller`
  - `test: add coverage for scheduling edge cases`
  - `docs: update deployment guide`
- **PRs:** All changes go through PRs to `develop` → merged to `main` for production deploy.
- **Never force-push to `main` or `develop`.**
- **Never commit secrets.** No `.env`, credentials, or keys in version control.

### 5.4 API Design
- Versioned routes: `/api/v1/...`
- RESTful conventions: `GET /services`, `POST /bookings`, `PATCH /bookings/:id`
- Consistent error response format:
  ```json
  { "success": false, "error": { "code": "BOOKING_CONFLICT", "message": "..." } }
  ```
- Rate limiting on all public endpoints.
- Input validation and sanitization on every route.

### 5.5 Security
- Helmet for HTTP headers.
- `express-mongo-sanitize` to prevent NoSQL injection.
- `xss-clean` for XSS prevention.
- `hpp` for HTTP parameter pollution protection.
- `express-rate-limit` on auth and public routes.
- CORS configured for known origins only.
- JWT tokens with expiration; refresh token rotation.

### 5.6 Environment Management
- Local: `.env.local` (from `env.local.example` template)
- EC2 production: `.env.ec2` (generated from AWS Parameter Store at deploy time)
- Frontend vars use `NEXT_PUBLIC_` prefix.
- Secrets live in **AWS Systems Manager Parameter Store**, never in code.

---

## 6. CI/CD Pipeline

Mirrors the bidor.ai pipeline. Four GitHub Actions workflows:

### `deploy-production.yml` — Auto-deploy to EC2 on push to `main`
1. Run tests (skippable with `[skip tests]` in commit message)
2. Check EC2 disk space
3. Docker cleanup if disk > 60%
4. Load secrets from AWS Parameter Store → generate `.env.ec2`
5. Pull latest `main` on EC2
6. Build Docker containers sequentially
7. Start services with health checks
8. Verify deployment

### `ci-tests.yml` — Run on PRs to `main`/`develop`
1. ESLint
2. Jest API tests (with MongoDB + Redis services)
3. Next.js build + Vitest
4. Docker build validation
5. Trivy security scan

### `test.yml` — Full test suite on PRs and `develop` pushes
1. Server tests (Jest + MongoDB + Redis)
2. Client tests (Vitest)
3. E2E tests (Playwright — Chromium, Firefox, WebKit)
4. Integration tests
5. Security tests (npm audit, audit-ci, Snyk)
6. Performance tests (Artillery)

### `rollback.yml` — Manual trigger for emergency rollback
1. Confirm rollback
2. Backup current state
3. Reset to specified commit
4. Rebuild and verify

---

## 7. Deployment Architecture

```
User → CloudFront (CDN/SSL) → ALB → EC2 Instance
                                       │
                                       ├── Nginx (reverse proxy)
                                       │     ├── / → Next.js (web container)
                                       │     └── /api/ → Express (api container)
                                       │
                                       ├── Redis (cache container)
                                       └── MongoDB Atlas (external)
```

- **EC2:** Single instance, Docker Compose orchestration
- **Containers:** `nginx`, `api`, `web`, `redis`
- **Database:** MongoDB Atlas (managed, not containerized in prod)
- **SSL:** Terminated at ALB/CloudFront level
- **Health checks:** `/health` endpoint on all services
- **Network:** Bridge network (`atyors-network`)

---

## 8. Makefile Commands

Standard developer workflow commands (mirror bidor.ai):

| Command | Description |
|---------|-------------|
| `make dev` | Start local dev environment |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make build` | Build all Docker images |
| `make logs` | Tail logs for all services |
| `make status` | Show container status |
| `make health` | Check service health |
| `make clean` | Remove containers and volumes |
| `make ssl-setup` | Generate local SSL certs |
| `make deploy-ec2` | Deploy to EC2 |
| `make test` | Run all tests |

---

## 9. Reference Documents

### atyors.com
| What | Location |
|------|----------|
| GitHub repo | [github.com/CraftyCrackle/atyors](https://github.com/CraftyCrackle/atyors) |
| Issue tracker | [github.com/CraftyCrackle/atyors/issues](https://github.com/CraftyCrackle/atyors/issues) |
| Milestones | [github.com/CraftyCrackle/atyors/milestones](https://github.com/CraftyCrackle/atyors/milestones) |
| SSH key | `~/.ssh/id_ed25519_atyors` |
| Local workspace | `/Users/borgella/Desktop/atyors_com` |

### Bidor.ai (Gold Standard)
| What | Location |
|------|----------|
| Source code | `/Users/borgella/workflowhero_io` |
| GitHub repo | `github.com/CraftyCrackle/workflowhero` |
| CI/CD workflows | `/Users/borgella/workflowhero_io/.github/workflows/` |
| Deployment guide | `/Users/borgella/workflowhero_io/docs/deployment/MANUAL_DEPLOYMENT_GUIDE.md` |
| Infrastructure report | `/Users/borgella/workflowhero_io/docs/infrastructure/INFRASTRUCTURE_REPORT.md` |
| Security assessment | `/Users/borgella/workflowhero_io/docs/security/SECURITY_COMPLIANCE_ASSESSMENT.md` |
| Docker configs | `/Users/borgella/workflowhero_io/docker-compose*.yml` |
| Nginx configs | `/Users/borgella/workflowhero_io/nginx/` |
| Makefile | `/Users/borgella/workflowhero_io/Makefile` |

### Credentials & Access
| Credential | Storage | How Accessed |
|-----------|---------|-------------|
| GitHub PAT | Git remote URL (`.git/config`) | `git remote get-url origin \| sed 's\|https://\|\|;s\|@.*\|\|'` |
| EC2 SSH key (CI/CD) | GitHub Actions secret `EC2_SSH_PRIVATE_KEY` | Written to runner at deploy time |
| EC2 SSH key (manual) | `~/.ssh/workflowhero-recovery-*.pem` | `ssh -i <key> ec2-user@<host>` |
| AWS CLI | `~/.aws/credentials` or env vars | Auto-authenticated |

---

## 10. Atyors-Specific Domain Concepts

### Service Model
- **Service Category:** Top-level grouping (e.g., "Trash & Recycling", "Lawn Care", "Snow Removal")
- **Service Type:** Specific offering within a category (e.g., "Barrel Put-Out", "Barrel Bring-In", "Both")
- **Booking:** A scheduled instance of a service at an address
- **Subscription:** Recurring booking (weekly, bi-weekly)
- **Service Provider / Servicer:** The person fulfilling the job
- **Service Zone:** Geographic area defining availability and pricing
- **Route:** A servicer's ordered list of stops for a day, enabling queue-based tracking

### Booking Status Lifecycle

```
pending → active → en-route → arrived → in-progress → completed
   │         │         │         │            │
   └─cancelled└─cancelled└─cancelled          └── no-show
```

- **pending** — Created, awaiting servicer acceptance
- **active** — Servicer accepted the job
- **en-route** — Servicer is traveling to this stop
- **arrived** — Servicer is on-site
- **in-progress** — Service is being performed
- **completed** — Job done ("Mark Done" in UI)
- **cancelled** — Cancelled by customer or admin
- **no-show** — Customer was unreachable

### Phase 1 Scope (Trash Barrels)
- Residential addresses only
- Weekly recurring or one-time bookings
- Stripe payments (subscription or per-service)
- SMS/push notifications for job status
- Provider assignment and routing
- Customer dashboard with upcoming/past services

### Future Phases
- Lawn mowing, leaf cleanup
- Snow shoveling, de-icing
- Package retrieval
- Multi-provider marketplace
- Provider mobile app
- Advanced route optimization (TSP solver)

---

## 11. Features Implemented (Current State)

### 11.1 Backend — Data Models (8 models)

| Model | File | Key Fields |
|-------|------|------------|
| **User** | `apps/server/models/User.js` | email, phone, firstName, lastName, passwordHash, role (customer/servicer/admin/superadmin), stripeCustomerId, notificationPreferences |
| **Address** | `apps/server/models/Address.js` | userId, street, city, state, zip, location (GeoJSON), barrelLocation, barrelPhotoUrl, barrelNotes, serviceZoneId |
| **Booking** | `apps/server/models/Booking.js` | userId, addressId, serviceTypeId, scheduledDate, timeWindow, status, assignedTo, routeId, routeOrder, amount, statusHistory[] |
| **Route** | `apps/server/models/Route.js` | servicerId, date, stops[] (bookingId, order, status), currentStopIndex, status (planned/in-progress/completed), lastLocation (lat/lng) |
| **Subscription** | `apps/server/models/Subscription.js` | userId, stripeSubscriptionId, dayOfWeek, timeWindow, monthlyPrice |
| **ServiceCategory** | `apps/server/models/ServiceCategory.js` | name, slug, description, icon, isActive |
| **ServiceType** | `apps/server/models/ServiceType.js` | categoryId, name, slug, basePrice, recurringPrice |
| **ServiceZone** | `apps/server/models/ServiceZone.js` | name, polygon (GeoJSON), pricingModifier |

### 11.2 Backend — API Endpoints (~40 total)

**Authentication** (`/api/v1/auth/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | public | Register new user |
| POST | `/login` | public | Login, returns JWT |
| POST | `/refresh` | public | Refresh access token |
| GET | `/me` | JWT | Get current user |

**Users** (`/api/v1/users/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | JWT | Get profile |
| PATCH | `/me` | JWT | Update profile |

**Addresses** (`/api/v1/addresses/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create address |
| GET | `/` | JWT | List addresses |
| PATCH | `/:id` | JWT | Update address (barrel details, etc.) |
| DELETE | `/:id` | JWT | Remove address |
| POST | `/:id/photo` | JWT | Upload barrel photo (multer) |
| GET | `/check-zone` | JWT | Check if address is in service zone |

**Bookings** (`/api/v1/bookings/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create booking |
| GET | `/` | JWT | List user's bookings (status/page/limit filters) |
| GET | `/:id` | JWT | Get booking detail |
| GET | `/:id/queue` | JWT | Get queue position + servicer location |
| PATCH | `/:id/cancel` | JWT | Cancel booking |
| PATCH | `/:id/reschedule` | JWT | Reschedule booking |

**Servicer Portal** (`/api/v1/servicer/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs/available` | servicer+ | List unassigned pending jobs |
| GET | `/jobs/mine` | servicer+ | List assigned jobs |
| GET | `/jobs/:id` | servicer+ | Job detail |
| POST | `/jobs/:id/accept` | servicer+ | Accept job → status becomes `active` |
| PATCH | `/jobs/:id/status` | servicer+ | Advance job status |
| POST | `/routes` | servicer+ | Create day's route from ordered booking IDs |
| GET | `/routes/active` | servicer+ | Get today's in-progress route |
| GET | `/routes/planned` | servicer+ | Get today's planned route |
| PATCH | `/routes/:id/start` | servicer+ | Start route, first stop → `en-route` |
| PATCH | `/routes/:id/complete-stop` | servicer+ | Complete current stop, advance to next |
| PATCH | `/routes/:id/skip-stop` | servicer+ | Skip current stop, advance to next |

**Subscriptions** (`/api/v1/subscriptions/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Create subscription |
| GET | `/` | JWT | List subscriptions |
| POST | `/:id/cancel` | JWT | Cancel subscription |

**Payments** (`/api/v1/payments/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-intent` | JWT | Create Stripe PaymentIntent |
| POST | `/setup-intent` | JWT | Create Stripe SetupIntent |
| GET | `/methods` | JWT | List payment methods |
| DELETE | `/methods/:id` | JWT | Remove payment method |
| GET | `/history` | JWT | Payment history |

**Admin** (`/api/v1/admin/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bookings` | admin+ | List all bookings with filters |
| PATCH | `/bookings/:id/assign` | admin+ | Assign booking to servicer |
| PATCH | `/bookings/:id/status` | admin+ | Update booking status |
| GET | `/customers` | admin+ | List customers |
| GET | `/customers/:id` | admin+ | Customer detail |
| POST | `/zones` | admin+ | Create service zone |
| PATCH | `/zones/:id` | admin+ | Update service zone |
| DELETE | `/zones/:id` | admin+ | Delete service zone |
| GET | `/reports/summary` | admin+ | Dashboard summary metrics |

**Services** (`/api/v1/services/`) — public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List service categories |
| GET | `/types/:categorySlug` | List types in a category |
| POST | `/seed` | Seed demo data |

**Webhooks** (`/api/v1/webhooks/`) — public (Stripe signature verified)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/stripe` | Stripe webhook handler (raw body parsing) |

### 11.3 Backend — Real-Time (Socket.io)

| Namespace | Purpose | Key Events | Room Pattern |
|-----------|---------|------------|--------------|
| `/tracking` | Live GPS tracking | `location:update`, `queue:position`, `status:update`, `join:booking`, `leave:booking` | `booking:{id}` |
| `/notifications` | Push notifications | `booking:accepted`, `booking:status`, `queue:position` | `user:{id}` |

**Geo-tracking flow:**
1. Servicer emits `location:update` with `routeId` + GPS coords
2. Server looks up route, finds "next stop" customer (`currentStopIndex`)
3. Only that customer receives `location:update` (live Leaflet map)
4. All other customers in the route receive `queue:position` (e.g., "You are stop #3 of 5")
5. `lastLocation` is persisted on the Route document for late-joining clients

### 11.4 Frontend — Pages (11 routes)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.js` | Landing page with auth redirects |
| `/login` | `app/login/page.js` | Customer login form |
| `/signup` | `app/signup/page.js` | Customer registration |
| `/dashboard` | `app/dashboard/page.js` | Booking list (upcoming/active/past tabs) |
| `/book` | `app/book/page.js` | Multi-step booking: address → service → schedule → confirm |
| `/profile` | `app/profile/page.js` | Profile + address management |
| `/tracking/[id]` | `app/tracking/[id]/page.js` | Live tracking: Leaflet map (if next) or queue position display |
| `/servicer/login` | `app/servicer/login/page.js` | Dark-themed servicer login |
| `/servicer/dashboard` | `app/servicer/dashboard/page.js` | Available/My Jobs/Done tabs + "Plan Route" CTA |
| `/servicer/route` | `app/servicer/route/page.js` | Route planner: reorder stops → create → start → advance |
| `/servicer/job/[id]` | `app/servicer/job/[id]/page.js` | Individual job detail with status controls |

### 11.5 Frontend — Components

| Component | Purpose |
|-----------|---------|
| `AuthGuard` | Protects authenticated routes, redirects to `/login` |
| `BottomNav` | Mobile bottom navigation (Home, Book, Profile) |
| `NotificationProvider` | Socket.io-powered toast notifications (wraps app layout) |
| `TrackingMap` | Leaflet + OpenStreetMap with servicer (blue) and customer (red) markers |

### 11.6 Frontend — State & Services

| File | Type | Purpose |
|------|------|---------|
| `stores/authStore.js` | Zustand | User state, init/login/register/logout |
| `services/api.js` | HTTP client | `get`/`post`/`patch`/`delete` with auto token refresh on 401 |

### 11.7 File Uploads

- **multer** handles barrel photo uploads via `POST /api/v1/addresses/:id/photo`
- Storage: local `uploads/` directory (mounted as Docker volume)
- Served statically at `/uploads/:path*` (proxied through Next.js rewrites + Express static)
- File limits: 5 MB, JPEG/PNG/WebP only
- Future: migrate to AWS S3

### 11.8 Infrastructure

| Component | Local Dev | Production |
|-----------|-----------|------------|
| Nginx | Port 8000 | Port 80/443 |
| API | Port 8081 (→ 8080 internal) | Port 8080 internal |
| Web | Port 3001 (→ 3000 internal) | Port 3000 internal |
| MongoDB | Port 27018 (→ 27017 internal) | MongoDB Atlas |
| Redis | Port 6380 (→ 6379 internal) | Redis container |

### 11.9 Tests

| File | Framework | Covers |
|------|-----------|--------|
| `apps/server/tests/auth.test.js` | Jest | JWT token generation |
| `apps/server/tests/booking.test.js` | Jest | Booking status transitions |
| `apps/server/tests/route.test.js` | Jest | Route model schema, service exports |

---

## 12. Stack Insights & Lessons Learned

### 12.1 Docker Development Patterns

**Port conflict resolution:** Local ports are remapped to avoid conflicts with other projects. Never bind directly to standard ports (27017, 6379, 80, 3000, 8080). Use offset ports (27018, 6380, 8000, 3001, 8081) in `docker-compose.yml`.

**Health check gotcha:** Alpine containers resolve `localhost` to IPv6 (`::1`) but Node.js Express listens on IPv4 (`0.0.0.0`). Always use `http://127.0.0.1:<port>` in Docker health checks, never `localhost`.

**Module caching in Docker:** When adding new npm dependencies, you must force a full rebuild:
```bash
docker compose build api --no-cache
docker compose up -d api --force-recreate -V
```
The `-V` flag recreates anonymous volumes (including `node_modules`). Without it, Docker reuses the old volume and the new dependency won't be found.

**Volume mounting for uploads:** The `uploads/` directory must be mounted as a named volume in `docker-compose.yml` so files persist across container restarts:
```yaml
volumes:
  - ./uploads:/app/uploads
```
The Dockerfile must also `RUN mkdir -p /app/uploads` to ensure the directory exists.

### 12.2 Next.js ↔ Express Communication

**Rewrites over direct API calls:** The frontend Next.js app cannot reach the API container by `localhost:8081` from inside Docker (different network namespaces). Use `next.config.js` rewrites to proxy API requests through the Next.js server, which can resolve Docker service names:
```javascript
async rewrites() {
  return [
    { source: '/api/:path*', destination: 'http://atyors-api:8080/api/:path*' },
    { source: '/socket.io/:path*', destination: 'http://atyors-api:8080/socket.io/:path*' },
    { source: '/uploads/:path*', destination: 'http://atyors-api:8080/uploads/:path*' },
  ];
}
```

**Socket.io client in Next.js:** Use `dynamic` import or lazy `import()` to avoid SSR issues. The Socket.io client must be loaded only on the client side.

### 12.3 Socket.io Architecture

**Namespace separation:** Use `/tracking` for high-frequency GPS data and `/notifications` for low-frequency push alerts. This prevents GPS noise from flooding notification listeners.

**Room-based routing:** Customers join `booking:{bookingId}` rooms. Servicers broadcast to routes, and the server fans out to the correct rooms. This scales cleanly because Socket.io handles room membership internally.

**Authentication:** Both namespaces use the same JWT `authMiddleware` via `socket.handshake.auth.token`. The middleware sets `socket.userId` and `socket.userRole` for downstream handlers.

### 12.4 Geo-Tracking (Route + Queue System)

**Route model design:** A Route is an ordered list of stops. `currentStopIndex = -1` means "not started." When started, index moves to 0 and the first booking transitions to `en-route`. Each `completeCurrentStop()` call advances the index and auto-transitions the next booking.

**Queue position calculation:** Compare the booking's index in the stops array against `currentStopIndex`. Only the customer at `currentStopIndex` sees the live map; everyone else sees "You are stop #N of M."

**GPS broadcasting:** The servicer's app uses `navigator.geolocation.watchPosition()` and emits coordinates via Socket.io every few seconds. The server persists `lastLocation` on the Route so late-joining customers can see the servicer's last known position.

### 12.5 Frontend Patterns

**Mobile-first structure:** All pages start from the `min-width: 320px` viewport. Tailwind `sm:`, `md:`, `lg:` breakpoints scale up. Touch targets use `py-3` / `py-4` minimum for thumb-friendly tapping.

**Auth guard pattern:** Wrap protected pages in `<AuthGuard>` which checks `localStorage` for tokens and redirects to `/login` if missing. The `authStore.init()` call on mount fetches `/api/v1/auth/me` to rehydrate user state.

**Leaflet in Next.js:** Leaflet must be loaded via `next/dynamic` with `{ ssr: false }` because it accesses `window` and `document`. Marker icons use `L.DivIcon` (inline HTML) instead of default PNGs to avoid broken image paths in Docker.

### 12.6 Mongoose Patterns

**Sparse indexes:** When a field like `cognitoId` is optional, define the index separately with `{ sparse: true }` rather than in the field definition. Mongoose may create duplicate indexes otherwise:
```javascript
userSchema.index({ cognitoId: 1 }, { sparse: true });
```

**Status history tracking:** Bookings maintain a `statusHistory[]` array. Each status change appends `{ status, changedAt, changedBy }`. This provides a full audit trail without external logging.

---

## 13. Development Workflow Checklist

When starting any task:

1. **Read this file** for context and conventions.
2. **Check existing code** before creating new files.
3. **Follow the project structure** defined in Section 4.
4. **Write tests** for any new logic (unit + integration minimum).
5. **Run regression tests** to ensure nothing breaks.
6. **Lint** before committing.
7. **Use conventional commits** (Section 5.3).
8. **Never commit secrets** — use env templates and Parameter Store.
9. **Mobile-first** — build small screens first, scale up.
10. **Reference bidor.ai** patterns when unsure about implementation approach.

---

## 14. Progressive Web App (PWA)

atyors.com is configured as a Progressive Web App, enabling "Add to Home Screen" install on Android, iOS, and desktop browsers.

### Key Files
- `apps/web/public/manifest.json` — App manifest (name, icons, display mode, start URL)
- `apps/web/public/icons/` — Icon set (192px, 512px, 180px apple-touch-icon, maskable variants)
- `apps/web/next.config.js` — `@ducanh2912/next-pwa` wraps the Next.js config; disabled in dev to avoid caching issues
- `apps/web/worker/index.js` — Custom service worker code for push notifications (merged into generated SW by next-pwa)
- `apps/web/src/components/InstallPrompt.js` — Install prompt UX (Android auto-prompt + iOS manual guide)
- `apps/web/public/push-sw.js` — Standalone push handler (fallback reference)

### Service Worker
- Generated by `@ducanh2912/next-pwa` at build time (production only)
- Caching strategy: CacheFirst for images, StaleWhileRevalidate for JS/CSS, NetworkFirst for API calls
- Custom push event handler merged from `worker/index.js`
- `.gitignore` excludes generated `sw.js`, `workbox-*.js` files

### Web Push Notifications
- Server: `web-push` package with VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` env vars)
- Model: `PushSubscription` stores user push subscriptions (endpoint + keys)
- API routes: `GET /api/v1/push/vapid-key`, `POST /api/v1/push/subscribe`, `POST /api/v1/push/unsubscribe`
- Integration: `notificationService.create()` automatically sends web push alongside in-app notifications
- Frontend: `NotificationProvider` auto-subscribes authenticated users to push on service worker ready
- Expired subscriptions (410 status) are automatically cleaned up

### Install Prompt Behavior
- **Android/Chrome**: Intercepts `beforeinstallprompt` and shows custom install banner
- **iOS/Safari**: Detects iOS + non-standalone mode, shows manual "Add to Home Screen" step-by-step guide after 3 seconds
- Dismissal persists for the session via `sessionStorage`

### Deployment Requirement
- HTTPS is mandatory for service worker, push, and install prompt to work
- Use AWS CloudFront with ACM certificate for SSL termination in production
- `localhost` is exempt from HTTPS requirement for development

---

## 15. Quick Reference Commands

```bash
# Clone and setup
git clone <repo-url> && cd atyors_com
cp env.local.example .env.local   # Edit with your values
make dev                           # Start everything

# Development
make logs-api                      # API logs
make logs-web                      # Web logs
make health                        # Health check

# Testing
cd apps/server && npm test         # API tests
cd apps/web && npm test            # Web unit tests
cd apps/web && npm run test:e2e    # E2E tests

# Deployment
git push origin main               # Triggers auto-deploy via GitHub Actions

# Emergency
# Manual rollback via GitHub Actions "rollback" workflow
# Manual SSH: ssh -i ~/.ssh/<key>.pem ec2-user@<host>
```
