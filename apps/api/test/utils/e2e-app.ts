import { randomInt, randomUUID } from "node:crypto";
import { LoginResponseSchema } from "@alturia/shared";
import type { INestApplication } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import request from "supertest";
import type { App } from "supertest/types";
import { AppModule } from "../../src/app.module";
import {
  LLM_CHAT_PROVIDER,
  type LlmChatProvider,
} from "../../src/llm/llm.interface";
import { PrismaService } from "../../src/prisma/prisma.service";

export interface E2eContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  /** The fake LLM's chat(): stands in for Ollama/OpenRouter — deterministic, free and inspectable. */
  llmChat: jest.MockedFunction<LlmChatProvider["chat"]>;
}

/**
 * Boots the real AppModule (guards, pipes, Prisma, every controller) against
 * the e2e database from global-setup.ts. Only the LLM is replaced, since a real
 * model is slow, costs money and never answers the same way twice.
 */
export async function createE2eApp(): Promise<E2eContext> {
  const llmChat: jest.MockedFunction<LlmChatProvider["chat"]> = jest
    .fn()
    .mockResolvedValue({ content: "Respuesta del LLM falso" });
  const llm: LlmChatProvider = { chat: llmChat };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LLM_CHAT_PROVIDER)
    .useValue(llm)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  return { app, prisma: app.get(PrismaService), llmChat };
}

/** A random, valid 10-digit cédula, so parallel test files never collide. */
export function randomNationalId(): string {
  return String(randomInt(1_000_000_000, 9_999_999_999));
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Creates a course with its own unique id and returns it. */
export function createCourse(prisma: PrismaService) {
  return prisma.course.create({
    data: {
      id: `course-${randomUUID()}`,
      name: "Curso e2e",
      type: "RETRAINING",
    },
  });
}

/** Creates an admin with a unique email and returns a valid Bearer token for it. */
export async function createAdminToken(
  ctx: E2eContext,
  botId = "bot_default",
): Promise<string> {
  const email = `admin-${randomUUID()}@e2e.test`;
  const password = "e2e-password";
  await ctx.prisma.adminUser.create({
    data: {
      email,
      name: "Admin e2e",
      botId,
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  const res = await request(ctx.app.getHttpServer())
    .post("/api/auth/login")
    .send({ email, password })
    .expect(201);
  return LoginResponseSchema.parse(res.body).accessToken;
}

/** A throwaway client bot with its own unique slug and public key. */
export function createBot(
  prisma: PrismaService,
  overrides: Partial<Prisma.BotUncheckedCreateInput> = {},
) {
  const suffix = randomUUID().slice(0, 8);
  return prisma.bot.create({
    data: {
      slug: `e2e-${suffix}`,
      publicKey: `pk_e2e_${suffix}`,
      name: `Bot e2e ${suffix}`,
      greeting: "Hola desde el bot e2e",
      theme: { primaryColor: "#123456", position: "bottom-left" },
      persona: `Eres el bot e2e ${suffix}.`,
      escalationKeywords: ["asesor"],
      escalationReply: "Un asesor del bot e2e te escribe pronto.",
      faqQuickQuestions: ["¿Pregunta e2e?"],
      features: ["FAQ", "HUMAN_HANDOFF"],
      allowedOrigins: [],
      ...overrides,
    },
  });
}

export const BOT_HEADER = "X-Alturia-Bot";
