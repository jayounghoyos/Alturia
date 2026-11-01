import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema";
import { LLM_TIMEOUT_MS, LlmUnavailableError } from "../llm.errors";
import type { ChatParams, ChatResult, LlmChatProvider } from "../llm.interface";

/** Dev-only provider: talks to Ollama running natively on the team's own GPU box. */
@Injectable()
export class OllamaChatProvider implements LlmChatProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async chat({
    systemPrompt,
    messages,
    temperature,
  }: ChatParams): Promise<ChatResult> {
    const baseUrl = this.config.get("OLLAMA_BASE_URL", { infer: true });
    const model = this.config.get("OLLAMA_CHAT_MODEL", { infer: true });

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        options: { temperature },
        stream: false,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new LlmUnavailableError("Ollama", "request failed", {
        cause: error,
      });
    });
    if (!res.ok) {
      throw new LlmUnavailableError(
        "Ollama",
        `HTTP ${res.status}: ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { message?: { content?: string } };
    const content = body.message?.content?.trim();
    if (!content) throw new LlmUnavailableError("Ollama", "empty completion");
    return { content };
  }
}
