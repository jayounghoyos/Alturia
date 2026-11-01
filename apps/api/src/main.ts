import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import type { Env } from "./config/env.schema";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Open CORS on purpose — an embeddable widget has to work on whatever
  // origin a customer pastes the script tag into, which we can't know in
  // advance (that's the whole point of "paste this HTML anywhere"). This
  // isn't a security gap: we never use cookies, so there's nothing for a
  // third-party origin to ride on, and every route that actually needs
  // protecting (dashboard/admin endpoints) is gated by JwtAuthGuard, not by
  // which origin the request came from.
  // maxAge: the X-Alturia-Bot header makes browsers preflight; caching the
  // preflight keeps polling and cold starts from paying for it every time.
  app.enableCors({ origin: true, maxAge: 86_400 });

  await app.listen(config.get("PORT", { infer: true }));
}
void bootstrap();
