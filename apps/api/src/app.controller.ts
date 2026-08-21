import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./auth/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET / — health check. Also useful for "waking up" Render's free tier before a demo. */
  @Public()
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
