# Private AI Lead Assistant

## 1. What is this?

A private CRM for freelancers and small agencies. Paste a client conversation, run it through a **local** open-weight LLM, review and correct the extracted lead data, save it, then generate follow-up messages and proposal drafts — all from one screen.

Client data never leaves your machine: there is no external AI API, no telemetry, and no cloud model in the request path.

## 2. Why does it exist?

Freelancers lose deals in the gap between a chat thread and a CRM:

- Copying details out of WhatsApp/Email by hand is slow and error-prone.
- Cloud CRMs with "AI enrichment" ship your client conversations to a third party.
- A conversation says "around 40k before Dashain" — a CRM field wants a number and a date.

This project closes that gap with a model that runs on your own CPU/GPU, and a review step that keeps a human in charge of every value that gets saved.

## 3. Architecture

```
Browser
   ↓
Express
   ↓
AI Service
   ↓
Ollama
   ↓
Qwen
```

Request flow in the server:

```
HTTP request → route → controller → service → database / external → response
```

- **Routes** declare paths only (`server/src/routes/`).
- **Controllers** parse the request, call one service, send the response (`server/src/controllers/`).
- **Services** hold business logic and database/AI access (`server/src/services/`).
- The AI subsystem (`server/src/services/ai/`) is the only code that talks to Ollama, behind the `AiProvider` interface.

## 4. Tech stack

| Layer | Choice |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, TanStack Query 5 |
| Server | Node.js 22, Express 5, TypeScript (CJS), Zod |
| Database | PostgreSQL 16, Drizzle ORM |
| AI | Ollama + `qwen2.5:1.5b` behind an `AiProvider` abstraction |
| Auth | JWT in an httpOnly cookie, bcrypt password hashes |
| Tests | Vitest + Supertest (server), Vitest + Testing Library (client) |

## 5. Database design

`users → leads → conversations → messages`, plus `proposals` hanging off a lead. All primary keys are UUIDs; child rows cascade on delete.

```
users
 ├── leads (user_id, cascade)
 │     ├── conversations (lead_id, cascade)
 │     │     └── messages (conversation_id, cascade)
 │     └── proposals (lead_id, cascade)
```

| Table | Purpose |
| --- | --- |
| `users` | Account: name, unique email, bcrypt `password_hash` |
| `leads` | The CRM record: client, company, project, budget range + currency, status, priority, deadline, next follow-up |
| `conversations` | One pasted conversation thread per lead |
| `messages` | Individual messages, each with a role (`client` / `user` / `assistant`) |
| `proposals` | Saved proposal drafts: title, overview, scope, deliverables, timeline, pricing, next steps |

Enums: `lead_status` (`new … lost`), `priority` (`low/medium/high`), `message_role` (`client/assistant/user`).

Schema changes: edit `server/src/db/schema.ts` → `npm run db:generate -w server` → `npm run db:migrate -w server` (never hand-edit SQL migrations).

## 6. Local AI architecture

All inference runs in Ollama on your machine. The app never calls a hosted model.

