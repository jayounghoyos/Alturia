import type { Option } from "../engine/types";
import type { ChatContext } from "./context";

const ICONS: Option["icon"][] = ["info", "document", "pin"];

/** Quick questions from the bot's config; answered by the LLM like free text. */
export function startFaq(ctx: ChatContext): void {
  const questions = ctx.config.faqQuickQuestions;
  ctx.setStep({ kind: "idle" });
  if (questions.length === 0) {
    ctx.say(ctx.t.faq.introNoQuestions);
    return;
  }
  ctx.say(ctx.t.faq.intro);
  ctx.push({
    kind: "options",
    options: questions.map((question, i) => ({
      label: question,
      icon: ICONS[i % ICONS.length] ?? "info",
      action: { type: "faq.ask", question },
    })),
  });
}
