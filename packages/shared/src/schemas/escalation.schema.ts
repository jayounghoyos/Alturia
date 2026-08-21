import { z } from "zod";
import { MessageRecordSchema } from "./chat.schema.js";

/** Contact details captured only when the user agrees to escalate to an advisor (Colombian Law 1581 of 2012). */
export const EscalationContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional(),
  consentGiven: z.literal(true),
});
export type EscalationContact = z.infer<typeof EscalationContactSchema>;

export const CreateEscalationSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().min(1),
  contact: EscalationContactSchema.optional(),
});
export type CreateEscalationInput = z.infer<typeof CreateEscalationSchema>;

/** GET /api/escalations — admin-only, powers the dashboard inbox. */
export const EscalationRecordSchema = z.object({
  id: z.string(),
  reason: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
  contactInfo: EscalationContactSchema.nullable(),
  createdAt: z.string(),
  conversationId: z.string(),
});
export type EscalationRecord = z.infer<typeof EscalationRecordSchema>;

/** GET /api/escalations/:id — admin-only, the full conversation thread. */
export const EscalationDetailSchema = z.object({
  escalation: EscalationRecordSchema,
  sessionId: z.string(),
  messages: z.array(MessageRecordSchema),
});
export type EscalationDetail = z.infer<typeof EscalationDetailSchema>;

/** POST /api/escalations/:id/reply — admin-only, sends a message into the conversation. */
export const ReplyToEscalationSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type ReplyToEscalationInput = z.infer<typeof ReplyToEscalationSchema>;
