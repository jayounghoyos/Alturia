import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatParams, ChatResult, LlmChatProvider } from "../llm.interface";

/** Alternative production provider. Anthropic has no embeddings API — pair with an OpenAI/other EMBEDDING_PROVIDER. */
@Injectable()
export class AnthropicChatProvider implements LlmChatProvider {
  constructor(private readonly config: ConfigService) {}

  async chat({ systemPrompt, messages, temperature }: ChatParams): Promise<ChatResult> {
    const apiKey = this.config.getOrThrow<string>("ANTHROPIC_API_KEY");
    const model = this.config.getOrThrow<string>("ANTHROPIC_CHAT_MODEL");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        temperature,
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic chat failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { content: { type: string; text: string }[] };
    const text = body.content.find((block) => block.type === "text")?.text ?? "";
    return { content: text };
  }
}
