import test from "node:test";
import assert from "node:assert/strict";

/*
  Test pure helper functions from adminNews route module.
  The functions are defined inside the module, so we replicate the logic here to
  validate the contracts without needing a DB connection.
*/

/* ── normalizeSlug logic (mirrors server/routes/adminNews.js) ── */
function normalizeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 220);
}

function normalizeTags(input) {
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

/* ── normalizeSlug tests ── */
test("normalizeSlug lowercases and replaces spaces with dashes", () => {
  assert.equal(normalizeSlug("Hello World"), "hello-world");
});

test("normalizeSlug strips special characters", () => {
  assert.equal(normalizeSlug("News! @2024 – Ready?"), "news-2024-ready");
});

test("normalizeSlug collapses consecutive dashes", () => {
  assert.equal(normalizeSlug("a---b---c"), "a-b-c");
});

test("normalizeSlug trims leading/trailing dashes", () => {
  assert.equal(normalizeSlug("-leading-and-trailing-"), "leading-and-trailing");
});

test("normalizeSlug returns empty string for empty input", () => {
  assert.equal(normalizeSlug(""), "");
  assert.equal(normalizeSlug(null), "");
  assert.equal(normalizeSlug(undefined), "");
});

test("normalizeSlug truncates to 220 chars", () => {
  const long = "a".repeat(300);
  assert.equal(normalizeSlug(long).length, 220);
});

/* ── normalizeTags tests ── */
test("normalizeTags returns unique lowercase trimmed tags", () => {
  const result = normalizeTags(["Chess", "  tactics ", "CHESS", "endgame"]);
  assert.deepEqual(result, ["chess", "tactics", "endgame"]);
});

test("normalizeTags filters empty strings and limits to 12", () => {
  const input = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
  assert.equal(normalizeTags(input).length, 12);
});

test("normalizeTags returns empty array for non-array input", () => {
  assert.deepEqual(normalizeTags("not-an-array"), []);
  assert.deepEqual(normalizeTags(null), []);
  assert.deepEqual(normalizeTags(undefined), []);
});

test("normalizeTags removes falsy entries", () => {
  assert.deepEqual(normalizeTags(["valid", "", null, undefined, "ok"]), [
    "valid",
    "ok",
  ]);
});
