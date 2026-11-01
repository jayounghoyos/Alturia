import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Asis Altura doesn't share their real database, so this seeds simulated
// data faithful to the domain (see prisma/README.md). Idempotent: re-running
// this must not duplicate anything — every row uses a fixed id or an upsert
// on a stable unique field instead of a bare `create`.
//
// Bots and admins are create-only (`update: {}`): Render runs this on every
// deploy, and it must never overwrite what a client edited in the dashboard.
// Asis Altura's bot ("bot_default") is created by its migration, so existing
// conversations could be backfilled into it.

const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";

async function seedAdmin(email: string, name: string, botId: string) {
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      botId,
      passwordHash: await bcrypt.hash(seedPassword, 10),
    },
  });
  console.log(
    process.env.SEED_ADMIN_PASSWORD
      ? `Seeded admin login: ${email} (password from SEED_ADMIN_PASSWORD)`
      : `Seeded admin login: ${email} / ${seedPassword} (default dev password — override with SEED_ADMIN_PASSWORD)`,
  );
}

/**
 * A second, generic client so multi-bot behaviour can be shown and tested:
 * its own brand, persona and admin, and only the generic features (no access
 * to Asis Altura's workers or courses).
 */
async function seedDemoBot() {
  await prisma.bot.upsert({
    where: { id: "bot_demo" },
    update: {},
    create: {
      id: "bot_demo",
      slug: "demo",
      publicKey: "pk_demo",
      name: "Café Ladera",
      greeting:
        "¡Hola! Soy el asistente de Café Ladera. Pregúntame por horarios, pedidos o domicilios.",
      theme: {
        primaryColor: "#7C2D12",
        position: "bottom-left",
        avatarPreset: "chat",
      },
      persona: `Eres el asistente virtual de Café Ladera, una tienda de café de especialidad en Medellín.

Reglas de comportamiento:
- Responde siempre en español, de forma breve, clara y amable.
- Nunca inventes precios, horarios ni promociones que no estén en el contexto; si no lo sabes, dilo y ofrece hablar con una persona del equipo.`,
      escalationKeywords: ["asesor", "humano", "persona", "queja", "reclamo"],
      escalationReply:
        "Listo, le avisé al equipo de Café Ladera. Una persona te va a responder por aquí mismo.",
      faqQuickQuestions: [
        "¿Cuál es el horario?",
        "¿Hacen domicilios?",
        "¿Venden café en grano?",
      ],
      features: ["FAQ", "HUMAN_HANDOFF"],
      allowedOrigins: [],
    },
  });
}

async function seedCourses() {
  await prisma.course.upsert({
    where: { id: "course-advanced" },
    update: {},
    create: {
      id: "course-advanced",
      name: "Trabajo Seguro en Alturas - Nivel Avanzado",
      type: "ADVANCED",
    },
  });

  await prisma.course.upsert({
    where: { id: "course-retraining" },
    update: {},
    create: {
      id: "course-retraining",
      name: "Reentrenamiento Trabajo en Alturas",
      type: "RETRAINING",
    },
  });
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function seedCourseSessions() {
  const sessions = [
    {
      id: "session-advanced-1",
      courseId: "course-advanced",
      date: daysFromNow(7),
      time: "08:00",
      availableSlots: 12,
      location: "Sede Medellín",
    },
    {
      id: "session-advanced-2",
      courseId: "course-advanced",
      date: daysFromNow(14),
      time: "14:00",
      availableSlots: 8,
      location: "Sede Medellín",
    },
    {
      id: "session-retraining-1",
      courseId: "course-retraining",
      date: daysFromNow(5),
      time: "08:00",
      availableSlots: 15,
      location: "Sede Bogotá",
    },
  ];

  for (const session of sessions) {
    await prisma.courseSession.upsert({
      where: { id: session.id },
      update: {},
      create: session,
    });
  }
}

async function seedWorkersAndCertificates() {
  // nationalId matches the number shown in the original A1 mockup screenshot.
  const worker1 = await prisma.worker.upsert({
    where: { nationalId: "1036482117" },
    update: {},
    create: {
      nationalId: "1036482117",
      name: "Carlos Restrepo",
      phone: "3001234567",
    },
  });

  const worker2 = await prisma.worker.upsert({
    where: { nationalId: "1234567890" },
    update: {},
    create: {
      nationalId: "1234567890",
      name: "María Gómez",
      phone: "3009876543",
    },
  });

  // worker1: both certificates valid — the "everything's fine" demo path.
  await prisma.certificate.upsert({
    where: { id: "cert-worker1-course" },
    update: { publicToken: "demo-worker1-course" },
    create: {
      id: "cert-worker1-course",
      publicToken: "demo-worker1-course",
      workerId: worker1.id,
      courseId: "course-advanced",
      expirationType: "COURSE",
      issuedAt: daysFromNow(-300),
      expiresAt: daysFromNow(65),
      status: "VALID",
    },
  });
  await prisma.certificate.upsert({
    where: { id: "cert-worker1-medical" },
    update: { publicToken: "demo-worker1-medical" },
    create: {
      id: "cert-worker1-medical",
      publicToken: "demo-worker1-medical",
      workerId: worker1.id,
      courseId: "course-advanced",
      expirationType: "MEDICAL_EXAM",
      issuedAt: daysFromNow(-150),
      expiresAt: daysFromNow(215),
      status: "VALID",
    },
  });

  // worker2: expired course certificate but a valid medical exam — the demo
  // path for "the two expiration types are independent" (HU-01).
  await prisma.certificate.upsert({
    where: { id: "cert-worker2-course" },
    update: { publicToken: "demo-worker2-course" },
    create: {
      id: "cert-worker2-course",
      publicToken: "demo-worker2-course",
      workerId: worker2.id,
      courseId: "course-retraining",
      expirationType: "COURSE",
      issuedAt: daysFromNow(-400),
      expiresAt: daysFromNow(-35),
      status: "EXPIRED",
    },
  });
  await prisma.certificate.upsert({
    where: { id: "cert-worker2-medical" },
    update: { publicToken: "demo-worker2-medical" },
    create: {
      id: "cert-worker2-medical",
      publicToken: "demo-worker2-medical",
      workerId: worker2.id,
      courseId: "course-retraining",
      expirationType: "MEDICAL_EXAM",
      issuedAt: daysFromNow(-100),
      expiresAt: daysFromNow(265),
      status: "VALID",
    },
  });

  // Any other nationalId (e.g. from the widget's "not found" test path) simply
  // won't match a Worker row — that's the A4 mockup case, no seed needed for it.
}

async function main() {
  await seedAdmin("admin@asisaltura.co", "Asis Altura Admin", "bot_default");
  await seedDemoBot();
  await seedAdmin("admin@cafeladera.co", "Café Ladera Admin", "bot_demo");
  await seedCourses();
  await seedCourseSessions();
  await seedWorkersAndCertificates();
  // Knowledge base (FAQ content -> embedded chunks) is seeded separately once
  // the RAG/chat module lands — it needs a live embedding provider to run.
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
