import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  admin: z.object({ email: z.string(), name: z.string() }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
