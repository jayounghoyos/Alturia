import { Injectable } from "@nestjs/common";
import type { CertificateLookupResponse } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns null when no worker matches — the controller maps that to 404 (mockup A4). */
  async lookupByNationalId(nationalId: string): Promise<CertificateLookupResponse | null> {
    const worker = await this.prisma.worker.findUnique({
      where: { nationalId },
      include: { certificates: true },
    });
    if (!worker) return null;

    // Security NFR: only binary status + expiration date, never name/phone/etc.
    return {
      certificates: worker.certificates.map((c) => ({
        expirationType: c.expirationType,
        status: c.status,
        expiresAt: c.expiresAt.toISOString(),
      })),
    };
  }
}
