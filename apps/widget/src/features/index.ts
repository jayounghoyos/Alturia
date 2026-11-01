import type { BotFeature } from "@alturia/shared";
import type { Action, Step } from "../engine/types";
import {
  confirmBooking,
  pickCourse,
  pickSession,
  startBooking,
  startRetrainingBooking,
  submitBookingText,
} from "./appointments";
import { startCertificateLookup, submitNationalId } from "./certificates";
import type { ChatContext } from "./context";
import { startFaq } from "./faq";
import { startHandoff } from "./handoff";
import { startQrScan } from "./qr";

export { mainMenuOptions, backToMenu } from "./menu";
export { handleQrPayload } from "./qr";
export type { ChatContext } from "./context";

/** The single place that maps a feature to the flow that starts it. */
export function startFeature(
  ctx: ChatContext,
  feature: BotFeature,
): void | Promise<void> {
  switch (feature) {
    case "CERTIFICATES":
      return startCertificateLookup(ctx);
    case "QR":
      return startQrScan(ctx);
    case "APPOINTMENTS":
      return startBooking(ctx);
    case "FAQ":
      return startFaq(ctx);
    case "HUMAN_HANDOFF":
      return startHandoff(ctx);
  }
}

/** What an option click does. `step` is the conversation's current step. */
export function runAction(
  ctx: ChatContext,
  action: Action,
  step: Step,
): void | Promise<void> {
  switch (action.type) {
    case "menu":
      return ctx.showMenu();
    case "feature":
      return ctx.has(action.feature)
        ? startFeature(ctx, action.feature)
        : undefined;
    case "faq.ask":
      return ctx.ask(action.question);
    case "booking.course":
      return ctx.busy(() => pickCourse(ctx, action.course));
    case "booking.session":
      return pickSession(ctx, action.course, action.session);
    case "booking.retraining":
      return startRetrainingBooking(ctx);
    case "booking.confirm":
      return step.kind === "booking.consent"
        ? confirmBooking(ctx, step.draft)
        : undefined;
  }
}

/** Routes what the visitor typed: the current step's question, else the bot. */
export function submitText(
  ctx: ChatContext,
  step: Step,
  text: string,
): void | Promise<void> {
  switch (step.kind) {
    case "certificates.id":
      return submitNationalId(ctx, text);
    case "booking.id":
    case "booking.name":
    case "booking.phone":
      return submitBookingText(ctx, step, text);
    case "idle":
    case "booking.consent":
      return ctx.ask(text);
  }
}
