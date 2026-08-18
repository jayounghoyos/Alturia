export interface ChatParams {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  /** 0..1, from Bot.temperature — sampling temperature, see PromptBuilderService for how it also drives the strictness instruction text. */
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
 * Deliberately two separate tokens, not one "LLM_PROVIDER" — Anthropic has no
 * embeddings API, and OpenRouter's embedding coverage is inconsistent, so chat
 * and embeddings must be independently selectable. See .env.example.
 */
export const LLM_CHAT_PROVIDER = Symbol("LLM_CHAT_PROVIDER");
export const EMBEDDING_PROVIDER = Symbol("EMBEDDING_PROVIDER");
