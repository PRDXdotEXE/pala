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
  - `src/services/ai/` — AI subsystem: `provider.ts` (`AiProvider` interface), `ollama.provider.ts`, `ai.service.ts` (extraction pipeline), `prompts/`, `schemas/`, `index.ts` factory. Add providers here, not in routes.
  - `src/schemas/` — Zod request/response schemas (payload validation).
  - `src/utils/` — shared helpers (`HttpError`).
  - `src/server.ts` — entrypoint; `src/app.ts` assembles the app (factory-style for Supertest).
  - `tests/` — Vitest + Supertest; `setup.ts` seeds env defaults.

## Conventions

- Env vars are read only via `src/config/env.ts` (never `process.env` elsewhere).
- AI access only through the `AiProvider` interface — no direct Ollama calls in routes/controllers.
- `POST /api/ai/analyze` (auth + Zod-validated `{conversation}`) → `services/ai/ai.service.ts` → provider → Ollama. Model output is never trusted: JSON → Zod `safeParse` → `502` with field-level details on failure; anything the conversation does not state must come back `null`.
- Express apps are built by `createApp(ai)` so tests can inject mocks.
- Business logic lives in `services/`; controllers stay thin; routes only declare paths.
- **Every lead query MUST be scoped by `user_id`** (the non-negotiable authz rule): use `and(eq(leads.id, …), eq(leads.userId, req.user.id))`. Missing-lead and other-user's-lead both return `404`.
- Input validation with Zod via `middleware/validate.ts`; schemas live in `src/schemas/`.
- Client: shared Tailwind class sets live in `client/src/lib/ui.ts` (each carries its `dark:` pairings — extend there instead of hand-writing dark variants); toasts via `components/Toast.tsx` (`useToast()` is safe without a provider), confirmations via `components/ConfirmDialog.tsx`, loading via `components/Skeleton.tsx`; theme in `lib/theme.ts`; single-key shortcuts in `components/Shortcuts.tsx` (ignored while typing).
- Auth: JWT (`plas_session` httpOnly cookie) verified in `middleware/auth.ts` (`requireAuth`); bcrypt for password hashes; `services/auth.service.ts`.
- Schema changes: edit `db/schema.ts` → `db:generate` → `db:migrate` (never hand-edit SQL migrations).
- No secrets in git: `.env` is ignored; use `.env.example` for documentation.
- Server runtime target: Node 22. tsconfig may get rewritten to `Node16` by tooling — code must typecheck under both `CommonJS` and `Node16` resolution (avoid dynamic `import()` of relative paths).

## Database

`users → leads → conversations → messages`, plus `proposals` off a lead: 5 tables, all UUID PKs, cascade deletes.
Enums: `lead_status` (new…lost), `priority` (low/medium/high), `message_role` (client/assistant/user).

## Local AI (Ollama) — Phase 8 findings

Tested independently of the app (raw HTTP to `localhost:11434`); the app still only touches Ollama via `AiProvider`.

- **Model**: `qwen2.5:1.5b` — GGUF, Q4_K_M, 1.5B params, ~986 MB, `context_length: 32768`. (`llama3.2:latest` also installed; never load both — this 3.6 GB box swaps and inference crawls.)
- **Inference**: cold request ≈ 39 s model load + ~89 s total; warm requests 1–2 s at 44–70 tok/s (CPU). Always cap output with `options.num_predict`.
- **Temperature**: `0` + fixed `seed` → byte-identical output across runs (verified); `1.5` → varied. Use `0` for lead extraction, never >1.
- **Context**: input size shows as `prompt_eval_count` (8-word prompt ≈ 33 tok incl. chat template; ~340 words ≈ 660 tok). Ollama's default `num_ctx` (2048) **silently truncates** longer prompts — verified: 300-word prompt with `num_ctx:128` evaluated only 66 tok and the model counted wrong. Set `num_ctx` explicitly for pasted conversations (≤ 32768).
- **Tokens**: `prompt_eval_count` = input tokens, `eval_count` = output tokens, speed = `eval_count / eval_duration`.
- **Structured output**: `format: "json"` guarantees parseable JSON — verified extraction of the sample conversation → `{"location":"Pokhara","project":"modern website","budget":40000,"deadline":"Dashain"}`. JSON-schema `format` also works for typed fields (verified). Prefer schema format for Phase 9 extraction, plus temperature 0.
- **Request shape**: `POST /api/generate` `{model, prompt, stream:false, options:{temperature, num_ctx, num_predict, seed}, format}` → `{response, prompt_eval_count, prompt_eval_duration, eval_count, eval_duration, load_duration, total_duration}`.

## Lead extraction (Phases 9–11) — `POST /api/ai/analyze`

