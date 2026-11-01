# @alturia/api

API NestJS + Prisma (PostgreSQL/pgvector) que sirve a todos los bots. Cada request se
resuelve a un bot: los del widget con el header `X-Alturia-Bot` (sin header, el bot por
defecto) y los del dashboard con el bot del admin autenticado (`src/bots/bot-context.guard.ts`).
El LLM es intercambiable: Ollama en desarrollo y OpenRouter en producción.

```bash
pnpm --filter api start:dev
pnpm --filter api run test:e2e   # Testcontainers, solo requiere Docker
```

Notas de la base de datos y las migraciones escritas a mano: `prisma/README.md`. Variables:
`.env.example` en la raíz.
