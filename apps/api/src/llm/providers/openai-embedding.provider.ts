import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema";
import type { EmbeddingProvider } from "../llm.interface";

/** Production provider — used when EMBEDDING_PROVIDER=openai, independent of whichever LLM_CHAT_PROVIDER is active. */
@Injectable()
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.get("OPENAI_API_KEY", { infer: true });
    const model = this.config.get("OPENAI_EMBED_MODEL", { infer: true });

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
      throw new Error(
        `OpenAI embed failed (${res.status}): ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { data: { embedding: number[] }[] };
    return body.data.map((d) => d.embedding);
  }
}
