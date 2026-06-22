/**
 * Master-key rotation: decrypt all ApiKey rows with the OLD secret, re-encrypt with NEW.
 *
 * Usage:
 *   OLD_KEY_VAULT_SECRET=<old> NEW_KEY_VAULT_SECRET=<new> npx tsx backend/scripts/rotate-vault-keys.ts
 *
 * After rotation, update KEY_VAULT_SECRET in your secret manager / deployment to the new value.
 */
import { prisma } from '../src/lib/prisma.js';
import { reencryptAllUserKeys } from '../src/vault/keyStore.js';

const oldSecret = process.env.OLD_KEY_VAULT_SECRET;
const newSecret = process.env.NEW_KEY_VAULT_SECRET;

if (!oldSecret || !newSecret) {
  console.error('Set OLD_KEY_VAULT_SECRET and NEW_KEY_VAULT_SECRET');
  process.exit(1);
}

const count = await reencryptAllUserKeys(oldSecret, newSecret);
console.log(`Re-encrypted ${count} stored API keys. Update KEY_VAULT_SECRET to the new value.`);

await prisma.$disconnect();
