import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  AppointmentConfirmation,
  AvailableSession,
  CertificateLookup,
  Course,
} from "@alturia/shared";
import { NationalIdSchema } from "@alturia/shared";
import {
  createAppointment,
  createEscalation,
  fetchAvailability,
  fetchBotConfig,
  fetchCourses,
  getOrCreateSessionId,
  lookupCertificate,
  sendChatMessage,
  type BotConfig,
} from "./api";
import { WidgetHeader } from "./components/WidgetHeader";
import { OptionButton } from "./components/OptionButton";
import { CertificateCard } from "./components/CertificateCard";
import { ConfirmationCard } from "./components/ConfirmationCard";
import {
  AdvisorIcon,
  ArrowLeftIcon,
  CalendarIcon,
  DocumentIcon,
  InfoIcon,
  PinIcon,
  SearchIcon,
  SendIcon,
} from "./icons";

type Msg =
  | { id: string; role: "user" | "bot"; kind: "text"; content: string }
  | { id: string; role: "bot"; kind: "options"; options: { label: string; icon: ReactNode; onSelect: () => void }[] }
  | { id: string; role: "bot"; kind: "certificate"; certificate: CertificateLookup; onScheduleRetraining?: () => void }
  | { id: string; role: "bot"; kind: "confirmation"; confirmation: AppointmentConfirmation };

type FlowStep =
  | { kind: "idle" }
  | { kind: "awaiting_cedula" }
  | { kind: "course_select" }
  | { kind: "session_select"; course: Course }
  | { kind: "awaiting_booking_cedula"; course: Course; session: AvailableSession }
  | { kind: "awaiting_name"; course: Course; session: AvailableSession; nationalId: string }
  | { kind: "awaiting_phone"; course: Course; session: AvailableSession; nationalId: string; name: string }
  | {
      kind: "awaiting_consent";
      course: Course;
      session: AvailableSession;
      nationalId: string;
      name: string;
      phone: string;
    };

const FAQ_QUESTIONS = [
  "¿Cuánto dura la certificación?",
  "¿Qué documentos necesito?",
  "¿Dónde están ubicados?",
];

function id() {
  return crypto.randomUUID();
}

