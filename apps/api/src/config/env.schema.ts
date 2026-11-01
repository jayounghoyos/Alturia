import { z } from "zod";

/** Blank values in .env files ("KEY=") mean "not set", not "empty string". */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

/**
 * Every environment variable the API reads, validated once at boot so a
 * missing or misspelled value fails the deploy instead of surfacing later as a
 * 500 in the middle of a chat. Provider-specific keys are only required for
 * the provider that is actually selected.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRES_IN: z.string().default("7d"),

    LLM_CHAT_PROVIDER: z.enum(["ollama", "openrouter"]),
    // Nothing calls the embedding provider yet (knowledge is plain context
    // stuffing), so it is optional until real retrieval lands.
    EMBEDDING_PROVIDER: z.enum(["ollama", "openai"]).default("ollama"),

    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_CHAT_MODEL: z.string().default("qwen2.5:7b"),
    OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),

    OPENROUTER_API_KEY: optionalString,
    OPENROUTER_CHAT_MODEL: optionalString,

    OPENAI_API_KEY: optionalString,
    OPENAI_EMBED_MODEL: z.string().default("text-embedding-3-small"),
  })
  .superRefine((env, ctx) => {
    const requireKey = (key: keyof typeof env, reason: string) => {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `required when ${reason}`,
        });
      }
    };
    if (env.LLM_CHAT_PROVIDER === "openrouter") {
      requireKey("OPENROUTER_API_KEY", "LLM_CHAT_PROVIDER=openrouter");
      requireKey("OPENROUTER_CHAT_MODEL", "LLM_CHAT_PROVIDER=openrouter");
    }
    if (env.EMBEDDING_PROVIDER === "openai") {
      requireKey("OPENAI_API_KEY", "EMBEDDING_PROVIDER=openai");
    }
  });

export type Env = z.infer<typeof envSchema>;

/** `ConfigModule.forRoot({ validate })` hook: returns the parsed, defaulted env. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
