export interface ChatParams {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  /** 0..1 sampling temperature — see PromptBuilderService for how it also drives the strictness instruction text. */
  temperature: number;
}

export interface ChatResult {
  content: string;
}

export interface LlmChatProvider {
  chat(params: ChatParams): Promise<ChatResult>;
}

export interface EmbeddingProvider {
  /** Returns one vector per input string, same order. */
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Deliberately two separate tokens, not one "LLM_PROVIDER" — chat and
 * embeddings run on different models with different cost/latency tradeoffs
 * (e.g. free-tier OpenRouter chat + a cheap dedicated embedding model), so
 * they need to be independently selectable. See .env.example.
 */
export const LLM_CHAT_PROVIDER = Symbol("LLM_CHAT_PROVIDER");
export const EMBEDDING_PROVIDER = Symbol("EMBEDDING_PROVIDER");
