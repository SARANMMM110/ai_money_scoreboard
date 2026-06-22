# Deploy to Render

One **Web Service** serves the API and the React app. A **PostgreSQL** database holds scan data.

## Before you start

You need accounts and keys for:

| Item | Why |
|------|-----|
| [Render](https://render.com) | Hosting |
| [Supabase](https://supabase.com) | Auth (required in production) |
| Git repo (GitHub/GitLab) | Render deploys from git |

Generate a vault secret (save it — you’ll paste it into Render):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 1. Push code to Git

Commit your changes and push to GitHub (or connect Render to your repo).

```bash
git add .
git commit -m "Prepare Render deployment"
git push origin main
```

## 2. Supabase setup

1. Create a Supabase project.
2. **Authentication → URL configuration** — add your Render URL when you have it, e.g.  
   `https://ai-money-scorecard.onrender.com`
3. Copy from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `anon` public key → `SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_KEY`

## 3. Render — PostgreSQL

1. Dashboard → **New +** → **PostgreSQL**
2. Name: `ai-money-scorecard-db`
3. Create → copy the **Internal Database URL** (use this for `DATABASE_URL` on the web service in the same region)

## 4. Render — Web Service

**Option A — Blueprint (recommended)**

1. **New +** → **Blueprint**
2. Connect repo; Render reads `render.yaml`
3. Set secrets in the dashboard when prompted:
   - `KEY_VAULT_SECRET` (64-char hex from step above)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
4. After first deploy, set `FRONTEND_URL` to your service URL, e.g.  
   `https://ai-money-scorecard.onrender.com`  
   (must match exactly for CORS)

**Option B — Manual**

| Setting | Value |
|---------|--------|
| **Environment** | Node |
| **Root directory** | *(leave empty — repo root)* |
| **Build command** | `npm install && npx playwright install --with-deps chromium && npm run build && npm run db:migrate:deploy` |
| **Start command** | `npm start` |
| **Plan** | Starter or higher (Playwright scans need RAM; free tier may OOM) |

**Environment variables**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal URL from Render Postgres |
| `KEY_VAULT_SECRET` | Your 64-char hex secret |
| `SUPABASE_URL` | From Supabase |
| `SUPABASE_ANON_KEY` | From Supabase |
| `SUPABASE_SERVICE_KEY` | From Supabase |
| `FRONTEND_URL` | `https://YOUR-SERVICE.onrender.com` |
| `PORT` | `10000` (Render sets this automatically; optional) |
| `STORAGE_PATH` | `/tmp/storage` (ephemeral on Render) |

Optional:

| Key | Value |
|-----|--------|
| `ANTHROPIC_API_KEY` | LLM copy enrichment only |
| `SCAN_RATE_LIMIT_MAX` | `10` |

## 5. Verify

1. Open `https://YOUR-SERVICE.onrender.com/api/health` → `{"status":"ok",...}`
2. Open the root URL → landing page loads
3. Register / sign in (Supabase)
4. Run a scan on a public URL

## Notes

- **PDF reports** on Render use ephemeral disk unless you add a persistent disk or object storage (S3/R2).
- **First request** after idle on free/starter may be slow (cold start).
- **Playwright**: build installs Chromium; if scans fail with browser errors, upgrade plan or check build logs for `playwright install`.
- **Migrations** run in the build step (`db:migrate:deploy`). Re-deploy after pulling new migrations.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on Prisma | Check `DATABASE_URL` is set on the service (linked DB) |
| `KEY_VAULT_SECRET is required` | Add 32-byte hex secret in env |
| `Auth not configured` | Set all three Supabase env vars |
| CORS / login fails | `FRONTEND_URL` must match the browser URL exactly |
| Scan timeout | Upgrade instance; scans crawl up to 20 pages with Playwright fallback |
