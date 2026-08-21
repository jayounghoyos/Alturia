import { z } from "zod";
import { NationalIdSchema } from "./national-id.js";

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["ADVANCED", "RETRAINING"]),
});
export type Course = z.infer<typeof CourseSchema>;

export const AvailableSessionSchema = z.object({
  sessionId: z.string(),
  date: z.string(), // ISO date
  time: z.string(),
  availableSlots: z.number().int(),
  location: z.string(),
});
export type AvailableSession = z.infer<typeof AvailableSessionSchema>;

/** POST /api/appointments — contact details -> confirmation in a single step. */
export const CreateAppointmentSchema = z.object({
  sessionId: z.string(),
  nationalId: NationalIdSchema,
  name: z.string().min(1),
  phone: z.string().min(7),
  // Colombian Law 1581 of 2012 — explicit consent capture before storing contact data.
  dataConsent: z.literal(true),
});
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;

export const AppointmentConfirmationSchema = z.object({
  confirmationCode: z.string(),
  courseName: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string(),
  status: z.literal("CONFIRMED"),
});
export type AppointmentConfirmation = z.infer<
  typeof AppointmentConfirmationSchema
>;
