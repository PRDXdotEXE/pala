# Private AI Lead Assistant

A private CRM for freelancers and small agencies. Paste a client conversation, run it through a **local** open-weight LLM, review the extracted lead data, save it, and generate follow-ups — client data never leaves your machine.

## Stack

- **Client**: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- **Server**: Node.js, Express, TypeScript, Zod
- **Database**: PostgreSQL, Drizzle ORM
- **AI**: Ollama (default model: `qwen2.5:1.5b`), behind an `AiProvider` abstraction

## Prerequisites

- Node.js 22+
- PostgreSQL 14+ (local or remote)
- [Ollama](https://ollama.com) with a pulled model

## Setup

```bash
# 1. Install dependencies (npm workspaces — one install at the root)
npm install

# 2. Create the database (once). Uses the postgres superuser by default;
#    for your own role: CREATE ROLE <you> LOGIN PASSWORD '<pw>'; then grant.
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE lead_assistant;"

# 3. Configure environment
cp .env.example .env
# edit .env — set DATABASE_URL password, and OLLAMA_MODEL if desired

# 4. Pull the model (once, ~1 GB)
ollama pull qwen2.5:1.5b

# 5. Start both apps
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001 (`GET /api/health` reports db/ai status)

### Alternative: Docker dependencies

If you prefer containerized Postgres/Ollama (and have Docker):

```bash
docker compose up -d
```

Then point `DATABASE_URL` at `postgres://lead:lead_dev_password@localhost:5432/lead_assistant`.

## Scripts (run from repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Client (5173) + server (3001) with watch |
| `npm run build` | Typecheck + build client, build server |
| `npm test` | Vitest on both workspaces |
| `npm run typecheck` | `tsc --noEmit` on both workspaces |
| `npm run db:generate -w server` | Generate a SQL migration from `db/schema.ts` |
| `npm run db:migrate -w server` | Apply migrations |
| `npm run db:push -w server` | Push Drizzle schema directly (dev shortcut) |

### Request flow

```
HTTP request → route → controller → service → database / external → response
```

Routes only declare paths, controllers stay thin, services hold business logic — see `AGENTS.md`.

## Environment variables

Set in `.env` at the repo root (server loads it; see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — (required) | Postgres connection string |
| `PORT` | `3001` | Server port |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Model tag for generation |
| `AI_PROVIDER` | `ollama` | Provider selected via factory |

## Architecture notes

- `server/src/ai/provider.ts` defines the `AiProvider` interface; `OllamaProvider` is one implementation. New models/providers plug in via the factory in `server/src/ai/index.ts`.
- The Vite dev server proxies `/api` to the Express server, so the client always calls relative URLs.
- `.env` is gitignored; `.env.example` contains placeholders only.

## Project layout

```
private-ai-lead-assistant/
├── client/          # Vite + React SPA
├── server/          # Express API, Drizzle, AI providers
├── docker-compose.yml
├── README.md
├── AGENTS.md
└── .env.example
```
