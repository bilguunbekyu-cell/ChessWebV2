import { describe, expect, it, vi } from "vitest";
import {
  FEEDBACK_MIN_MESSAGE_LENGTH,
  normalizeFeedbackMessage,
  submitFeedbackRequest,
  validateFeedbackMessage,
} from "./feedbackApi";

describe("feedbackApi", () => {
  it("normalizes and validates feedback message length", () => {
    expect(normalizeFeedbackMessage("  hello world  ")).toBe("hello world");
    expect(validateFeedbackMessage("1234567890")).toBe(true);
    expect(validateFeedbackMessage("too short")).toBe(false);
  });

  it("rejects too-short messages without calling fetch", async () => {
    const fetchMock = vi.fn();

    await expect(
      submitFeedbackRequest({
        category: "bug",
        message: "short",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow(
      `Feedback message must be at least ${FEEDBACK_MIN_MESSAGE_LENGTH} characters`,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits feedback payload with normalized message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    await submitFeedbackRequest({
      category: "feature",
      message: "  Needs a better tournament filter  ",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/feedback");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");

    const payload = JSON.parse(String(options.body));
    expect(payload.category).toBe("feature");
    expect(payload.message).toBe("Needs a better tournament filter");
  });

  it("propagates backend error message when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server rejected feedback" }),
    });

    await expect(
      submitFeedbackRequest({
        category: "general",
        message: "This message is definitely long enough.",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Server rejected feedback");
  });

  it("falls back to generic error if failed response has no json", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    await expect(
      submitFeedbackRequest({
        category: "general",
        message: "This message is definitely long enough.",
        fetchImpl: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Failed to send feedback");
  });
});
