import type { z } from "zod";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  /** Sent as JSON. */
  json?: unknown;
  /** Sent as-is (e.g. an image), with `contentType`. */
  body?: Blob;
  contentType?: string;
}

/**
 * One fetch wrapper for the whole dashboard: base URL, bearer token,
 * response validation with the shared Zod schemas, and a single place that
 * reacts to an expired session.
 */
export function createHttp({
  baseUrl,
  getToken,
  onUnauthorized,
}: {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<S extends z.ZodType>(
    path: string,
    schema: S | null,
    options: RequestOptions = {},
  ): Promise<z.infer<S>> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.json);
    } else if (options.body) {
      headers["Content-Type"] = options.contentType ?? options.body.type;
      body = options.body;
    }

    const res = await fetch(`${root}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
    if (res.status === 401 && token) onUnauthorized();
    if (!res.ok) throw new HttpError(res.status, await errorMessage(res));
    if (!schema) return undefined;
    return schema.parse(await res.json());
  }

  return { request, resolve: (path: string) => `${root}${path}` };
}
export type Http = ReturnType<typeof createHttp>;

/** Nest error bodies carry `message` as a string or a list of strings. */
async function errorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    message?: string | string[];
  } | null;
  const message = body?.message;
  if (Array.isArray(message)) return message.join(" · ");
  return message ?? `La solicitud falló (${res.status})`;
}
