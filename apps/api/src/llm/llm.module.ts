import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.schema";
import { EMBEDDING_PROVIDER, LLM_CHAT_PROVIDER } from "./llm.interface";
import { OllamaChatProvider } from "./providers/ollama-chat.provider";
import { OpenRouterChatProvider } from "./providers/openrouter-chat.provider";
import { OllamaEmbeddingProvider } from "./providers/ollama-embedding.provider";
import { OpenAiEmbeddingProvider } from "./providers/openai-embedding.provider";

/**
 * Selects the chat/embedding implementation via env vars at boot time.
 * ChatModule/KnowledgeModule inject the LLM_CHAT_PROVIDER / EMBEDDING_PROVIDER
 * tokens and never import a concrete adapter directly — swapping dev (Ollama)
 * for prod (OpenRouter) is a .env change, not a code change.
 */
@Module({
  providers: [
    OllamaChatProvider,
    OpenRouterChatProvider,
    OllamaEmbeddingProvider,
    OpenAiEmbeddingProvider,
    {
      provide: LLM_CHAT_PROVIDER,
      useFactory: (
        config: ConfigService<Env, true>,
        ollama: OllamaChatProvider,
        openrouter: OpenRouterChatProvider,
      ) => {
        switch (config.get("LLM_CHAT_PROVIDER", { infer: true })) {
          case "ollama":
            return ollama;
          case "openrouter":
            return openrouter;
          default:
            throw new Error(
              'LLM_CHAT_PROVIDER must be "ollama" | "openrouter"',
            );
        }
      },
      inject: [ConfigService, OllamaChatProvider, OpenRouterChatProvider],
    },
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (
        config: ConfigService<Env, true>,
        ollama: OllamaEmbeddingProvider,
        openai: OpenAiEmbeddingProvider,
      ) => {
        switch (config.get("EMBEDDING_PROVIDER", { infer: true })) {
          case "ollama":
            return ollama;
          case "openai":
            return openai;
          default:
            throw new Error('EMBEDDING_PROVIDER must be "ollama" | "openai"');
        }
      },
      inject: [ConfigService, OllamaEmbeddingProvider, OpenAiEmbeddingProvider],
    },
  ],
  exports: [LLM_CHAT_PROVIDER, EMBEDDING_PROVIDER],
})
export class LlmModule {}
