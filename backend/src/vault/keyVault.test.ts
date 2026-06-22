import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decryptKey,
  encryptKey,
  maskApiKeyMeta,
  parseMasterKey,
  reencryptPayload,
  scrubSecrets,
} from './keyVault.js';

const MASTER_A = parseMasterKey('a'.repeat(64));
const MASTER_B = parseMasterKey('b'.repeat(64));

describe('keyVault', () => {
  it('round-trips encrypt and decrypt', () => {
    const plain = 'pplx-test-key-1234567890abcdef';
    const enc = encryptKey(plain, MASTER_A);
    const dec = decryptKey(enc.ciphertext, enc.iv, enc.authTag, MASTER_A);
    assert.equal(dec, plain);
    assert.equal(enc.last4, 'cdef');
  });

  it('rejects tampered auth tag', () => {
    const enc = encryptKey('secret-key-value', MASTER_A);
    const badTag = Buffer.from(enc.authTag, 'base64');
    badTag[0] ^= 0xff;
    assert.throws(
      () => decryptKey(enc.ciphertext, enc.iv, badTag.toString('base64'), MASTER_A),
      /decryption failed/i,
    );
  });

  it('rejects wrong master key', () => {
    const enc = encryptKey('another-secret', MASTER_A);
    assert.throws(
      () => decryptKey(enc.ciphertext, enc.iv, enc.authTag, MASTER_B),
      /decryption failed/i,
    );
  });

  it('never exposes plaintext in masked metadata', () => {
    const plain = 'sk-openai-super-secret-key';
    const enc = encryptKey(plain, MASTER_A);
    const meta = maskApiKeyMeta({
      ...enc,
      provider: 'openai',
      valid: true,
      lastValidatedAt: new Date(),
    });
    const serialized = JSON.stringify(meta);
    assert.ok(!serialized.includes(plain));
    assert.ok(!serialized.includes(enc.ciphertext));
    assert.ok(!serialized.includes(enc.iv));
    assert.ok(!serialized.includes(enc.authTag));
    assert.equal(meta.last4, plain.slice(-4));
  });

  it('scrubs common secret patterns from strings', () => {
    const dirty = 'Error: Bearer sk-ant-api03-abcdef and api_key=deadbeef failed';
    const clean = scrubSecrets(dirty);
    assert.ok(!clean.includes('sk-ant-api03-abcdef'));
    assert.ok(!clean.includes('deadbeef'));
    assert.ok(clean.includes('[REDACTED]'));
  });

  it('reencrypts with a new master key', () => {
    const plain = 'gemini-key-rotate-me';
    const enc = encryptKey(plain, MASTER_A);
    const rotated = reencryptPayload(enc, MASTER_A, MASTER_B);
    assert.equal(rotated.plaintext, plain);
    const dec = decryptKey(rotated.ciphertext, rotated.iv, rotated.authTag, MASTER_B);
    assert.equal(dec, plain);
  });

  it('parses hex master key', () => {
    const key = parseMasterKey('ab'.repeat(32));
    assert.equal(key.length, 32);
  });
});
