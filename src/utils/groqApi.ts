import { MoveQualityInfo } from "./moveQuality";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Check if Groq API is configured
 */
export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY;
}

/**
 * Generate a chess move explanation using Groq's Llama 3 model
 */
export async function getAiMoveExplanation(
  fen: string,
  movePlayed: string,
  bestMove: string | undefined,
  qualityInfo: MoveQualityInfo | undefined,
  moveNumber: number,
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }

  const quality = qualityInfo?.label || "Unknown";
  const epLoss = qualityInfo?.epLoss
    ? (qualityInfo.epLoss * 100).toFixed(1)
    : "0";
  const epBefore = qualityInfo?.epBefore
    ? (qualityInfo.epBefore * 100).toFixed(0)
    : "50";
  const epAfter = qualityInfo?.epAfter
    ? (qualityInfo.epAfter * 100).toFixed(0)
    : "50";

  const systemPrompt = `You are a chess coach. Explain why the move is bad or brilliant in max 120 characters. Be specific: name the tactic, threat, or what piece/material is lost or gained.`;

  const userPrompt = `Move ${moveNumber}: ${movePlayed} (${quality})
${bestMove && bestMove !== movePlayed ? `Best was: ${bestMove}` : ""}
Explain in max 120 chars why this ${quality.toLowerCase()} is bad or good.`;

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 60,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      throw new Error(`API error: ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    const content =
      data.choices[0]?.message?.content || "No explanation available.";
    return content.slice(0, 120); // Enforce 120 char limit
  } catch (error) {
    console.error("Failed to get AI explanation:", error);
    throw error;
  }
}

/**
 * Batch-generate explanations in a single request.
 * Only Blunder / Mistake / Brilliant get AI text; others should
 * be filled with prepared phrases on the caller side.
 * Every returned string must be <= 60 characters.
 */
export async function getAiBatchExplanations(
  moves: Array<{
    ply: number;
    san: string;
    quality: string;
    bestMove?: string;
    epLoss?: number;
  }>,
): Promise<Record<number, string>> {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }

  if (moves.length === 0) return {};

  const filtered = moves.filter((m) =>
    ["Blunder", "Mistake", "Brilliant"].includes(m.quality),
  );

  if (filtered.length === 0) return {};

  const lines = filtered
    .map((m) => {
      const parts = [`ply:${m.ply}`, `move:${m.san}`, `quality:${m.quality}`];
      if (m.bestMove) parts.push(`best:${m.bestMove}`);
      if (m.epLoss !== undefined) parts.push(`loss:${m.epLoss.toFixed(3)}`);
      return parts.join(" | ");
    })
    .join("\n");

  const systemPrompt =
    "You are a chess coach. For each move, explain WHY it's bad or brilliant in max 120 characters. Be specific: name the tactic, what piece/material is lost or gained, or what threat is created/missed.";

  const userPrompt = `Explain these chess moves (max 120 chars each):
${lines}

Respond with JSON only: {"ply_number": "explanation", ...}
Examples:
- "Hangs the queen to a knight fork on e7. After Nxe7+ you lose the queen for nothing."
- "Drops the bishop. After Bxe5 dxe5, white is up a full piece with a winning position."
- "Brilliant queen sacrifice! After Qxh7+ Kxh7, Rh1+ forces mate in 3 moves."
- "Overlooks Nxf7 forking king and queen. This loses the exchange and the game."`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 512,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API batch error:", error);
      throw new Error(`API error: ${response.status}`);
    }

    const data = (await response.json()) as { choices: any[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};

    let parsed: Record<number, string> = {};
    try {
      const raw = JSON.parse(content) as Record<string, string>;
      parsed = Object.entries(raw).reduce(
        (acc, [ply, text]) => {
          const safeText =
            typeof text === "string"
              ? text.trim().slice(0, 120)
              : String(text).slice(0, 120);
          acc[Number(ply)] = safeText;
          return acc;
        },
        {} as Record<number, string>,
      );
    } catch (err) {
      console.error("Failed to parse Groq batch JSON:", err, content);
      return {};
    }

    return parsed;
  } catch (error) {
    console.error("Failed to get batch AI explanations:", error);
    throw error;
  }
}

/**
 * Check if the Groq API key is valid
 */
export async function validateGroqApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.length < 10) return false;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
