import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  CreateEscalationSchema,
  ReplyToEscalationSchema,
  type CreateEscalationInput,
  type ReplyToEscalationInput,
} from "@alturia/shared";
import { Public } from "../auth/public.decorator";
import type { ResolvedBot } from "../bots/bot.types";
import { CurrentBot } from "../bots/current-bot.decorator";
import { RequiresFeature } from "../bots/requires-feature.decorator";
import { ParseIdPipe } from "../common/id-param.pipe";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { EscalationsService } from "./escalations.service";

@Controller("api/escalations")
export class EscalationsController {
  constructor(private readonly escalations: EscalationsService) {}

  /** Public — no auth. Called by the widget when the user asks for a human. */
  @Public()
  @RequiresFeature("HUMAN_HANDOFF")
  @Post()
  create(
    @CurrentBot() bot: ResolvedBot,
    @Body(new ZodValidationPipe(CreateEscalationSchema))
    body: CreateEscalationInput,
  ) {
    return this.escalations.create(bot.id, body);
  }

  /** Admin-only (no @Public()) — the dashboard's escalation inbox. */
  @Get()
  list(@CurrentBot() bot: ResolvedBot) {
    return this.escalations.listOpen(bot.id);
  }

  /** Admin-only — open one case's full conversation thread. */
  @Get(":id")
  detail(@CurrentBot() bot: ResolvedBot, @Param("id", ParseIdPipe) id: string) {
    return this.escalations.getDetail(bot.id, id);
  }

  /** Admin-only — reply into the conversation; auto-bumps OPEN -> IN_PROGRESS. */
  @Post(":id/reply")
  reply(
    @CurrentBot() bot: ResolvedBot,
    @Param("id", ParseIdPipe) id: string,
    @Body(new ZodValidationPipe(ReplyToEscalationSchema))
    body: ReplyToEscalationInput,
  ) {
    return this.escalations.reply(bot.id, id, body.content);
  }

  /** Admin-only — closes the case out. */
  @Patch(":id/resolve")
  resolve(
    @CurrentBot() bot: ResolvedBot,
    @Param("id", ParseIdPipe) id: string,
  ) {
    return this.escalations.resolve(bot.id, id);
  }
}
