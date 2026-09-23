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
