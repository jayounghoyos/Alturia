import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatParams, ChatResult, LlmChatProvider } from "../llm.interface";

/** Dev-only provider: talks to Ollama running natively on the team's own GPU box. */
@Injectable()
export class OllamaChatProvider implements LlmChatProvider {
  constructor(private readonly config: ConfigService) {}

  async chat({ systemPrompt, messages, temperature }: ChatParams): Promise<ChatResult> {
    const baseUrl = this.config.getOrThrow<string>("OLLAMA_BASE_URL");
    const model = this.config.getOrThrow<string>("OLLAMA_CHAT_MODEL");

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        options: { temperature },
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`Ollama chat failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { message: { content: string } };
    return { content: body.message.content };
  }
}
