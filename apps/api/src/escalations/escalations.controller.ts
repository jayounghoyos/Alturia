import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateEscalationSchema, type CreateEscalationInput } from "@alturia/shared";
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
}
