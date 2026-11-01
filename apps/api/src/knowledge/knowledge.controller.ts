import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import {
  CreateKnowledgeSourceSchema,
  type CreateKnowledgeSourceInput,
} from "@alturia/shared";
import type { ResolvedBot } from "../bots/bot.types";
import { CurrentBot } from "../bots/current-bot.decorator";
import { ParseIdPipe } from "../common/id-param.pipe";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { KnowledgeService } from "./knowledge.service";

/** Admin-only (no @Public()) — the admin's bot's uploaded context document(s). */
@Controller("api/knowledge")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(@CurrentBot() bot: ResolvedBot) {
    return this.knowledge.list(bot.id);
  }

  @Post()
  create(
    @CurrentBot() bot: ResolvedBot,
    @Body(new ZodValidationPipe(CreateKnowledgeSourceSchema))
    body: CreateKnowledgeSourceInput,
  ) {
    return this.knowledge.create(bot.id, body);
  }

  @Delete(":id")
  remove(@CurrentBot() bot: ResolvedBot, @Param("id", ParseIdPipe) id: string) {
    return this.knowledge.remove(bot.id, id);
  }
}
