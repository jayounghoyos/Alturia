import {
  NationalIdSchema,
  type CertificateLookupResponse,
} from "@alturia/shared";
import { isNotFound } from "../api/client";
import type { ChatContext } from "./context";

/** Asis Altura: certificate status by cédula (and the shared result rendering for QR). */
export function startCertificateLookup(ctx: ChatContext): void {
  ctx.say(ctx.t.certificates.askId, ctx.t.certificates.idHint);
  ctx.setStep({ kind: "certificates.id" });
}

export async function submitNationalId(
  ctx: ChatContext,
  raw: string,
): Promise<void> {
  const t = ctx.t.certificates;
  ctx.echo(raw);
  const parsed = NationalIdSchema.safeParse(raw.trim());
  if (!parsed.success) {
    ctx.say(parsed.error.issues[0]?.message ?? t.idHint);
    return;
  }
  ctx.setStep({ kind: "idle" });
  await ctx.busy(async () => {
    try {
      const result = await ctx.api.lookupCertificate(parsed.data);
      showCertificates(ctx, result, t.foundMany, t.foundOne);
    } catch (error) {
      ctx.say(isNotFound(error) ? t.notFound : t.error);
    }
  });
  ctx.offerMore([
    {
      label: t.another,
      icon: "search",
      action: { type: "feature", feature: "CERTIFICATES" },
    },
  ]);
}

export function showCertificates(
  ctx: ChatContext,
  result: CertificateLookupResponse,
  foundMany: string,
  foundOne: string,
): void {
  ctx.say(result.certificates.length > 1 ? foundMany : foundOne);
  ctx.push(
    ...result.certificates.map((certificate) => ({
      kind: "certificate" as const,
      certificate,
      canScheduleRetraining:
        ctx.has("APPOINTMENTS") &&
        certificate.status === "EXPIRED" &&
        certificate.expirationType === "COURSE",
    })),
  );
}
