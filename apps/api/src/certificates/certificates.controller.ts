import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { NationalIdSchema } from "@alturia/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CertificatesService } from "./certificates.service";

@Controller("api/certificates")
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  /** Public — no auth. Mockups A1-A4: lookup by national ID (cédula). */
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
