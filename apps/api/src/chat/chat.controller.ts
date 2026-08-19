import { Body, Controller, Post } from "@nestjs/common";
import { ChatRequestSchema, type ChatRequestInput } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ChatService } from "./chat.service";

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** Public — no auth. Called by the embedded widget. */
  @Post()
  send(@Body(new ZodValidationPipe(ChatRequestSchema)) body: ChatRequestInput) {
    return this.chat.handleMessage(body.sessionId, body.message);
  }
}
