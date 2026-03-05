const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const FEEDBACK_MIN_MESSAGE_LENGTH = 10;

export function normalizeFeedbackMessage(message: string): string {
  return String(message || "").trim();
}

export function validateFeedbackMessage(message: string): boolean {
  return normalizeFeedbackMessage(message).length >= FEEDBACK_MIN_MESSAGE_LENGTH;
}

export async function submitFeedbackRequest({
  category,
  message,
  fetchImpl = fetch,
}: {
  category: string;
  message: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const normalizedMessage = normalizeFeedbackMessage(message);
  if (!validateFeedbackMessage(normalizedMessage)) {
    throw new Error(
      `Feedback message must be at least ${FEEDBACK_MIN_MESSAGE_LENGTH} characters`,
    );
  }

  const response = await fetchImpl(`${API_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      category,
      message: normalizedMessage,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to send feedback");
  }
}
