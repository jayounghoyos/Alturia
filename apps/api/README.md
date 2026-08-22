# @alturia/api

NestJS backend for the Asis Altura chatbot (single client, no
multi-tenancy). Prisma + PostgreSQL/pgvector, swappable LLM abstraction
(local Ollama in dev, OpenRouter in prod).

```bash
pnpm --filter api start:dev
```

See `prisma/README.md` for pgvector/seed notes, and the repo root's
`.env.example` for the required variables.
