# Finovia — Personal Finance App

A full-stack personal finance app: track expenses, income, and savings goals, with an
analytics engine that turns your habits into actionable budgeting insights, all on a sleek
dashboard with charts and a subtle animated 3D background.

## Stack

| Layer       | Choice                                                                    |
| ----------- | ------------------------------------------------------------------------- |
| Backend     | Java 21 · Spring Boot 3 (Web, Data JPA, Security, Validation, Flyway)      |
| Auth        | Firebase Authentication (backend verifies ID tokens via Firebase Admin)   |
| Database    | PostgreSQL (Cloud SQL in production)                                       |
| Frontend    | React + TypeScript + Vite · Tailwind CSS · TanStack Query                 |
| Charts / 3D | Recharts · react-three-fiber + drei                                        |
| Infra       | GCP: Cloud Run · Firebase Hosting · Cloud SQL · Secret Manager · Cloud Build |

## Repository layout

```
backend/    Spring Boot API (controllers, services, JPA domain, Flyway migrations)
frontend/   Vite React SPA (pages, charts, auth, API client)
infra/      docker-compose (local Postgres), Cloud Build pipeline
firebase.json   Firebase Hosting config
```

## Architecture

```
React SPA (Firebase Hosting)
   │  HTTPS + Firebase ID token (Bearer)
   ▼
Spring Boot API (Cloud Run) ──(Cloud SQL Connector)──> Cloud SQL: PostgreSQL
   │  verifies token (Firebase Admin SDK)            Secret Manager: DB creds
   ▼
Firebase Authentication
```

Every request carries a Firebase ID token. `FirebaseTokenFilter` verifies it and sets a
`FirebaseUserPrincipal`; services resolve the matching `app_user` row (just-in-time
provisioning) and scope **all** queries by `user_id` for tenant isolation.

---

## Local development

### Prerequisites
- Java 21, Maven, Node 20+, Docker
- A Firebase project (Email/Password + Google sign-in enabled)

### 1. Start PostgreSQL
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Run the backend
Provide Firebase credentials so the Admin SDK can verify tokens. Either set
`FIREBASE_CREDENTIALS_PATH` to a service-account JSON, or rely on Application Default
Credentials (`gcloud auth application-default login`).

```bash
cd backend
export FIREBASE_PROJECT_ID=your-firebase-project-id
export FIREBASE_CREDENTIALS_PATH=/path/to/service-account.json   # optional
./mvnw spring-boot:run
```
API is at `http://localhost:8080`. Flyway runs migrations automatically.
Health: `GET http://localhost:8080/actuator/health`.

### 3. Run the frontend
```bash
cd frontend
cp .env.example .env.local      # fill in Firebase web config + VITE_API_BASE_URL
npm install
npm run dev
```
App is at `http://localhost:5173`.

### Tests
```bash
cd backend && ./mvnw test        # JUnit + Testcontainers (needs Docker)
cd frontend && npm test          # Vitest
```

---

## API surface

| Method | Path                                  | Purpose                            |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/api/me`                             | Current user (provisions on first) |
| GET/POST/PUT/DELETE | `/api/transactions[/{id}]` | Expense/income CRUD                |
| GET/POST/PUT/DELETE | `/api/categories[/{id}]`   | Categories (system defaults seeded) |
| GET/POST/PUT/DELETE | `/api/goals[/{id}]`        | Savings goals CRUD                 |
| GET    | `/api/analytics/summary`              | KPIs + rule-based insights         |
| GET    | `/api/analytics/spend-by-category`    | Pie/donut data                     |
| GET    | `/api/analytics/income-vs-expense`    | Monthly bar data                   |
| GET    | `/api/analytics/savings-trend`        | Cumulative savings line            |

All endpoints (except `/actuator/health`) require `Authorization: Bearer <Firebase ID token>`.
Analytics endpoints take `from` & `to` (ISO `yyyy-MM-dd`) query params.

---

## Deploying to GCP

> **Full step-by-step runbook (Cloud Run + Firebase Hosting + Cloud SQL + Jenkins CI/CD on a GCE VM): [infra/DEPLOYMENT.md](infra/DEPLOYMENT.md).** The repo's [`Jenkinsfile`](Jenkinsfile) defines the pipeline; [infra/jenkins/startup.sh](infra/jenkins/startup.sh) provisions the Jenkins VM.

### Quick overview

One-time setup:
```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

# Cloud SQL (PostgreSQL)
gcloud sql instances create finance-pg --database-version=POSTGRES_16 \
  --tier=db-g1-small --region=us-central1
gcloud sql databases create finance --instance=finance-pg
gcloud sql users create finance --instance=finance-pg --password=<STRONG_PWD>

# Store the DB password in Secret Manager
printf '<STRONG_PWD>' | gcloud secrets create db-password --data-file=-

# Artifact Registry repo
gcloud artifacts repositories create finance --repository-format=docker --location=us-central1
```

Then connect the Cloud Build trigger to your repo using `infra/cloudbuild.yaml` and set the
substitutions (`_REGION`, `_SERVICE`, `_AR_REPO`, `_CLOUD_SQL_CONNECTION`, `_DB_NAME`,
`_DB_USER`). On push to `main` it builds/tests the backend, deploys to Cloud Run (wiring
Cloud SQL + `db-password` secret), and deploys the frontend to Firebase Hosting.

After the first deploy, set the frontend's `VITE_API_BASE_URL` to the Cloud Run URL and
restrict the backend's `CORS_ALLOWED_ORIGINS` to your Hosting domain.

### Scaling notes
- Cloud Run scales 0→N; keep `max-instances × DB_POOL_SIZE` under Cloud SQL's connection limit.
- Cache analytics responses (Cloud CDN / Memorystore Redis) and pre-compute monthly rollups
  (Cloud Scheduler + Pub/Sub) as traffic grows; add Cloud SQL read replicas for reporting.

---

## Security highlights
- Stateless auth; tokens verified server-side every request.
- Row-level ownership enforced in the service layer (`findByIdAndUserId`).
- Monetary values stored as `NUMERIC(14,2)` — never floating point.
- Secrets in Secret Manager, never in images or source.
- CORS restricted to the SPA origin.
