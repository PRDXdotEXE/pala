# AGENTS.md — Private AI Lead Assistant

Guidance for AI agents (and humans) working in this repo.

## What this is

Private CRM for freelancers: client conversations → local LLM → structured leads → human review → follow-up generation. All AI inference runs locally via Ollama; no client data leaves the machine.

## Commands (run from repo root)

| Command | Purpose |
| --- | --- |
| `npm install` | Install all workspaces |
| `npm run dev` | Dev servers: client :5173, server :3001 |
| `npm run typecheck` | TypeScript across both workspaces |
| `npm test` | Vitest across both workspaces |
| `npm run build` | Production build |
| `npm run db:generate -w server` | Generate SQL migration from schema changes |
| `npm run db:migrate -w server` | Apply migrations |
| `npm run db:push -w server` | Push schema directly (dev shortcut) |
| `npx tsx src/db/verify-relationships.ts` (in server/) | Drop schema, re-migrate, verify FK chain |

Server-only equivalents: `npm run dev -w server`, etc.

## Layout

- `client/` — React 19 + Vite + Tailwind v4 + React Router + TanStack Query. Proxies `/api` → `:3001`.
- `server/` — Express 5 + TypeScript (CJS) + Zod env config + Drizzle ORM + AI abstraction.
  - Request flow: **route → controller → service → database/external → response**. Never put business logic in routes.
  - `src/config/env.ts` — Zod-validated env, loads repo-root `.env`; fails fast on bad config.
  - `src/db/` — pg Pool + Drizzle client; `schema.ts` (users, leads, conversations, messages + enums + relations); `migrate.ts` runner.
  - `src/middleware/` — error handler (JSON errors, logs 5xx).
  - `src/routes/` — thin routers only; wire path → controller.
  - `src/controllers/` — parse request, call service, send response, forward errors via `next`.
  - `src/services/` — business logic + db/external access.
  - `src/schemas/` — Zod request/response schemas (payload validation).
  - `src/utils/` — shared helpers (`HttpError`).
  - `src/ai/` — `AiProvider` interface, `OllamaProvider`, factory. Add providers here, not in routes.
  - `src/server.ts` — entrypoint; `src/app.ts` assembles the app (factory-style for Supertest).
  - `tests/` — Vitest + Supertest; `setup.ts` seeds env defaults.

## Conventions

- Env vars are read only via `src/config/env.ts` (never `process.env` elsewhere).
- AI access only through the `AiProvider` interface — no direct Ollama calls in routes/services.
- Express apps are built by `createApp(ai)` so tests can inject mocks.
- Business logic lives in `services/`; controllers stay thin; routes only declare paths.
- **Every lead query MUST be scoped by `user_id`** (the non-negotiable authz rule): use `and(eq(leads.id, …), eq(leads.userId, req.user.id))`. Missing-lead and other-user's-lead both return `404`.
- Input validation with Zod via `middleware/validate.ts`; schemas live in `src/schemas/`.
- Auth: JWT (`plas_session` httpOnly cookie) verified in `middleware/auth.ts` (`requireAuth`); bcrypt for password hashes; `services/auth.service.ts`.
- Schema changes: edit `db/schema.ts` → `db:generate` → `db:migrate` (never hand-edit SQL migrations).
- No secrets in git: `.env` is ignored; use `.env.example` for documentation.
- Server runtime target: Node 22. tsconfig may get rewritten to `Node16` by tooling — code must typecheck under both `CommonJS` and `Node16` resolution (avoid dynamic `import()` of relative paths).

## Database

`users → leads → conversations → messages`, all UUID PKs, cascade deletes.
Enums: `lead_status` (new…lost), `priority` (low/medium/high), `message_role` (client/assistant/user).

## Phase status

- [x] Phase 0 — Product definition (PRD)
- [x] Phase 1 — Project setup (client, server, db, Ollama, tests, docs)
- [x] Phase 2 — Backend architecture (route → controller → service → db flow)
- [x] Phase 3 — Database (4 tables, enums, FKs, migrations from scratch)
- [x] Phase 4 — Authentication (register/login/logout/me, JWT cookie, bcrypt, user scoping)
- [x] Phase 5 — Lead CRUD (list/create/get/patch/delete, ownership enforced, 14-test suite)
- [x] Phase 6 — CRM frontend (dashboard, leads list with filters, lead detail/edit/delete, conversation panel)
- [ ] Phase 7 — Conversation intake + AI extraction
- [ ] Phase 8 — Review/correction UI
- [ ] Phase 9 — Follow-up generation / proposals

## Hacktoberfest note

Targeting DEV Challenge "Hacktoberfest Open-Source AI Challenge: Week 2" (Side Hustle), submissions due Oct 18 11:59 PM PDT, tag `#hf26challenge`. Final deliverable includes a DEV post.
