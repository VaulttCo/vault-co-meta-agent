/**
 * Credential Encryption Utility — AES-256-GCM
 *
 * Encrypts and decrypts sensitive credential fields (API keys, tokens) before
 * storing them in Supabase. Uses Node.js built-in `crypto` module (server-side only).
 *
 * Key: CREDENTIAL_ENCRYPTION_KEY env var (64 hex chars = 32 bytes = 256 bits)
 * Algorithm: AES-256-GCM with a random 12-byte IV per encryption
 * Format: "ciphertext_hex:iv_hex:tag_hex" (all base64url-safe hex)
 *
 * NEVER import this file in client components — it uses Node.js crypto.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hexKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hexKey, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns "ciphertext:iv:tag" (all hex-encoded).
 */
export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${encrypted.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}`;
}

/**
 * Decrypt a "ciphertext:iv:tag" string back to plaintext.
 * Returns null if decryption fails (wrong key, tampered data, etc.).
 */
export function decryptCredential(encrypted: string): string | null {
  try {
    const key = getKey();
    const parts = encrypted.split(":");
    if (parts.length !== 3) return null;
    const [ciphertextHex, ivHex, tagHex] = parts;
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Check whether the encryption key is configured.
 */
export function hasEncryptionKey(): boolean {
  const hexKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  return Boolean(hexKey && hexKey.length === 64);
}
