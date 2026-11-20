import "server-only";
import { createAdminClient } from "../supabase/admin";
import { ApiError } from "./errors";

/**
 * Configurable limits (override with env vars, e.g. RATE_LIMIT_AI="20/60").
 * Format: "<max requests>/<window seconds>".
 */
const DEFAULTS = {
  AUTH: "60/600",     // login / signup / password reset per IP: 60 per 10 min (college Wi-Fi shares one IP)
  AUTH_ACCOUNT: "15/600", // sign-in attempts per account: 15 per 10 min
  AI: "20/300",       // Gemini-backed routes per user: 20 per 5 min
  AI_DAILY: "150/86400",
  WRITE: "120/60",    // record create/update per user
  UPLOAD: "10/3600",
} as const;
export type LimitName = keyof typeof DEFAULTS;

function parse(name: LimitName) {
  const raw = process.env[`RATE_LIMIT_${name}`] ?? DEFAULTS[name];
  const [max, win] = raw.split("/").map(Number);
  return Number.isFinite(max) && Number.isFinite(win) && max > 0 && win > 0 ? { max, win } : parse2(DEFAULTS[name]);
}
function parse2(raw: string) {
  const [max, win] = raw.split("/").map(Number);
  return { max, win };
}

/** Throws 429 when the limit is exceeded. Fails open (logs) if the limiter itself errors. */
export async function rateLimit(name: LimitName, key: string) {
  const { max, win } = parse(name);
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${name}:${key}`,
    p_max: max,
    p_window_seconds: win,
  });
  if (error) {
    console.error("[rate-limit] limiter unavailable", error.message);
    return;
  }
  if (data === false) {
    throw new ApiError(429, "Too many requests. Please wait a few minutes and try again.", "rate_limited");
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
