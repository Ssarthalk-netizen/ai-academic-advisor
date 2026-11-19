// Public (browser-safe) values only. The anon/publishable key is designed to be
// public: Row Level Security is what protects the data.

/** Accepts a URL copied with extra path (e.g. ".../rest/v1/") and keeps only the origin. */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return raw.trim();
  }
}

export const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
