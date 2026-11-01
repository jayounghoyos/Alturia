import { Body, Controller, Post } from "@nestjs/common";
import {
  CreateAppointmentSchema,
  type CreateAppointmentInput,
} from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Public } from "../auth/public.decorator";
import { RequiresFeature } from "../bots/requires-feature.decorator";
import { AppointmentsService } from "./appointments.service";

/** Public — no auth. Mockups B3->B4: contact details in, confirmation out, in one step. */
@Public()
@RequiresFeature("APPOINTMENTS")
@Controller("api/appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateAppointmentSchema))
    body: CreateAppointmentInput,
  ) {
    return this.appointments.createAppointment(body);
  }
}
