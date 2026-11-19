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
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY.trim() });
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

/** Ask the API which models this key can use, best "flash" models first. */
async function discoverModels(): Promise<string[]> {
  try {
    const found: string[] = [];
    const pager = await ai().models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      const name = (m.name ?? "").replace(/^models\//, "");
      const actions = (m as { supportedActions?: string[] }).supportedActions ?? [];
      if (name.includes("flash") && !/image|tts|audio|live|embedding|thinking-exp/.test(name) && (actions.length === 0 || actions.includes("generateContent"))) found.push(name);
    }
    // prefer newest versions, non-lite before lite
    return found.sort((a, b) => (b.match(/\d+(\.\d+)?/)?.[0] ?? "0").localeCompare(a.match(/\d+(\.\d+)?/)?.[0] ?? "0", undefined, { numeric: true }) || Number(a.includes("lite")) - Number(b.includes("lite")));
  } catch (err) {
    console.error("[gemini] could not list models", err);
    return [];
  }
}

export let lastAiError = "";

export async function generate(opts: GenOptions): Promise<{ text: string; model: string }> {
  let models = workingModel
    ? [workingModel]
    : [...new Set([env().GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[])];
  let discovered = false;

  const contents =
    typeof opts.prompt === "string"
      ? [{ role: "user", parts: [...(opts.pdf ? [{ inlineData: opts.pdf }] : []), { text: opts.prompt }] }]
      : opts.prompt.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  let lastErr: unknown;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
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
      if (/not found|404|not supported|unsupported model|is not available/i.test(msg)) {
        if (i === models.length - 1 && !discovered) {
          discovered = true;
          const extra = (await discoverModels()).filter((m) => !models.includes(m));
          models = [...models, ...extra];
        }
        continue; // try next model
      }
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        throw new ApiError(503, "The AI service is busy (free-tier limit reached). Please try again in a minute.", "ai_quota");
      }
      break;
    }
  }
  console.error("[gemini] generation failed", lastErr);
  lastAiError = String((lastErr as Error)?.message ?? lastErr).slice(0, 300);
  // TEMP diagnostic detail (Google's error text, never contains the key); remove after setup
  throw new ApiError(503, "The AI service is unavailable right now. Your data is safe, so please try again shortly.", "ai_unavailable", `tried ${models.join(", ")}: ${lastAiError}`);
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
