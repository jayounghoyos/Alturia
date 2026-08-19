import { Body, Controller, Post } from "@nestjs/common";
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
}
