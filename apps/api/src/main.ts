import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Open CORS on purpose — an embeddable widget has to work on whatever
  // origin a customer pastes the script tag into, which we can't know in
  // advance (that's the whole point of "paste this HTML anywhere"). This
  // isn't a security gap: we never use cookies, so there's nothing for a
  // third-party origin to ride on, and every route that actually needs
  // protecting (dashboard/admin endpoints) is gated by JwtAuthGuard, not by
  // which origin the request came from.
  app.enableCors({ origin: true });

  await app.listen(config.get<number>("PORT") ?? 3000);
}
bootstrap();
