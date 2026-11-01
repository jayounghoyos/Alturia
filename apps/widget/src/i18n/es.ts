/**
 * Every visitor-facing string in the widget. Brand-specific copy (greeting,
 * handoff message, FAQ questions) comes from each bot's config instead.
 */
export const LOCALE = "es-CO";

export const es = {
  launcher: { open: "Abrir chat", close: "Cerrar chat" },
  header: { status: "En línea · Responde al instante", close: "Cerrar chat" },
  input: {
    label: "Escribe tu mensaje",
    placeholder: "Escribe tu mensaje...",
    send: "Enviar",
  },
  typing: "Escribiendo…",
  previewNotice:
    "Vista previa: así se verá tu asistente. Las respuestas aquí son de ejemplo.",
  previewReply:
    "Esta es una respuesta de ejemplo. En tu sitio, el asistente responde con lo que sabe de tu negocio.",

  menu: {
    prompt: "Selecciona una opción:",
    more: "¿Deseas hacer algo más?",
    back: "Volver al menú principal",
    certificates: "Consultar un certificado",
    qr: "Leer código QR del certificado",
    appointments: "Agendar un curso",
    faq: "Preguntas frecuentes",
    handoff: "Hablar con un asesor",
  },

  certificates: {
    askId:
      "Perfecto. Escribe el número de cédula del trabajador para consultar el estado de su certificación.",
    idHint: "Solo dígitos, sin puntos ni comas (8 a 10 caracteres).",
    foundMany: "Encontré estas certificaciones asociadas a este documento:",
    foundOne: "Encontré una certificación asociada a este documento:",
    notFound:
      "No encontré ningún certificado asociado a ese número de documento.",
    error:
      "Tuvimos un problema consultando el certificado. Intenta de nuevo en un momento.",
    another: "Consultar otra cédula",
    card: {
      course: "Certificado de curso",
      medical: "Examen médico ocupacional",
      valid: "VIGENTE",
      expired: "VENCIDO",
      validUntil: "Vigente hasta",
      daysLeft: "Días restantes",
      days: (n: number) => `${n} días`,
      expiredOn: "Venció el",
      status: "Estado",
      needsRenewal: "Requiere renovación",
      privacy:
        "Por seguridad solo se muestra el estado y la fecha de vencimiento.",
      reminder:
        "Enviamos un aviso automático 30 días antes de cada vencimiento.",
      scheduleRetraining: "Agendar reentrenamiento →",
    },
  },

  qr: {
    intro: "Escanea el código QR o pega/sube una captura del certificado.",
    foundMany: "Encontré estas certificaciones asociadas al código QR:",
    foundOne: "Encontré una certificación asociada al código QR:",
    notFound: "Este código QR no corresponde a un certificado registrado.",
    error:
      "Tuvimos un problema validando el QR. Intenta de nuevo o usa la cédula.",
    scanner: {
      region: "Lector de código QR",
      aiming: "Apunta la cámara al código QR o pega una captura con Ctrl + V.",
      idle: "Puedes pegar una captura o seleccionar un PNG/JPG con el código QR.",
      noCamera: "Este navegador no permite acceder a la cámara.",
      cameraDenied: "No pudimos acceder a tu cámara.",
      cameraError: "No pudimos leer el código QR de la cámara.",
      unreadable: "No encontramos un código QR legible en esa imagen.",
      upload: "Subir imagen",
      useId: "Usar cédula",
      close: "Cerrar lector",
    },
  },

  appointments: {
    pickCourse: "¿Qué curso quieres agendar?",
    noSlots: (course: string) =>
      `No hay cupos disponibles para "${course}" por ahora. Escríbenos y te avisamos apenas se abra un cupo.`,
    sessions: "Estas son las próximas fechas disponibles:",
    askId: (course: string, session: string) =>
      `Vas a agendar "${course}" — ${session}. Primero, ¿cuál es tu número de cédula?`,
    askName: "¿Cuál es tu nombre completo?",
    askPhone: "¿Cuál es tu número de teléfono de contacto?",
    consent:
      "Antes de confirmar, necesitamos tu autorización para guardar estos datos de contacto (Ley 1581 de 2012).",
    accept: "Acepto y confirmo la cita",
    booked: "¡Listo! Tu cupo quedó reservado.",
    bookingFailed:
      "No pudimos confirmar tu cita — puede que el cupo ya no esté disponible. Intenta con otra fecha.",
    coursesError:
      "No pude cargar los cursos disponibles. Intenta de nuevo en un momento.",
    availabilityError:
      "No pude cargar la disponibilidad. Intenta de nuevo en un momento.",
    card: {
      code: "Código de reserva",
      course: "Curso",
      date: "Fecha",
      time: "Hora",
      location: "Sede",
    },
  },

  faq: {
    intro:
      "Puedo resolver dudas frecuentes al instante. Elige una o escribe tu pregunta:",
    introNoQuestions: "Escribe tu pregunta y te respondo al instante.",
  },

  chat: {
    error: "Tuvimos un problema respondiendo. Intenta de nuevo en un momento.",
  },

  handoff: {
    reason: "El usuario pidió hablar con un asesor desde el menú principal.",
    fallback: (bot: string) =>
      `Listo, ya avisé al equipo de ${bot} y una persona va a revisar tu caso pronto.`,
    error:
      "No pude conectar con el equipo en este momento. Intenta de nuevo en un momento.",
    advisorPrefix: "Asesor:",
  },
} as const;

export type Strings = typeof es;
