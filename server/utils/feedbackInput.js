const ALLOWED_FEEDBACK_CATEGORIES = new Set([
  "general",
  "bug",
  "feature",
  "account",
  "other",
]);

export function normalizeFeedbackCategory(input) {
  const category = String(input || "general")
    .trim()
    .toLowerCase();
  return ALLOWED_FEEDBACK_CATEGORIES.has(category) ? category : "general";
}

export function normalizeFeedbackScreenshots(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export function normalizeFeedbackMessage(input) {
  return String(input || "").trim();
}

export function validateFeedbackMessage(message, minLength = 10) {
  return typeof message === "string" && message.length >= minLength;
}
