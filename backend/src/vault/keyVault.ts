import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export type EncryptedPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  last4: string;
};

/** Patterns used to scrub secrets from logs and error messages. */
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{10,}/g,
  /pplx-[a-zA-Z0-9_-]{10,}/g,
  /AIza[a-zA-Z0-9_-]{20,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/gi,
  /"api_key"\s*:\s*"[^"]+"/gi,
  /api_key=[a-zA-Z0-9]+/gi,
];

export function parseMasterKey(secret: string): Buffer {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error('KEY_VAULT_SECRET is empty');

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const b64 = Buffer.from(trimmed, 'base64');
  if (b64.length === KEY_BYTES) return b64;

  if (Buffer.byteLength(trimmed, 'utf8') === KEY_BYTES) {
    return Buffer.from(trimmed, 'utf8');
  }

  throw new Error('KEY_VAULT_SECRET must be 32 bytes (hex, base64, or raw)');
}

export function encryptKey(plaintext: string, masterKey: Buffer): EncryptedPayload {
  if (masterKey.length !== KEY_BYTES) {
    throw new Error('Master key must be 32 bytes');
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const last4 = plaintext.length >= 4 ? plaintext.slice(-4) : plaintext;

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    last4,
  };
}

export function decryptKey(
  ciphertext: string,
  iv: string,
  authTag: string,
  masterKey: Buffer,
): string {
  if (masterKey.length !== KEY_BYTES) {
    throw new Error('Master key must be 32 bytes');
  }
  const decipher = createDecipheriv(ALGO, masterKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  try {
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Key decryption failed — data may be tampered or master key mismatch');
  }
}

export function scrubSecrets(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

export function safeCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function maskApiKeyMeta(payload: EncryptedPayload & { provider: string; valid: boolean; lastValidatedAt: Date | null }) {
  return {
    provider: payload.provider,
    last4: payload.last4,
    valid: payload.valid,
    lastValidatedAt: payload.lastValidatedAt,
  };
}

/** Decrypt all rows with old key, re-encrypt with new key. Returns count rotated. */
export function reencryptPayload(
  record: { ciphertext: string; iv: string; authTag: string },
  oldMaster: Buffer,
  newMaster: Buffer,
): EncryptedPayload & { plaintext: string } {
  const plaintext = decryptKey(record.ciphertext, record.iv, record.authTag, oldMaster);
  const enc = encryptKey(plaintext, newMaster);
  return { ...enc, plaintext };
}
