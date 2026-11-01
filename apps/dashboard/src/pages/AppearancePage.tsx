import {
  AVATAR_PRESET_LABELS,
  AVATAR_PRESETS,
  type BotFeature,
  type BotSettings,
} from "@alturia/shared";
import { contrastRatio, readableTextOn } from "@alturia/widget/branding";
import { Copy, Plus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/auth-context";
import { PageTitle } from "../components/PageTitle";
import { BotMark } from "../components/BotMark";
import { WidgetPreview } from "../components/WidgetPreview";
import {
  draftFromSettings,
  prepareAvatar,
  toPreviewConfig,
  toUpdateInput,
  validateDraft,
  type AvatarChange,
  type Draft,
} from "../lib/appearance";
import { formatTime } from "../lib/format";
import { useBot } from "../shell/bot-context";

const WIDGET_SCRIPT_URL =
  import.meta.env.VITE_WIDGET_SCRIPT_URL ??
  "https://alturia-widget.vercel.app/widget.js";

const DOMAIN_FEATURES: { id: BotFeature; label: string }[] = [
  { id: "CERTIFICATES", label: "Consulta de certificados por cédula" },
  { id: "QR", label: "Lectura del QR del certificado" },
  { id: "APPOINTMENTS", label: "Agendamiento de cursos" },
];

export function AppearancePage() {
  const { bot } = useBot();
  if (!bot) {
    return (
      <div className="px-5 py-6 lg:px-6">
        <PageTitle>Apariencia</PageTitle>
        <p className="mt-6 h-40 rounded-sheet bg-raised" aria-busy="true" />
      </div>
    );
  }
  // Remount the form when another bot's settings load (a different admin).
  return <AppearanceForm key={bot.publicKey} bot={bot} />;
}

/**
 * Settings answer "what will visitors see?": every field on the left, the
 * real widget on the right showing the unsaved result.
 */
function AppearanceForm({ bot }: { bot: BotSettings }) {
  const { api } = useAuth();
  const { setBot } = useBot();
  const [saved, setSaved] = useState(() => draftFromSettings(bot));
  const [draft, setDraft] = useState(saved);
  const [avatar, setAvatar] = useState<AvatarChange>({ kind: "keep" });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>(
    {},
  );
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved"; at: Date }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    avatar.kind !== "keep" || JSON.stringify(draft) !== JSON.stringify(saved);
  const preview = useMemo(
    () => toPreviewConfig(draft, bot, avatar),
    [draft, bot, avatar],
  );

  // Free the object URL of a replaced or saved upload.
  useEffect(() => {
    if (avatar.kind !== "upload") return;
    return () => URL.revokeObjectURL(avatar.previewUrl);
  }, [avatar]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    try {
      const image = await prepareAvatar(file);
      setAvatar({
        kind: "upload",
        image,
        previewUrl: URL.createObjectURL(image),
      });
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "No pudimos usar esa imagen.",
      });
    }
  }

  async function save() {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: "error", message: "Revisa los campos marcados." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      let next = await api.updateBot(toUpdateInput(draft));
      if (avatar.kind === "upload") next = await api.uploadAvatar(avatar.image);
      if (avatar.kind === "remove") next = await api.removeAvatar();
      setBot(next);
      const fresh = draftFromSettings(next);
      setSaved(fresh);
      setDraft(fresh);
      setAvatar({ kind: "keep" });
      setStatus({ kind: "saved", at: new Date() });
    } catch (err) {
      setStatus({
        kind: "error",
        message: `No se guardó: ${err instanceof Error ? err.message : "error desconocido"}.`,
      });
    }
  }

  function discard() {
    setDraft(saved);
    setAvatar({ kind: "keep" });
    setErrors({});
    setStatus({ kind: "idle" });
  }

  const textOnBrand = readableTextOn(preview.theme.primaryColor);
  const brandContrast = contrastRatio(preview.theme.primaryColor, textOnBrand);
  const snippet = `<script src="${WIDGET_SCRIPT_URL}" data-bot="${bot.publicKey}" defer></script>`;
  // The widget shows the uploaded logo when there is one, else the icon.
  const showsImage =
    avatar.kind === "upload" ||
    (avatar.kind === "keep" && bot.avatarUrl !== null);
  const logoSrc =
    avatar.kind === "upload"
      ? avatar.previewUrl
      : avatar.kind === "remove"
        ? null
        : undefined;

  return (
    <div className="px-5 py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Apariencia</PageTitle>
          <p className="mt-1 text-muted">
            Así ven y oyen a tu asistente los visitantes de tu sitio. La vista
            previa cambia mientras editas; nada se publica hasta guardar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-muted">
            {status.kind === "saved" && !dirty
              ? `Guardado ${formatTime(status.at)}`
              : dirty
                ? "Cambios sin guardar"
                : ""}
          </p>
          <button
            type="button"
            onClick={discard}
            disabled={!dirty || status.kind === "saving"}
            className="h-8 rounded-control border border-control px-3 font-medium hover:bg-raised disabled:text-muted disabled:hover:bg-transparent"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || status.kind === "saving"}
            className="h-8 rounded-control bg-primary px-3 font-medium text-white hover:bg-black disabled:bg-active disabled:text-muted"
          >
            {status.kind === "saving" ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
      {status.kind === "error" && (
        <p role="alert" className="mt-3 text-negative">
          {status.message}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Section
            title="Identidad"
            help="El nombre y el saludo con los que abre la conversación."
          >
            <Field label="Nombre del asistente" error={errors.name}>
              {(id, describedBy) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.name}
                  maxLength={60}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field label="Saludo" error={errors.greeting}>
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={2}
                  value={draft.greeting}
                  maxLength={300}
                  onChange={(e) => set("greeting", e.target.value)}
                  className={textareaClass}
                />
              )}
            </Field>
          </Section>

          <Section
            title="Logo y color"
            help="El logo va en la cabecera del chat. El color pinta el botón flotante, tus mensajes y las acciones."
          >
            <fieldset>
              <legend className="font-medium">Ícono</legend>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {AVATAR_PRESETS.map((preset) => {
                  const selected = !showsImage && draft.avatarPreset === preset;
                  return (
                    <label
                      key={preset}
                      title={AVATAR_PRESET_LABELS[preset]}
                      className={`cursor-pointer rounded-[8px] p-1 outline-offset-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                        selected
                          ? "ring-2 ring-accent"
                          : "ring-1 ring-line hover:ring-control"
                      }`}
                    >
                      <input
                        type="radio"
                        name="avatarPreset"
                        value={preset}
                        checked={draft.avatarPreset === preset}
                        onChange={() => {
                          set("avatarPreset", preset);
                          // Picking an icon means "no logo".
                          if (showsImage) setAvatar({ kind: "remove" });
                        }}
                        className="sr-only"
                      />
                      <BotMark
                        bot={{
                          ...bot,
                          theme: {
                            ...bot.theme,
                            primaryColor: preview.theme.primaryColor,
                            avatarPreset: preset,
                          },
                        }}
                        src={null}
                        size={36}
                      />
                      <span className="sr-only">
                        {AVATAR_PRESET_LABELS[preset]}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <BotMark
                  bot={{ ...bot, theme: preview.theme }}
                  src={logoSrc}
                  size={40}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-8 rounded-control border border-control bg-surface px-3 font-medium hover:bg-raised"
                >
                  Subir logo
                </button>
                {showsImage && (
                  <button
                    type="button"
                    onClick={() => setAvatar({ kind: "remove" })}
                    className="text-muted hover:text-ink"
                  >
                    Quitar logo
                  </button>
                )}
                <p id="logo-hint" className="basis-full text-xs text-muted">
                  PNG, JPG o WebP. Lo reducimos a 256 px antes de subirlo.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-describedby="logo-hint"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    void pickLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </fieldset>

            <Field
              label="Color de marca"
              error={errors.primaryColor}
              hint={`Texto ${textOnBrand === "#ffffff" ? "blanco" : "oscuro"} sobre tu color · contraste ${brandContrast.toFixed(1)}:1${brandContrast < 4.5 ? " — bajo, algunos visitantes lo leerán con dificultad" : ""}`}
            >
              {(id, describedBy) => (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Elegir color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor)
                        ? draft.primaryColor
                        : "#000000"
                    }
                    onChange={(e) =>
                      set("primaryColor", e.target.value.toUpperCase())
                    }
                    className="h-10 w-12 cursor-pointer rounded-[10px] border border-line bg-surface p-1"
                  />
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.primaryColor}
                    maxLength={7}
                    onChange={(e) => set("primaryColor", e.target.value.trim())}
                    className={`${inputClass} num w-32 uppercase`}
                  />
                </div>
              )}
            </Field>

            <fieldset>
              <legend className="font-medium">Posición en la página</legend>
              <div className="mt-2 inline-flex rounded-control bg-active p-0.5">
                {(
                  [
                    ["bottom-right", "Abajo a la derecha"],
                    ["bottom-left", "Abajo a la izquierda"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-[5px] px-3 py-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                      draft.position === value
                        ? "bg-surface font-medium"
                        : "text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="position"
                      value={value}
                      checked={draft.position === value}
                      onChange={() => set("position", value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section
            title="Conversación"
            help="Las preguntas rápidas aparecen como botones en «Preguntas frecuentes»; el asistente las responde con tu conocimiento."
          >
            <fieldset>
              <legend className="font-medium">Preguntas rápidas</legend>
              <ul className="mt-2 space-y-2">
                {draft.faqQuickQuestions.map((question, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <input
                      aria-label={`Pregunta ${index + 1}`}
                      value={question}
                      maxLength={120}
                      onChange={(e) =>
                        set(
                          "faqQuickQuestions",
                          draft.faqQuickQuestions.map((q, i) =>
                            i === index ? e.target.value : q,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                    <button
                      type="button"
                      aria-label={`Quitar pregunta ${index + 1}`}
                      onClick={() =>
                        set(
                          "faqQuickQuestions",
                          draft.faqQuickQuestions.filter((_, i) => i !== index),
                        )
                      }
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-control text-muted hover:bg-active hover:text-ink"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              {draft.faqQuickQuestions.length < 6 && (
                <button
                  type="button"
                  onClick={() =>
                    set("faqQuickQuestions", [...draft.faqQuickQuestions, ""])
                  }
                  className="mt-2 flex h-8 items-center gap-1.5 font-medium text-ink"
                >
                  <Plus size={14} aria-hidden />
                  Agregar pregunta
                </button>
              )}
              {errors.faqQuickQuestions && (
                <p className="mt-1 text-negative">{errors.faqQuickQuestions}</p>
              )}
            </fieldset>

            <Field
              label="Mensaje al pasar con una persona"
              error={errors.escalationReply}
            >
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={2}
                  maxLength={300}
                  value={draft.escalationReply}
                  onChange={(e) => set("escalationReply", e.target.value)}
                  className={textareaClass}
                />
              )}
            </Field>
            <Field
              label="Palabras que piden una persona"
              hint="Separadas por comas. Si el visitante escribe una, el caso llega a Escalamientos."
              error={errors.escalationKeywords}
            >
              {(id, describedBy) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.escalationKeywords}
                  onChange={(e) => set("escalationKeywords", e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          </Section>

          <Section
            title="Personalidad"
            help="Quién es el asistente y cómo se comporta. Es la base de cada respuesta, antes de tus documentos de Conocimiento."
          >
            <Field
              label="Instrucciones del asistente"
              error={errors.persona}
              hint={`${draft.persona.length} de 4.000 caracteres`}
            >
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={8}
                  maxLength={4000}
                  value={draft.persona}
                  onChange={(e) => set("persona", e.target.value)}
                  className={textareaClass}
                />
              )}
            </Field>
          </Section>

          <Section
            title="Funciones"
            help="Lo que el menú del chat ofrece a los visitantes."
          >
            <Switch
              label="Preguntas frecuentes"
              description="Muestra tus preguntas rápidas en el menú."
              checked={draft.features.includes("FAQ")}
              onChange={(on) =>
                set("features", toggle(draft.features, "FAQ", on))
              }
            />
            <Switch
              label="Hablar con una persona"
              description="El visitante puede pedir un asesor; el caso llega a Escalamientos."
              checked={draft.features.includes("HUMAN_HANDOFF")}
              onChange={(on) =>
                set("features", toggle(draft.features, "HUMAN_HANDOFF", on))
              }
            />
            {DOMAIN_FEATURES.some((f) => bot.features.includes(f.id)) && (
              <div className="border-t border-line pt-3">
                <p className="font-medium">Funciones de tu cuenta</p>
                <ul className="mt-1 text-muted">
                  {DOMAIN_FEATURES.filter((f) =>
                    bot.features.includes(f.id),
                  ).map((f) => (
                    <li key={f.id}>{f.label}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted">
                  Usan los datos de tu empresa; para cambiarlas escribe al
                  equipo de AlturiaBot.
                </p>
              </div>
            )}
          </Section>

          <Section
            title="Instalación"
            help="Pega esta línea antes de </body> en cada página donde quieras el chat."
          >
            <CopyField value={snippet} />
            <Field
              label="Sitios permitidos (opcional)"
              hint="Uno por línea, como https://misitio.com. Vacío: cualquier sitio puede mostrar tu chat."
              error={errors.allowedOrigins}
            >
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={3}
                  value={draft.allowedOrigins}
                  onChange={(e) => set("allowedOrigins", e.target.value)}
                  className={`${textareaClass} num`}
                />
              )}
            </Field>
          </Section>
        </div>

        <aside
          aria-labelledby="preview-title"
          className="xl:sticky xl:top-6 xl:self-start"
        >
          <h2 id="preview-title" className="font-semibold">
            Vista previa
          </h2>
          <p className="mt-1 text-muted">
            Prueba el menú: las respuestas son de ejemplo.
          </p>
          <div data-ui className="mt-3 h-[640px] rounded-sheet bg-raised p-4">
            <WidgetPreview config={preview} apiBaseUrl={api.url("")} />
          </div>
        </aside>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-[10px] border border-line bg-surface px-3 outline-none focus:border-accent";
const textareaClass =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2 outline-none focus:border-accent";

function toggle<T>(list: T[], item: T, on: boolean): T[] {
  return on ? [...new Set([...list, item])] : list.filter((x) => x !== item);
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-b border-line py-8 first:pt-0 last:border-b-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6"
    >
      <div className="md:pt-2">
        <h2 id={id} className="text-base font-medium">
          {title}
        </h2>
        <p className="mt-1 text-muted">{help}</p>
      </div>
      <div className="space-y-4 rounded-sheet bg-[#fafafa] p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <div className="mt-2">
        {children(id, hint || error ? hintId : undefined)}
      </div>
      {(error ?? hint) && (
        <p
          id={hintId}
          className={`mt-1 text-xs ${error ? "text-negative" : "text-muted"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function Switch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={`${id}-label`} className="font-medium">
          {label}
        </p>
        <p id={`${id}-desc`} className="text-muted">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-[34px] flex-none rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          checked ? "bg-positive" : "bg-control"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[16px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex">
      <input
        readOnly
        aria-label="Código para instalar el chat"
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="num h-10 min-w-0 flex-1 rounded-l-[10px] border border-r-0 border-line bg-surface px-3 text-xs"
      />
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          })
        }
        className="flex h-10 flex-none items-center gap-1.5 rounded-r-[10px] border border-line bg-surface px-3 font-medium hover:bg-raised"
      >
        <Copy size={14} aria-hidden />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
