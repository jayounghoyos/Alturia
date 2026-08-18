import { z } from "zod";

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
