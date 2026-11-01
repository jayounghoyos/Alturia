import type {
  AppointmentConfirmation,
  AvailableSession,
  BotFeature,
  CertificateLookup,
  Course,
} from "@alturia/shared";

/** Names of icons an option can show (see OPTION_ICONS in chat/MessageView.tsx). */
export type OptionIcon =
  | "search"
  | "qr"
  | "calendar"
  | "faq"
  | "advisor"
  | "back"
  | "info"
  | "document"
  | "pin"
  | "check";

/**
 * What clicking an option does. Plain data, never a callback, so messages are
 * serializable and an old menu can't run against stale state.
 */
export type Action =
  | { type: "menu" }
  | { type: "feature"; feature: BotFeature }
  | { type: "faq.ask"; question: string }
  | { type: "booking.course"; course: Course }
  | { type: "booking.session"; course: Course; session: AvailableSession }
  | { type: "booking.retraining" }
  | { type: "booking.confirm" };

export interface Option {
  label: string;
  icon: OptionIcon;
  action: Action;
}

export type Msg =
  | { id: string; kind: "text"; from: "user" | "bot" | "advisor"; text: string }
  | {
      id: string;
      kind: "options";
      options: Option[];
      /** Index of the option the visitor picked; the menu is then spent. */
      chosen?: number;
    }
  | {
      id: string;
      kind: "certificate";
      certificate: CertificateLookup;
      canScheduleRetraining: boolean;
    }
  | { id: string; kind: "confirmation"; confirmation: AppointmentConfirmation }
  | { id: string; kind: "qr" };

export interface BookingDraft {
  course: Course;
  session: AvailableSession;
  nationalId?: string;
  name?: string;
  phone?: string;
}

/** What the text box currently answers. "idle" sends free text to the LLM. */
export type Step =
  | { kind: "idle" }
  | { kind: "certificates.id" }
  | { kind: "booking.id"; draft: BookingDraft }
  | { kind: "booking.name"; draft: BookingDraft }
  | { kind: "booking.phone"; draft: BookingDraft }
  | { kind: "booking.consent"; draft: BookingDraft };
