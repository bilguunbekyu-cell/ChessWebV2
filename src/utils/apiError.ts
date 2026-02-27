import i18n from "../i18n";

type ApiErrorResponse = {
  error?: string;
  message?: string;
  errorCode?: string;
  banned?: boolean;
  banReason?: string;
};

export type ParsedApiError = {
  message: string;
  code?: string;
  banned?: boolean;
  banReason?: string;
};

const ERROR_CODE_DEFAULTS: Record<string, string> = {
  AUTH_REQUIRED_FIELDS: "All fields are required",
  AUTH_EMAIL_IN_USE: "Email already in use",
  AUTH_EMAIL_PASSWORD_REQUIRED: "Email and password are required",
  AUTH_INVALID_CREDENTIALS: "Invalid email or password",
  AUTH_ACCOUNT_BANNED: "Your account has been banned",
  AUTH_LOGIN_FAILED: "Login failed",
  AUTH_REGISTER_FAILED: "Registration failed",
  AUTH_ME_FAILED: "Failed to load user",
  AUTH_FORBIDDEN: "Forbidden",
  AUTH_INVALID_PROFILE_UPDATE: "No valid profile fields provided",
  AUTH_INVALID_LANGUAGE: "Invalid language setting",
  AUTH_PROFILE_UPDATE_FAILED: "Failed to update profile",
  AUTH_AVATAR_REQUIRED: "Avatar is required",
  AUTH_AVATAR_UPDATE_FAILED: "Failed to update avatar",
  USER_NOT_FOUND: "User not found",
  BOT_FETCH_FAILED: "Failed to fetch bots",
  BOT_NOT_FOUND: "Bot not found",
  PUZZLES_FETCH_FAILED: "Failed to fetch puzzles",
  PUZZLE_FETCH_FAILED: "Failed to fetch puzzle",
  PUZZLE_NOT_FOUND: "Puzzle not found",
  PUZZLE_STATS_FETCH_FAILED: "Failed to fetch puzzle stats",
  PUZZLE_FEATURED_FETCH_FAILED: "Failed to fetch featured puzzles",
  PUZZLE_UPDATE_FAILED: "Failed to update puzzle",
  PUZZLE_STATS_UPDATE_FAILED: "Failed to update puzzle stats",
  PUZZLE_INVALID_RESULT: "Invalid result. Expected SOLVED, FAILED, or SKIPPED.",
  PUZZLE_ATTEMPT_RECORD_FAILED: "Failed to record puzzle attempt",
  PUZZLE_SOLVE_RECORD_FAILED: "Failed to record puzzle solve",
};

function translateMessage(raw: string): string {
  return i18n.t(raw, { defaultValue: raw });
}

export async function parseApiError(
  res: Response,
  fallbackMessage: string,
): Promise<ParsedApiError> {
  let payload: ApiErrorResponse = {};
  try {
    payload = (await res.json()) as ApiErrorResponse;
  } catch {
    payload = {};
  }

  const code = typeof payload.errorCode === "string" ? payload.errorCode : undefined;
  const defaultByCode = code ? ERROR_CODE_DEFAULTS[code] : undefined;
  const rawMessage =
    defaultByCode ||
    (typeof payload.error === "string" ? payload.error : "") ||
    (typeof payload.message === "string" ? payload.message : "") ||
    fallbackMessage;

  return {
    message: translateMessage(rawMessage),
    code,
    banned: payload.banned === true,
    banReason:
      typeof payload.banReason === "string" ? translateMessage(payload.banReason) : undefined,
  };
}

export function createApiError(parsed: ParsedApiError): Error & ParsedApiError {
  const error = new Error(parsed.message) as Error & ParsedApiError;
  error.code = parsed.code;
  error.banned = parsed.banned;
  error.banReason = parsed.banReason;
  return error;
}

export function mapErrorCodeToMessage(code: string, fallback: string): string {
  const raw = ERROR_CODE_DEFAULTS[code] || fallback;
  return translateMessage(raw);
}
