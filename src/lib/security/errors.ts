import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Error whose message is safe to show to the user. Anything else becomes a generic message. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler: validation errors -> 400 with field names only,
 * ApiError -> its status/message, everything else -> 500 "Something went wrong"
 * with full details logged on the server only (never sent to the browser).
 */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      // CSRF defence in depth: state-changing requests must come from our own origin.
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) {
          throw new ApiError(403, "Cross-site request blocked.", "csrf");
        }
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid input.", fields: [...new Set(err.issues.map((i) => i.path.join(".") || "body"))] },
          { status: 400 },
        );
      }
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      const id = crypto.randomUUID().slice(0, 8);
      console.error(`[api:${id}] ${req.method} ${new URL(req.url).pathname}`, err);
      return NextResponse.json({ error: "Something went wrong. Please try again.", ref: id }, { status: 500 });
    }
  };
}

/** Reject oversized or non-JSON bodies before parsing. */
export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "Expected a JSON body.");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Malformed JSON.");
  }
}
