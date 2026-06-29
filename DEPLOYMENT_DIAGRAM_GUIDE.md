# Expense Tracker — Deployment Process Diagram Guide

> **Purpose:** This document is structured for GPT-based diagram generation (e.g., Codex GPT 5.5).
> Feed this file directly to the model and ask it to generate a Mermaid flowchart, draw.io XML, or any diagram format.

---

## 1. PROJECT OVERVIEW (Context for the Diagram)

| Property         | Value                                       |
|------------------|---------------------------------------------|
| App Name         | Finovia (Expense Tracker)                   |
| Live URL         | https://gcp-learning-acnt.web.app           |
| Frontend         | React 18 + TypeScript + Vite (SPA)          |
| Backend          | Java 21 + Spring Boot 3.3.4 (REST API)      |
| Database         | PostgreSQL on Neon (serverless, free tier)  |
| Auth             | Firebase Authentication                     |
| Frontend Host    | Firebase Hosting                            |
| Backend Host     | Google Cloud Run                            |
| Container Registry | Google Artifact Registry                  |
| Secrets          | Google Secret Manager                       |
| CI/CD            | Jenkins (local Docker or GCE VM)            |
| Migration Tool   | Flyway (V1–V4)                              |

---

## 2. THE DEPLOYMENT PIPELINE — ORDERED STEPS

Below are the **exact sequential steps** in the CI/CD pipeline. Each step is a node in the diagram.

### PHASE 1 — TRIGGER
```
Step 1: Developer pushes code to GitHub (branch: master)
        → Triggers Jenkins via Webhook (or Poll SCM every 1 min)
```

### PHASE 2 — CI: BACKEND BUILD & TEST
```
Step 2: Jenkins checks out source code from GitHub

Step 3: Jenkins runs Maven build
        Command: ./mvnw clean package -DskipTests=false
        - Compiles Java 21 source code
        - Runs JUnit tests (with Testcontainers + real PostgreSQL)
        - Produces: backend/target/app.jar

Step 4: If tests fail → Pipeline STOPS. Notify developer.
        If tests pass → Continue to Step 5
```

### PHASE 3 — BUILD DOCKER IMAGE
```
Step 5: Jenkins builds Docker image from backend/Dockerfile
        - Stage 1 (Builder): Maven compiles the JAR inside Docker
        - Stage 2 (Runtime): Copies JAR into JDK 21 slim image
        - Drops to non-root user (appuser, uid 1001)
        - Exposes port 8080
        - Image tag: <artifact-registry-url>:BUILD_NUMBER

Step 6: Jenkins authenticates to Google Cloud
        - Uses GCP Service Account key (Jenkins credential: gcp-secret-key)
        - Command: gcloud auth activate-service-account --key-file=key.json

Step 7: Jenkins pushes Docker image to Google Artifact Registry
        - Registry: asia-south1-docker.pkg.dev/<project>/finovia
        - Tag: BUILD_NUMBER (e.g., :42)
```

### PHASE 4 — CD: DEPLOY BACKEND
```
Step 8: Jenkins deploys new image to Google Cloud Run
        Command: gcloud run deploy finance-api
        - Sets environment variables: DB_URL, DB_USER, FIREBASE_PROJECT_ID, CORS_ALLOWED_ORIGINS
        - Mounts secret from Secret Manager: DB_PASSWORD=db-password:latest
        - Min instances: 0 (scales to zero)
        - Max instances: 5
        - Region: asia-south1
        - Traffic: 100% to new revision immediately

Step 9: Cloud Run performs health check on new revision
        - If healthy → new revision receives 100% traffic
        - If unhealthy → Cloud Run automatically rolls back to previous revision
```

