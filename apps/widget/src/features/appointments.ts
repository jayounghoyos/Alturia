import {
  NationalIdSchema,
  type AvailableSession,
  type Course,
} from "@alturia/shared";
import type { BookingDraft, Step } from "../engine/types";
import { LOCALE } from "../i18n/es";
import type { ChatContext } from "./context";

/** Course id the seed and the API use for the retraining course. */
const RETRAINING_COURSE_ID = "course-retraining";

/** Asis Altura: book a course session — pick course, pick date, contact data, consent. */
export async function startBooking(
  ctx: ChatContext,
  preselectCourseId?: string,
): Promise<void> {
  const t = ctx.t.appointments;
  await ctx.busy(async () => {
    try {
      const courses = await ctx.api.fetchCourses();
      const preselected = courses.find((c) => c.id === preselectCourseId);
      if (preselected) {
        await pickCourse(ctx, preselected);
        return;
      }
      ctx.say(t.pickCourse);
      ctx.push({
        kind: "options",
        options: courses.map((course) => ({
          label: course.name,
          icon: "document",
          action: { type: "booking.course", course },
        })),
      });
    } catch {
      ctx.say(t.coursesError);
    }
  });
}

export const startRetrainingBooking = (ctx: ChatContext) =>
  startBooking(ctx, RETRAINING_COURSE_ID);

export async function pickCourse(
  ctx: ChatContext,
  course: Course,
): Promise<void> {
  const t = ctx.t.appointments;
  try {
    const sessions = await ctx.api.fetchAvailability(course.id);
    if (sessions.length === 0) {
      ctx.say(t.noSlots(course.name));
      ctx.showMenu();
      return;
    }
    ctx.say(t.sessions);
    ctx.push({
      kind: "options",
      options: sessions.map((session) => ({
        label: formatSession(session),
        icon: "calendar",
        action: { type: "booking.session", course, session },
      })),
    });
  } catch {
    ctx.say(t.availabilityError);
  }
}

export function pickSession(
  ctx: ChatContext,
  course: Course,
  session: AvailableSession,
): void {
  ctx.say(ctx.t.appointments.askId(course.name, formatSession(session)));
  ctx.setStep({ kind: "booking.id", draft: { course, session } });
}

/** Text answers while booking: cédula, then name, then phone. */
export function submitBookingText(
  ctx: ChatContext,
  step: Extract<
    Step,
    { kind: "booking.id" | "booking.name" | "booking.phone" }
  >,
  raw: string,
): void {
  const t = ctx.t.appointments;
  const text = raw.trim();
  ctx.echo(text);
  const { draft } = step;

  if (step.kind === "booking.id") {
    const parsed = NationalIdSchema.safeParse(text);
    if (!parsed.success) {
      ctx.say(parsed.error.issues[0]?.message ?? ctx.t.certificates.idHint);
      return;
    }
    ctx.say(t.askName);
    ctx.setStep({
      kind: "booking.name",
      draft: { ...draft, nationalId: parsed.data },
    });
    return;
  }
  if (step.kind === "booking.name") {
    ctx.say(t.askPhone);
    ctx.setStep({ kind: "booking.phone", draft: { ...draft, name: text } });
    return;
  }
  ctx.say(t.consent);
  ctx.push({
    kind: "options",
    options: [
      { label: t.accept, icon: "check", action: { type: "booking.confirm" } },
    ],
  });
  ctx.setStep({ kind: "booking.consent", draft: { ...draft, phone: text } });
}

export async function confirmBooking(
  ctx: ChatContext,
  draft: BookingDraft,
): Promise<void> {
  const t = ctx.t.appointments;
  const { nationalId, name, phone } = draft;
  if (!nationalId || !name || !phone) return;
  ctx.setStep({ kind: "idle" });
  await ctx.busy(async () => {
    try {
      const confirmation = await ctx.api.createAppointment({
        sessionId: draft.session.sessionId,
        nationalId,
        name,
        phone,
        dataConsent: true,
      });
      ctx.say(t.booked);
      ctx.push({ kind: "confirmation", confirmation });
      ctx.offerMore();
    } catch {
      ctx.say(t.bookingFailed);
      ctx.showMenu();
    }
  });
}

export function formatSession(session: AvailableSession): string {
  const date = new Date(session.date).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${date} · ${session.time} · ${session.location}`;
}
