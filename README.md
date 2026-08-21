# Alturia

## Getting started

```bash
# 1. Clone and install
git clone <repo-url> alturia
cd alturia
pnpm install

# 2. Configure environment
cp .env.example .env
# edit .env if you're not using the defaults (e.g. cloud LLM API keys)
# apps/api/.env is a symlink to this file, so one .env is enough.

# 3. Start Postgres (pgvector image)
pnpm db:up

# 4. Apply the already-committed Prisma migrations
pnpm db:migrate
# Only if you're authoring a NEW migration later (schema.prisma changed):
# pnpm db:migrate:new --name your_migration_name, then pnpm db:migrate to
# apply it — see apps/api/prisma/README.md for why it's split this way.

# 5. Seed demo data (workers, courses, sessions, certificates, admin login)
pnpm db:seed

# 6. Pull the local models (skip if using a cloud LLM_CHAT_PROVIDER/EMBEDDING_PROVIDER)
ollama pull qwen2.5:14b-instruct-q4_K_M
ollama pull nomic-embed-text

# 7. Run everything (each in its own terminal)
pnpm dev:api          # http://localhost:3000
pnpm dev:dashboard    # http://localhost:5173
pnpm dev:widget       # http://localhost:5174 (dev preview)
```

### Trying the embedded widget

```bash
pnpm --filter widget build
npx serve apps/widget/dist
# open the served /test.html — the chat bubble should appear bottom-right
```

## Useful scripts

| Command | Does |
| --- | --- |
| `pnpm dev:api` / `dev:dashboard` / `dev:widget` | Start one app in watch mode |
| `pnpm db:up` | Start the Postgres/pgvector container |
| `pnpm db:migrate` | Apply pending Prisma migrations (`migrate deploy`, non-interactive) |
| `pnpm db:migrate:new` | Author a new migration from a `schema.prisma` change (`migrate dev --create-only`) |
| `pnpm db:seed` | Seed demo data (workers, courses, sessions, certificates, admin login) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |

## Repo layout

```
apps/
  api/        NestJS backend
  dashboard/  Admin panel (React)
  widget/     Embeddable chat widget
packages/
  shared/     Shared zod schemas/types
mockups/      Sprint 0 screen designs
designs/      Architecture diagrams
```
