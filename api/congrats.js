// Drift — Claude-generated completion congratulations.
// Runs as a Vercel serverless function. The Anthropic API key
// stays server-side as the ANTHROPIC_API_KEY env var; the browser
// only sees the resulting message string.

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// Cap user-controlled input so a bad client can't push huge prompts.
const MAX_HABITS = 30;
const MAX_NAME_LEN = 50;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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

  const namesClause = habitNames.length
    ? `: ${habitNames.join(", ")}`
    : "";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system:
        "You write a short, warm congratulations for a habit tracker user " +
        "who just completed every habit they had today. " +
        "Hard constraints: " +
        "1) Maximum 2 sentences. " +
        "2) No emojis (the app already has them). " +
        "3) No exclamation marks. " +
        "4) Do not use the word 'Congratulations' or 'congrats'. " +
        "5) Reference how many habits they completed, concretely. " +
        "Tone: calm, grounded, gently encouraging — like a thoughtful journal " +
        "entry to oneself. Avoid hype, AI-isms, and saccharine language. " +
        "Output only the message, no quotes or preamble.",
      messages: [
        {
          role: "user",
          content: `I just completed all ${habitCount} of my habits for today${namesClause}.`,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({ error: "Empty response from model" });
    }

    return res.status(200).json({ message: text });
  } catch (err) {
    // Use the SDK's typed exception classes (not string matching)
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[congrats] missing or invalid ANTHROPIC_API_KEY");
      return res.status(500).json({ error: "Server not configured" });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Rate limited, try again later" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[congrats] API ${err.status}:`, err.message);
      return res.status(502).json({ error: "Upstream API error" });
    }
    console.error("[congrats] unexpected error:", err);
    return res.status(500).json({ error: "Generation failed" });
  }
}
