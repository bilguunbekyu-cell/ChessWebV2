import test, { afterEach, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

// We import dynamically so we can manipulate process.env before each test
let encryptField, decryptField, isFieldEncryptionEnabled;

async function reimport() {
  // Bust the module cache by loading the file fresh via a query-string trick.
  // Node caches by resolved URL; appending a unique query forces a fresh load.
  const tag = `t=${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const mod = await import(`../utils/fieldEncryption.js?${tag}`);
  encryptField = mod.encryptField;
  decryptField = mod.decryptField;
  isFieldEncryptionEnabled = mod.isFieldEncryptionEnabled;
}

// Generate a valid 64-hex-char key for tests
const TEST_KEY = crypto.randomBytes(32).toString("hex");

describe("fieldEncryption", () => {
  let originalKey;

  beforeEach(() => {
    originalKey = process.env.FIELD_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.FIELD_ENCRYPTION_KEY;
    } else {
      process.env.FIELD_ENCRYPTION_KEY = originalKey;
    }
  });

  test("encrypt then decrypt round-trips correctly", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();

    const plain = "user@example.com";
    const cipher = encryptField(plain);
    assert.ok(cipher.startsWith("enc:v1:"), "ciphertext must have version prefix");
    assert.notEqual(cipher, plain, "ciphertext must differ from plaintext");

    const decrypted = decryptField(cipher);
    assert.equal(decrypted, plain, "decrypted value must match original");
  });

  test("each encryption produces a unique ciphertext (random IV)", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();

    const plain = "same input";
    const a = encryptField(plain);
    const b = encryptField(plain);
    assert.notEqual(a, b, "two encryptions of the same input should differ");
  });

  test("does not double-encrypt already-encrypted values", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();

    const cipher = encryptField("secret");
    const again = encryptField(cipher);
    assert.equal(again, cipher, "re-encrypting should return the same ciphertext");
  });

  test("pass-through when no key is configured", async () => {
    delete process.env.FIELD_ENCRYPTION_KEY;
    await reimport();

    const plain = "not encrypted";
    assert.equal(encryptField(plain), plain);
    assert.equal(decryptField(plain), plain);
    assert.equal(isFieldEncryptionEnabled(), false);
  });

  test("handles non-string / empty inputs gracefully", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();

    assert.equal(encryptField(null), null);
    assert.equal(encryptField(undefined), undefined);
    assert.equal(encryptField(""), "");
    assert.equal(decryptField(null), null);
    assert.equal(decryptField(""), "");
  });

  test("tampered ciphertext throws on decrypt", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();

    const cipher = encryptField("sensitive");
    // Flip a character in the ciphertext portion
    const parts = cipher.split(":");
    const lastPart = parts[parts.length - 1];
    const flipped =
      lastPart[0] === "a"
        ? "b" + lastPart.slice(1)
        : "a" + lastPart.slice(1);
    parts[parts.length - 1] = flipped;
    const tampered = parts.join(":");

    assert.throws(
      () => decryptField(tampered),
      /Unsupported state|unable to authenticate/i,
      "decrypting tampered ciphertext should throw",
    );
  });

  test("isFieldEncryptionEnabled returns true when key is set", async () => {
    process.env.FIELD_ENCRYPTION_KEY = TEST_KEY;
    await reimport();
    assert.equal(isFieldEncryptionEnabled(), true);
  });
});
