import { Injectable } from "@nestjs/common";
import type { CertificateLookupResponse } from "@alturia/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns null when no worker matches — the controller maps that to 404 (mockup A4). */
  async lookupByNationalId(
    nationalId: string,
  ): Promise<CertificateLookupResponse | null> {
    const worker = await this.prisma.worker.findUnique({
      where: { nationalId },
      include: { certificates: true },
    });
    if (!worker) return null;

    // Security NFR: only binary status + expiration date, never name/phone/etc.
    return {
      certificates: worker.certificates.map((c) => ({
        expirationType: c.expirationType,
        status: getCurrentStatus(c.expiresAt),
        expiresAt: c.expiresAt.toISOString(),
      })),
    };
  }

  async lookupByQrPayload(
    payload: string,
  ): Promise<CertificateLookupResponse | null> {
    const publicToken = extractPublicToken(payload);
    if (!publicToken) return null;

    const certificate = await this.prisma.certificate.findUnique({
      where: { publicToken },
    });
    if (!certificate) return null;

    return {
      certificates: [
        {
          expirationType: certificate.expirationType,
          status: getCurrentStatus(certificate.expiresAt),
          expiresAt: certificate.expiresAt.toISOString(),
        },
      ],
    };
  }
}

function getCurrentStatus(expiresAt: Date): "VALID" | "EXPIRED" {
  return expiresAt.getTime() > Date.now() ? "VALID" : "EXPIRED";
}

/**
 * The first QR contract accepts an opaque token, an Alturia URL, or the
 * future-friendly alturia:// scheme. Keeping parsing here lets the real
 * certificate format be added without changing the widget or database lookup.
 */
function extractPublicToken(payload: string): string | null {
  const value = payload.trim();
  if (!value) return null;

  if (value.startsWith("alturia://certificate/")) {
    return (
      decodeURIComponent(value.slice("alturia://certificate/".length)) || null
    );
  }

  try {
    const url = new URL(value);
    const token = url.searchParams.get("token");
    if (token) return token;
    const marker = "/certificates/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return (
        decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) ||
        null
      );
    }
  } catch {
    // Plain opaque tokens are the supported test format.
  }

  return /^[A-Za-z0-9._~-]+$/.test(value) ? value : null;
}
