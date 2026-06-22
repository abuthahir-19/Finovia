# Finovia — GCP Deployment + Jenkins CI/CD Runbook

Deploy target: **backend → Cloud Run service**, **frontend → Firebase Hosting**, **database → Cloud SQL (PostgreSQL)**, secrets in **Secret Manager**, images in **Artifact Registry**, CI/CD via **Jenkins on a GCE VM**.

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
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  iam.googleapis.com \
  firebasehosting.googleapis.com
```

## 2. Cloud SQL (PostgreSQL)
```bash
gcloud sql instances create finance-pg \
  --database-version=POSTGRES_16 --tier=db-g1-small --region=$REGION

gcloud sql databases create finance --instance=finance-pg
gcloud sql users create finance --instance=finance-pg --password='CHANGE_ME_STRONG'
```
Note the **connection name** (`PROJECT_ID:asia-south1:finance-pg`):
```bash
gcloud sql instances describe finance-pg --format='value(connectionName)'
```

## 3. Store the DB password in Secret Manager
```bash
printf 'CHANGE_ME_STRONG' | gcloud secrets create db-password --data-file=-
```

## 4. Artifact Registry (Docker)
```bash
gcloud artifacts repositories create finance \
  --repository-format=docker --location=$REGION \
  --description="Finovia images"
```

## 5. Service accounts
Two SAs: one the **Cloud Run service runs as** (reads DB + secret), one the **Jenkins VM runs as** (builds + deploys).

### 5a. Cloud Run runtime SA
```bash
gcloud iam service-accounts create finance-run --display-name="Finovia Cloud Run runtime"

RUNTIME_SA=finance-run@$PROJECT_ID.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$RUNTIME_SA" --role="roles/cloudsql.client"
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
  roles/firebasehosting.admin \
  roles/cloudsql.client ; do
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

## 7. Provision the Jenkins VM
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
The pipeline only rolls new images onto an existing service, so create it first with its env vars, Cloud SQL, secret, and runtime SA. (Uses a public placeholder image initially — the first pipeline run replaces it.)
```bash
gcloud run deploy finance-api \
  --image gcr.io/cloudrun/hello \
  --project $PROJECT_ID --region $REGION --platform managed \
  --service-account finance-run@$PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances $PROJECT_ID:$REGION:finance-pg \
  --set-env-vars "SPRING_PROFILES_ACTIVE=gcp,CLOUD_SQL_CONNECTION_NAME=$PROJECT_ID:$REGION:finance-pg,DB_NAME=finance,DB_USER=finance,FIREBASE_PROJECT_ID=$PROJECT_ID,CORS_ALLOWED_ORIGINS=https://$PROJECT_ID.web.app" \
  --update-secrets "DB_PASSWORD=db-password:latest" \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 10 --cpu 1 --memory 512Mi --concurrency 80 --port 8080
```
Grab the URL: `gcloud run services describe finance-api --region $REGION --format='value(status.url)'`.

## 10. Run the pipeline
Click **Build Now**. Stages: checkout → `mvn clean package` (build + tests) → build Docker image (`./backend`) → push to Artifact Registry → `gcloud run services update` (rolls the new image) → build frontend → `firebase deploy --only hosting`.

After the first run, put the real Cloud Run URL into the `finovia-frontend-env` credential (`VITE_API_BASE_URL`) and update `CORS_ALLOWED_ORIGINS` on the service, then re-run so the SPA targets the right API.

## 11. Verify
- `https://<cloud-run-url>/actuator/health` → `{"status":"UP"}`.
- `curl https://<cloud-run-url>/api/transactions` with no token → **401** (auth working).
- Open `https://YOUR_PROJECT.web.app`, sign in, add a transaction, see the dashboard update.
- Flyway migrations (V1–V4) run automatically on container startup — check Cloud Run logs.

---

## Auto-trigger builds on push
- **GitHub:** add a webhook to `http://<VM_IP>:8080/github-webhook/` and enable "GitHub hook trigger" in the job. (Use the **Multibranch Pipeline** to build per-branch / PRs.)
- Or enable **Poll SCM** (`H/5 * * * *`) for a simple pull-based trigger.

## Scaling & cost (when traffic grows)
- Keep `max-instances × Hikari pool size` under Cloud SQL's connection limit.
- Add a Cloud CDN / Memorystore (Redis) cache for analytics responses; pre-compute monthly rollups.
- Vertical-scale Cloud SQL and add a read replica for reporting.
- Estimated baseline cost: ~$11–15/mo (hobby) to ~$45–55/mo (small prod) — Cloud SQL dominates. See the cost breakdown shared earlier.

## Security checklist
- Secrets only in Secret Manager (never in the image or Git).
- `CORS_ALLOWED_ORIGINS` restricted to your Hosting domain.
- Cloud Run runs as a least-privilege runtime SA (Cloud SQL Client + Secret Accessor only).
- Jenkins port 8080 firewalled to your IP; consider an HTTPS reverse proxy + auth for production.
- Rotate the DB password by adding a new `db-password` secret version and redeploying.
