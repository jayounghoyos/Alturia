import { isNotFound } from "../api/client";
import { showCertificates } from "./certificates";
import type { ChatContext } from "./context";

/** Asis Altura: certificate status from the QR printed on it. */
export function startQrScan(ctx: ChatContext): void {
  ctx.say(ctx.t.qr.intro);
  ctx.push({ kind: "qr" });
  ctx.setStep({ kind: "idle" });
}

export async function handleQrPayload(
  ctx: ChatContext,
  payload: string,
): Promise<void> {
  const t = ctx.t.qr;
  await ctx.busy(async () => {
    try {
      const result = await ctx.api.lookupCertificateByQr(payload);
      showCertificates(ctx, result, t.foundMany, t.foundOne);
    } catch (error) {
      ctx.say(isNotFound(error) ? t.notFound : t.error);
    }
  });
}
