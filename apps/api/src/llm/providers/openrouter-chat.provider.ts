import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatParams, ChatResult, LlmChatProvider } from "../llm.interface";

/** Production provider: OpenAI-compatible API, routes to Qwen (or others) without self-hosting anything. */
@Injectable()
export class OpenRouterChatProvider implements LlmChatProvider {
  constructor(private readonly config: ConfigService) {}

  async chat({ systemPrompt, messages, temperature }: ChatParams): Promise<ChatResult> {
    const apiKey = this.config.getOrThrow<string>("OPENROUTER_API_KEY");
    const model = this.config.getOrThrow<string>("OPENROUTER_CHAT_MODEL");

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
    });
    if (!res.ok) {
      throw new Error(`OpenRouter chat failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return { content: body.choices[0].message.content };
  }
}
