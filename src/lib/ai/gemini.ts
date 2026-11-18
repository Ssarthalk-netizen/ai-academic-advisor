import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../env";
import { ApiError } from "../security/errors";

/**
 * Gemini wrapper. The API key never leaves the server. Model names change
 * often, so we try GEMINI_MODEL first, then fall back through known models
 * if one isn't available on this key.
 */
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

let client: GoogleGenAI | null = null;
let workingModel: string | null = null;

function ai() {
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY });
  return client;
}

export const AI_LABEL = "AI-generated guidance. It may be wrong, so check important details with your faculty.";

export type GenOptions = {
  system: string;
  prompt: string | { role: "user" | "model"; text: string }[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  pdf?: { data: string; mimeType: "application/pdf" }; // base64
};

export async function generate(opts: GenOptions): Promise<{ text: string; model: string }> {
  const models = workingModel
    ? [workingModel]
    : [...new Set([env().GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[])];

  const contents =
    typeof opts.prompt === "string"
      ? [{ role: "user", parts: [...(opts.pdf ? [{ inlineData: opts.pdf }] : []), { text: opts.prompt }] }]
      : opts.prompt.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  let lastErr: unknown;
  for (const model of models) {
    try {
      const res = await ai().models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens ?? 1200,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
          abortSignal: AbortSignal.timeout(30_000),
        },
      });
      const text = res.text?.trim();
      if (!text) throw new Error("empty response");
      workingModel = model;
      return { text, model };
    } catch (err) {
      lastErr = err;
      const msg = String((err as Error)?.message ?? err);
      if (/not found|404|not supported|unsupported model/i.test(msg)) continue; // try next model
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        throw new ApiError(503, "The AI service is busy (free-tier limit reached). Please try again in a minute.", "ai_quota");
      }
      break;
    }
  }
  console.error("[gemini] generation failed", lastErr);
  throw new ApiError(503, "The AI service is unavailable right now. Your data is safe, so please try again shortly.", "ai_unavailable");
}

/** Parse a JSON reply defensively (models sometimes wrap JSON in ``` fences). */
export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new ApiError(502, "The AI returned an unreadable answer. Please try again.", "ai_bad_json");
  }
}
