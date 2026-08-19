import { Controller, Get, Param } from "@nestjs/common";
import { CoursesService } from "./courses.service";

@Controller("api/courses")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  /** Public — no auth. Mockup B1: course selection. */
  @Get()
  list() {
    return this.courses.listCourses();
  }

  /** Public — no auth. Mockup B2: date/time selection, only sessions with open slots. */
  @Get(":id/availability")
  availability(@Param("id") id: string) {
    return this.courses.listAvailability(id);
  }
}
