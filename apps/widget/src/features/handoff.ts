import type { ChatContext } from "./context";

/** "Talk to a human": opens a case in the dashboard inbox and waits for replies. */
export async function startHandoff(ctx: ChatContext): Promise<void> {
  const t = ctx.t.handoff;
  await ctx.busy(async () => {
    try {
      await ctx.api.createEscalation({
        sessionId: ctx.sessionId(),
        reason: t.reason,
      });
      ctx.say(ctx.config.handoffMessage || t.fallback(ctx.config.name));
      ctx.awaitAdvisor();
    } catch {
      ctx.say(t.error);
    }
  });
  ctx.offerMore();
}
