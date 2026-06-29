# Finovia — GCP Deployment + Jenkins CI/CD Runbook

Deploy target: **backend → Cloud Run service**, **frontend → Firebase Hosting**, **database → Neon (free serverless PostgreSQL)**, secrets in **Secret Manager**, images in **Artifact Registry**, CI/CD via **Jenkins on a GCE VM**.

> **Cost:** this stack is **$0 at personal-use scale** — Cloud Run (scales to zero, free tier), Firebase Hosting + Auth (free), and Neon Postgres (free tier, no card). GCP still requires a billing account on file, but you stay within free limits. The backend connects to Neon over a standard SSL JDBC URL, so **no `gcp`/Cloud SQL profile is used** and there are no Cloud SQL charges.

Jenkins authenticates to GCP with a **service-account key file** stored as a Jenkins *Secret file* credential (`gcp-secret-key`) — matching the convention from your existing Spring Batch pipeline (`gcloud auth activate-service-account --key-file=...`). The pipeline **builds + tests + pushes the image and rolls it onto an already-created Cloud Run service** (`gcloud run services update --image`); the service is created once below with its full config.

> Replace `YOUR_PROJECT_ID` everywhere. Region used below is `asia-south1` (Mumbai) — change if you prefer. Run the `gcloud` commands from your machine (with `gcloud auth login`) or Cloud Shell.

---