### PHASE 5 — DATABASE MIGRATIONS (AUTO ON STARTUP)
```
Step 10: When the new Cloud Run container starts, Spring Boot auto-runs Flyway
         - Flyway connects to Neon PostgreSQL (direct/non-pooled endpoint)
         - Checks current schema version
         - Applies any pending migrations: V1 → V2 → V3 → V4
         - Migrations are SQL files in backend/src/main/resources/db/migration/
         - Once done, Hikari connection pool is initialized (pool size: 3 for Cloud Run)
```

### PHASE 6 — CI: FRONTEND BUILD
```
Step 11: Jenkins injects production environment variables into frontend/.env.production
         - VITE_API_BASE_URL (Cloud Run backend URL)
         - VITE_FIREBASE_API_KEY
         - VITE_FIREBASE_AUTH_DOMAIN
         - VITE_FIREBASE_PROJECT_ID
         - VITE_FIREBASE_APP_ID
         Source: Jenkins credential store (finovia-frontend-env)

Step 12: Jenkins installs frontend dependencies
         Command: npm install
         Location: frontend/ directory

Step 13: Jenkins builds the frontend for production
         Command: npm run build (runs: tsc -b && vite build)
         - TypeScript compiled and type-checked
         - Vite bundles and tree-shakes React app
         - Output: frontend/dist/ (static HTML, JS, CSS assets)
```

### PHASE 7 — CD: DEPLOY FRONTEND
```
Step 14: Jenkins deploys frontend/dist/ to Firebase Hosting
         Command: firebase deploy --only hosting --project gcp-learning-acnt
         - Uploads static files to Firebase CDN
         - firebase.json configures:
             → Public dir: frontend/dist
             → SPA rewrite: all routes → index.html
             → Immutable asset cache: max-age 1 year

Step 15: Firebase Hosting goes live
         URL: https://gcp-learning-acnt.web.app
         Previous version is kept for instant rollback if needed.
```

### PHASE 8 — COMPLETE
```
Step 16: Jenkins marks build as SUCCESS
         - All stages passed
         - Backend live on Cloud Run
         - Frontend live on Firebase Hosting
         - Database migrated and healthy
```

---

## 3. DIAGRAM NODE LIST (for GPT to map into visual nodes)

Use these labels verbatim as diagram node labels:

| Node ID | Label                               | Type        |
|---------|-------------------------------------|-------------|
| N1      | Developer pushes to GitHub          | Actor/Start |
| N2      | GitHub Webhook                      | Event       |
| N3      | Jenkins CI Server                   | System      |
| N4      | Checkout Source Code                | Process     |
| N5      | Maven Build & JUnit Tests           | Process     |
| N6      | Tests Failed?                       | Decision    |
| N7      | Notify Developer (Build Failed)     | Output      |
| N8      | Build Docker Image (Multi-Stage)    | Process     |
| N9      | Authenticate to GCP                 | Process     |
| N10     | Push Image to Artifact Registry     | Process     |
| N11     | Deploy to Cloud Run                 | Process     |
| N12     | Cloud Run Health Check              | Decision    |
| N13     | Rollback to Previous Revision       | Output      |
| N14     | Flyway DB Migrations (on startup)   | Process     |
| N15     | Neon PostgreSQL                     | Database    |
| N16     | Inject Frontend Env Vars            | Process     |
| N17     | npm install                         | Process     |
| N18     | Vite Production Build (npm run build)| Process   |
| N19     | Firebase Deploy (Hosting)           | Process     |
| N20     | Firebase Hosting (CDN) LIVE         | Output/End  |
| N21     | Cloud Run Backend LIVE              | Output      |
| N22     | Google Secret Manager               | System      |
| N23     | Google Artifact Registry            | System      |

---

## 4. DIAGRAM CONNECTIONS (Edges / Arrows)