Flow: **controller → `services/ai/ai.service.ts` → `AiProvider` → `OllamaProvider` → Ollama → Qwen**. Nothing outside `services/ai/` touches Ollama; another provider only means a new class next to `OllamaProvider`.

- **Input**: `{ "conversation": "…" }` (auth required, Zod-validated in `src/schemas/ai.schema.ts`, 1–20 000 chars) → `{ lead: … }`.
- **Output schema**: `services/ai/schemas/lead-extraction.ts` — `clientName, company, project, description, budgetMin, budgetMax, currency, deadline, status, priority, nextAction`, every field nullable, enums shared with the DB. `z.toJSONSchema(…, { io: 'input' })` is sent as Ollama's `format`, so constrained decoding emits typed JSON (verified against `qwen2.5:1.5b`).
- **Never trust the model**: `parseLeadExtraction` does JSON → Zod `safeParse`; bad JSON or failed validation throws `HttpError(502)` naming the failing field paths, unknown keys are stripped, provider failures map to `502` (not `500`).
- **No guessing**: absent info must be `null`. Verified: `"I need a website."` → `budgetMin/budgetMax/currency/deadline/status/priority/nextAction` all `null`; `"…40000 to 60000 NPR before Dashain…"` → `40000/60000/NPR/Dashain` (deadline kept verbatim, never converted to a date).
- **Options**: temperature `0`, seed `42`, `num_ctx: 8192`, `num_predict: 512`. Warm ≈ 1.5–3 s, cold ≈ 45–55 s. Known weakness: the 1.5 B model sometimes still defaults `priority: 'medium'` — the human review/correction UI is the fix, not a bigger prompt.
- Tests: `server/tests/ai-analyze.test.ts` uses a scripted mock provider (no live Ollama in CI).

## Phase status

- [x] Phase 0 — Product definition (PRD)
- [x] Phase 1 — Project setup (client, server, db, Ollama, tests, docs)
- [x] Phase 2 — Backend architecture (route → controller → service → db flow)
- [x] Phase 3 — Database (tables, enums, FKs, migrations from scratch; `proposals` added later)
- [x] Phase 4 — Authentication (register/login/logout/me, JWT cookie, bcrypt, user scoping)
- [x] Phase 5 — Lead CRUD (list/create/get/patch/delete, ownership enforced, 14-test suite)
- [x] Phase 6 — CRM frontend (dashboard, leads list with filters, lead detail/edit/delete, conversation panel)
- [x] Phase 7 — Conversation system (create/retrieve conversations + messages, no AI; Lead → Conversation → Messages)
- [x] Phase 8 — Local AI setup (Ollama + Qwen, independent testing — no app integration; findings above)
- [x] Phases 9–11 (AI) — AI service architecture (`services/ai/` provider abstraction), lead extraction (`POST /api/ai/analyze`), Zod-validated structured output
- [x] Phase 9 — Review/correction UI (AI extraction pipeline: Analyze page, edit before save)
- [x] Phase 10 — Follow-up generation / proposals (`POST /api/ai/follow-up`, `POST /api/ai/proposal`, saved proposals)
- [x] Phase 17 — Search and filtering (`q` over client/company/project + status/priority/follow-up filters, UI + `leads-filters.test.ts`; no ES/vector search — plain Postgres `ilike`)
- [x] Phase 18 — Error handling (db 503, auth 401, invalid input 400, Ollama down 503, model timeout 504, bad AI output 502, empty conversation 400, unauthorized 404 — friendly text, no stack traces)
- [x] Phase 19 — Testing (unit + API suites, 109 tests total; 29-case AI eval harness `npm run ai:eval -w server` printing Expected/Actual/Pass-Fail)
- [x] Phase 20 — Security (validation, authz by user_id, bcrypt, rate limits, allow-list CORS, secure cookie flags, env via Zod, parameterized SQL, 128 KB body cap, AI output validation, prompt-injection detection)
- [x] Phase 21 — Docker (root `Dockerfile` with `server`/`client` targets + `docker-compose.yml` dev stack: React, Express, Postgres; Ollama documented separately / `--profile ollama`)
- [x] Phase 22 — UI polish (dark mode, toasts, skeletons, empty + error states with retry, confirm dialogs, keyboard shortcuts, responsive layout, typography)
- [x] Phase 23 — Documentation (README: 14 sections + Browser → Express → AI Service → Ollama → Qwen diagram)
- [x] Phase 24 — Final MVP demo (register → analyze → create lead → open lead → follow-up → proposal, run against the live local model; `GET /api/health` reports `provider: ollama`, `model: qwen2.5:1.5b`, no external AI API)

## Hacktoberfest note

Targeting DEV Challenge "Hacktoberfest Open-Source AI Challenge: Week 2" (Side Hustle), submissions due Oct 18 11:59 PM PDT, tag `#hf26challenge`. Final deliverable includes a DEV post.
