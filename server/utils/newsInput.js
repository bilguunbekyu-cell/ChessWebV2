export function normalizeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 220);
}

export function normalizeTags(input) {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .map((tag) =>
          String(tag || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ].slice(0, 12);
}
