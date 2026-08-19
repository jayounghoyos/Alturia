import { Body, Controller, Post } from "@nestjs/common";
import { CreateAppointmentSchema, type CreateAppointmentInput } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AppointmentsService } from "./appointments.service";

@Controller("api/appointments")
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  /** Public — no auth. Mockups B3->B4: contact details in, confirmation out, in one step. */
  @Post()
  create(@Body(new ZodValidationPipe(CreateAppointmentSchema)) body: CreateAppointmentInput) {
    return this.appointments.createAppointment(body);
  }
}
