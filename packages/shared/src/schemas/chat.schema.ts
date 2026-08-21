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
  /** True once a case is escalated and an admin hasn't resolved it yet — the
   * bot stops generating replies so it doesn't talk over the human advisor.
   * `reply` is empty in that case; the widget should skip rendering it. */
  awaitingHuman: z.boolean().default(false),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const MessageRoleSchema = z.enum(["USER", "BOT", "ADMIN", "SYSTEM"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/** Shared by the admin escalation-detail view and the widget's own polling endpoint. */
export const MessageRecordSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
});
export type MessageRecord = z.infer<typeof MessageRecordSchema>;
