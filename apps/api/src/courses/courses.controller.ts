import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { CoursesService } from "./courses.service";

/** Public — no auth. Mockups B1/B2: course selection and availability. */
@Public()
@Controller("api/courses")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list() {
    return this.courses.listCourses();
  }

  @Get(":id/availability")
  availability(@Param("id") id: string) {
    return this.courses.listAvailability(id);
  }
}
