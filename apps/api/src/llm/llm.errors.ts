/** The chat model could not produce an answer (timeout, HTTP error, empty response). */
export class LlmUnavailableError extends Error {
  constructor(provider: string, detail: string, options?: ErrorOptions) {
    super(`${provider}: ${detail}`, options);
    this.name = "LlmUnavailableError";
  }
}

/** Free-tier models can be slow, but a visitor should not wait forever. */
export const LLM_TIMEOUT_MS = 20_000;
