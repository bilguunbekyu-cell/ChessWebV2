import { MoveQualityInfo } from "./moveQuality";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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
 * Generate a chess move explanation using Groq's Llama 3 model
 */
export async function getAiMoveExplanation(
  apiKey: string,
  fen: string,
  movePlayed: string,
  bestMove: string | undefined,
  qualityInfo: MoveQualityInfo | undefined,
  moveNumber: number,
): Promise<string> {
  if (!apiKey) {
    throw new Error("No API key provided");
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

  const systemPrompt = `You are a chess coach. Give 1-2 sentence explanations only. Be direct and specific about the tactical/positional reason. No fluff.`;

  const userPrompt = `Move ${moveNumber}: ${movePlayed} (${quality})
${bestMove && bestMove !== movePlayed ? `Best was: ${bestMove}` : ""}
Why is this ${quality.toLowerCase()}?`;

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 80,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      throw new Error(`API error: ${response.status}`);
    }

    const data: GroqResponse = await response.json();
    return data.choices[0]?.message?.content || "No explanation available.";
  } catch (error) {
    console.error("Failed to get AI explanation:", error);
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
