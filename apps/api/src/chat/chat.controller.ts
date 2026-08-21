import { Controller, Get, Param, Body, Post } from "@nestjs/common";
import { ChatRequestSchema, type ChatRequestInput } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Public } from "../auth/public.decorator";
import { ChatService } from "./chat.service";

/** Public — no auth. Called by the embedded widget. */
@Public()
@Controller("api/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  send(@Body(new ZodValidationPipe(ChatRequestSchema)) body: ChatRequestInput) {
    return this.chat.handleMessage(body.sessionId, body.message);
  }

  /**
   * Polled by the widget after an escalation, to pick up ADMIN replies typed
   * from the dashboard. sessionId is a UUID the visitor's own browser
   * generated — same trust model as the rest of the public API (see main.ts).
   */
  @Get(":sessionId/messages")
  getMessages(@Param("sessionId") sessionId: string) {
    return this.chat.getMessages(sessionId);
  }
}
