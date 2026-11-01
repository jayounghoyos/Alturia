import { PayloadTooLargeException } from "@nestjs/common";
import type { Request } from "express";

/**
 * Reads a binary request body (Nest only parses JSON and form bodies, so an
 * image/* body is still unread), refusing anything over `limit` bytes.
 */
export async function readRawBody(
  req: Request,
  limit: number,
): Promise<Buffer> {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > limit) throw new PayloadTooLargeException();

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > limit) throw new PayloadTooLargeException();
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** The image type from the file's own first bytes — the Content-Type header is not trusted. */
export function sniffImageMime(
  bytes: Buffer,
): "image/png" | "image/jpeg" | "image/webp" | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
