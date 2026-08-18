import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { LlmModule } from "./llm/llm.module";

@Module({
  imports: [
    // pnpm --filter api ... runs with cwd = apps/api, so the shared .env at
    // the monorepo root is two levels up.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), "../../.env"),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    LlmModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
