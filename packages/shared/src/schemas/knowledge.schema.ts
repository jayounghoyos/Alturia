import { z } from "zod";

/**
 * How much uploaded text reaches the bot: documents are joined into the
 * system prompt and cut here. The dashboard shows usage against this.
 */
export const MAX_KNOWLEDGE_CONTEXT_CHARS = 6000;

/** The exact text the API appends to the prompt, before truncation. */
export function knowledgeContext(
  sources: readonly { title: string; content: string }[],
): string {
  return sources.map((s) => `### ${s.title}\n${s.content}`).join("\n\n");
}

/** POST /api/knowledge — admin uploads a .md file's raw text as the bot's context. */
export const CreateKnowledgeSourceSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20_000),
});
export type CreateKnowledgeSourceInput = z.infer<
  typeof CreateKnowledgeSourceSchema
>;

export const KnowledgeSourceRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
});
export type KnowledgeSourceRecord = z.infer<typeof KnowledgeSourceRecordSchema>;
