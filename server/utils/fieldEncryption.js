/**
 * Field-level encryption for sensitive data at rest.
 *
 * Uses AES-256-GCM so that every ciphertext is authenticated and unique
 * (random IV per encryption call).
 *
 * Required env var:
 *   FIELD_ENCRYPTION_KEY  – hex-encoded 32-byte key (64 hex chars).
 *
 * If the key is absent the helpers become pass-through (no-ops) so that
 * development environments work without extra config, while production
 * **must** set the key for real encryption.
 *
 * Ciphertext format stored in DB:
 *   "enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>"
 *
 * Usage:
 *   import { encryptField, decryptField } from "../utils/fieldEncryption.js";
 *   const cipher = encryptField(plainEmail);
 *   const plain  = decryptField(cipher);
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const PREFIX = "enc:v1:";

function getEncryptionKey() {
  const hex = (process.env.FIELD_ENCRYPTION_KEY || "").trim();
  if (!hex) return null;
  if (hex.length !== 64) {
    console.warn(
      "FIELD_ENCRYPTION_KEY must be 64 hex chars (32 bytes). Field encryption disabled.",
    );
    return null;
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.  Returns prefixed ciphertext or the original
 * value when no key is configured.
 */
export function encryptField(plaintext) {
  if (typeof plaintext !== "string" || !plaintext) return plaintext;
  const key = getEncryptionKey();
  if (!key) return plaintext;
  // Already encrypted — don't double-encrypt
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a field value.  Returns plaintext.
 * If the value is not encrypted (no prefix) it is returned as-is.
 */
export function decryptField(ciphertext) {
  if (typeof ciphertext !== "string" || !ciphertext) return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // plaintext pass-through

  const key = getEncryptionKey();
  if (!key) {
    console.warn("Cannot decrypt field: FIELD_ENCRYPTION_KEY not configured.");
    return ciphertext;
  }

  const rest = ciphertext.slice(PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) return ciphertext;

  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Check whether encryption is active (key is configured).
 */
export function isFieldEncryptionEnabled() {
  return getEncryptionKey() !== null;
}
