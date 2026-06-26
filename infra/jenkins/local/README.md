# Local Jenkins + Cloudflare Tunnel — first-run checklist

Run the full CI/CD pipeline on your own machine for **$0**, with **instant GitHub webhook
triggers** via a Cloudflare Tunnel. Works on Windows/macOS/Linux with Docker Desktop.

## 1. Start Jenkins
```bash
docker compose -f infra/jenkins/local/docker-compose.yml up -d --build
docker exec finovia-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
Open `http://localhost:8080`, unlock, and **Install suggested plugins**. Ensure these plugins are
present (suggested set usually includes them): **Pipeline**, **Git**, **GitHub**,
**Credentials Binding**.

## 2. Configure Jenkins (Manage Jenkins → …)
- **Tools:** add Maven named **`Maven3`** (auto-install latest) and JDK named **`JDK21`**
  (install dir `/opt/java/openjdk` — it's in the image — or auto-install).
- **System → Global properties → Environment variables:** add **`GCP_PROJECT_ID`** = your project id.
- **Credentials → (global) → Add Credentials** (Kind: *Secret file*):
  - **`gcp-secret-key`** — the `jenkins-deployer-key.json` (from DEPLOYMENT.md §5b).
  - **`finovia-frontend-env`** — your production `frontend/.env.production` values.
- **Pipeline job:** New Item → **Pipeline** → *Pipeline script from SCM* → your Git repo →
  script path **`Jenkinsfile`**.

## 3. Expose Jenkins with Cloudflare Tunnel
Install once (`winget install --id Cloudflare.cloudflared` on Windows, `brew install cloudflared`
on macOS).

**Quick tunnel — no account, random URL (changes each restart):**
```bash
cloudflared tunnel --url http://localhost:8080
```
Copy the printed `https://<random-words>.trycloudflare.com` URL.

**Named tunnel — stable URL that survives restarts** (needs a free Cloudflare account + a domain
on Cloudflare). Run once to set up:
```bash
cloudflared login
cloudflared tunnel create finovia-jenkins
cloudflared tunnel route dns finovia-jenkins jenkins.yourdomain.com
```
Then each session:
```bash
cloudflared tunnel run --url http://localhost:8080 finovia-jenkins
```

Set Jenkins' own URL so webhook links resolve:
**Manage Jenkins → System → Jenkins URL** = your tunnel URL, e.g. `https://jenkins.yourdomain.com/`.

## 4. Add the GitHub webhook
GitHub repo → **Settings → Webhooks → Add webhook**:
- **Payload URL:** `https://<your-tunnel-url>/github-webhook/`  ← trailing slash matters
- **Content type:** `application/json`
- **Secret:** set one (recommended); add the same value under
  *Manage Jenkins → System → GitHub → Advanced → Shared secret*.
- **Events:** *Just the push event*.

In the **job config**, enable **"GitHub hook trigger for GITScm polling"**.

## 5. Deploy flow
1. `docker compose ... up -d` (start Jenkins) and `cloudflared tunnel run … finovia-jenkins`
   (or `cloudflared tunnel --url http://localhost:8080` for a quick tunnel).
2. `git push` → GitHub fires the webhook → Jenkins runs:
   build + test → image → Artifact Registry → `gcloud run services update` → frontend → Firebase Hosting.
3. When done: `Ctrl+C` the tunnel and `docker compose -f infra/jenkins/local/docker-compose.yml down`.

## Security notes
- Jenkins is now publicly reachable while the tunnel runs — keep a **strong admin password** and the
  **webhook secret** set (validates that requests really come from GitHub).
- The `/github-webhook/` endpoint is intentionally unauthenticated; the shared secret is what
  protects it.
- Only the tunnel is public; your `gcp-secret-key` and DB password stay local / in Secret Manager.
