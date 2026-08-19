import { resolve } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { LlmModule } from "./llm/llm.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { CoursesModule } from "./courses/courses.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { BotModule } from "./bot/bot.module";
import { ChatModule } from "./chat/chat.module";
import { AuthModule } from "./auth/auth.module";
import { EscalationsModule } from "./escalations/escalations.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";

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
    CertificatesModule,
    CoursesModule,
    AppointmentsModule,
    BotModule,
    ChatModule,
    AuthModule,
    EscalationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Protects everything by default — routes opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
