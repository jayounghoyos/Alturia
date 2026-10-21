import { e2eGlobals } from "./global-setup";

/** Stops the container started by global-setup.ts (no-op when E2E_DATABASE_URL was used). */
export default async function globalTeardown(): Promise<void> {
  await e2eGlobals.__E2E_POSTGRES__?.stop();
}
