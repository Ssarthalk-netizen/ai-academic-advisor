"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Trash2 } from "lucide-react";
import { AiLabel, Badge, Notice } from "@/components/ui";
import { Markdown } from "@/components/ui/Markdown";
import { api, useApi } from "@/lib/client/api";

type Msg = { id?: string; role: "user" | "assistant"; content: string; intent?: string | null; confidence?: number | null; escalated?: boolean; source?: string };
type Reply = { reply: string; source: string; escalated: boolean; intent: { name: string; confidence: number; threshold: number; inScope: boolean } };

const MODES = [["default", "Normal"], ["simple", "Simpler"], ["example", "With an example"], ["exam", "Exam answer"], ["deep", "Deeper"]] as const;
const STARTERS = ["Am I at risk of failing this semester?", "Which subject should I focus on this week?", "Suggest electives for machine learning", "How is SGPA calculated?", "Explain normalization in DBMS"];

export default function Advisor() {
  const history = useApi<{ data: Msg[] }>("/api/chat");
  const profile = useApi<{ data: { ai_consent: boolean } }>("/api/profile");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- seed local chat state once history loads
  useEffect(() => { if (history.data) setMsgs(history.data.data); }, [history.data]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  async function send(message: string) {
    const m = message.trim();
    if (!m || busy) return;
    setText(""); setError(null); setBusy(true);
    setMsgs((x) => [...x, { role: "user", content: m }]);
    try {
      const r = await api<Reply>("/api/chat", { body: { message: m, mode } });
      setMsgs((x) => [...x, { role: "assistant", content: r.reply, intent: r.intent.name, confidence: r.intent.confidence, escalated: r.escalated, source: r.source }]);
    } catch (e) {
      setError((e as Error).message);
      setMsgs((x) => x.slice(0, -1));
      setText(m);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-[calc(100dvh-140px)] min-h-[520px] flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-[34px] sm:text-[40px]">AI advisor</h1>
          <p className="mt-1 max-w-2xl text-ink-soft">Answers use your own records. A small ML model first works out what you&apos;re asking. College FAQs are answered directly, and everything else goes to Gemini.</p>
        </div>
        {msgs.length > 0 && <button className="btn btn-ghost" onClick={async () => { await api("/api/chat", { method: "DELETE" }); setMsgs([]); }}><Trash2 className="size-4" />Clear chat</button>}
      </div>

      {profile.data && !profile.data.data.ai_consent && (
        <div className="mt-4"><Notice tone="info" title="AI features are off">
          FAQs, risk checks and course suggestions still work. To get full answers, turn on AI features in <Link className="underline" href="/settings">Settings</Link>.
        </Notice></div>
      )}

      <div className="mt-5 flex-1 overflow-y-auto rounded-[18px] border border-line bg-[#fffbee] p-4 sm:p-6" aria-live="polite">
        {msgs.length === 0 && !history.loading && (
          <div className="mx-auto max-w-lg py-10 text-center">
            <p className="font-semibold">Try asking</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13.5px] hover:border-ink-faint">{s}</button>)}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[80%] rounded-[16px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[14.5px] text-[#fff8e6]">{m.content}</div>
          ) : (
            <div key={i} className={`max-w-[88%] rounded-[16px] rounded-bl-[6px] border px-4 py-3 text-[14.5px] ${m.escalated ? "border-[#f8cfa9] bg-ember-soft" : "border-line bg-white"}`}>
              <Markdown text={m.content} />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-faint">
                {m.escalated && <Badge tone="ember">Connecting you with people who can help</Badge>}
                {m.intent && <span>Intent: {m.intent.replace(/_/g, " ")}{typeof m.confidence === "number" ? ` (${Math.round(m.confidence * 100)}% confident)` : ""}</span>}
                {m.source === "faq" && <Badge tone="plain">from FAQ</Badge>}
              </div>
              {(m.source === "ai" || (!m.source && !m.escalated)) && <AiLabel />}
            </div>
          ))}
          {busy && <div className="w-24 animate-pulse rounded-[16px] border border-line bg-white px-4 py-3 text-ink-faint">Thinking…</div>}
          <div ref={end} />
        </div>
      </div>

      {error && <div className="mt-3"><Notice tone="critical">{error}</Notice></div>}
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Answer style">
        {MODES.map(([v, l]) => (
          <button key={v} role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
            className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${mode === v ? "bg-butter text-ink" : "text-ink-soft hover:bg-butter-soft"}`}>{l}</button>
        ))}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="msg" className="sr-only">Message</label>
        <textarea id="msg" rows={1} maxLength={1500} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your subjects, marks, plan or career…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
          className="field min-h-[48px] resize-none py-3" />
        <button className="btn btn-primary px-4" disabled={busy || !text.trim()} aria-label="Send"><SendHorizontal className="size-5" /></button>
      </form>
    </div>
  );
}
