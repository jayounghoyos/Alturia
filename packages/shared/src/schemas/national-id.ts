import { z } from "zod";

// Error message stays in Spanish — it's shown directly to end users
// (workers/employers) filling in the certificate lookup or booking flow.
export const NationalIdSchema = z
  .string()
  .regex(/^\d{8,10}$/, "la cédula debe tener entre 8 y 10 dígitos");
