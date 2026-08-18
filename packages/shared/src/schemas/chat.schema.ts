import { z } from "zod";

export const ChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  reply: z.string(),
  lowConfidence: z.boolean().default(false),
  escalationOffered: z.boolean().default(false),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
