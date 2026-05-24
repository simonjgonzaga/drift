// Drift — Gemini-generated completion congratulations.
// Runs as a Vercel serverless function. The Gemini API key stays
// server-side as the GEMINI_API_KEY env var; the browser only sees
// the resulting message string.

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Cap user-controlled input so a bad client can't push huge prompts.
const MAX_HABITS = 30;
const MAX_NAME_LEN = 50;

const SYSTEM_INSTRUCTION = [
  "You write a short personal affirmation for a habit tracker user",
  "who just completed every habit they had today.",
  "Hard constraints:",
  "1) Maximum 2 short sentences.",
  "2) Written in FIRST PERSON, present tense — start with 'I' or 'My'.",
  "3) Reference how many habits they completed, or a quality the act",
  "   demonstrates (consistency, follow-through, presence, self-trust).",
  "4) No emojis. No exclamation marks. No quotation marks.",
  "5) Do not use the words 'Congratulations', 'congrats', or 'well done'.",
  "Tone: calm, grounded, declarative — like something written in a",
  "journal to remind oneself of what's true. Acknowledging",
  "('I have...' / 'I am...'), not aspirational ('I want to...').",
  "Output only the affirmation itself, no preamble or framing.",
].join(" ");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Fail fast with a clear message if the key isn't configured yet.
  if (!process.env.GEMINI_API_KEY) {
    console.error("[congrats] GEMINI_API_KEY is not set");
    return res.status(500).json({ error: "Server not configured" });
  }

  // Vercel auto-parses JSON when Content-Type: application/json
  const body = req.body ?? {};
  const habitCount = Number.isInteger(body.habitCount) ? body.habitCount : null;
  const habitNames = Array.isArray(body.habitNames)
    ? body.habitNames
        .filter((s) => typeof s === "string")
        .slice(0, MAX_HABITS)
        .map((s) => s.slice(0, MAX_NAME_LEN).trim())
        .filter(Boolean)
    : [];

  if (!habitCount || habitCount < 1 || habitCount > 100) {
    return res.status(400).json({ error: "habitCount must be 1-100" });
  }

  const namesClause = habitNames.length ? ` (${habitNames.join(", ")})` : "";
  const prompt =
    `Write an affirmation for someone who just completed all ${habitCount} ` +
    `of their habits for today${namesClause}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 120,
        // Disable Gemini 2.5 Flash's default thinking — not needed for a
        // 2-sentence generation, and it slows things down and costs more.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = (response.text ?? "").trim();
    if (!text) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    return res.status(200).json({ message: text });
  } catch (err) {
    // The Google GenAI SDK throws errors with a `status` (HTTP code) and
    // `message`. Map the common cases to clean responses for the frontend.
    const status = typeof err?.status === "number" ? err.status : 500;
    const msg = String(err?.message ?? err);
    console.error(`[congrats] Gemini error (${status}):`, msg);

    if (status === 401 || status === 403) {
      return res.status(500).json({ error: "Server not configured" });
    }
    if (status === 429) {
      return res.status(429).json({ error: "Rate limited, try again later" });
    }
    return res.status(502).json({ error: "Generation failed" });
  }
}
