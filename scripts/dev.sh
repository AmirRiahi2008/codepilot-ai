#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Add GitHub/LLM credentials when needed."
fi

docker compose up -d
npm run db:generate
npm run db:push

printf '\nCodePilot infrastructure is ready. Open 3 terminals and run:\n'
printf '  npm run dev:api\n  npm run dev:worker\n  npm run dev:web\n\n'
