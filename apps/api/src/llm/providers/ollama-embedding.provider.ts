import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema";
import type { EmbeddingProvider } from "../llm.interface";

@Injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async embed(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.get("OLLAMA_BASE_URL", { infer: true });
    const model = this.config.get("OLLAMA_EMBED_MODEL", { infer: true });

    // Ollama's /api/embed batches; older versions only support one input at a
    // time via /api/embeddings — batching here keeps the interface simple.
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts }),
    });
    if (!res.ok) {
      throw new Error(
        `Ollama embed failed (${res.status}): ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { embeddings: number[][] };
    return body.embeddings;
  }
}
