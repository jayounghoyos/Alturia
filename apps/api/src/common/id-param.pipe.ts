import { BadRequestException, type PipeTransform } from "@nestjs/common";

/** cuid / uuid shaped ids — rejects garbage before it reaches the database. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!ID_PATTERN.test(value)) throw new BadRequestException("Invalid id");
    return value;
  }
}
