# CodePilot AI — MVP

CodePilot AI is a SaaS-style repository intelligence platform. A user registers, connects GitHub, chooses a repository, starts an audit, and receives a static-analysis report with optional LLM enrichment.

## Architecture

```text
Next.js Web (3000)
      |
      | HTTP + httpOnly cookie
      v
NestJS API (4000) ---- PostgreSQL
      |                Redis
      | BullMQ
      v
Analysis Worker
      |
      +---- GitHub API / ZIP download
      +---- Static analyzers (no repo execution)
      +---- Optional LLM API
```

## Safety/design choices in this MVP

- GitHub OAuth access tokens are encrypted at rest with AES-256-GCM.
- The worker never runs repository package scripts, builds, tests, or arbitrary binaries.
- Repository archives are downloaded through the GitHub API and scanned as text/files only.
- The LLM step is optional. Static analysis still produces a report without an LLM key.
- The first version is intentionally single-user/team-light; billing, teams, webhooks, and IDE integrations come later.

## Prerequisites

- Node.js 22.18+
- Docker Desktop
- A GitHub OAuth App for GitHub connection
- An optional LLM API key

Prisma 7 uses the `prisma-client` generator and an explicit generated output path. This project follows that layout.

## First run

1. Copy `.env.example` to `.env`.
2. Start infrastructure:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma Client:

```bash
npm run db:generate
```

5. Create/update the local database schema:

```bash
npm run db:push
```

6. Start the API:

```bash
npm run dev:api
```

7. Start the worker in a second terminal:

```bash
npm run dev:worker
```

8. Start the web app in a third terminal:

```bash
npm run dev:web
```

Open http://localhost:3000.

## Web/API deployment and troubleshooting

The browser calls `/api/v1` on the web domain. The Next.js gateway forwards
these requests to NestJS and stores the httpOnly session on the web domain.
This avoids cross-site cookie restrictions and browser access to the Render
hostname. Internal worker endpoints are not exposed by this gateway.

On the Vercel **web** project, set `API_ORIGIN` to the public NestJS origin
(for example, `https://your-api.onrender.com`). An existing
`NEXT_PUBLIC_API_URL` ending in `/api/v1` is also supported as a fallback.
Never point either variable at the web domain. Set Vercel's Root Directory to
`apps/web` and use its `npm run build` command, then redeploy after changing
environment variables. Local web development defaults to `http://localhost:4000`;
put any override in `apps/web/.env.local`.

For an existing Render **API** service, run these commands from the repository root:

```bash
# Build command
npm ci && npm run db:generate && npm run build:api

# Start command
npm --workspace apps/api start
```

The compiled entry point is `apps/api/dist/src/main.js`, not `dist/main.js`.
The API binds to `0.0.0.0` and honors Render's `PORT` before `API_PORT`.
Use `/api/v1/health` for its health check. Configure `DATABASE_URL`,
`JWT_SECRET`, `WORKER_SECRET`, `WEB_URL` (the web origin), and `API_URL`
(the API origin) on the API service. Existing database schemas are not changed
by the build command; schema changes require a separate reviewed database step.

Audit delivery currently uses **QStash**. Set `QSTASH_TOKEN`,
`QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` on the API,
with a publicly reachable `API_URL`. The optional BullMQ worker does not receive
jobs from the current QStash producer. Authentication and browsing can start
without QStash; starting an audit returns a clear service-unavailable error
until delivery is configured. The GitHub OAuth callback stays on the API:
`https://your-api.onrender.com/api/v1/github/callback`.

Requests time out instead of loading indefinitely. A `401` means the session
needs a login; temporary API failures stay on the dashboard with a retry action.
Check both the web gateway's `/api/v1/health` and the API health endpoint when
diagnosing a deployment. A successful static home page does not verify the API.

Run the regression checks before deploying:

```bash
npm run typecheck
npm test
npm run build:web
```

## GitHub OAuth local setup

Create a GitHub OAuth App and set the callback URL to:

```text
http://localhost:4000/api/v1/github/callback
```

Put the client ID and secret into `.env`.

## Demo without GitHub

The dashboard and API are designed so you can seed a local user and use the API independently. The full GitHub connection flow requires a real OAuth App because repository access is provided by GitHub.

## Main API routes

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/github/connect`
- `GET /api/v1/github/callback`
- `GET /api/v1/github/repositories`
- `POST /api/v1/repositories/:id/sync`
- `POST /api/v1/repositories/:id/audits`
- `GET /api/v1/audits/:id`
- `GET /api/v1/audits/:id/issues`
- `GET /api/v1/issues/:id`
- `POST /api/v1/issues/:id/explain`
- `POST /api/v1/issues/:id/fix`

## Production hardening still required

- Move GitHub tokens into a managed secret store/KMS instead of application DB encryption.
- Run repository analysis in sandboxed containers with CPU, memory, disk, and time limits.
- Add stronger per-language parsers and SAST engines.
- Add CSRF protection, rate limiting, refresh-token rotation, audit logging, and email verification.
- Use GitHub Apps + installation tokens for organizations and finer permissions.
- Add database migrations and CI checks before production deployment.

## Troubleshooting: Node and dependency versions

This project uses NestJS 12 and Prisma ORM 7.

For the most predictable local setup, use Node.js 24 LTS. The project includes `.nvmrc` with `24`.

Check:

```bash
node -v
```

Then, from the project root:

```bash
rm -rf node_modules package-lock.json
npm install
```

Do not use `npm install --force` or `--legacy-peer-deps` for this project.

Prisma 7 PostgreSQL access uses the `@prisma/adapter-pg` driver adapter. After dependencies are installed:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```
