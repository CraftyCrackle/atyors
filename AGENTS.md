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
- **Service Provider:** The person fulfilling the job
- **Service Zone:** Geographic area defining availability and pricing

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
- Route optimization

---

## 11. Development Workflow Checklist

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

## 12. Quick Reference Commands

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
