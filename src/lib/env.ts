import "server-only";
import { z } from "zod";

/** Validated server environment. Fails fast with a clear message if a key is missing. */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(20),
  GEMINI_MODEL: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Server misconfigured: missing or invalid environment variables: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