## 0. Prerequisites
- A GCP project with billing enabled.
- `gcloud` CLI authenticated (`gcloud auth login`) and `gcloud config set project YOUR_PROJECT_ID`.
- A Firebase project linked to the same GCP project, with **Authentication → Email/Password + Google** enabled and a **Web app** registered (you'll need its config for the frontend).

```bash
export PROJECT_ID=YOUR_PROJECT_ID
export REGION=asia-south1
gcloud config set project $PROJECT_ID
```

## 1. Enable APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  firebasehosting.googleapis.com
```

## 2. Database — Neon (free serverless PostgreSQL)
1. Sign up at **https://neon.tech** (GitHub/Google login, **no credit card**) and create a project — pick a region near you (e.g. AWS `ap-south-1` Mumbai).
2. It creates a database (default `neondb`) and a role with a password. Open **Connection Details** and copy the **pooled** connection string (host ends in `-pooler...neon.tech`) — the pooler is important so many Cloud Run instances don't exhaust connections.
3. Build a JDBC URL from it (note `sslmode=require`):
   ```
   jdbc:postgresql://<your-endpoint>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
   Keep the **username** and **password** handy for the next step.

Neon scales to zero after ~5 min idle and wakes automatically on the next connection (sub-second) — perfect for a personal app and the reason it's free.

## 3. Store the Neon password in Secret Manager
```bash
printf 'YOUR_NEON_PASSWORD' | gcloud secrets create db-password --data-file=-
```

## 4. Artifact Registry (Docker)
```bash
gcloud artifacts repositories create finance \
  --repository-format=docker --location=$REGION \
  --description="Finovia images"
```

## 5. Service accounts
Two SAs: one the **Cloud Run service runs as** (reads the secret), one the **Jenkins VM runs as** (builds + deploys). No Cloud SQL role is needed — the DB is Neon, reached over the public internet via SSL.

### 5a. Cloud Run runtime SA
```bash
gcloud iam service-accounts create finance-run --display-name="Finovia Cloud Run runtime"

RUNTIME_SA=finance-run@$PROJECT_ID.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA" --role="roles/secretmanager.secretAccessor"
```

### 5b. Jenkins deployer SA + key
```bash
gcloud iam service-accounts create jenkins-deployer --display-name="Jenkins CI/CD"

JENKINS_SA=jenkins-deployer@$PROJECT_ID.iam.gserviceaccount.com
for ROLE in \
  roles/artifactregistry.writer \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/firebasehosting.admin ; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$JENKINS_SA" --role="$ROLE"
done

# Allow Jenkins to deploy Cloud Run AS the runtime SA.
gcloud iam service-accounts add-iam-policy-binding $RUNTIME_SA \
  --member="serviceAccount:$JENKINS_SA" --role="roles/iam.serviceAccountUser"

# Create a key for Jenkins (upload to Jenkins as the 'gcp-secret-key' Secret file credential).
gcloud iam service-accounts keys create jenkins-deployer-key.json --iam-account=$JENKINS_SA
```
> Keep `jenkins-deployer-key.json` out of Git (it's already covered by `.gitignore`). Delete it locally once uploaded to Jenkins.

## 6. Firebase Hosting init (one-time, local)
From the repo root (`firebase.json` already targets `frontend/dist`):
```bash
npm i -g firebase-tools
firebase login
firebase use --add        # pick YOUR_PROJECT_ID, alias it "default"
```
This creates `.firebaserc`. Commit it (it contains no secrets).

---

## 7. Run Jenkins

You have two options. **Local is recommended for a personal, $0 setup** — there's no VM to pay for or manage. Use the GCE VM only if you want an always-on public endpoint for instant webhooks.

### Option A — Local Jenkins in Docker (free, recommended)
Runs Jenkins (Linux) on Docker Desktop with the host Docker socket mounted, so the pipeline's `sh` / `docker` / `gcloud` / `firebase` steps all work — even on Windows.
```bash
docker compose -f infra/jenkins/local/docker-compose.yml up -d --build
# Unlock password:
docker exec finovia-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open `http://localhost:8080`, install suggested plugins, then jump to **§8**.

Because GitHub can't reach `localhost`, trigger builds one of these ways (configure in the job):
- **Poll SCM** (`H/5 * * * *`) — Jenkins checks GitHub every few minutes and builds new commits. No public URL needed; just keep the container running. *(recommended)*
- **Build Now** — trigger manually after a push.
- **Cloudflare Tunnel** — gives `localhost:8080` a public HTTPS URL so a real GitHub webhook (`…/github-webhook/`) triggers builds **instantly**. Step-by-step Cloudflare Tunnel + webhook setup: **[infra/jenkins/local/README.md](jenkins/local/README.md)**.

> Start it only when you want to deploy (`docker compose ... up -d` + `cloudflared tunnel --url http://localhost:8080`) and tear down afterward — truly $0.

### Option B — Jenkins on a GCE VM (always-on, public webhooks)
```bash
gcloud compute instances create jenkins \
  --zone=${REGION}-a \
  --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud \
  --metadata-from-file=startup-script=infra/jenkins/startup.sh \
  --tags=jenkins
```
Open port 8080 to your IP only:
```bash
gcloud compute firewall-rules create allow-jenkins \
  --allow=tcp:8080 --target-tags=jenkins --source-ranges=YOUR.IP.ADDR.ESS/32
```
The startup script installs JDK 21, Docker, Node 20, firebase-tools, and Jenkins. SSH in to get the unlock password:
```bash
gcloud compute ssh jenkins --zone=${REGION}-a \
  --command='sudo cat /var/lib/jenkins/secrets/initialAdminPassword'
```
Browse to `http://<VM_EXTERNAL_IP>:8080`, install suggested plugins (includes **Pipeline** + **Credentials Binding**).

> Jenkins authenticates to GCP using the `gcp-secret-key` credential (the deployer SA key), so the VM does **not** need an attached service account. The VM can run anywhere this convention is used.

## 8. Configure Jenkins
**Global tools** (`Manage Jenkins → Tools`): add a Maven install named **`Maven3`** and a JDK named **`JDK21`** (matching the `tools{}` block in the `Jenkinsfile`).

**Global env** (`Manage Jenkins → System → Global properties → Environment variables`): add **`GCP_PROJECT_ID`** = your project id. (`REGION` is set in the `Jenkinsfile`; move it here too if you prefer.)

**Credentials** (`Manage Jenkins → Credentials → (global) → Add Credentials`, Kind: **Secret file** for both):
1. **`gcp-secret-key`** — upload `jenkins-deployer-key.json` from step 5b.
2. **`finovia-frontend-env`** — upload your production frontend env file:
   ```
   VITE_API_BASE_URL=https://<cloud-run-url>/api
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_APP_ID=...
   ```
   (You won't know the Cloud Run URL until step 9 — use a placeholder, then re-upload and re-run.)

**Pipeline job:** New Item → **Pipeline** (or **Multibranch Pipeline**). *Pipeline script from SCM* → your Git repo → script path **`Jenkinsfile`**.

## 9. Create the Cloud Run service once (full config)
The pipeline only rolls new images onto an existing service, so create it first with its env vars, the Neon connection, secret, and runtime SA. (Uses a public placeholder image initially — the first pipeline run replaces it.)

Set your Neon details first. Use the **direct** (non-pooled) endpoint — Spring runs Flyway at
startup, and Neon's pooler (PgBouncer) doesn't support the session locks Flyway needs:
```bash
export DB_URL='jdbc:postgresql://ep-young-tree-ad40uxc5.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
export DB_USER='neondb_owner'
```
Then create the service (note: **no** `gcp` profile and **no** `--add-cloudsql-instances`):
```bash
gcloud run deploy finance-api \
  --image gcr.io/cloudrun/hello \
  --project $PROJECT_ID --region $REGION --platform managed \
  --service-account finance-run@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars "DB_URL=$DB_URL,DB_USER=$DB_USER,DB_POOL_SIZE=3,FIREBASE_PROJECT_ID=$PROJECT_ID,CORS_ALLOWED_ORIGINS=https://$PROJECT_ID.web.app" \
  --update-secrets "DB_PASSWORD=db-password:latest" \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 5 --cpu 1 --memory 512Mi --concurrency 80 --port 8080
```
Grab the URL: `gcloud run services describe finance-api --region $REGION --format='value(status.url)'`.

> `DB_POOL_SIZE=3` keeps Hikari small so `max-instances × pool` (≈15) stays within Neon's free
> connection budget on the direct endpoint. The app's default Spring profile already reads
> `DB_URL`/`DB_USER`/`DB_PASSWORD`, so no code changes. **If you later scale up**, switch `DB_URL`
> to the `-pooler` host and set `spring.flyway.url` to the direct host so migrations still work.

> **Email digest (optional):** to enable the weekly/monthly digest emails, add the mail + digest
> env vars and secrets to this service and create the scheduler jobs — see **§12** below.

## 10. Run the pipeline
Click **Build Now**. Stages: checkout → `mvn clean package` (build + tests) → build Docker image (`./backend`) → push to Artifact Registry → `gcloud run services update` (rolls the new image) → build frontend → `firebase deploy --only hosting`.

After the first run, put the real Cloud Run URL into the `finovia-frontend-env` credential (`VITE_API_BASE_URL`) and update `CORS_ALLOWED_ORIGINS` on the service, then re-run so the SPA targets the right API.

## 11. Verify
- `https://<cloud-run-url>/actuator/health` → `{"status":"UP"}`.
- `curl https://<cloud-run-url>/api/transactions` with no token → **401** (auth working).
- Open `https://YOUR_PROJECT.web.app`, sign in, add a transaction, see the dashboard update.
- Flyway migrations (V1–V5) run automatically on container startup — check Cloud Run logs.

---

## 12. Email digest (weekly/monthly) — optional, free

Users opt into a **weekly** or **monthly** summary email from the **Account** page. Delivery needs
an SMTP provider and a scheduler to trigger the runs. Everything below stays within free tiers.

### 12a. Pick an SMTP provider
Any SMTP works. **Brevo** (formerly Sendinblue) has a free tier (~300 emails/day):
host `smtp-relay.brevo.com`, port `587`, with a generated SMTP key as the password. (Gmail with an
app password also works for low volume.)

### 12b. Store the SMTP password + a digest token as secrets
```bash
printf '%s' 'YOUR_SMTP_PASSWORD' | gcloud secrets create mail-password --data-file=- --project $PROJECT_ID
# A long random shared secret that protects the internal trigger endpoint:
openssl rand -hex 32 | tr -d '\n' | gcloud secrets create digest-token --data-file=- --project $PROJECT_ID
# Let the Cloud Run runtime SA read them:
for s in mail-password digest-token; do
  gcloud secrets add-iam-policy-binding $s --project $PROJECT_ID \
    --member "serviceAccount:finance-run@$PROJECT_ID.iam.gserviceaccount.com" \
    --role roles/secretmanager.secretAccessor
done
```

### 12c. Add the mail config to the Cloud Run service
```bash
gcloud run services update finance-api --project $PROJECT_ID --region $REGION \
  --update-env-vars "MAIL_ENABLED=true,MAIL_HOST=smtp-relay.brevo.com,MAIL_PORT=587,MAIL_USERNAME=YOUR_SMTP_LOGIN,MAIL_FROM=no-reply@yourdomain.com,MAIL_FROM_NAME=Finovia,PUBLIC_URL=https://$PROJECT_ID.web.app" \
  --update-secrets "MAIL_PASSWORD=mail-password:latest,DIGEST_TOKEN=digest-token:latest"
```
Verify from the app: **Account → Email digest → "Send me a test digest"** should arrive in your inbox.

### 12d. Schedule the runs with Cloud Scheduler (free: ≤3 jobs)
The endpoint is `POST /api/internal/digests/run?frequency=WEEKLY|MONTHLY`, gated by the
`X-Digest-Token` header. Read the token, then create two jobs:
```bash
TOKEN=$(gcloud secrets versions access latest --secret digest-token --project $PROJECT_ID)
URL=$(gcloud run services describe finance-api --project $PROJECT_ID --region $REGION --format='value(status.url)')

# Weekly — Mondays 08:00 IST
gcloud scheduler jobs create http finovia-digest-weekly --project $PROJECT_ID --location $REGION \
  --schedule "0 8 * * 1" --time-zone "Asia/Kolkata" --http-method POST \
  --uri "$URL/api/internal/digests/run?frequency=WEEKLY" \
  --headers "X-Digest-Token=$TOKEN"

# Monthly — 1st of month 08:00 IST
gcloud scheduler jobs create http finovia-digest-monthly --project $PROJECT_ID --location $REGION \
  --schedule "0 8 1 * *" --time-zone "Asia/Kolkata" --http-method POST \
  --uri "$URL/api/internal/digests/run?frequency=MONTHLY" \
  --headers "X-Digest-Token=$TOKEN"
```
Each run returns `{"frequency","recipients","sent","skipped"}`. Users with no activity in the
period are skipped (no empty emails). To disable email, set `MAIL_ENABLED=false` (or remove the
scheduler jobs); the app runs fine without it.

> **Local dev:** leave `MAIL_*` unset and email is simply skipped (logged, never fails). To test
> locally, set `MAIL_ENABLED=true` + the `MAIL_*`/`DIGEST_TOKEN` env vars in your run config.

---

## Auto-trigger builds on push
- **GitHub:** add a webhook to `http://<VM_IP>:8080/github-webhook/` and enable "GitHub hook trigger" in the job. (Use the **Multibranch Pipeline** to build per-branch / PRs.)
- Or enable **Poll SCM** (`H/5 * * * *`) for a simple pull-based trigger.

## Cost & scaling
- **Baseline: ~$0/month** at personal scale — Cloud Run stays in the free tier (2M requests, scales to zero), Firebase Hosting + Auth are free, and Neon's free tier covers a personal DB. The only thing that can incur GCP cost is the **Jenkins `e2-medium` VM** (~$25/mo if left running) — stop it when idle (`gcloud compute instances stop jenkins`) and start it only to deploy, or run Jenkins locally instead, to keep it truly free.
- Keep `max-instances × DB_POOL_SIZE` under Neon's connection limit; always use Neon's **pooled** endpoint.
- When you outgrow the free DB: bump the Neon plan, or migrate to Cloud SQL (re-enable the `gcp` profile + `--add-cloudsql-instances`). Add a CDN / Redis cache for analytics as traffic grows.

## Security checklist
- Secrets only in Secret Manager (never in the image or Git).
- `CORS_ALLOWED_ORIGINS` restricted to your Hosting domain.
- Cloud Run runs as a least-privilege runtime SA (Secret Accessor only).
- Neon connection always uses `sslmode=require`.
- Jenkins port 8080 firewalled to your IP; consider an HTTPS reverse proxy + auth for production.
- Rotate the DB password in Neon, add a new `db-password` secret version, and redeploy.
