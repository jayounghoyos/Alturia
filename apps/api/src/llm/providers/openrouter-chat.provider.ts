import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema";
import { LLM_TIMEOUT_MS, LlmUnavailableError } from "../llm.errors";
import type { ChatParams, ChatResult, LlmChatProvider } from "../llm.interface";

/** Production provider: OpenAI-compatible API, routes to Qwen (or others) without self-hosting anything. */
@Injectable()
export class OpenRouterChatProvider implements LlmChatProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async chat({
    systemPrompt,
    messages,
    temperature,
  }: ChatParams): Promise<ChatResult> {
    const apiKey = this.config.get("OPENROUTER_API_KEY", { infer: true });
    const model = this.config.get("OPENROUTER_CHAT_MODEL", { infer: true });

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new LlmUnavailableError("OpenRouter", "request failed", {
        cause: error,
      });
    });
    if (!res.ok) {
      throw new LlmUnavailableError(
        "OpenRouter",
        `HTTP ${res.status}: ${await res.text()}`,
      );
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmUnavailableError("OpenRouter", "empty completion");
    }
    return { content };
  }
}
