"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { Notice } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? "That link has expired or was already used. Request a new one." : null);
  const [done, setDone] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const r = await api<{ needsConfirmation: boolean }>("/api/auth/signup", {
          body: { email: f.get("email"), password: f.get("password"), full_name: f.get("full_name") || null },
        });
        if (r.needsConfirmation) { setDone("Check your email for a confirmation link, then sign in."); return; }
        router.replace("/onboarding");
      } else {
        await api("/api/auth/login", { body: { email: f.get("email"), password: f.get("password") } });
        const next = params.get("next");
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Notice tone="info" title="Almost there">{done}</Notice>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {error && <Notice tone="critical">{error}</Notice>}
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="full_name">Your name</label>
          <input id="full_name" name="full_name" className="field" maxLength={100} autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required maxLength={254} className="field" autoComplete="email" />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="password">Password</label>
          {mode === "login" && <Link href="/reset-password" className="text-[13px] text-ink-soft underline-offset-2 hover:underline">Forgot password?</Link>}
        </div>
        <input id="password" name="password" type="password" required minLength={8} maxLength={72} className="field"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-describedby={mode === "signup" ? "pw-hint" : undefined} />
        {mode === "signup" && <p id="pw-hint" className="mt-1 text-[12px] text-ink-faint">At least 8 characters, with upper-case, lower-case and a number.</p>}
      </div>
      {mode === "signup" && (
        <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
          <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-[#3a1607]" />
          <span>I&apos;m 18 or older and I agree to the <Link href="/terms" className="underline">terms of use</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.</span>
        </label>
      )}
      <button className="btn btn-primary w-full py-3" disabled={busy || (mode === "signup" && !agree)}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-[13.5px] text-ink-soft">
        {mode === "login" ? <>New here? <Link href="/signup" className="font-semibold text-ink underline">Create an account</Link></>
          : <>Already have an account? <Link href="/login" className="font-semibold text-ink underline">Sign in</Link></>}
      </p>
    </form>
  );
}
