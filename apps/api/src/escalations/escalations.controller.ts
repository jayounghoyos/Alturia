import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  CreateEscalationSchema,
  ReplyToEscalationSchema,
  type CreateEscalationInput,
  type ReplyToEscalationInput,
} from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Public } from "../auth/public.decorator";
import { EscalationsService } from "./escalations.service";

@Controller("api/escalations")
export class EscalationsController {
  constructor(private readonly escalations: EscalationsService) {}

  /** Public — no auth. Called by the widget when the user asks for a human. */
  @Public()
  @Post()
  create(@Body(new ZodValidationPipe(CreateEscalationSchema)) body: CreateEscalationInput) {
    return this.escalations.create(body);
  }

  /** Admin-only (no @Public()) — the dashboard's escalation inbox. */
  @Get()
  list() {
    return this.escalations.listOpen();
  }

  /** Admin-only — open one case's full conversation thread. */
  @Get(":id")
  detail(@Param("id") id: string) {
    return this.escalations.getDetail(id);
  }

  /** Admin-only — reply into the conversation; auto-bumps OPEN -> IN_PROGRESS. */
  @Post(":id/reply")
  reply(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ReplyToEscalationSchema)) body: ReplyToEscalationInput,
  ) {
    return this.escalations.reply(id, body.content);
  }

  /** Admin-only — closes the case out. */
  @Patch(":id/resolve")
  resolve(@Param("id") id: string) {
    return this.escalations.resolve(id);
  }
}
