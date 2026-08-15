import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

// OAuth access/refresh tokens grant real access to whatever third-party
// system they're for (a Salesforce token can read/write someone's whole
// org's data) — these are not "just another config value" and should
// never sit in the database in plaintext. AES-256-GCM: a random IV per
// encryption, and the auth tag catches tampering (not just accidental
// corruption — GCM is authenticated encryption).

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.CRM_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'CRM_TOKEN_ENCRYPTION_KEY is not set — required to store CRM credentials. Generate one with `openssl rand -base64 32`.',
    );
  }
  // scrypt derives a proper 32-byte key regardless of the raw secret's
  // length/format, rather than requiring the env var to be exactly the
  // right byte length itself.
  return scryptSync(secret, 'donor-success-crm-tokens', 32);
}

/** Returns `iv:authTag:ciphertext`, all hex-encoded, joined with `:`. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored: string): string {
  const [ivHex, authTagHex, encryptedHex] = stored.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Malformed encrypted token — expected iv:authTag:ciphertext.');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
