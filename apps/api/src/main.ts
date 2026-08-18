import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Single bot, embedded only on asisaltura.com — a fixed allowlist, not a
  // wildcard "any origin" (that would only be needed if we went back to
  // multi-tenancy with arbitrary embeds).
  const allowedOrigins = [
    config.getOrThrow<string>("DASHBOARD_ORIGIN"),
    config.getOrThrow<string>("WIDGET_ORIGIN"),
  ];
  app.enableCors({ origin: allowedOrigins, credentials: true });

  await app.listen(config.get<number>("PORT") ?? 3000);
}
bootstrap();
