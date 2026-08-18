import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EmbeddingProvider } from "../llm.interface";

/** Production provider — required when EMBEDDING_PROVIDER=openai (e.g. paired with LLM_CHAT_PROVIDER=anthropic). */
@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ConfigService) {}

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.getOrThrow<string>("OPENAI_API_KEY");
    const model = this.config.getOrThrow<string>("OPENAI_EMBED_MODEL");

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      // dimensions: 768 matches nomic-embed-text so both providers write into
      // the same fixed vector(768) column — see prisma/README.md.
      body: JSON.stringify({ model, input: texts, dimensions: 768 }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI embed failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { data: { embedding: number[] }[] };
    return body.data.map((d) => d.embedding);
  }
}
