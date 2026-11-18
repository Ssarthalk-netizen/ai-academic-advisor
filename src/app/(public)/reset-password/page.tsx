"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import { createClient } from "@/lib/supabase/client";

/** Two states: request a reset link, or (after clicking the link) choose a new password. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "critical"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  async function request(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ message: string }>("/api/auth/reset", { body: { email: new FormData(e.currentTarget).get("email") } });
      setMsg({ tone: "info", text: r.message });
    } catch (err) { setMsg({ tone: "critical", text: (err as Error).message }); } finally { setBusy(false); }
  }

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get("password"));
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/.test(pw)) {
      setMsg({ tone: "critical", text: "Password needs 8+ characters with upper-case, lower-case and a number." });
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ tone: "critical", text: "Couldn't update the password. Request a new link and try again." });
    else router.replace("/dashboard");
  }

  return (
    <AuthShell title={hasSession ? "Choose a new password" : "Reset your password"}
      intro={hasSession ? "Pick something you haven't used before." : "We'll email you a link to set a new password."}>
      <div className="space-y-4">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        {hasSession ? (
          <form onSubmit={update} className="space-y-4">
            <div><label className="label" htmlFor="password">New password</label>
              <input id="password" name="password" type="password" minLength={8} maxLength={72} required className="field" autoComplete="new-password" /></div>
            <button className="btn btn-primary w-full py-3" disabled={busy}>Save new password</button>
          </form>
        ) : (
          <form onSubmit={request} className="space-y-4">
            <div><label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required maxLength={254} className="field" autoComplete="email" /></div>
            <button className="btn btn-primary w-full py-3" disabled={busy}>Send reset link</button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
