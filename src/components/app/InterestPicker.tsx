"use client";
import { useState } from "react";
import { X } from "lucide-react";

export const SUGGESTED_INTERESTS = [
  "machine learning", "python", "web development", "data analysis", "cyber security", "cloud",
  "app development", "design", "competitive programming", "entrepreneurship", "finance", "research",
];

export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const toggle = (i: string) => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].slice(0, 15));
  const add = () => {
    const v = draft.trim().toLowerCase().slice(0, 40);
    if (v && !value.includes(v)) onChange([...value, v].slice(0, 15));
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_INTERESTS.map((i) => (
          <button type="button" key={i} onClick={() => toggle(i)} aria-pressed={value.includes(i)}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium ${value.includes(i) ? "border-ink bg-ink text-[#fff8e6]" : "border-line bg-white text-ink-soft hover:border-ink-faint"}`}>
            {i}
          </button>
        ))}
        {value.filter((v) => !SUGGESTED_INTERESTS.includes(v)).map((v) => (
          <button type="button" key={v} onClick={() => toggle(v)} className="inline-flex items-center gap-1 rounded-full border border-ink bg-ink px-3 py-1 text-[13px] font-medium text-[#fff8e6]">
            {v}<X className="size-3.5" aria-label={`remove ${v}`} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input className="field" value={draft} maxLength={40} placeholder="Add your own interest" onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="btn btn-soft" onClick={add}>Add</button>
      </div>
    </div>
  );
}