export function ChatWidget() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<FlowStep>({ kind: "idle" });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef(getOrCreateSessionId());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBotConfig()
      .then((cfg) => {
        setConfig(cfg);
        botText(cfg.greeting);
        showMainMenu();
      })
      .catch((err: Error) => setLoadError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  function botText(content: string) {
    setMessages((prev) => [...prev, { id: id(), role: "bot", kind: "text", content }]);
  }

  function userText(content: string) {
    setMessages((prev) => [...prev, { id: id(), role: "user", kind: "text", content }]);
  }

  function pushOptions(options: { label: string; icon: ReactNode; onSelect: () => void }[]) {
    setMessages((prev) => [...prev, { id: id(), role: "bot", kind: "options", options }]);
  }

  function showMainMenu() {
    setStep({ kind: "idle" });
    botText("Selecciona una opción:");
    pushOptions([
      { label: "Consultar un certificado", icon: <SearchIcon className="h-4 w-4" />, onSelect: startCertificateFlow },
      { label: "Agendar un curso", icon: <SearchIcon className="h-4 w-4" />, onSelect: () => startBookingFlow() },
      { label: "Preguntas frecuentes", icon: <SearchIcon className="h-4 w-4" />, onSelect: startFaq },
      { label: "Hablar con un asesor", icon: <SearchIcon className="h-4 w-4" />, onSelect: startEscalation },
    ]);
  }

  function startCertificateFlow() {
    botText("Perfecto. Escribe el número de cédula del trabajador para consultar el estado de su certificación.");
    botText("Solo dígitos, sin puntos ni comas (8 a 10 caracteres).");
    setStep({ kind: "awaiting_cedula" });
  }

  async function handleCedulaSubmit(raw: string) {
    userText(raw);
    const parsed = NationalIdSchema.safeParse(raw.trim());
    if (!parsed.success) {
      botText(parsed.error.issues[0].message);
      return;
    }
    setSending(true);
    try {
      const result = await lookupCertificate(parsed.data);
      botText(
        result.certificates.length > 1
          ? "Encontré estas certificaciones asociadas a este documento:"
          : "Encontré una certificación asociada a este documento:",
      );
      for (const cert of result.certificates) {
        setMessages((prev) => [
          ...prev,
          {
            id: id(),
            role: "bot",
            kind: "certificate",
            certificate: cert,
            onScheduleRetraining:
              cert.status === "EXPIRED" && cert.expirationType === "COURSE"
                ? () => startBookingFlow("course-retraining")
                : undefined,
          },
        ]);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        botText("No encontré ningún certificado asociado a ese número de documento.");
      } else {
        botText("Tuvimos un problema consultando el certificado. Intenta de nuevo en un momento.");
      }
    } finally {
      setSending(false);
    }
    botText("¿Deseas hacer algo más?");
    pushOptions([
      { label: "Consultar otra cédula", icon: <SearchIcon className="h-4 w-4" />, onSelect: startCertificateFlow },
      { label: "Volver al menú principal", icon: <ArrowLeftIcon className="h-4 w-4" />, onSelect: showMainMenu },
    ]);
    setStep({ kind: "idle" });
  }

  async function startBookingFlow(preselectCourseId?: string) {
    setSending(true);
    try {
      const courses = await fetchCourses();
      const preselected = preselectCourseId && courses.find((c) => c.id === preselectCourseId);
      if (preselected) {
        await goToSessionSelect(preselected);
        return;
      }
      botText("¿Qué curso quieres agendar?");
      pushOptions(
        courses.map((course) => ({
          label: course.name,
          icon: <SearchIcon className="h-4 w-4" />,
          onSelect: () => goToSessionSelect(course),
        })),
      );
      setStep({ kind: "course_select" });
    } catch {
      botText("No pude cargar los cursos disponibles. Intenta de nuevo en un momento.");
    } finally {
      setSending(false);
    }
  }

  async function goToSessionSelect(course: Course) {
    setSending(true);
    try {
      const sessions = await fetchAvailability(course.id);
      if (sessions.length === 0) {
        botText(`No hay cupos disponibles para "${course.name}" por ahora. Escríbenos y te avisamos apenas se abra un cupo.`);
        showMainMenu();
        return;
      }
      botText("Estas son las próximas fechas disponibles:");
      pushOptions(
        sessions.map((session) => ({
          label: `${formatSessionLabel(session)}`,
          icon: <CalendarIcon className="h-4 w-4" />,
          onSelect: () => {
            botText(
              `Vas a agendar "${course.name}" — ${formatSessionLabel(session)}. Primero, ¿cuál es tu número de cédula?`,
            );
            setStep({ kind: "awaiting_booking_cedula", course, session });
          },
        })),
      );
      setStep({ kind: "session_select", course });
    } catch {
      botText("No pude cargar la disponibilidad. Intenta de nuevo en un momento.");
    } finally {
      setSending(false);
    }
  }

  function handleBookingCedulaSubmit(
    raw: string,
    current: Extract<FlowStep, { kind: "awaiting_booking_cedula" }>,
  ) {
    userText(raw);
    const parsed = NationalIdSchema.safeParse(raw.trim());
    if (!parsed.success) {
      botText(parsed.error.issues[0].message);
      return;
    }
    botText("¿Cuál es tu nombre completo?");
    setStep({ kind: "awaiting_name", course: current.course, session: current.session, nationalId: parsed.data });
  }

  function handleNameSubmit(name: string, current: Extract<FlowStep, { kind: "awaiting_name" }>) {
    userText(name);
    botText("¿Cuál es tu número de teléfono de contacto?");
    setStep({
      kind: "awaiting_phone",
      course: current.course,
      session: current.session,
      nationalId: current.nationalId,
      name,
    });
  }

  function handlePhoneSubmit(phone: string, current: Extract<FlowStep, { kind: "awaiting_phone" }>) {
    userText(phone);
    botText(
      "Antes de confirmar, necesitamos tu autorización para guardar estos datos de contacto (Ley 1581 de 2012).",
    );
    pushOptions([
      {
        label: "Acepto y confirmo la cita",
        icon: <SearchIcon className="h-4 w-4" />,
        onSelect: () =>
          submitAppointment({
            course: current.course,
            session: current.session,
            nationalId: current.nationalId,
            name: current.name,
            phone,
          }),
      },
    ]);
    setStep({
      kind: "awaiting_consent",
      course: current.course,
      session: current.session,
      nationalId: current.nationalId,
      name: current.name,
      phone,
    });
  }

  async function submitAppointment({
    course,
    session,
    nationalId,
    name,
    phone,
  }: {
    course: Course;
    session: AvailableSession;
    nationalId: string;
    name: string;
    phone: string;
  }) {
    setSending(true);
    try {
      const confirmation = await createAppointment({
        sessionId: session.sessionId,
        nationalId,
        name,
        phone,
        dataConsent: true,
      });
      void course;
      botText("¡Listo! Tu cupo quedó reservado.");
      setMessages((prev) => [...prev, { id: id(), role: "bot", kind: "confirmation", confirmation }]);
      pushOptions([
        { label: "Volver al menú principal", icon: <ArrowLeftIcon className="h-4 w-4" />, onSelect: showMainMenu },
      ]);
    } catch {
      botText("No pudimos confirmar tu cita — puede que el cupo ya no esté disponible. Intenta con otra fecha.");
      showMainMenu();
    } finally {
      setSending(false);
    }
  }

  function startFaq() {
    botText("Puedo resolver dudas frecuentes al instante. Elige una o escribe tu pregunta:");
    const icons = [InfoIcon, DocumentIcon, PinIcon];
    pushOptions(
      FAQ_QUESTIONS.map((q, i) => {
        const Icon = icons[i];
        return { label: q, icon: <Icon className="h-4 w-4" />, onSelect: () => askFaq(q) };
      }),
    );
    setStep({ kind: "idle" });
  }

  async function askFaq(question: string) {
    userText(question);
    setSending(true);
    try {
      const res = await sendChatMessage(sessionId.current, question);
      botText(res.reply);
    } catch {
      botText("Tuvimos un problema respondiendo. Intenta de nuevo en un momento.");
    } finally {
      setSending(false);
    }
  }

  async function startEscalation() {
    setSending(true);
    try {
      await createEscalation({
        sessionId: sessionId.current,
        reason: "El usuario pidió hablar con un asesor desde el menú principal.",
      });
      botText("Listo, ya avisé al equipo de Asis Altura y un asesor va a revisar tu caso pronto.");
    } catch {
      botText("No pude conectar con el equipo en este momento. Intenta de nuevo en un momento.");
    } finally {
      setSending(false);
    }
    pushOptions([
      { label: "Volver al menú principal", icon: <ArrowLeftIcon className="h-4 w-4" />, onSelect: showMainMenu },
    ]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    if (step.kind === "awaiting_cedula") return handleCedulaSubmit(text);
    if (step.kind === "awaiting_booking_cedula") return handleBookingCedulaSubmit(text, step);
    if (step.kind === "awaiting_name") return handleNameSubmit(text, step);
    if (step.kind === "awaiting_phone") return handlePhoneSubmit(text, step);

    // idle, course_select, session_select, awaiting_consent — free text falls
    // back to the general chat/FAQ endpoint (which also runs the server-side
    // escalation keyword check).
    userText(text);
    setSending(true);
    try {
      const res = await sendChatMessage(sessionId.current, text);
      botText(res.reply);
    } catch {
      botText("Tuvimos un problema respondiendo. Intenta de nuevo en un momento.");
    } finally {
      setSending(false);
    }
  }

  if (loadError) return null; // backend unavailable — fail silently on the host page
  if (!config) return null; // still loading

  const primary = config.theme.primaryColor;
  const positionClass = config.theme.position === "bottom-left" ? "left-5" : "right-5";

  return (
    <div className={`fixed bottom-5 ${positionClass} z-[2147483000] flex flex-col items-end gap-3`}>
      {open && (
        <div className="flex h-[600px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
          <WidgetHeader name={config.name} onClose={() => setOpen(false)} />

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m) => {
              if (m.kind === "text") {
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "user" ? "ml-auto bg-primary text-white" : "bg-bubble text-ink"
                    }`}
                  >
                    {m.content}
                  </div>
                );
              }
              if (m.kind === "options") {
                return (
                  <div key={m.id} className="space-y-2">
                    {m.options.map((opt, i) => (
                      <OptionButton key={i} icon={opt.icon} label={opt.label} onClick={opt.onSelect} />
                    ))}
                  </div>
                );
              }
              if (m.kind === "certificate") {
                return (
                  <CertificateCard
                    key={m.id}
                    certificate={m.certificate}
                    onScheduleRetraining={m.onScheduleRetraining}
                  />
                );
              }
              return <ConfirmationCard key={m.id} confirmation={m.confirmation} />;
            })}
            {sending && (
              <div className="max-w-[85%] rounded-xl bg-bubble px-3 py-2 text-sm text-faint">Escribiendo…</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-full border border-slate-200 bg-bubble px-3 py-2 text-sm text-ink outline-none focus:border-slate-300"
            />
            <button
              onClick={handleSend}
              disabled={sending}
              aria-label="Enviar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: primary }}
      >
        {open ? "✕" : <AdvisorIcon className="h-6 w-6" />}
      </button>
    </div>
  );
}

function formatSessionLabel(session: AvailableSession): string {
  const date = new Date(session.date).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${date} · ${session.time} · ${session.location}`;
}