```
N1  → N2   (pushes code)
N2  → N3   (webhook triggers)
N3  → N4   (Jenkins starts)
N4  → N5   (checkout done)
N5  → N6   (build result)
N6  → N7   (YES → tests failed → notify & stop)
N6  → N8   (NO → tests passed → continue)
N8  → N9   (image built)
N9  → N10  (authenticated to GCP)
N10 → N23  (push image to registry)
N23 → N11  (pull image for deployment)
N22 → N11  (inject DB_PASSWORD secret)
N11 → N12  (deploy triggered)
N12 → N13  (health check fails → rollback)
N12 → N14  (health check passes → app starts → Flyway runs)
N14 → N15  (apply SQL migrations)
N15 → N21  (migrations done → backend is LIVE)
N11 → N16  (in parallel: frontend pipeline starts)
N16 → N17  (env vars injected)
N17 → N18  (deps installed)
N18 → N19  (dist/ built)
N19 → N20  (deployed to CDN)
N20 → N21  (frontend calls backend API)
```

---

## 5. ENVIRONMENT SEPARATION

| Environment | Frontend URL                        | Backend                   | Database         |
|-------------|-------------------------------------|---------------------------|------------------|
| Local Dev   | http://localhost:5173               | http://localhost:8080     | Docker PostgreSQL|
| Production  | https://gcp-learning-acnt.web.app   | Google Cloud Run (URL)    | Neon PostgreSQL  |

---

## 6. SECRETS & CREDENTIALS FLOW

```
GCP Secret Manager
    └── db-password (secret)
            └── Injected into Cloud Run at deploy time
                    └── Used by Spring Boot → Hikari → Neon PostgreSQL

Jenkins Credentials Store
    ├── gcp-secret-key (Service Account JSON)
    │       └── Used to: authenticate gcloud, push to Artifact Registry, deploy Cloud Run
    └── finovia-frontend-env (.env.production file)
            └── Used to: inject VITE_ variables before Vite build
```

---

## 7. ROLLBACK STRATEGY

| Component  | Rollback Method                                                  |
|------------|------------------------------------------------------------------|
| Backend    | Cloud Run auto-rollback on failed health check. Manual: `gcloud run services update-traffic` |
| Frontend   | Firebase Hosting keeps previous deploy. Manual: Firebase Console → Hosting → Release History → Rollback |
| Database   | Flyway migrations are forward-only. Rollback = write a new migration (V5). |

---

## 8. PROMPT INSTRUCTIONS FOR GPT DIAGRAM GENERATION

> Copy and paste the section below directly into GPT/Codex as a prompt:

---

**GPT PROMPT:**

```
I have a CI/CD deployment pipeline for a full-stack web app called "Finovia" (Expense Tracker).
The stack is: React (Vite) frontend, Java Spring Boot backend, PostgreSQL database (Neon),
deployed to Firebase Hosting (frontend) and Google Cloud Run (backend), using Jenkins for CI/CD.

Please create a clean, detailed deployment flow diagram using Mermaid syntax (flowchart TD direction).

Use these EXACT phases and steps as diagram nodes:

PHASE 1 - TRIGGER:
- Developer pushes code to GitHub
- GitHub Webhook fires
- Jenkins CI Server receives trigger

PHASE 2 - BACKEND BUILD:
- Checkout Source Code
- Maven Build + JUnit Tests (with Testcontainers)
- Decision: Tests Passed?
  - NO → Notify Developer (STOP)
  - YES → Continue

PHASE 3 - DOCKER & REGISTRY:
- Build Multi-Stage Docker Image (Maven builder → JDK 21 runtime)
- Authenticate to Google Cloud (Service Account)
- Push Docker Image to Google Artifact Registry

PHASE 4 - DEPLOY BACKEND:
- Deploy to Google Cloud Run (inject DB_PASSWORD from GCP Secret Manager)
- Cloud Run Health Check
  - FAIL → Auto Rollback to Previous Revision
  - PASS → Continue

PHASE 5 - DATABASE MIGRATIONS:
- Flyway Runs SQL Migrations on Startup (V1 → V4)
- Neon PostgreSQL updated
- Backend API is LIVE

PHASE 6 - FRONTEND BUILD:
- Inject Production Env Vars (from Jenkins credentials)
- npm install
- Vite Production Build (tsc + vite build → dist/)

PHASE 7 - DEPLOY FRONTEND:
- Firebase Deploy to Hosting CDN
- Frontend SPA is LIVE at https://gcp-learning-acnt.web.app

Style requirements:
- Use subgraphs for each phase with a colored background
- Use diamond shapes for decisions
- Use rounded rectangles for processes
- Use cylinder shape for the database (Neon PostgreSQL)
- Add emoji icons in node labels where appropriate (🔨 for build, 🐳 for Docker, 🚀 for deploy, ✅ for success, ❌ for failure)
- Color the SUCCESS end node GREEN and FAILURE nodes RED
- Add a legend at the bottom showing: Trigger, Process, Decision, Database, External Service
```

