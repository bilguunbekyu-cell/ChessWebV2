import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFeedbackCategory,
  normalizeFeedbackMessage,
  normalizeFeedbackScreenshots,
  validateFeedbackMessage,
} from "../utils/feedbackInput.js";

test("normalizeFeedbackCategory keeps allowed categories", () => {
  assert.equal(normalizeFeedbackCategory("bug"), "bug");
  assert.equal(normalizeFeedbackCategory(" FEATURE "), "feature");
  assert.equal(normalizeFeedbackCategory("account"), "account");
});

test("normalizeFeedbackCategory falls back to general", () => {
  assert.equal(normalizeFeedbackCategory("unknown"), "general");
  assert.equal(normalizeFeedbackCategory(""), "general");
  assert.equal(normalizeFeedbackCategory(null), "general");
});

test("normalizeFeedbackMessage trims whitespace", () => {
  assert.equal(normalizeFeedbackMessage("  hello world  "), "hello world");
  assert.equal(normalizeFeedbackMessage(""), "");
});

test("normalizeFeedbackScreenshots returns up to five non-empty strings", () => {
  const result = normalizeFeedbackScreenshots([
    " https://a.png ",
    "",
    null,
    "https://b.png",
    "https://c.png",
    "https://d.png",
    "https://e.png",
    "https://f.png",
  ]);

  assert.deepEqual(result, [
    "https://a.png",
    "https://b.png",
    "https://c.png",
    "https://d.png",
    "https://e.png",
  ]);
});

test("normalizeFeedbackScreenshots returns empty array for non-array values", () => {
  assert.deepEqual(normalizeFeedbackScreenshots(null), []);
  assert.deepEqual(normalizeFeedbackScreenshots(undefined), []);
  assert.deepEqual(normalizeFeedbackScreenshots("https://a.png"), []);
});

test("validateFeedbackMessage enforces minimum length", () => {
  assert.equal(validateFeedbackMessage("1234567890", 10), true);
  assert.equal(validateFeedbackMessage("123456789", 10), false);
  assert.equal(validateFeedbackMessage("", 10), false);
});