- **Provider abstraction**: `AiProvider` (`server/src/services/ai/provider.ts`) with `OllamaProvider` as the only implementation. Adding a provider means adding a class and a factory entry — no route or controller changes.
- **Structured extraction**: `POST /api/ai/analyze` sends a JSON Schema (derived from the Zod output schema) as Ollama's `format`, so constrained decoding emits typed JSON.
- **Never trust the model**: output goes through `JSON.parse → Zod safeParse`. A failure returns `502` naming the failing fields; unknown keys are stripped.
- **No guessing**: anything the conversation does not state comes back `null`.
- **Options**: temperature `0`, fixed seed, explicit `num_ctx` (Ollama's 2048 default silently truncates long conversations), capped `num_predict`.
- **Prompt injection**: pasted conversations are scanned for instruction-shaped text (`services/ai/injection.ts`); the review UI surfaces a warning, and a human approves every extracted lead.

```
controller → ai.service → AiProvider → OllamaProvider → Ollama → qwen2.5:1.5b
```

## 7. Installation

```bash
# 1. Install dependencies (npm workspaces — one install at the root)
npm install

# 2. Create the database (once)
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE lead_assistant;"

# 3. Configure environment
cp .env.example .env
# edit .env — set DATABASE_URL password and JWT_SECRET

# 4. Run migrations
npm run db:migrate -w server
```

Prerequisites: Node.js 22+, PostgreSQL 14+, [Ollama](https://ollama.com).

## 8. Ollama setup

The model runtime is host/GPU specific, so it is set up separately from the app.

```bash
# Install Ollama, then pull the default model (~1 GB)
ollama pull qwen2.5:1.5b

# Confirm it is up
curl http://localhost:11434/api/tags
```

- The server reaches it at `OLLAMA_HOST` (default `http://localhost:11434`).
- Keep only one model loaded at a time on small machines — swapping kills inference speed.
- First request loads the model (~40 s cold); afterwards requests are ~1–3 s warm.
- GPU/Windows/WSL notes: see [ollama.com](https://ollama.com); nothing in this app depends on the GPU.

## 9. Environment variables

Set in `.env` at the repo root (loaded by `server/src/config/env.ts`, which fails fast on bad values):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — (required) | Postgres connection string |
| `PORT` | `3001` | Server port |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `qwen2.5:1.5b` | Model tag for generation |
| `AI_PROVIDER` | `ollama` | Provider selected via factory |
| `JWT_SECRET` | — (required) | Signs session cookies (min 16 chars) |
| `CORS_ORIGIN` | — (unset) | Exact origin allowed cross-origin; omit for the Vite proxy setup |
| `VITE_API_PROXY` | `http://localhost:3001` | Client dev proxy target (set to `http://server:3001` in Docker) |

`.env` is gitignored; `.env.example` documents every variable.

## 10. Running locally

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001 (`GET /api/health` reports db/ai status)

### Docker development environment

```bash
docker compose up --build
```

Starts **PostgreSQL + Express + React** with hot reload (client 5173, server 3001, db 5432). Migrations run on server start.

Ollama is deliberately not part of the default stack — point the server at your host install (`OLLAMA_HOST`, default `http://host.docker.internal:11434`), or opt in with `docker compose --profile ollama up -d`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Client (5173) + server (3001) with watch |
| `npm run build` | Typecheck + build client, build server |
| `npm test` | Vitest on both workspaces |
| `npm run typecheck` | `tsc --noEmit` on both workspaces |
| `npm run db:generate -w server` | Generate a SQL migration from `db/schema.ts` |
| `npm run db:migrate -w server` | Apply migrations |
| `npm run db:push -w server` | Push Drizzle schema directly (dev shortcut) |
| `npm run ai:eval -w server` | Run the AI evaluation cases against the real model |

## 11. Testing

```bash
npm test           # both workspaces
npm run typecheck  # tsc --noEmit
```

- **Unit tests** — Zod validation, lead business logic, AI parsing (`parseLeadExtraction`, `parseProposal`, `stripSignature`), prompt-injection detection, rate limiter, error handler, client utilities (theme, shortcuts, follow-up buckets, stats).
- **API tests** — Supertest through the real Express app with a scripted `AiProvider`: register/login/logout, lead CRUD, authorization (another user's lead is a `404`), conversations, AI analysis, follow-ups, proposals, rate limits, error sanitizing.
- **AI evaluation** — `npm run ai:eval -w server` runs 29 conversation cases against the live model and prints an Expected / Actual / Pass–Fail table (normal, missing budget/deadline, ambiguous budget, multiple requirements, very short, long, Nepali + English, invalid output). It needs a running Ollama, so it is not part of `npm test`.

## 12. Security

| Control | How |
| --- | --- |
| Input validation | Zod schemas on every body and query (`middleware/validate.ts`) |
| Authentication | JWT in an httpOnly `plas_session` cookie, 7-day expiry, `sameSite=lax`, `secure` in production |
| Authorization | Every lead/conversation/proposal query is scoped by `user_id`; another user's row is `404` |
| Password hashing | bcrypt, 10 rounds |
| Rate limiting | Per-IP fixed windows: global, auth (brute force), AI (inference) |
| CORS | Explicit allow-list, only when `CORS_ORIGIN` is set |
| Request size | JSON body capped at 128 KB (oversized → `413`) |
| SQL injection | Drizzle parameterized queries — no string-built SQL |
| AI output validation | JSON → Zod `safeParse`, failures become `502` with field paths |
| Prompt injection | Conversation scanning + untrusted-content system prompts + mandatory human review |
| Error responses | Single error handler; stack traces and internals never reach the client |

## 13. Limitations

- **Model size**: `qwen2.5:1.5b` runs on CPU but occasionally defaults `priority: medium` when the conversation says nothing. The review/correction step is the mitigation, not a bigger prompt.
- **Deadline semantics**: deadlines are kept verbatim (`"before Dashain"`) unless they are real dates; the UI asks you to pick a date when editing.
- **Single process**: the rate limiter is in-memory and per-process — fine for one Node process, not for horizontal scaling.
- **No multi-user teams**: one account sees only its own data; there is no sharing or roles.
- **Cold start**: the first AI call loads the model (~40 s); subsequent calls are fast.
- **Copy/paste UX**: conversations are pasted as text — no email or chat integrations yet.

## 14. Future improvements

- SMTP/WhatsApp send for follow-ups (with the human approval step kept).
- Fine-tuned or larger local models for better extraction on noisy conversations.
- Shared rate-limit store (Redis) and multi-process deployment.
- Teams/roles, lead import (CSV), and activity history per lead.
- Deadline normalization (festival names → dates) behind a review toggle.
- Vector search over past conversations for "similar lead" suggestions.

---

## Appendix: API reference

All endpoints live under `/api`. Bodies are validated with Zod (`400` on invalid input).

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `{name, email, password≥8}` → `201` + session cookie |
| POST | `/auth/login` | — | `{email, password}` → session cookie |
| POST | `/auth/logout` | — | clears session cookie |
| GET | `/auth/me` | ✔ | current user, `401` without session |
| GET | `/leads` | ✔ | current user's leads; filters: `q`, `status`, `priority`, `followUp=overdue\|today\|upcoming` |
| POST | `/leads` | ✔ | create lead (`clientName` required, rest optional) |
| GET | `/leads/:id` | ✔ | `404` if missing **or owned by another user** |
| PATCH | `/leads/:id` | ✔ | partial update, same ownership rule |
| DELETE | `/leads/:id` | ✔ | `204`, same ownership rule |
| GET | `/leads/:id/conversations` | ✔ | conversations + messages for the lead |
| POST | `/leads/:id/conversations` | ✔ | create empty conversation → `201` |
| POST | `/leads/:id/messages` | ✔ | `{role: client\|user\|assistant, content}` → `201` |
| GET | `/leads/:id/proposals` | ✔ | saved proposals for the lead |
| POST | `/leads/:id/proposals` | ✔ | save a reviewed proposal |
| DELETE | `/leads/:id/proposals/:proposalId` | ✔ | delete a saved proposal |
| GET | `/conversations/:id/messages` | ✔ | messages of one conversation |
| POST | `/conversations/:id/messages` | ✔ | `{role, content}` → `201` |
| POST | `/ai/analyze` | ✔ | `{conversation}` → `{lead, warning?}` |
| POST | `/ai/follow-up` | ✔ | `{leadId}` → `{message}` |
| POST | `/ai/proposal` | ✔ | `{leadId, requirements?}` → `{proposal}` |
| GET | `/health` | — | db/ai status |

Auth is a JWT in an httpOnly cookie (`plas_session`, 7 days). Passwords hashed with bcrypt (10 rounds). Every lead query is scoped by `user_id` — users can never see each other's leads.

## Project layout

```
private-ai-lead-assistant/
├── client/          # Vite + React SPA
├── server/          # Express API, Drizzle, AI providers
├── Dockerfile       # dev image (server + client targets)
├── docker-compose.yml
├── README.md
├── AGENTS.md
└── .env.example
```
