import assert from "node:assert/strict";

const API_BASE_URL = process.env.API_URL || "http://localhost:3001";

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cookieFromResponse(res) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return "";
  return setCookie.split(";")[0] || "";
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function main() {
  const suffix = uniqueSuffix();
  const fullName = `i18n-test-${suffix}`;
  const email = `i18n-${suffix}@example.com`;
  const password = "testpass123";

  console.log(`Running language persistence integration test against ${API_BASE_URL}`);

  const registerRes = await fetch(`${API_BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName, email, password, language: "mn" }),
  });
  const registerData = await parseJsonSafe(registerRes);
  assert.equal(registerRes.status, 200, `Register failed: ${JSON.stringify(registerData)}`);
  assert.equal(registerData?.user?.language, "mn", "Expected registered user language=mn");
  const cookie = cookieFromResponse(registerRes);
  assert.ok(cookie, "Missing auth cookie after register");
  console.log("PASS register with language=mn");

  const meAfterRegisterRes = await fetch(`${API_BASE_URL}/api/me`, {
    headers: { Cookie: cookie },
  });
  const meAfterRegisterData = await parseJsonSafe(meAfterRegisterRes);
  assert.equal(
    meAfterRegisterRes.status,
    200,
    `GET /api/me failed after register: ${JSON.stringify(meAfterRegisterData)}`,
  );
  assert.equal(meAfterRegisterData?.user?.language, "mn", "Expected /api/me language=mn");
  console.log("PASS /api/me returns persisted language=mn");

  const updateToEnglishRes = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ language: "en" }),
  });
  const updateToEnglishData = await parseJsonSafe(updateToEnglishRes);
  assert.equal(
    updateToEnglishRes.status,
    200,
    `PUT /api/profile failed: ${JSON.stringify(updateToEnglishData)}`,
  );
  assert.equal(updateToEnglishData?.user?.language, "en", "Expected updated language=en");
  console.log("PASS profile update language=en");

  const meAfterUpdateRes = await fetch(`${API_BASE_URL}/api/me`, {
    headers: { Cookie: cookie },
  });
  const meAfterUpdateData = await parseJsonSafe(meAfterUpdateRes);
  assert.equal(
    meAfterUpdateRes.status,
    200,
    `GET /api/me failed after update: ${JSON.stringify(meAfterUpdateData)}`,
  );
  assert.equal(meAfterUpdateData?.user?.language, "en", "Expected /api/me language=en");
  console.log("PASS /api/me returns persisted language=en");

  const invalidLanguageRes = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ language: "jp" }),
  });
  const invalidLanguageData = await parseJsonSafe(invalidLanguageRes);
  assert.equal(
    invalidLanguageRes.status,
    400,
    `Expected 400 for invalid language, got ${invalidLanguageRes.status}: ${JSON.stringify(invalidLanguageData)}`,
  );
  assert.equal(
    invalidLanguageData?.errorCode,
    "AUTH_INVALID_LANGUAGE",
    `Expected AUTH_INVALID_LANGUAGE, got ${JSON.stringify(invalidLanguageData)}`,
  );
  console.log("PASS invalid language rejected with AUTH_INVALID_LANGUAGE");

  console.log("Language persistence integration test passed.");
}

main().catch((error) => {
  console.error("Language persistence integration test failed.");
  console.error(error);
  process.exit(1);
});
