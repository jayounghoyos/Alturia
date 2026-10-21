import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

// Same image as docker-compose.yml and CI, so the `vector` extension and the
// hand-added ivfflat index in the migrations behave exactly like production.
const POSTGRES_IMAGE = "pgvector/pgvector:pg16";

/** Handed to global-teardown.ts through globalThis (both run in Jest's parent process). */
export const e2eGlobals = globalThis as typeof globalThis & {
  __E2E_POSTGRES__?: StartedPostgreSqlContainer;
};

/**
 * Gives the e2e suite its own database instead of whatever DATABASE_URL the
 * developer's .env points at, so `pnpm test:e2e` works with only Docker
 * running and never touches dev data.
 *
 * - E2E_DATABASE_URL set (CI, which already runs a Postgres service): use it.
 * - Otherwise: start a throwaway pgvector container via Testcontainers.
 *
 * Either way the migrations are applied before any test runs. DATABASE_URL is
 * set here, in Jest's parent process, so the test workers inherit it; dotenv
 * (ConfigModule and Prisma) never overrides a variable that is already set.
 */
export default async function globalSetup(): Promise<void> {
  const started = Date.now();
  process.stdout.write("\n");
  log("Preparing the e2e database");
  let databaseUrl = process.env.E2E_DATABASE_URL;

  if (databaseUrl) {
    log(`  Using E2E_DATABASE_URL (${redact(databaseUrl)})`);
  } else {
    log(`  Starting a throwaway ${POSTGRES_IMAGE} container (Testcontainers)…`);
    try {
      const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
      e2eGlobals.__E2E_POSTGRES__ = container;
      databaseUrl = container.getConnectionUri();
    } catch (error) {
      throw new Error(
        "Could not start a Postgres container for the e2e tests. Make sure " +
          "Docker is running, or set E2E_DATABASE_URL to an existing test " +
          `database.\n\n${String(error)}`,
      );
    }
    log(`  Container ready at ${redact(databaseUrl)}`);
  }

  process.env.DATABASE_URL = databaseUrl;

  const output = execFileSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), "migrate", "deploy"],
    {
      cwd: resolve(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
      stdio: "pipe",
    },
  );
  const applied = [...output.matchAll(/Applying migration `([^`]+)`/g)].map(
    (m) => m[1],
  );
  log(
    applied.length
      ? `  Applied ${applied.length} migration(s):\n${applied.map((m) => `    - ${m}`).join("\n")}`
      : "  Schema already up to date (no pending migrations)",
  );
  log(`  Ready in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
}

function log(message: string): void {
  process.stdout.write(`[e2e] ${message.replace(/\n(?!$)/g, "\n[e2e] ")}\n`);
}

/** Hides the password so connection strings are safe to print in CI logs. */
function redact(url: string): string {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:***@");
}
