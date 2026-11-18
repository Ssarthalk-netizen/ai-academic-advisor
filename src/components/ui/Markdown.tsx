import { Fragment, type ReactNode } from "react";

/**
 * Tiny, safe markdown renderer for AI replies: **bold**, _italic_, `code`,
 * bullet/numbered lists, headings and paragraphs. It never uses
 * dangerouslySetInnerHTML, so model output can't inject HTML/scripts (XSS).
 */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;
  const flush = () => {
    if (!list) return;
    const L = list.ordered ? "ol" : "ul";
    out.push(<L key={out.length}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</L>);
    list = null;
  };
  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      if (code) { out.push(<pre key={out.length} className="my-2 overflow-x-auto rounded-lg bg-butter-soft p-3 text-[13px]">{code.join("\n")}</pre>); code = null; }
      else { flush(); code = []; }
      continue;
    }
    if (code) { code.push(raw); continue; }
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const head = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) { flush(); list = { ordered, items: [] }; }
      list.items.push((bullet ?? num)![1]);
    } else {
      flush();
      if (head) out.push(<h3 key={out.length}>{inline(head[1])}</h3>);
      else if (line.trim()) out.push(<p key={out.length}>{inline(line)}</p>);
    }
  }
  flush();
  if (code) out.push(<pre key={out.length}>{(code as string[]).join("\n")}</pre>);
  return <div className="prose-ai">{out}</div>;
}
