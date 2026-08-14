# Digital Mind

Digital Mind is a private personal operating system built around the loop **Plan → Execute → Record → Review → Adjust**.

This repository contains the approved foundation and the Phase 1 core relational model. UI execution workflows remain out of scope until Phase 2.

## Requirements

- Node.js 22 LTS recommended
- npm
- A Neon PostgreSQL database

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Set `DATABASE_URL` in `.env.local` to the pooled PostgreSQL connection string supplied by Neon. Never commit this file.
4. Apply migrations: `npm run db:migrate`.
5. Run `npm run db:bootstrap-user`. This idempotently creates or reuses the single owner and writes `DIGITAL_MIND_USER_ID` to the ignored `.env.local` without printing it.
6. Start development: `npm run dev`.
7. Open `http://localhost:3000` (the root redirects to `/today`).

The UI is intentionally available before database configuration. `GET /api/health` returns HTTP 503 with `database: "not_configured"` until `DATABASE_URL` is set, `database: "unavailable"` if a configured database cannot be reached, and HTTP 200 only after a successful query.

## Database workflow

- Define schema changes in `db/schema.ts`.
- Generate a migration with `npm run db:generate`.
- Review generated SQL under `drizzle/`.
- Apply committed migrations with `npm run db:migrate`.
- Inspect locally with `npm run db:studio` when appropriate.
- Verify the deployed core structure with `npm run db:verify`.
- Run isolated Neon constraint tests with `npm run test:integration`.

Every schema change must be represented by a reviewed migration. Do not edit hosted database structures manually.

Ownership, deletion, hierarchy, timestamp, and history decisions are documented in `docs/data-model.md`.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

## Security notes

Database code is server-only. Environment files are ignored except `.env.example`; the database URL must never use a `NEXT_PUBLIC_` prefix. Authentication is required before any production deployment. Do not deploy Digital Mind as a publicly usable application yet.

`DIGITAL_MIND_USER_ID` is a temporary server-only owner boundary for Phase 2. It must not use a `NEXT_PUBLIC_` prefix. The application is still private-development software and must not be publicly deployed until authentication replaces this boundary.
