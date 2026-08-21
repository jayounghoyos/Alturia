import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CreateKnowledgeSourceSchema, type CreateKnowledgeSourceInput } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { KnowledgeService } from "./knowledge.service";

/** Admin-only (no @Public()) — the bot's uploaded context/behavior document(s). */
@Controller("api/knowledge")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list() {
    return this.knowledge.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(CreateKnowledgeSourceSchema)) body: CreateKnowledgeSourceInput) {
    return this.knowledge.create(body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.knowledge.remove(id);
  }
}
