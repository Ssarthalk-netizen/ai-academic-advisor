"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ClientError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** fetch wrapper: JSON in/out, readable error messages, redirect to login on 401. */
export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard reload clears any stale client state after the session expires
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new ClientError(res.status, data.error ?? "Something went wrong. Please try again.", data.code);
  return data as T;
}

/** Minimal data hook: { data, error, loading, reload }. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const live = useRef(true);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const d = await api<T>(url);
      if (live.current) { setData(d); setError(null); }
    } catch (e) {
      if (live.current) setError((e as Error).message);
    } finally {
      if (live.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    live.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching on mount/url change is the purpose of this hook
    reload();
    return () => { live.current = false; };
  }, [reload]);

  return { data, error, loading, reload, setData };
}
