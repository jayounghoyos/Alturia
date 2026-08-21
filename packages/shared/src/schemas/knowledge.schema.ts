import { z } from "zod";

/** POST /api/knowledge — admin uploads a .md file's raw text as the bot's context. */
export const CreateKnowledgeSourceSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20_000),
});
export type CreateKnowledgeSourceInput = z.infer<typeof CreateKnowledgeSourceSchema>;

export const KnowledgeSourceRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
});
export type KnowledgeSourceRecord = z.infer<typeof KnowledgeSourceRecordSchema>;
