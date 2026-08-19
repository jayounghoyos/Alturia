import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { NationalIdSchema } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { Public } from "../auth/public.decorator";
import { CertificatesService } from "./certificates.service";

/** Public — no auth. Mockups A1-A4: lookup by national ID (cédula). */
@Public()
@Controller("api/certificates")
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get(":nationalId")
  async lookup(
    @Param("nationalId", new ZodValidationPipe(NationalIdSchema)) nationalId: string,
  ) {
    const result = await this.certificates.lookupByNationalId(nationalId);
    if (!result) {
      throw new NotFoundException("No certificates found for this national ID");
    }
    return result;
  }
}
