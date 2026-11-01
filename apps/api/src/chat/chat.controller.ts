import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ChatRequestSchema, type ChatRequestInput } from "@alturia/shared";
import { Public } from "../auth/public.decorator";
import type { ResolvedBot } from "../bots/bot.types";
import { CurrentBot } from "../bots/current-bot.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ChatService } from "./chat.service";

/** Public — no auth. Called by the embedded widget. */
@Public()
@Controller("api/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Tighter than the global limit: every message can cost an LLM call on a free quota. */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  send(
    @CurrentBot() bot: ResolvedBot,
    @Body(new ZodValidationPipe(ChatRequestSchema)) body: ChatRequestInput,
  ) {
    return this.chat.handleMessage(bot, body.sessionId, body.message);
  }

  /**
   * Polled by the widget after an escalation, to pick up ADMIN replies typed
   * from the dashboard. sessionId is a UUID the visitor's own browser
   * generated — same trust model as the rest of the public API (see main.ts).
   */
  @Get(":sessionId/messages")
  getMessages(
    @CurrentBot() bot: ResolvedBot,
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
  ) {
    return this.chat.getMessages(bot.id, sessionId);
  }
}