---

## 9. ALTERNATIVE: PLAIN TEXT DIAGRAM (ASCII)

If you prefer ASCII art or a simpler text-based representation to feed into GPT:

```
[Developer]
     |
     | git push → master
     ↓
[GitHub Repository]
     |
     | Webhook / Poll SCM
     ↓
[Jenkins CI Server]
     |
     ├─── BACKEND PIPELINE ──────────────────────────────────────────┐
     │                                                                │
     │  [Checkout Code]                                               │
     │       ↓                                                        │
     │  [Maven Build + Tests]                                         │
     │       ↓                                                        │
     │  {Tests Pass?}──NO──→ [Notify Dev] ──→ STOP                   │
     │       │YES                                                     │
     │       ↓                                                        │
     │  [Build Docker Image]                                          │
     │       ↓                                                        │
     │  [Auth with GCP Service Account]                               │
     │       ↓                                                        │
     │  [Push to Artifact Registry] ────→ [Artifact Registry 📦]     │
     │       ↓                                                        │
     │  [Deploy to Cloud Run] ←──── [Secret Manager 🔐 DB_PASSWORD]  │
     │       ↓                                                        │
     │  {Health Check?}──FAIL──→ [Auto Rollback]                     │
     │       │PASS                                                    │
     │       ↓                                                        │
     │  [Flyway Migrations Run]                                       │
     │       ↓                                                        │
     │  [Neon PostgreSQL 🗄️ Updated]                                 │
     │       ↓                                                        │
     │  ✅ Backend API LIVE on Cloud Run                              │
     │                                                                │
     └─── FRONTEND PIPELINE ─────────────────────────────────────────┘
     │
     │  [Inject .env.production Vars]
     │       ↓
     │  [npm install]
     │       ↓
     │  [Vite Build → dist/]
     │       ↓
     │  [Firebase Deploy → Hosting CDN]
     │       ↓
     │  ✅ Frontend LIVE → https://gcp-learning-acnt.web.app
     │
     ↓
[Jenkins marks build: SUCCESS ✅]
```

---

## 10. TECHNOLOGY ICONS REFERENCE (for GPT image generation)

| Component             | Brand Logo to Use         | Color     |
|-----------------------|---------------------------|-----------|
| Jenkins               | Jenkins logo (butler)     | #D33833   |
| GitHub                | GitHub Octocat            | #181717   |
| Google Cloud Run      | GCP Cloud Run icon        | #4285F4   |
| Firebase Hosting      | Firebase flame icon       | #FFCA28   |
| Artifact Registry     | GCP Artifact Registry     | #4285F4   |
| Secret Manager        | GCP lock icon             | #34A853   |
| Neon PostgreSQL       | PostgreSQL elephant       | #336791   |
| React (Vite)          | React atom + Vite bolt    | #61DAFB   |
| Spring Boot           | Spring leaf icon          | #6DB33F   |
| Docker                | Docker whale              | #2496ED   |
| Java 21               | Java coffee cup           | #007396   |

---

*Last updated: 2026-06-28 | Project: Expense-Tracker (Finovia)*
