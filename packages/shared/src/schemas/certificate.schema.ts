import { z } from "zod";

export { NationalIdSchema } from "./national-id.js";

export const ExpirationTypeSchema = z.enum(["COURSE", "MEDICAL_EXAM"]);

/** Public response shape of GET /api/certificates/:nationalId — binary status + date only, never personal data (security NFR). */
export const CertificateLookupSchema = z.object({
  expirationType: ExpirationTypeSchema,
  status: z.enum(["VALID", "EXPIRED"]),
  expiresAt: z.string(), // ISO date
});
export type CertificateLookup = z.infer<typeof CertificateLookupSchema>;

/** A worker can have both a course certificate and a medical exam certificate, each with its own expiration. */
export const CertificateLookupResponseSchema = z.object({
  certificates: z.array(CertificateLookupSchema),
});
export type CertificateLookupResponse = z.infer<
  typeof CertificateLookupResponseSchema
>;
